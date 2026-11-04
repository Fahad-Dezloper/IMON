"use client";

import type { ReactNode } from "react";
import { ArrowDownToLine } from "lucide-react";
import { useVaultData } from "@/lib/useVaultData";
import { fmtCompactUsd, fmtPct } from "@/lib/format";
import { LiveValue } from "./ui/LiveValue";

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="mt-0.5 text-[15px] font-medium text-ink">{children}</div>
    </div>
  );
}

export function Hero({ onDeposit }: { onDeposit: () => void }) {
  const { stats, basket } = useVaultData();

  return (
    <section className="rounded-2xl bg-surface p-6 shadow-surface sm:p-7">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-3">Current net APY</p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="tnum text-[44px] font-semibold leading-none tracking-tight text-ink">
          {fmtPct(stats.netApy)}
        </span>
        <span className="text-sm text-ink-3">net · after a 5% cut of the yield</span>
      </div>
      <p className="mt-3 text-[15px] text-ink-2">
        Auto-compounding · auto-balanced · {basket.length} staking tokens · always redeemable.
      </p>

      <button
        onClick={onDeposit}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.99]"
      >
        <ArrowDownToLine size={16} />
        Deposit
      </button>

      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5">
        <Stat label="Basket value">
          <LiveValue
            base={stats.navMon}
            apy={stats.netApy}
            format={{ maximumFractionDigits: 2, minimumFractionDigits: 2 }}
            suffix=" MON"
          />
        </Stat>
        <Stat label="TVL">{fmtCompactUsd(stats.tvlUsd)}</Stat>
        <Stat label="Holders">
          <span className="tnum">{stats.holders}</span>
        </Stat>
      </div>
    </section>
  );
}
