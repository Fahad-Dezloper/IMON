# Integration contract — frontend ↔ backend

This is the only surface where the two halves meet. Keep it stable; change it with a note
to both sides.

## Branch & sync workflow

- Single long-lived branch: **`main`**. Both people push to `main` (small, frequent commits).
- Work stays in your own folder: frontend → `frontend/`, backend → `backend/`. Because the
  two folders don't overlap, pushes to `main` rarely conflict.
- **Pull `main` frequently** (every ~15 min, or before each work session) so each side has
  the latest of the other. Use the helper:

  ```bash
  ./scripts/sync.sh      # git pull --rebase --autostash, then builds + tests the backend
  ```

- Never commit secrets (`.env`, `.env.local`) or `lib/` / `out/` / `node_modules/` (all
  gitignored).

## How the backend publishes to the frontend

The frontend must **not** need the Foundry toolchain. The backend publishes two things:

1. **Addresses** — `backend/deployments/143.json` (committed). One entry per deployed
   contract. Until deployed, values are `null`.
2. **ABIs** — copied into `frontend/lib/abi/*.json` (committed) by:

   ```bash
   ./scripts/export-abi.sh        # runs `forge build`, copies iMONVault (+others) ABIs to frontend/lib/abi
   ```

   The frontend imports addresses + ABIs through `frontend/lib/contracts.ts`.

So the contract between the two sides is: **`deployments/143.json` + `frontend/lib/abi/*.json`**.
When the backend changes a function signature or deploys a new address, it re-runs
`export-abi.sh`, updates `143.json`, and pushes. The frontend picks it up on the next pull.

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

Events (for the dashboard / activity feed):
- `Deposited(caller, receiver, asset, amountIn, sharesOut)`
- `Redeemed(caller, receiver, sharesIn)`
- `AssetAdded(asset)`

> Coming in later phases and additive to this list: per-asset caps + `depositsPaused()`
> (Phase 3), rebalance + LST↔LST swap (Phase 4), fee views (FeeController). The backend
> will update this file when they land.

## Chain

Monad mainnet — chain id **143**, RPC `https://rpc.monad.xyz`, explorer
`https://monadvision.com`. The frontend's chain config is `frontend/lib/chains.ts`.
