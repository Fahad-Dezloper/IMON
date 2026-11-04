"use client";

// Harsh's original PR dashboard, kept on its own route (/classic) for reference.
// Our main design lives at "/". Both talk to the same live vault.

import { useAccount, useChainId } from "wagmi";
import { WalletButton } from "@/components/WalletButton";
import { VaultDashboard } from "@/components/VaultDashboard";
import { MONAD_CHAIN_ID, isDeployed, vaultAddress } from "@/lib/contracts";
import { shortAddress } from "@/lib/format";

export default function Classic() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const onMonad = chainId === MONAD_CHAIN_ID;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-6">
      <header className="flex items-center justify-between pb-10">
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-ink">iMON</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
            Monad mainnet · chain {MONAD_CHAIN_ID} · classic view
          </span>
        </div>
        <WalletButton />
      </header>

      <section className="mb-8 flex flex-col gap-3">
        <h1 className="text-balance text-3xl font-bold leading-tight text-ink sm:text-4xl">
          The simple, safer home for Monad staking.
        </h1>
        <p className="max-w-[62ch] text-ink-3">
          Deposit MON — we auto-swap into the highest-APY LST sleeve within caps and mint iMON.
          Redeem always returns your pro-rata basket — no oracle, never paused. Unaudited.
        </p>
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs ${
            isDeployed
              ? isConnected && onMonad
                ? "border-emerald-700/50 text-emerald-600"
                : "border-line-2 text-ink-3"
              : "border-amber-700/50 text-amber-600"
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
