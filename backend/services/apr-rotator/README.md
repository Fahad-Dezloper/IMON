# APR rotator (keeper)

Production keeper that keeps iMON capital tilted toward the **highest trailing APR**
LST sleeves **without breaking per-asset caps**.

## Flow

1. `YieldOracle.recordMany(assets)` — refresh trailing APRs from RateReader growth.
2. Read `vault.preferredDepositAsset()` (best) and `oracle.worstAsset(...)` (source).
3. If `bestApr − worstApr ≥ MIN_APR_DELTA_BPS`, call
   `vault.rebalance(worst, best, amountIn, minOut)` (keeper / owner).

Vault deposits also auto-route when `autoRouteDeposits=true`: single-asset
`deposit()` swaps into `preferredDepositAsset` via the Uniswap adapter
(LST→WMON→LST at the deepest live fee tier, usually 100).

## Honest limits

- APR is **trailing** rate growth — not a forward guarantee.
- Caps always win: destination must have weight headroom under `capBps`.
- Redeem stays oracle-free and never paused.
- Thin Uniswap liquidity → rebalance reverts on slippage; lower `MAX_ROTATE_BPS`
  or raise `SLIPPAGE_BPS`.

## Setup

```bash
cd backend/services/apr-rotator
npm install

export MONAD_MAINNET_RPC=https://rpc.monad.xyz
export DEPLOYER_PRIVATE_KEY=0x...   # must be vault keeper/owner
# addresses default from deployments/143.json
export VAULT=0x516191871A97e8171ffCb53565B7E4D00295EfbF
export YIELD_ORACLE=0xE0CBFaE1fFe2607DD632a630571ea2c5838208DF
```

## Run

```bash
# one shot
npm run once

# dry-run (record + plan, no rebalance)
DRY_RUN=1 npm run once

# loop every 5 minutes
npm start
```

## Knobs

| Env | Default | Meaning |
|---|---|---|
| `INTERVAL_MS` | `300000` | Loop cadence |
| `MIN_APR_DELTA_BPS` | `50` | Min APR gap (0.50%) before rotate |
| `MAX_ROTATE_BPS` | `500` | Max % of source sleeve per tick |
| `MIN_WEIGHT_BPS` | `100` | Only sell sleeves ≥ this weight |
| `SLIPPAGE_BPS` | `50` | minOut haircut vs fair MON value |
| `DRY_RUN` | — | Plan only |

## Live stack (chain 143)

See `../../deployments/143.json` and `../../docs/APR_ROTATION.md`.
