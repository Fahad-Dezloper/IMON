"use client";

import { useAccount } from "wagmi";
import { MOCK_POSITION } from "./mock";
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

/**
 * The single data seam for the connected user's position.
 *
 * Mocked for now, but wallet-aware: it returns the empty state until a wallet is
 * connected, so the real empty/connected UX is already exercised.
 *
 * TODO(backend integration): read balanceOf(user), previewRedeem(balance), and the
 * user's wallet token balances once the vault is deployed.
 */
export function useUserPosition(): UserPosition {
  const { isConnected } = useAccount();
  return isConnected ? { ...MOCK_POSITION, connected: true } : EMPTY;
}
