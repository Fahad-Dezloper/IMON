# iMON

**The simple, safer home for Monad staking.**

iMON is one token that holds a capped, auto-balanced basket of Monad liquid staking
tokens (shMON, aprMON, gMON, sMON). Deposit MON or a staking token, get iMON; it
auto-compounds, and a hard per-token cap bounds how much any single provider can ever
cost you. Redemption always returns your pro-rata slice of the basket — no oracle, no
cap check, never paused.

> **Target network: Monad mainnet (chain id 143).** Unaudited. Launch is guarded (hard
> deposit caps, a limited token set) until a security review is complete.

## Monorepo layout & ownership

```
imon/
├── frontend/   Next.js + wagmi/viem/RainbowKit — the app        (owner: frontend)
├── backend/    Foundry contracts + off-chain services + specs    (owner: backend)
│   ├── src/ test/ script/        the Solidity + tests
│   ├── services/                 off-chain keeper / health monitor (Phase 3)
│   ├── deployments/              published addresses per chain (143.json)
│   ├── docs/ ARCHITECTURE.md BUILD.md   the full backend build spec
│   └── README.md                 start here if you're building the backend
├── scripts/    sync.sh (pull + test) · export-abi.sh (publish ABIs to frontend)
├── docs/       PHASES.md — shared roadmap
├── INTEGRATION.md   the contract between frontend and backend (addresses, ABIs, workflow)
└── README.md
```

**Division of work:** the **frontend** person builds `frontend/`; the **backend** person
builds `backend/`. Both pull `main` frequently (see [`INTEGRATION.md`](INTEGRATION.md)).
The two sides meet only at the integration contract: the ABIs + deployed addresses the
backend publishes, which the frontend consumes.

## Setup

```bash
# backend
cd backend && forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts && forge build && forge test

# frontend
cd frontend && cp -n .env.local.example .env.local && npm install && npm run dev   # localhost:3000
```

`lib/` (forge deps) is gitignored — run `forge install` after cloning. The app needs a
free WalletConnect project id in `frontend/.env.local` (from https://cloud.reown.com).

## Status

- **Phase 0 — Foundations:** done. Monorepo, Monad mainnet config, wallet-connecting shell.
- **Phase 1 — Core vault:** done. `iMONVault` (multi-asset NAV, pro-rata redeem, three-layer
  inflation/donation defense) — 14 passing Foundry tests incl. a fuzz round-trip.

Next: **Phase 2** — production `RateReader` + real LST adapters + a mainnet-fork test.
See [`docs/PHASES.md`](docs/PHASES.md).
