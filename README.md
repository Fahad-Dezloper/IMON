# iMON

**The simple, safer home for Monad staking.**

iMON is one token that holds a capped, auto-balanced basket of Monad liquid staking
tokens (shMON, aprMON, gMON, sMON). Deposit MON or a staking token, get iMON; it
auto-compounds, and a hard per-token cap bounds how much any single provider can ever
cost you. Redemption always returns your pro-rata slice of the basket — no oracle, no
cap check, never paused.

This repo is a monorepo built **phase by phase**. See [`docs/PHASES.md`](docs/PHASES.md)
for the plan and current status, and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for
the locked design decisions.

> **Target network: Monad mainnet (chain id 143).** This code is unaudited. Launch is
> guarded (hard deposit caps, a limited token set) until a security review is complete.
> Do not deposit funds you cannot afford to lose.

## Layout

```
imon/
├── contracts/   Foundry (Solidity) — the vault, registry, rate reader, fees, guardian
├── web/         Next.js + wagmi/viem/RainbowKit — the app
└── docs/        Phase plan + architecture
```

## Quickstart

### Contracts (Foundry)

```bash
cd contracts
forge install            # pulls forge-std (already vendored as a submodule)
forge build
forge test
```

> **Deploying to Monad needs Foundry ≥ 1.8.0** with the Monad network profile
> (`network = "monad"` in `foundry.toml`). Building and testing work on older Foundry
> against a standard EVM; the Monad-specific gas/opcode model only matters at deploy and
> mainnet-fork time. Upgrade with `foundryup` before Phase 1 deploy work.

### Web (Next.js)

```bash
cd web
cp .env.local.example .env.local   # add a WalletConnect project id
npm install
npm run dev                        # http://localhost:3000
```

The app connects a wallet to Monad mainnet (chain 143). You'll need a free WalletConnect
project id from https://cloud.reown.com (formerly WalletConnect Cloud).

## Status

**Phase 0 — Foundations: complete.** Monorepo scaffold, Monad mainnet config, a
wallet-connecting app shell, and a passing contract test suite. No contracts deployed, no
funds involved. Next: Phase 1 — the core vault.
