// Static token metadata (names, descriptions, logos, exit type). These are real facts
// about each LST, not mock numbers — the live numbers (weight, APY, balances) come from
// chain. Keyed by symbol; the address/provider/cap come from deployments via basketAssets.

export interface TokenMeta {
  name: string;
  about: string;
  logo: string;
  exit: "instant" | "queued";
}

export const TOKEN_META: Record<string, TokenMeta> = {
  shMON: {
    name: "FastLane Staked MON",
    about:
      "MEV-boosted liquid staking. Your MON is staked and the validator's MEV is auctioned and routed back to stakers, lifting the yield above plain staking.",
    logo: "https://coin-images.coingecko.com/coins/images/70837/large/SHMONAD_ICON_%281%29.png",
    exit: "instant",
  },
  gMON: {
    name: "Magma Staked MON",
    about:
      "Magma's liquid staking token. Stake MON, hold a liquid receipt that accrues staking rewards while you keep using it across Monad.",
    logo: "https://coin-images.coingecko.com/coins/images/39746/large/gMonad_200px.png",
    exit: "queued",
  },
  sMON: {
    name: "Kintsu Staked MON",
    about:
      "Kintsu's capital-efficient liquid staking. Stake is pooled across validators and rewards compound into the token's value over time.",
    logo: "https://coin-images.coingecko.com/coins/images/70835/large/sMON_%281%29.png",
    exit: "queued",
  },
  aprMON: {
    name: "aPriori Staked MON",
    about:
      "aPriori's reward-bearing LST. Captures staking plus priority-fee and MEV flow; your balance stays constant while the value per token rises.",
    logo: "https://coin-images.coingecko.com/coins/images/102171785/large/aprmon.png",
    exit: "queued",
  },
};
