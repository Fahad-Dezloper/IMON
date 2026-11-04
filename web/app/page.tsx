"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { monad } from "@/lib/chains";

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const onMonad = chainId === monad.id;

  return (
    <main className="wrap">
      <header className="top">
        <span className="brand">iMON</span>
        <ConnectButton showBalance={false} />
      </header>

      <section className="hero">
        <p className="eyebrow">Phase 0 · scaffold</p>
        <h1>The simple, safer home for Monad staking.</h1>
        <p className="lead">
          One token holds a capped, auto-balanced basket of Monad staking tokens. Auto-compounding,
          always redeemable, with a hard cap on how much any single token can cost you.
        </p>

        <div className={`status ${isConnected ? (onMonad ? "ok" : "warn") : ""}`}>
          {!isConnected && "Connect a wallet to Monad mainnet (chain 143) to begin."}
          {isConnected && onMonad && (
            <>
              Connected: {address?.slice(0, 6)}&hellip;{address?.slice(-4)} &middot; Monad mainnet (143)
            </>
          )}
          {isConnected && !onMonad && (
            <>
              Connected on chain {chainId}. Switch your wallet to Monad mainnet (143).
            </>
          )}
        </div>
      </section>
    </main>
  );
}
