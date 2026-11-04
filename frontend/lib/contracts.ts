// Integration layer between the app and the contracts.
//
// The BACKEND owns these values and publishes them with `scripts/export-abi.sh`
// (ABIs -> lib/abi/*.json) and by filling `deployments.143.json` with deployed
// addresses. The FRONTEND only reads them. See ../../INTEGRATION.md.
//
// Addresses are `null` until the backend deploys; guard for null before calling.

import deployments from "./deployments.143.json";
import iMONVaultAbi from "./abi/iMONVault.json";

export const MONAD_CHAIN_ID = 143;

type Hex = `0x${string}`;

export const addresses = deployments.contracts as Record<string, Hex | null>;
export const vaultAddress: Hex | null = addresses.iMONVault;
export const iMONVaultABI = iMONVaultAbi;
export { deployments };
