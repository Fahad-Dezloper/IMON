# iMON backend — build spec

The actionable, end-to-end plan for the backend. Pair this with
[`ARCHITECTURE.md`](ARCHITECTURE.md) (the locked design: share math, contract set,
inflation defenses, fee accounting, guardian model, security checklist). This doc is the
**what to build, in what order, and how to verify it** — written so an AI agent can execute
it phase by phase.

Target: **Monad mainnet, chain 143.** Unaudited; guarded launch (deposit caps + limited
token set) until reviewed.

---

## Contract set (final)

| Contract | State | Responsibility |
|---|---|---|
| `iMONVault` | Phase 1 ✅ | Share token + multi-asset NAV accounting, `deposit`/`redeem`, inflation defense. Gains caps + pause hooks (P3), fee hooks (P-fees), swap (P4). |
| `IRateReader` | Phase 1 ✅ | Interface: `rateOf(asset) → MON per 1e18, 1e18 precision`. |
| `RateReader` | Phase 2 | Production impl: per-LST adapters reading each LST's canonical rate getter; staleness + deviation + monotonic guards. |
| `AssetRegistry` | Phase 3 | Supported assets, per-asset `capBps`, `targetBps`, rate source, enabled flag. Governance-only. (In P1 this lives inline in the vault; extract here.) |
| `FeeController` | Phase (fees) | Yield-skim (5% via HWM share dilution), exit fee, future swap fee; treasury; high-water-mark state. |
| `Guardian` | Phase 3 | Two-tier pause: fast key can `pauseDeposits()`; un-pause + config via timelock + multisig. |
| `Rebalancer` / swap adapters | Phase 4 | LST↔LST swap through the vault at a fee; rebalance toward targets within caps. |

Keep the launch set to **Vault + AssetRegistry + RateReader + FeeController + Guardian**.

---

## Phase 2 — production RateReader + real LST adapters

**Goal:** replace the mock rate source with a real, guarded one, and prove it on a mainnet fork.

Build:
1. `RateReader` implementing `IRateReader`, holding a mapping `asset → adapter`.
2. A per-LST **adapter** that normalizes each LST's native exchange-rate getter to
   "MON per 1e18 of token, 1e18 precision". For an ERC-4626 LST that's `convertToAssets(1e18)`.
   - **shMON (FastLane) quirk:** deposit and unstake use *different* rates (unstake excludes
     current-epoch rewards), and a `crank()` may be needed near epoch boundaries before a
     correct exit quote. The adapter must read the **conservative (unstake)** rate for NAV so
     the vault never over-values the sleeve. Document which getter is used.
3. **Guards in RateReader** (the single oracle chokepoint):
   - **Staleness:** revert if the rate's last update is older than `maxAge`.
   - **Deviation / rate-limiter:** store a checkpoint; revert a deposit if
     `|rate - lastRate| / lastRate > maxDeviationBps` within an interval.
   - **Monotonic sanity:** LST rates should trend up; a sharp drop flags the asset (→ pause).
   - These run on the **deposit path only**. `redeem` never calls the RateReader.

Verify:
- Unit tests with a mock adapter: staleness revert, deviation revert, monotonic-drop flag.
- **Mainnet-fork test** (`forge test --fork-url $MONAD_MAINNET_RPC`): point the shMON adapter
  at the real shMON address and assert `rateOf` returns a sane value (~1.0–1.3 MON). This is
  the first time we touch a real address — read-only, no funds.

Done when: fork test green; NAV tracks a simulated rate increase; a simulated drop is caught.

### Confirm LST addresses (do before wiring any into the vault)

Research left these **unconfirmed** — verify each on https://monadscan.com before use, and
fill `deployments/143.json`:
- shMON (FastLane): candidate `0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c` — confirm ERC-4626 + rate getter.
- gMON (Magma): candidates conflict (`0xFF19…8888` "GmonadToken" vs `0x8498…5081`) — read the verified token page.
- sMON (Kintsu): candidate `0xa3227c5969757783154c60bf0bc1944180ed81b9` — confirm interface.
- aprMON (aPriori): full address not verified; ~$253k TVL and reportedly rebranding — **consider excluding at launch**, or cap tiny (1500 bps).

Start the basket with **only shMON** (confirmed + liquid) and add others as confirmed.

---

## Phase 3 — caps, registry, guardian, keeper

