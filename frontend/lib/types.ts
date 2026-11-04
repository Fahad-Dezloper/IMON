// Domain types shared across the app. The backend's on-chain data maps onto these,
// so when we wire wagmi reads the components don't change — only the hooks in
// useVaultData.ts / useUserPosition.ts.

export type Hex = `0x${string}`;
export type HealthStatus = "healthy" | "watch" | "flagged";
export type View = "dashboard" | "basket" | "activity" | "safety";

export interface LstAsset {
  symbol: string; // "shMON"
  name: string; // "FastLane Staked MON"
  provider: string; // "FastLane"
  about: string; // what it does under the hood
  logo?: string; // token logo URL (falls back to the gradient coin if absent)
  address: Hex | null;
  apy: number; // decimal, e.g. 0.125 = 12.5%
  weightBps: number; // current weight, out of 10_000
  targetBps: number; // policy target weight
  capBps: number; // hard per-token cap
  health: HealthStatus;
  exit: "instant" | "queued";
}

export interface VaultStats {
  navMon: number; // total basket value, in MON
  navPerShare: number; // MON per 1 iMON
  tvlUsd: number;
  blendedApyGross: number; // decimal, weighted avg of basket APYs
  netApy: number; // decimal, after the yield fee
  yieldFeeBps: number; // e.g. 500 = 5% of yield
  exitFeeBps: number; // e.g. 10 = 0.10% on redeem
  totalSupply: number; // iMON in existence
  holders: number;
  monUsd: number; // MON price in USD
  depositsPaused: boolean;
  perUserCapMon: number; // guarded-launch cap
  totalCapMon: number;
  capBpsMax: number; // the headline hard cap, e.g. 3000 = 30%
}

export interface WalletToken {
  symbol: string;
  balance: number; // token units the user holds and can deposit
}

export interface UserPosition {
  connected: boolean;
  iMonBalance: number;
  valueMon: number;
  valueUsd: number;
  earnedMon: number; // since first deposit
  costBasisMon: number;
  wallet: WalletToken[];
}

export interface Activity {
  id: string;
  kind: "deposit" | "redeem";
  who: string; // short address
  asset: string;
  amountMon: number;
  ago: string;
}
