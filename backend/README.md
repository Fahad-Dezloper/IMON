# iMON — backend

Smart contracts + off-chain services for iMON, a capped, auto-balanced index of Monad
liquid staking tokens. **If you (or your agent) are building the backend, start here, then
read [`docs/BUILD.md`](docs/BUILD.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).**

## What we're building, in one paragraph

Users deposit a Monad LST (shMON / gMON / sMON / aprMON) — or MON, auto-staked — and get
`iMON`, one ERC-20 that represents a pro-rata slice of a diversified basket. iMON
auto-compounds as the underlying LSTs earn. The product's promises, stated honestly:

- **Always redeemable.** `redeem()` returns your pro-rata slice of the raw basket with no
  oracle call, no cap check, and (from Phase 3) never pausable. This invariant is sacred.
- **Bounded loss, not "balanced" loss.** A hard per-token weight cap (≤30%) means no single
  LST failing can cost holders more than that token's slice. We do **not** claim to cancel
  losses or to be "quantum safe."
- **Fault isolation.** The LSTs are independent; if one breaks, the others keep earning and
  we pause deposits into the basket.
- **Revenue:** ~5% of yield (share dilution on a high-water mark) + an exit fee; later an
  LST↔LST swap fee (the volume engine).

## Stack

- **Foundry** (Solidity ^0.8.24, OpenZeppelin v5). Deploy target: **Monad mainnet, chain 143**.
- Deploying/fork-testing against Monad needs **Foundry ≥ 1.8.0** with `network = "monad"` in
  `foundry.toml` (uncomment it after `foundryup`). Building + unit tests work on older Foundry.
- Off-chain **keeper** (the health monitor / pause bot) lives in `services/` — Phase 3.

## Setup

```bash
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts   # lib/ is gitignored
forge build
forge test
```

## Status

- **Phase 1 done:** `src/iMONVault.sol` — multi-asset NAV accounting, `deposit`/`redeem`,
  three-layer inflation/donation defense. `src/interfaces/IRateReader.sol`. 14 passing tests
  in `test/iMONVault.t.sol` (incl. a fuzz round-trip and a donation-attack test).
- **Next (Phase 2):** production `RateReader` with real LST adapters + guards, mainnet-fork test.

Full per-phase plan: [`docs/BUILD.md`](docs/BUILD.md). Shared roadmap: [`../docs/PHASES.md`](../docs/PHASES.md).

## Rules that must not be broken

1. **`redeem` stays pro-rata on raw balances** — no oracle, no cap check, never paused.
2. **NAV reads `vaultBalance` (internal accounting), never `token.balanceOf(this)`** — this
   is the donation-attack defense; do not "simplify" it.
3. **Every share-math division rounds down in the vault's favor.**
4. **Caps are a hard `require` on deposit/rebalance**, never on redeem.
5. **Fees bounded by hard maxima** in their setters; no un-timelocked path to raise them.

## Publishing to the frontend

The frontend never runs Foundry. After any interface change or deployment, run
`../scripts/export-abi.sh` (writes ABIs to `frontend/lib/abi/` and copies
`deployments/143.json`) and fill `deployments/143.json` with real addresses. See
[`../INTEGRATION.md`](../INTEGRATION.md).
