# iMON frontend

Next.js app for the iMON vault on **Monad mainnet (chain id 143)**.

## Live deployment (guarded launch)

| Contract | Address |
|---|---|
| iMONVault | `0xfC23ebd82FA90392c1251b835F901C9ac1373b49` |
| RateReader | `0x5A6c7D433558f92797E4448eA50bc7Ba3A3a2ee7` |
| ShMONRateAdapter | `0xf586cB3f1dE58a43A3D6E1626D7f232d59DdfA1e` |
| Basket asset | shMON `0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c` |

Source of truth: `lib/deployments.143.json` (copied from `backend/deployments/143.json` by
`../scripts/export-abi.sh`). ABIs live in `lib/abi/`.

> Unaudited. No deposit caps / Guardian yet. Do not deposit funds you cannot afford to lose.

## Run locally

```bash
cd frontend
cp .env.local.example .env.local   # optional RPC override
npm install
npm run dev                        # http://localhost:3000
```

Wallet: **injected only** (MetaMask / Rabby / browser extension). Switch to Monad mainnet
when prompted. No WalletConnect / RainbowKit in this build (keeps the bundler clean).

## What the UI does

1. **Connect wallet** → injected connector via wagmi.
2. **Reads (public):** vault `nav`, `navPerShare`, `totalSupply`, `vaultBalance(shMON)`,
   user `balanceOf(iMON)`, shMON `balanceOf` + `allowance`, RateReader `rateOf(shMON)`.
3. **Deposit:** `shMON.approve(vault, amount)` → wait receipt → `vault.deposit(shMON, amount, you)`.
4. **Redeem:** `vault.redeem(shares, you)` — always open, oracle-free, pro-rata basket.

Integration contract (function list the app relies on): [`../INTEGRATION.md`](../INTEGRATION.md).

## Layout

```
frontend/
├── app/                 # Next.js App Router
├── components/
│   ├── WalletButton.tsx
│   └── VaultDashboard.tsx   # reads + deposit/redeem
└── lib/
    ├── contracts.ts         # addresses + ABIs
    ├── deployments.143.json
    ├── abi/*.json
    ├── chains.ts            # Monad 143
    ├── format.ts
    └── wagmi.ts
```
