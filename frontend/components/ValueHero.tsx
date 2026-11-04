"use client";

import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useUserPosition } from "@/lib/useUserPosition";
import { useVaultData } from "@/lib/useVaultData";
import { fmtMon, fmtPct, fmtUsd } from "@/lib/format";
import { LiveValue } from "./ui/LiveValue";

interface Props {
  onDeposit: () => void;
  onRedeem: () => void;
}

/** The dopamine centerpiece: a big number that ticks up in real time as yield accrues. */
export function ValueHero({ onDeposit, onRedeem }: Props) {
  const pos = useUserPosition();
  const { stats } = useVaultData();
  const connected = pos.connected;
  const base = connected ? pos.valueMon : stats.navMon;

  return (
    <section className="rounded-3xl bg-surface px-6 py-10 text-center shadow-surface sm:py-14">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-3">
        {connected ? "Your position" : "Basket value"}
      </p>

      <div className="mt-2 text-[clamp(44px,9vw,72px)] font-bold leading-none tracking-tight text-ink">
        <LiveValue
          base={base}
          apy={stats.netApy}
          format={{ maximumFractionDigits: 4, minimumFractionDigits: 4 }}
          suffix=" MON"
        />
      </div>

      {connected ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-ink-3">
          <span className="tnum">{fmtUsd(pos.valueUsd)}</span>
          <span className="text-ink-4">·</span>
          <span className="tnum text-success">+{fmtMon(pos.earnedMon)} MON earned</span>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-3">
          Net APY {fmtPct(stats.netApy)} · auto-compounding, always redeemable
        </p>
      )}

      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          onClick={onDeposit}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          <ArrowDownToLine size={16} />
          Deposit
        </button>
        <button
          onClick={onRedeem}
          className="inline-flex items-center gap-2 rounded-full bg-surface px-6 py-3 text-sm font-medium text-ink shadow-surface transition-colors hover:bg-muted active:scale-[0.98]"
        >
          <ArrowUpFromLine size={16} />
          Redeem
        </button>
      </div>
    </section>
  );
}
