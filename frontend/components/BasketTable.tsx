"use client";

import { useVaultData } from "@/lib/useVaultData";
import { fmtPct } from "@/lib/format";
import { WeightBar } from "./ui/WeightBar";
import { HealthChip } from "./ui/HealthChip";

export function BasketTable() {
  const { stats, basket } = useVaultData();

  return (
    <section className="rounded-3xl bg-surface p-6 shadow-surface">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink">What&rsquo;s in the basket</h2>
        <span className="text-xs text-ink-3">cap {stats.capBpsMax / 100}% per token</span>
      </div>
      <p className="mb-4 text-sm text-ink-3">
        Blended {fmtPct(stats.blendedApyGross)} gross &rarr; {fmtPct(stats.netApy)} net.
      </p>

      <div className="flex flex-col divide-y divide-line">
        {basket.map((a) => (
          <div key={a.symbol} className="py-3.5 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-ink">{a.symbol}</div>
                <div className="truncate text-xs text-ink-3">{a.provider}</div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="tnum text-sm text-ink-2">{fmtPct(a.apy)}</span>
                <HealthChip status={a.health} />
              </div>
            </div>
            <div className="mt-2">
              <WeightBar weightBps={a.weightBps} capBps={a.capBps} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
