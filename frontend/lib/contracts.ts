// Integration layer between the app and the contracts.
//
// BACKEND owns addresses + ABIs via `scripts/export-abi.sh` and
// `backend/deployments/143.json`. FRONTEND only reads them. See ../../INTEGRATION.md.

import { erc20Abi, type Address, type Abi } from "viem";

export type { Address };
import deploymentsJson from "./deployments.143.json";
import iMONVaultAbiJson from "./abi/iMONVault.json";
import rateReaderAbiJson from "./abi/RateReader.json";
import yieldOracleAbiJson from "./abi/YieldOracle.json";
import shMonAdapterAbiJson from "./abi/ShMONRateAdapter.json";

export const MONAD_CHAIN_ID = 143;
export const EXPLORER_URL = "https://monadscan.com";
export const RPC_URL = "https://rpc.monad.xyz";

export type Hex = `0x${string}`;

export const deployments = deploymentsJson;

function asAddress(value: string | null | undefined): Address | null {
  if (!value) return null;
  return value as Address;
}

export const addresses = {
  iMONVault: asAddress(deployments.contracts.iMONVault),
  RateReader: asAddress(deployments.contracts.RateReader),
  YieldOracle: asAddress(
    (deployments.contracts as { YieldOracle?: string | null }).YieldOracle ?? null,
  ),
  UniswapV3SwapAdapter: asAddress(
    (deployments.contracts as { UniswapV3SwapAdapter?: string | null }).UniswapV3SwapAdapter ?? null,
  ),
  ShMONRateAdapter: asAddress(deployments.contracts.ShMONRateAdapter),
  AssetRegistry: asAddress(deployments.contracts.AssetRegistry),
  FeeController: asAddress(deployments.contracts.FeeController),
  Guardian: asAddress(deployments.contracts.Guardian),
} as const;

export const vaultAddress = addresses.iMONVault;
export const rateReaderAddress = addresses.RateReader;
export const yieldOracleAddress = addresses.YieldOracle;
export const shMonAdapterAddress = addresses.ShMONRateAdapter;

/** Basket assets from the published address book (launch = shMON only). */
export const basketAssets = Object.entries(deployments.assets)
  .filter(([, meta]) => Boolean((meta as { inVault?: boolean }).inVault))
  .map(([symbol, meta]) => ({
    symbol,
    address: (meta as { address: string }).address as Address,
    provider: (meta as { provider: string }).provider,
    capBps: (meta as { capBps: number }).capBps,
  }));

export const shMonAddress = asAddress(deployments.assets.shMON.address);

export const iMONVaultABI = iMONVaultAbiJson as Abi;
export const rateReaderABI = rateReaderAbiJson as Abi;
export const yieldOracleABI = yieldOracleAbiJson as Abi;
export const shMonAdapterABI = shMonAdapterAbiJson as Abi;
export const erc20ABI = erc20Abi;

export const isDeployed = Boolean(vaultAddress && rateReaderAddress && shMonAddress);

export function explorerAddress(addr: string): string {
  return `${EXPLORER_URL}/address/${addr}`;
}

export function explorerTx(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}
