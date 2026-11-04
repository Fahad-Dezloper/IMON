import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { monad } from "./chains";

export const wagmiConfig = getDefaultConfig({
  appName: "iMON",
  // Set NEXT_PUBLIC_WC_PROJECT_ID in .env.local (free from https://cloud.reown.com).
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "YOUR_WALLETCONNECT_PROJECT_ID",
  chains: [monad],
  transports: {
    [monad.id]: http(process.env.NEXT_PUBLIC_MONAD_RPC ?? "https://rpc.monad.xyz"),
  },
  ssr: true,
});
