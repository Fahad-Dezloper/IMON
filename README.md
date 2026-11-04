# iMON

**The simple, safer home for Monad staking.**

iMON is one token that holds a capped, auto-balanced basket of Monad liquid staking
tokens (shMON, aprMON, gMON, sMON). Deposit a staking token, get iMON; it auto-compounds,
and a hard per-token cap bounds how much any single provider can ever cost you.
Redemption always returns your pro-rata slice of the basket — no oracle, no cap check,
never paused.

> **Network: Monad mainnet (chain id 143).** Unaudited guarded launch. Do not deposit
> funds you cannot afford to lose.

## Live contracts

| Contract | Address |
|---|---|
| **iMONVault** | [`0xfC23…3b49`](https://monadscan.com/address/0xfC23ebd82FA90392c1251b835F901C9ac1373b49) |
| **RateReader** | [`0x5A6c…2ee7`](https://monadscan.com/address/0x5A6c7D433558f92797E4448eA50bc7Ba3A3a2ee7) |
| **ShMONRateAdapter** | [`0xf586…fA1e`](https://monadscan.com/address/0xf586cB3f1dE58a43A3D6E1626D7f232d59DdfA1e) |
| Basket | shMON only (`0x1B68…E19c`) |

Full wiring notes: [`INTEGRATION.md`](INTEGRATION.md) · deploy record: [`backend/docs/DEPLOYED.md`](backend/docs/DEPLOYED.md).

## Monorepo layout

```
imon/
├── frontend/   Next.js + wagmi/viem — wallet + vault UI
├── backend/    Foundry contracts + deploy scripts + specs
├── scripts/    sync.sh · export-abi.sh
├── docs/       PHASES.md
└── INTEGRATION.md
```

## Setup

```bash
# backend
cd backend && forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.2.0 --no-git
forge build && forge test

# frontend
cd frontend && cp -n .env.local.example .env.local && npm install && npm run dev
# → http://localhost:3000  (injected wallet: MetaMask / Rabby)
```

## Status

- **Phase 0–2:** done and **deployed** on Monad mainnet (vault + RateReader + shMON adapter).
- Frontend: connect wallet, live NAV/rate reads, approve → deposit, redeem.
- **Next — Phase 3:** AssetRegistry, weight + deposit caps, Guardian, keeper.

See [`docs/PHASES.md`](docs/PHASES.md) and [`backend/docs/BUILD.md`](backend/docs/BUILD.md).
