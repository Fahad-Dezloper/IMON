# Integration contract — frontend ↔ backend

This is the only surface where the two halves meet. Keep it stable; change it with a note
to both sides.

## Live status (Monad mainnet, chain 143)

**Phase 1+2 contracts are deployed and wired into the frontend.**

| Contract | Address | Frontend usage |
|---|---|---|
| `iMONVault` | `0xfC23ebd82FA90392c1251b835F901C9ac1373b49` | Deposit / redeem / NAV reads |
| `RateReader` | `0x5A6c7D433558f92797E4448eA50bc7Ba3A3a2ee7` | `rateOf(shMON)` for dashboard |
| `ShMONRateAdapter` | `0xf586cB3f1dE58a43A3D6E1626D7f232d59DdfA1e` | Behind RateReader (not called directly by UI) |
| shMON (FastLane) | `0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c` | ERC-20 approve + deposit asset |
| AssetRegistry / FeeController / Guardian | `null` | Phase 3 — not deployed |

- Address book: `backend/deployments/143.json` → copied to `frontend/lib/deployments.143.json`
- ABIs: `frontend/lib/abi/{iMONVault,RateReader,ShMONRateAdapter,ERC4626RateAdapter}.json`
- App entry: `frontend/lib/contracts.ts` → `frontend/components/VaultDashboard.tsx`
- Explorer: https://monadscan.com
- RPC: https://rpc.monad.xyz

Unaudited guarded launch: **shMON only**, no on-chain deposit caps / pause guardian yet.

## Branch & sync workflow

- Single long-lived branch: **`main`**. Both people push to `main` (small, frequent commits).
- Work stays in your own folder: frontend → `frontend/`, backend → `backend/`.
- Pull often:

  ```bash
  ./scripts/sync.sh
  ```

- Never commit secrets (`.env`, `.env.local`) or `lib/` / `out/` / `node_modules/`.

## How the backend publishes to the frontend

The frontend must **not** need Foundry. Backend publishes:

1. **Addresses** — `backend/deployments/143.json` (committed).
2. **ABIs** — via:

   ```bash
   ./scripts/export-abi.sh
   ```

   Writes ABIs into `frontend/lib/abi/` and copies the address book.

Frontend imports through `frontend/lib/contracts.ts` (`vaultAddress`, `iMONVaultABI`, etc.).

## Wallet + chain (frontend)

- wagmi v2 + injected connector (`frontend/lib/wagmi.ts`)
- Chain config: `frontend/lib/chains.ts` (id **143**)
- Connect / disconnect: `frontend/components/WalletButton.tsx`
- Wrong-network → “Switch to Monad” via `useSwitchChain`

## The vault interface the frontend relies on (`iMONVault`)

Reads (view):
- `nav() → uint256` — basket value in MON (1e18)
- `navPerShare() → uint256` — MON value of 1 iMON (1e18)
- `getAssets() → address[]` — the basket's tokens
- `vaultBalance(address asset) → uint256` — vault's holding of an asset
- `previewDeposit(address asset, uint256 amountIn) → uint256 shares`
- `previewRedeem(uint256 shares) → (address[] assets, uint256[] amounts)`
- `balanceOf(address) → uint256` — a holder's iMON (standard ERC-20)
- `totalSupply()`, `name()`, `symbol()`, `decimals()`

Writes:
- `deposit(address asset, uint256 amountIn, address receiver) → uint256 shares`
  (requires ERC-20 `approve(vault, amountIn)` on the asset first)
- `redeem(uint256 shares, address receiver) → (address[] assets, uint256[] amounts)`

Also used:
- RateReader `rateOf(address asset)`
- ERC-20 `balanceOf` / `allowance` / `approve` on shMON

Events:
- `Deposited(caller, receiver, asset, amountIn, sharesOut)`
- `Redeemed(caller, receiver, sharesIn)`
- `AssetAdded(asset)`

> Later (additive): caps + `depositsPaused()` (Phase 3), swap (Phase 4), fee views.

## End-to-end user flows (implemented)

### Deposit shMON → iMON

1. Connect injected wallet; switch to chain 143 if needed.
2. UI reads `previewDeposit(shMON, amount)`.
3. If `allowance < amount`, send `shMON.approve(vault, amount)` and wait for receipt.
4. Send `vault.deposit(shMON, amount, user)` and wait for receipt.
5. Refetch balances / NAV.

### Redeem iMON → basket

1. UI reads `previewRedeem(shares)`.
2. Send `vault.redeem(shares, user)` (no approve, no oracle).
3. Refetch. User receives pro-rata shMON (and any future basket assets).

## Chain

Monad mainnet — chain id **143**, RPC `https://rpc.monad.xyz`, explorer
`https://monadscan.com` (also MonadVision). Frontend chain config: `frontend/lib/chains.ts`.
