"use client";

import { formatUnits } from "viem";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { MONAD_CHAIN_ID, iMONVaultABI, isDeployed, vaultAddress } from "./contracts";
import type { UserPosition } from "./types";

const EMPTY: UserPosition = {
  connected: false,
  iMonBalance: 0,
  valueMon: 0,
  valueUsd: 0,
  earnedMon: 0,
  costBasisMon: 0,
  wallet: [],
};

export function useUserPosition(): UserPosition {
  const { address, isConnected } = useAccount();
  const vault = vaultAddress ?? undefined;
  const enabled = Boolean(isDeployed && vault && address);

  const { data } = useReadContracts({
    allowFailure: true,
    query: { enabled, refetchInterval: 8_000 },
    contracts: enabled
      ? [
          { address: vault!, abi: iMONVaultABI, functionName: "balanceOf", args: [address!], chainId: MONAD_CHAIN_ID },
          { address: vault!, abi: iMONVaultABI, functionName: "navPerShare", chainId: MONAD_CHAIN_ID },
        ]
      : [],
  });

  const { data: mon } = useBalance({
    address,
    chainId: MONAD_CHAIN_ID,
    query: { enabled: Boolean(address), refetchInterval: 8_000 },
  });

  if (!isConnected) return EMPTY;

  const iMonBalance = data?.[0]?.result !== undefined ? Number(formatUnits(data[0].result as bigint, 18)) : 0;
  const navPerShare = data?.[1]?.result !== undefined ? Number(formatUnits(data[1].result as bigint, 18)) : 1;
  const monBalance = mon?.value !== undefined ? Number(formatUnits(mon.value, 18)) : 0;

  return {
    connected: true,
    iMonBalance,
    valueMon: iMonBalance * navPerShare,
    valueUsd: 0,
    earnedMon: 0,
    costBasisMon: 0,
    wallet: [{ symbol: "MON", balance: monBalance }],
  };
}
