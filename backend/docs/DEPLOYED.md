# Mainnet deployment — Phase 1+2 (guarded)

Deployed **2026-11-04** to Monad mainnet (chain id **143**) from deployer
`0xA760ABcdB4249C9Bb598a20e67DE8cC79b606bE8` via `script/Deploy.s.sol`.

## Addresses

| Contract | Address |
|---|---|
| RateReader | `0x5A6c7D433558f92797E4448eA50bc7Ba3A3a2ee7` |
| ShMONRateAdapter | `0xf586cB3f1dE58a43A3D6E1626D7f232d59DdfA1e` |
| iMONVault | `0xfC23ebd82FA90392c1251b835F901C9ac1373b49` |
| shMON (basket) | `0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c` |

Canonical copy: [`../deployments/143.json`](../deployments/143.json).

## Wiring

1. Deploy RateReader (owner = deployer).
2. Deploy ShMONRateAdapter(shMON).
3. `setAdapter(shMON, adapter, { maxAge: 1 days, maxDeviationBps: 1000, maxDropBps: 500 })`.
4. `poke(shMON)` to seed the checkpoint.
5. Deploy iMONVault("iMON Index", "iMON", reader, deployer).
6. `vault.addAsset(shMON)`.

Frontend consumes these via `../../scripts/export-abi.sh` → `frontend/lib/*`.
See [`../../INTEGRATION.md`](../../INTEGRATION.md).

## Not yet deployed (Phase 3+)

AssetRegistry, FeeController, Guardian, deposit caps, keeper. Owner EOA currently
controls `addAsset` / `setRateReader` / RateReader admin.

## Verify / explore

- Vault: https://monadscan.com/address/0xfC23ebd82FA90392c1251b835F901C9ac1373b49
- Broadcast log: `broadcast/Deploy.s.sol/143/run-latest.json`
