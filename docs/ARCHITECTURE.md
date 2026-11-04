# iMON — architecture (locked decisions)

The design the build follows. These are deliberate calls, not defaults; the "why" matters
as much as the "what".

## Core decision: not ERC-4626

ERC-4626 is a **single-asset** standard. iMON holds a **basket**, so it is a custom ERC-20
share token (`iMON`) with internal NAV accounting denominated in **MON** (every LST
exposes a MON-per-token rate, so MON is the natural unit). We borrow 4626's share *math*
(virtual shares, rounding) but not its interface. Frontend-facing previews use our own
names so no integrator mistakes iMON for a 4626 vault.

## Contract set (launch = 5)

| Contract | Responsibility |
|---|---|
| `iMONVault` | The hub + the ERC-20 share token. Holds LST balances, does mint/redeem and NAV accounting, enforces caps, reads rates, applies fees, checks pause state. |
| `AssetRegistry` | Source of truth for the basket: supported LSTs, each one's cap (bps), target weight (bps), rate source, enabled flag. Governance-only writes. |
| `RateReader` | `rateOf(lst)` → MON-per-token at 1e18, normalized from each LST's canonical on-chain getter. Enforces staleness + deviation + monotonic-sanity guards. The single oracle chokepoint. |
| `FeeController` | Fee params (yield skim ~5%, exit fee, future swap fee), treasury, high-water-mark state. |
| `Guardian` | One-directional circuit breaker: a fast key can pause **deposits**; un-pause is timelocked. |

`Rebalancer` / `SwapRouter` adapters are added in Phase 4 for LST↔LST swaps. Until then,
rebalancing is passive (deposits route to the most under-weight asset).

## Share math (all 1e18, NAV in MON)

```
NAV        = Σ_i ( vaultBalance_i * rate_i ) / 1e18
OFFSET     = 3 ;  VIRT_SHARES = 10**OFFSET (=1000) ;  VIRT_ASSETS = 1
S*         = totalSupply + VIRT_SHARES
N*         = NAV + VIRT_ASSETS

deposit amtIn of LST j:
  valueIn   = amtIn * rate_j / 1e18            (round down)
  sharesOut = valueIn * S* / N*                (round down; read NAV BEFORE crediting balance)
  require(sharesOut > 0)

redeem sharesIn:
  for each asset i: amtOut_i = vaultBalance_i * sharesIn / totalSupply   (round down)
  burn(sharesIn); transfer each amtOut_i
```

Every division **rounds down in the vault's favor**. Redeem is pro-rata on **raw balances**
— no oracle, no cap check — which is what makes exit always possible with zero external
liquidity.

## Inflation / donation attack defense (three layers)

1. **Virtual shares + decimal offset = 3** (empty-vault rate is pinned).
2. **Dead shares at bootstrap** (first deposit mints a small fixed amount to a burn sink).
3. **Internal balance accounting** — NAV uses a stored `vaultBalance_i` mapping, never
   `IERC20(lst).balanceOf(this)`, so a raw token donation changes nothing. This is the one
   that truly kills the donation vector.

Plus `require(sharesOut > 0)`.

## Caps (hard invariant)

After any state change, no enabled asset exceeds its cap in NAV terms:
```
require(valueI * 10_000 <= nav * capBps[a], "CAP_EXCEEDED");
```
Checked on deposit and rebalance. **Skipped on redeem** (pro-rata can only improve weights;
a cap check must never block an exit). Guarded launch also enforces per-user and total
deposit caps.

## Fees

- **Yield skim (~5%)** via share dilution to the treasury on a high-water mark: when
  NAV-per-share rises, mint the treasury the shares representing 5% of the gain. No per-asset
  cost basis to track.
- **Exit fee** (bps on redeem) accrues as treasury-held iMON shares; hard max in the setter.
- **Swap fee** (Phase 4) on LST↔LST routed volume.

## Risk / pause / oracle

- **Two-tier guardian:** a small multisig/EOA can only `pauseDeposits()`; adding/removing
  assets, retuning caps/fees, and **un-pausing** go through a timelock + main multisig.
  `AccessControl` roles: `GUARDIAN_ROLE`, `GOVERNOR_ROLE` (timelock), `KEEPER_ROLE`.
- **Pause blocks deposits/mints and exposure-increasing rebalances. Redeem is never gated.**
- **Oracle = each LST's canonical rate getter** (not a DEX spot price), behind RateReader's
  staleness + deviation + monotonic guards, and **only on the deposit path**. A wrong oracle
  can never block or distort an exit.
- **Health monitor** = a self-run off-chain keeper watching the same signals, calling
  `pauseDeposits()`; the on-chain deviation guard is the backstop.

## Libraries (OpenZeppelin v5)

`ERC20`, `AccessControl`, `Pausable`, `ReentrancyGuard`, `SafeERC20`, `Math` (mulDiv with
explicit `Rounding.Floor`), `SafeCast`. Do **not** inherit OZ `ERC4626`.

## Security checklist (iMON-specific)

- `nonReentrant` + checks-effects-interactions on deposit/redeem/rebalance/skim; commit all
  balance/supply effects before any transfer (redeem transfers several LSTs in a loop).
- Floor rounding everywhere; test `redeem(mint(x)) <= x` and that dust stays in the vault.
- Inflation/donation: offset 3 + dead shares + internal accounting + `sharesOut > 0`; test
  the donate-then-deposit sequence.
- Oracle: canonical getters, staleness/deviation/monotonic guards, deposit-path only; fuzz a
  rate spike/drop and assert deposits revert while redeem still works.
- Caps: full-loop check after state change; test exactly-at-cap (ok) vs cap+1 (revert).
- Pause can't touch redeem or user funds; fee setters bounded by hard maxima.
- Removed-but-still-held assets stay in the pro-rata set until balance hits zero.
- Normalize non-18-decimal LSTs to 1e18 in RateReader.
- Note shMON's dual deposit/unstake rate (unstake excludes current-epoch rewards) and the
  `crank()` near epoch boundaries — handle in the shMON adapter.
