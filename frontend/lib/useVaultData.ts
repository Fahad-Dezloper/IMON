"use client";

import { MOCK_ACTIVITY, MOCK_BASKET, MOCK_STATS } from "./mock";
import type { Activity, LstAsset, VaultStats } from "./types";

export interface VaultData {
  stats: VaultStats;
  basket: LstAsset[];
  activity: Activity[];
}

/**
 * The single data seam for vault-level reads.
 *
 * TODO(backend integration): replace the mock returns with wagmi `useReadContracts`
 * against iMONVault (nav, navPerShare, getAssets + per-asset weight/cap/rate) and
 * AssetRegistry once `deployments.143.json` has addresses. Components never change.
 */
export function useVaultData(): VaultData {
  return { stats: MOCK_STATS, basket: MOCK_BASKET, activity: MOCK_ACTIVITY };
}
