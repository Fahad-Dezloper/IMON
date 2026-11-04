"use client";

import { ValueHero } from "@/components/ValueHero";
import { LstCard } from "@/components/LstCard";
import { Projection } from "@/components/Projection";
import { useVaultData } from "@/lib/useVaultData";
import { useUserPosition } from "@/lib/useUserPosition";
import { fmtCompactUsd, fmtPct } from "@/lib/format";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-surface p-5 text-center shadow-surface">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="mt-1 tnum text-xl font-bold text-ink">{value}</div>
    </div>
  );
}

export function DashboardView({ onDeposit, onRedeem }: { onDeposit: () => void; onRedeem: () => void }) {
  const { stats, basket } = useVaultData();
  const pos = useUserPosition();
  const principal = pos.connected ? pos.valueMon : 25_000;

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
        <ValueHero onDeposit={onDeposit} onRedeem={onRedeem} />
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Net APY" value={fmtPct(stats.netApy)} />
          <Stat label="TVL" value={fmtCompactUsd(stats.tvlUsd)} />
          <Stat label="Tokens" value={String(basket.length)} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-bold text-ink">In the basket</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {/* left: four tokens, 2 rows × 2 columns */}
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
            {basket.map((a) => (
              <LstCard key={a.symbol} asset={a} weight={a.weightBps / 100} compact />
            ))}
          </div>
          {/* right: the hold / projection */}
          <Projection principal={principal} netApy={stats.netApy} />
        </div>
      </div>
    </div>
  );
}
