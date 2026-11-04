"use client";

import { ArrowUpRight } from "lucide-react";
import { explorerAddress, vaultAddress } from "@/lib/contracts";

export function ActivityFeed() {
  const vault = vaultAddress;

  return (
    <section className="rounded-3xl bg-surface p-6 shadow-surface">
      <h2 className="mb-2 text-base font-bold text-ink">Recent activity</h2>
      <p className="text-sm leading-relaxed text-ink-3">
        Every deposit and redeem happens on-chain. View the full, verifiable history for the live
        vault on MonadScan.
      </p>
      {vault && (
        <a
          href={explorerAddress(vault)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-tint hover:text-accent"
        >
          Open vault on MonadScan <ArrowUpRight size={16} />
        </a>
      )}
    </section>
  );
}
