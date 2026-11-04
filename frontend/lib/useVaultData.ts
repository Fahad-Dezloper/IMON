"use client";

import { formatUnits } from "viem";
import { useReadContracts } from "wagmi";
import {
  MONAD_CHAIN_ID,
  basketAssets,
  iMONVaultABI,
  isDeployed,
  vaultAddress,
  yieldOracleABI,
  yieldOracleAddress,
} from "./contracts";
import { TOKEN_META } from "./tokens";
import type { Activity, LstAsset, VaultStats } from "./types";

export interface VaultData {
  stats: VaultStats;
  basket: LstAsset[];
  activity: Activity[];
}

const toNum = (v: unknown) => (typeof v === "bigint" ? Number(formatUnits(v, 18)) : 0);
const toInt = (v: unknown) => (typeof v === "bigint" ? Number(v) : typeof v === "number" ? v : 0);

export function useVaultData(): VaultData {
  const vault = vaultAddress ?? undefined;
  const oracle = yieldOracleAddress ?? undefined;
  const enabled = Boolean(isDeployed && vault && oracle);

  const { data } = useReadContracts({
    allowFailure: true,
    query: { enabled, refetchInterval: 8_000 },
    contracts: enabled
      ? [
          { address: vault!, abi: iMONVaultABI, functionName: "nav", chainId: MONAD_CHAIN_ID },
          { address: vault!, abi: iMONVaultABI, functionName: "navPerShare", chainId: MONAD_CHAIN_ID },
          { address: vault!, abi: iMONVaultABI, functionName: "totalSupply", chainId: MONAD_CHAIN_ID },
          { address: vault!, abi: iMONVaultABI, functionName: "depositsPaused", chainId: MONAD_CHAIN_ID },
          ...basketAssets.flatMap((a) => [
            { address: vault!, abi: iMONVaultABI, functionName: "vaultBalance", args: [a.address], chainId: MONAD_CHAIN_ID },
            { address: vault!, abi: iMONVaultABI, functionName: "weightBps", args: [a.address], chainId: MONAD_CHAIN_ID },
            { address: oracle!, abi: yieldOracleABI, functionName: "effectiveAprBps", args: [a.address], chainId: MONAD_CHAIN_ID },
          ]),
        ]
      : [],
  });

  const navMon = toNum(data?.[0]?.result);
  const navPerShare = data?.[1]?.result !== undefined ? toNum(data[1].result) : 1;
  const totalSupply = toNum(data?.[2]?.result);
  const depositsPaused = Boolean(data?.[3]?.result);

  const basket: LstAsset[] = basketAssets.map((a, i) => {
    const base = 4 + i * 3;
    const weightBps = toInt(data?.[base + 1]?.result);
    const apy = toInt(data?.[base + 2]?.result) / 10_000; // bps → decimal
    const meta = TOKEN_META[a.symbol];
    return {
      symbol: a.symbol,
      name: meta?.name ?? a.symbol,
      provider: a.provider,
      about: meta?.about ?? "",
      logo: meta?.logo,
      address: a.address,
      apy,
      weightBps,
      targetBps: a.capBps,
      capBps: a.capBps,
      health: "healthy",
      exit: meta?.exit ?? "queued",
    };
  });

  const blendedApyGross = basket.reduce((acc, a) => acc + (a.weightBps / 10_000) * a.apy, 0);
  const capBpsMax = basketAssets.reduce((m, a) => Math.max(m, a.capBps), 0) || 3000;

  const stats: VaultStats = {
    navMon,
    navPerShare,
    tvlUsd: 0,
    blendedApyGross,
    netApy: blendedApyGross * 0.95,
    yieldFeeBps: 500,
    exitFeeBps: 10,
    totalSupply,
    holders: 0,
    monUsd: 0,
    depositsPaused,
    perUserCapMon: 0,
    totalCapMon: 0,
    capBpsMax,
  };

  return { stats, basket, activity: [] };
}
