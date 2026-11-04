"use client";

import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { MONAD_CHAIN_ID } from "@/lib/contracts";

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <button
        onClick={() => disconnect()}
        className="rounded-lg border border-neutral-700 px-4 py-2 font-mono text-sm hover:border-neutral-500"
      >
        {address?.slice(0, 6)}&hellip;{address?.slice(-4)} &middot; Disconnect
      </button>
    );
  }

  return (
    <button
      onClick={() => connectors[0] && connect({ connector: connectors[0] })}
      disabled={isPending || !connectors[0]}
      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const onMonad = chainId === MONAD_CHAIN_ID;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-6">
      <header className="flex items-center justify-between pb-16">
        <span className="text-xl font-bold tracking-tight">iMON</span>
        <WalletButton />
      </header>

      <section className="mt-[6vh] flex flex-col gap-5">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-violet-400">
          Phase 0 · scaffold
        </p>
        <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl">
          The simple, safer home for Monad staking.
        </h1>
        <p className="max-w-[60ch] text-lg text-neutral-400">
          One token holds a capped, auto-balanced basket of Monad staking tokens.
          Auto-compounding, always redeemable, with a hard cap on how much any single
          token can cost you.
        </p>

        <div
          className={`mt-3 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 font-mono text-sm ${
            isConnected
              ? onMonad
                ? "border-emerald-700/50 text-emerald-400"
                : "border-amber-700/50 text-amber-400"
              : "border-neutral-800 text-neutral-400"
          }`}
        >
          {!isConnected && "Connect a wallet to begin."}
          {isConnected && onMonad && (
            <span>
              Connected: {address?.slice(0, 6)}&hellip;{address?.slice(-4)} &middot; Monad
              mainnet (143)
            </span>
          )}
          {isConnected && !onMonad && (
            <>
              <span>Wrong network (chain {chainId}).</span>
              <button
                onClick={() => switchChain({ chainId: MONAD_CHAIN_ID })}
                className="rounded-md border border-amber-600/60 px-2 py-1 text-xs hover:bg-amber-600/10"
              >
                Switch to Monad
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
