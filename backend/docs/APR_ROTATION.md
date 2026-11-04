# Max-APR capital rotation

Users deposit **native MON**; capital auto-swaps into the highest live-APY LST
sleeve, bounded by per-asset caps (≤30% once 4 LSTs are live).

## What runs in production

| Piece | Role |
|---|---|
| `iMONVault.depositMON` | Native MON → wrap WMON → swap into max-APY sleeve → mint iMON |
| `YieldOracle` | **Live APY** (keeper push from DefiLlama) + trailing rate-growth fallback → `effectiveAprBps` |
| `AssetRegistry` | Caps / targets / enabled flags (shMON, gMON, aprMON) |
| `iMONVault.preferredDepositAsset()` | Highest live APR with cap headroom |
| `iMONVault.rebalance(in,out,amt,minOut)` | Keeper rotates low-APR → high-APR |
| `UniswapV3SwapAdapter` | WMON↔LST single-hop / LST↔LST via WMON; fee usually **100** |
| `services/apr-rotator` | Off-chain loop: push live APY → `recordMany` → `rebalance` |

## Live v3 addresses (chain 143)

| Contract | Address |
|---|---|
| **iMONVault (v3 · depositMON)** | `0x821D8143d8Df17B55E40374f7FdcEe5706fC3e2E` |
| RateReader | `0x39963350bdfE244515891C6d877e512D61B2b2e8` |
| YieldOracle | `0xC33677eBB984388a363C6399ED5712F09F0524C4` |
| AssetRegistry | `0xd59580620D2640058aE7A6E2CE124F80A99259EA` |
| UniswapV3SwapAdapter | `0x68e66EFa46B693ac87d6AA48E312B8B334c12C9f` |
| Basket | shMON + gMON + aprMON |

Older vaults remain on-chain but the app points at v3.

## User flow

1. **Deposit MON** (`depositMON(receiver, minShares)` payable) — wrap → WMON →
   swap into `resolveDepositTarget()` (max live APY with cap headroom) → mint iMON.
   No need to buy an LST first.
2. Optional: deposit an LST directly (`deposit`). If `autoRouteDeposits` is on,
   capital may still swap into the preferred sleeve.
3. Keeper rebalances existing NAV low-APR → high-APR within caps.
4. Redeem is always pro-rata raw basket — never oracle / cap / pause gated.

## Limits (read these)

1. **Trailing APR ≠ future yield.** Oracle measures recent rate growth only.
2. **Caps beat APR.** No sleeve may permanently exceed its `capBps` once 4 LSTs are live.
3. **sMON not wired yet** (rate ABI TBD). With only 3 LSTs, hard ≤30% caps cannot cover 100% NAV, so cap enforcement is deferred until a 4th LST is added.
4. **Swaps need Uniswap V3 liquidity** (LST↔WMON fee=100 pools are live for shMON/gMON/aprMON).
5. Live APY is pushed by the keeper from DefiLlama (`pushLiveAprMany`); trailing
   rate-growth is only the fallback when the live feed is older than 24h.
6. Frontend `/api/lst-apy` refreshes the same feeds every 60s for the UI.

## Keeper

```bash
cd backend/services/apr-rotator && npm install && npm run once
```

See `services/apr-rotator/README.md`.
