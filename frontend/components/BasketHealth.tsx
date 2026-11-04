"use client";

import { useVaultData } from "@/lib/useVaultData";

export function BasketHealth() {
  const { stats } = useVaultData();
  const cap = stats.capBpsMax / 100;

  return (
    <section className="rounded-3xl bg-surface p-6 shadow-surface">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Safety</h2>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
            stats.depositsPaused ? "text-error" : "text-success"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${stats.depositsPaused ? "bg-error" : "bg-success"}`} />
          {stats.depositsPaused ? "Deposits paused" : "Deposits open"}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        A hard cap means no single token can be more than{" "}
        <b className="font-semibold text-ink">{cap}%</b> of the basket. If one staking token fails
        completely, the most it can cost you is its slice &mdash; the others keep working.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-ink-3">
        Honest: a fast exploit can&rsquo;t be dodged, only capped. If Monad itself or a shared price
        feed breaks, every token is hit together.
      </p>

      <div className="mt-4 rounded-xl bg-bg p-3 text-sm">
        <div className="flex justify-between py-0.5">
          <span className="text-ink-3">Max loss if one token fails</span>
          <span className="tnum font-medium text-warning">&le; {cap}%</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-ink-3">Per-wallet deposit cap</span>
          <span className="tnum font-medium text-ink">{stats.perUserCapMon.toLocaleString()} MON</span>
        </div>
      </div>
    </section>
  );
}