Build:
1. Extract `AssetRegistry`: assets, `capBps`, `targetBps`, rate source, `enabled`. Assert
   `targetBps ≤ capBps` on config. Vault reads it.
2. **Cap enforcement in the vault** — after any deposit/rebalance, for every enabled asset:
   `require(valueI * 10_000 <= nav * capBps[a], "CAP_EXCEEDED")`. Skip on redeem.
3. **Guarded-launch caps:** per-user and total deposit caps (`maxDepositPerUser`, `maxTotalDeposits`).
4. `Guardian` + `AccessControl` roles: `GUARDIAN_ROLE` (pause deposits), `GOVERNOR_ROLE`
   (timelock: config, fees, un-pause), `KEEPER_ROLE` (rebalance / skim poke). Replace the
   P1 `Ownable2Step` admin. `whenNotPaused` on deposit/mint only — **never on redeem**.
5. Off-chain **keeper** in `services/` (TypeScript or a small bot): polls each LST's rate +
   TVL + the RateReader deviation signal; on anomaly calls `pauseDeposits()`. Monad's ~300ms
   blocks make a self-run bot responsive; do **not** depend on a third-party keeper network
   (Gelato is testnet-only on Monad; Chainlink Automation unconfirmed). The on-chain
   deviation guard is the backstop if the keeper is down.

Verify:
- Cap tests: deposit exactly at cap (ok) vs cap+1 (revert); rebalance can't push the other leg over.
- Pause tests: when paused, deposit reverts but **redeem still works**; only `GUARDIAN_ROLE` can pause; only timelock un-pauses.
- Keeper integration test: scripted rate drop → keeper calls pause → deposits halt; dashboard event fires.

Done when: a scripted de-peg auto-pauses deposits while redeem stays open; caps can't be exceeded.

---

## Phase 4 — rebalance + LST↔LST swap (the volume revenue engine)

Build:
1. `Rebalancer` (KEEPER_ROLE): move actual weights toward targets within caps.
2. **LST↔LST swap through the vault** at a `swapFeeBps` (to treasury). This is the
   defensible, volume-scaling revenue — being the default place to swap staking tokens.
3. Optional: deposit **MON** → auto-stake into the most under-weight LST (needs a staking
   adapter per provider).

Verify: drift → rebalance restores targets without breaching caps; swap charges the fee and
preserves NAV (minus fee); fuzz that no rebalance/swap can breach a cap or lose value beyond fee.

---

## Fees (fold in with Phase 3/4)

Implement `FeeController` per [`ARCHITECTURE.md`](ARCHITECTURE.md) §4:
- **Yield skim 5%** via share dilution to treasury on a high-water mark (`yieldSkimBps`, hard max e.g. 2000).
- **Exit fee** (bps on redeem) as treasury-held shares; hard max e.g. 100.
- **Swap fee** (P4).
Tests: HWM only mints on a real NAV/share increase; treasury shares redeem through the normal
pro-rata path; setters revert above hard maxima.

---

## Phase 6/7 — deploy runbook + hardening

**Before mainnet deploy:**
1. `foundryup` to ≥1.8; add `network = "monad"` to `foundry.toml`.
2. Confirm all LST addresses on-chain; fill `deployments/143.json`.
3. Fund a dedicated deployer wallet with real MON (no faucet). Put its key in `.env`
   (`DEPLOYER_PRIVATE_KEY`), never committed.

**Deploy (`script/Deploy.s.sol`, to write):** deploy RateReader → AssetRegistry → FeeController
→ Guardian → iMONVault, wire roles to the multisig/timelock, add shMON only, set caps.
```bash
forge script script/Deploy.s.sol --rpc-url monad --broadcast --verify --verifier sourcify
```
Then run `../scripts/export-abi.sh`, commit `deployments/143.json`, push.

**Hardening:** external audit before lifting deposit caps; access-control review; monitoring
on the keeper and the deviation guard; consider a timelock delay of 24–48h on governance.

---

## Security checklist

Live in [`ARCHITECTURE.md`](ARCHITECTURE.md) §7 — reentrancy (CEI + `nonReentrant`), floor
rounding, the three-layer inflation/donation defense, oracle only on the deposit path, cap
full-loop check, pause can't touch redeem/funds, fee maxima, removed-but-held assets stay in
the pro-rata set, non-18-decimal normalization. Every phase adds its own known-answer tests;
the P1 suite in `test/iMONVault.t.sol` is the pattern to follow.
