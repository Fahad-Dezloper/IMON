"use client";

import { useAccount, useChainId } from "wagmi";
import { WalletButton } from "@/components/WalletButton";
import { VaultDashboard } from "@/components/VaultDashboard";
import { MONAD_CHAIN_ID, isDeployed, vaultAddress } from "@/lib/contracts";
import { shortAddress } from "@/lib/format";

export default function Home() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const onMonad = chainId === MONAD_CHAIN_ID;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-6">
      <header className="flex items-center justify-between pb-10">
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight">iMON</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-violet-400">
            Monad mainnet · chain {MONAD_CHAIN_ID}
          </span>
        </div>
        <WalletButton />
      </header>

      <section className="mb-8 flex flex-col gap-3">
        <h1 className="text-balance text-3xl font-bold leading-tight sm:text-4xl">
          The simple, safer home for Monad staking.
        </h1>
        <p className="max-w-[62ch] text-neutral-400">
          Deposit MON — we auto-swap into the highest-APY LST sleeve within caps and mint iMON.
          Redeem always returns your pro-rata basket — no oracle, never paused. Unaudited.
        </p>
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs ${
            isDeployed
              ? isConnected && onMonad
                ? "border-emerald-700/50 text-emerald-400"
                : "border-neutral-700 text-neutral-400"
              : "border-amber-700/50 text-amber-400"
          }`}
        >
          {isDeployed ? (
            <>
              Live vault {vaultAddress ? shortAddress(vaultAddress) : "—"}
              {isConnected ? (onMonad ? " · connected" : " · switch network") : " · connect wallet"}
            </>
          ) : (
            "Waiting for deployment addresses"
          )}
        </div>
      </section>

      <VaultDashboard />
    </main>
  );
}
