"use client";

import { MOCK_ACTIVITY, MOCK_BASKET, MOCK_STATS } from "./mock";
import type { Activity, LstAsset, VaultStats } from "./types";
import { useLiveVault } from "./useLiveVault";

export interface VaultData {
  stats: VaultStats;
  basket: LstAsset[];
  activity: Activity[];
}

/**
 * Vault-level data. Overlays live NAV / navPerShare / totalSupply from the deployed
 * vault when available; everything else (basket metadata, logos, activity) stays mock
 * until those are wired. Falls back to mock on any missing value.
 */
export function useVaultData(): VaultData {
  const live = useLiveVault();
  const navMon = live.navMon ?? MOCK_STATS.navMon;

  const stats: VaultStats = {
    ...MOCK_STATS,
    navMon,
    navPerShare: live.navPerShare ?? MOCK_STATS.navPerShare,
    totalSupply: live.totalSupply ?? MOCK_STATS.totalSupply,
    tvlUsd: navMon * MOCK_STATS.monUsd,
  };

  return { stats, basket: MOCK_BASKET, activity: MOCK_ACTIVITY };
}
