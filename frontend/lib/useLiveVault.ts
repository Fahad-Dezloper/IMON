"use client";

import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { MONAD_CHAIN_ID, iMONVaultABI, isDeployed, vaultAddress } from "./contracts";

/**
 * Reads the live vault's NAV / navPerShare / totalSupply from Monad mainnet when the
 * vault is deployed. Returns `undefined` for each value while loading, when not deployed,
 * or on failure — callers fall back to mock so the UI always renders.
 */
export function useLiveVault() {
  const enabled = isDeployed && Boolean(vaultAddress);
  const base = { address: vaultAddress as `0x${string}`, abi: iMONVaultABI, chainId: MONAD_CHAIN_ID } as const;

  const { data } = useReadContracts({
    allowFailure: true,
    query: { enabled, refetchInterval: 12_000 },
    contracts: enabled
      ? [
          { ...base, functionName: "nav" },
          { ...base, functionName: "navPerShare" },
          { ...base, functionName: "totalSupply" },
        ]
      : [],
  });

  const toNum = (v: unknown) => (typeof v === "bigint" ? Number(formatUnits(v, 18)) : undefined);

  return {
    navMon: toNum(data?.[0]?.result),
    navPerShare: toNum(data?.[1]?.result),
    totalSupply: toNum(data?.[2]?.result),
  };
}
