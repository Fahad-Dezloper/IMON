import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { monad } from "./chains";

// No RainbowKit: it statically imports Coinbase's Base Account connector, which drags in
// @coinbase/cdp-sdk + optional @x402/* modules that aren't installed and break the bundler.
// Injected only for now (MetaMask / Rabby / browser wallet) — the most reliable path.
// WalletConnect can be added later behind NEXT_PUBLIC_WC_PROJECT_ID.
export const wagmiConfig = createConfig({
  chains: [monad],
  connectors: [injected()],
  transports: {
    [monad.id]: http(process.env.NEXT_PUBLIC_MONAD_RPC ?? "https://rpc.monad.xyz"),
  },
  ssr: true,
});
