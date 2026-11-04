import { defineChain } from "viem";

// Monad mainnet (chain id 143). viem ships `monadTestnet`; mainnet is defined here.
export const monad = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.monad.xyz"],
      webSocket: ["wss://rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: { name: "MonadVision", url: "https://monadvision.com" },
  },
  testnet: false,
});
