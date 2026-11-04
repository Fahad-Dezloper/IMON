// SINGLE SOURCE OF MOCK DATA for the whole app, while the backend + contracts are built.
// Every component reads from here (via the hooks in useVaultData.ts / useUserPosition.ts).
// Numbers are illustrative but internally consistent; swap this out for live chain reads
// once the vault is deployed and addresses land in deployments.143.json.

import type { Activity, LstAsset, UserPosition, VaultStats } from "./types";

const MON_USD = 0.0312;
const NAV_PER_SHARE = 1.0474;

export const MOCK_BASKET: LstAsset[] = [
  {
    symbol: "shMON",
    name: "FastLane Staked MON",
    provider: "FastLane",
    about:
      "MEV-boosted liquid staking. Your MON is staked and the validator's MEV is auctioned and routed back to stakers, lifting the yield above plain staking.",
    logo: "https://coin-images.coingecko.com/coins/images/70837/large/SHMONAD_ICON_%281%29.png",
    address: null,
    apy: 0.125,
    weightBps: 3000,
    targetBps: 3000,
    capBps: 3000,
    health: "healthy",
    exit: "instant",
  },
  {
    symbol: "gMON",
    name: "Magma Staked MON",
    provider: "Magma",
    about:
      "Magma's liquid staking token. Stake MON, hold a liquid receipt that accrues staking rewards while you keep using it across Monad.",
    logo: "https://coin-images.coingecko.com/coins/images/39746/large/gMonad_200px.png",
    address: null,
    apy: 0.09,
    weightBps: 2800,
    targetBps: 2800,
    capBps: 3000,
    health: "healthy",
    exit: "queued",
  },
  {
    symbol: "sMON",
    name: "Kintsu Staked MON",
    provider: "Kintsu",
    about:
      "Kintsu's capital-efficient liquid staking. Stake is pooled across validators and rewards compound into the token's value over time.",
    logo: "https://coin-images.coingecko.com/coins/images/70835/large/sMON_%281%29.png",
    address: null,
    apy: 0.11,
    weightBps: 2700,
    targetBps: 2700,
    capBps: 3000,
    health: "healthy",
    exit: "queued",
  },
  {
    symbol: "aprMON",
    name: "aPriori Staked MON",
    provider: "aPriori",
    about:
      "aPriori's reward-bearing LST. Captures staking plus priority-fee and MEV flow; your balance stays constant while the value per token rises.",
    logo: "https://coin-images.coingecko.com/coins/images/102171785/large/aprmon.png",
    address: null,
    apy: 0.08,
    weightBps: 1500,
    targetBps: 1500,
    capBps: 1500,
    health: "watch",
    exit: "queued",
  },
];

const blendedApyGross = MOCK_BASKET.reduce(
  (acc, a) => acc + (a.weightBps / 10_000) * a.apy,
  0,
);

export const MOCK_STATS: VaultStats = {
  navMon: 6_120_000,
  navPerShare: NAV_PER_SHARE,
  tvlUsd: 6_120_000 * MON_USD,
  blendedApyGross,
  netApy: blendedApyGross * (1 - 0.05),
  yieldFeeBps: 500,
  exitFeeBps: 10,
  totalSupply: Math.round(6_120_000 / NAV_PER_SHARE),
  holders: 512,
  monUsd: MON_USD,
  depositsPaused: false,
  perUserCapMon: 50_000,
  totalCapMon: 10_000_000,
  capBpsMax: 3000,
};

export const MOCK_POSITION: UserPosition = {
  connected: true,
  iMonBalance: 24_800,
  valueMon: 24_800 * NAV_PER_SHARE,
  valueUsd: 24_800 * NAV_PER_SHARE * MON_USD,
  costBasisMon: 24_500,
  earnedMon: 24_800 * NAV_PER_SHARE - 24_500,
  wallet: [
    { symbol: "MON", balance: 540.21 },
    { symbol: "shMON", balance: 8.4 },
    { symbol: "gMON", balance: 120.0 },
    { symbol: "sMON", balance: 0 },
    { symbol: "aprMON", balance: 26.5 },
  ],
};

export const MOCK_ACTIVITY: Activity[] = [
  { id: "1", kind: "deposit", who: "0x9a2f…c1d4", asset: "shMON", amountMon: 1250.0, ago: "2m" },
  { id: "2", kind: "redeem", who: "0x44be…90a1", asset: "basket", amountMon: 430.5, ago: "11m" },
  { id: "3", kind: "deposit", who: "0x7c01…52ef", asset: "MON", amountMon: 8800.0, ago: "26m" },
  { id: "4", kind: "deposit", who: "0x1df8…aa72", asset: "gMON", amountMon: 310.0, ago: "41m" },
  { id: "5", kind: "redeem", who: "0xbb20…7f33", asset: "basket", amountMon: 2100.0, ago: "1h" },
];
