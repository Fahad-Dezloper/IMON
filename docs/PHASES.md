# iMON — build phases

Each phase is built fully, then verified, committed, and pushed before the next begins.
Target network: **Monad mainnet (chain id 143)**. Launch is guarded (deposit caps, a
limited confirmed-token set) until a security review is done.

| Phase | Build | Done when | Status |
|---|---|---|---|
| **0 · Foundations** | Monorepo scaffold, Monad mainnet config, app shell, empty test suite | Repo builds; tests pass; app connects a wallet to Monad | ✅ done |
| **1 · Core vault** | `iMONVault` — deposit LST → mint iMON at NAV; redeem → pro-rata basket; NAV from each LST's rate; inflation-attack defense | Foundry tests pass (mint/redeem/NAV/rounding); runs on a mainnet fork | ⬜ next |
| **2 · Pricing + mocks** | Mock ERC-4626 LSTs (settable rate, to simulate yield and a crash) + `RateReader` with staleness/deviation guards | NAV tracks accruing yield; a de-peg can be simulated | ⬜ |
| **3 · Risk engine** | Per-LST weight caps enforced on deposit/rebalance; `Guardian` + off-chain health monitor auto-pausing deposits (redeem always open) | Scripted de-peg → deposits auto-pause; cap cannot be exceeded | ⬜ |
| **4 · Rebalance + swap** | Rebalance toward targets within caps; LST↔LST swap through the vault with a fee (the volume revenue engine) | Drift → rebalances; swap works and takes its fee | ⬜ |
| **5 · The app** | Aave-grade UI: dashboard, deposit modal w/ signing preview, basket + health views, honest redeem, portfolio + live count-up | Full flow works against mainnet contracts | ⬜ |
| **6 · Demo polish** | Live NAV ticker on real on-chain state; scripted demo (deposit → yield ticks → de-peg → auto-pause + bounded loss); deploy app | 2-minute demo runs end to end on a public URL | ⬜ |
| **7 · Hardening** *(post-hackathon)* | Real keeper, access-control/timelock review, audit, monitoring, collateral-listing integrations | Production-ready | ⬜ |

## Prerequisites before any mainnet *deploy* (Phase 1+)

1. **Upgrade Foundry to ≥ 1.8.0** (`foundryup`) and add `network = "monad"` to
   `contracts/foundry.toml` so the toolchain uses Monad's gas/opcode model.
2. **Confirm the real LST addresses + interfaces on-chain** (read-only) before wiring any
   into a fund. As of research, only **shMON** is high-confidence and liquid; aprMON is
   thin (~$253k) and reportedly rebranding. Start with 1–2 confirmed tokens.
3. **Fund a dedicated deployer wallet with real MON** (no faucet on mainnet).

## Guarded-launch rules (baked into the design from Phase 1)

- Hard **per-user** and **total** deposit caps, enforced in the vault.
- Only confirmed, liquid LSTs in the basket.
- Redeem is never paused, never cap-checked, never oracle-dependent.
- Caps lifted only after a security review.
