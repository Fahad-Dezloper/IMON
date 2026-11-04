"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { MOCK_POSITION, MOCK_STATS } from "./mock";
import type { UserPosition } from "./types";
import { MONAD_CHAIN_ID, iMONVaultABI, vaultAddress } from "./contracts";
import { useLiveVault } from "./useLiveVault";

const EMPTY: UserPosition = {
  connected: false,
  iMonBalance: 0,
  valueMon: 0,
  valueUsd: 0,
  earnedMon: 0,
  costBasisMon: 0,
  wallet: [],
};

/**
 * The connected user's position. Reads the real iMON balance from the vault and values
 * it at the live navPerShare when available; otherwise falls back to the mock position
 * so the demo renders. Returns the empty state until a wallet is connected.
 */
export function useUserPosition(): UserPosition {
  const { address, isConnected } = useAccount();
  const live = useLiveVault();

  const { data: bal } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: iMONVaultABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: MONAD_CHAIN_ID,
    query: { enabled: Boolean(vaultAddress && address), refetchInterval: 12_000 },
  });

  if (!isConnected) return EMPTY;

  const iMon = typeof bal === "bigint" ? Number(formatUnits(bal, 18)) : undefined;

  if (iMon !== undefined && live.navPerShare) {
    const valueMon = iMon * live.navPerShare;
    return {
      ...MOCK_POSITION, // keep mock wallet balances for the (still-mock) deposit modal
      connected: true,
      iMonBalance: iMon,
      valueMon,
      valueUsd: valueMon * MOCK_STATS.monUsd,
      costBasisMon: valueMon, // no on-chain cost basis — don't fabricate earnings
      earnedMon: 0,
    };
  }

  return { ...MOCK_POSITION, connected: true };
}
