import { defineChain } from "viem";

// viem ships a built-in `monadTestnet`, but the mainnet export is not guaranteed yet,
// so we define Monad mainnet (chain id 143) explicitly. Swap to viem's export if/when added.
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
