"use client";

import { useUserPosition } from "@/lib/useUserPosition";
import { useVaultData } from "@/lib/useVaultData";
import { fmtMon, fmtUsd } from "@/lib/format";
import { LiveValue } from "./ui/LiveValue";

interface Props {
  onDeposit: () => void;
  onRedeem: () => void;
}

export function PositionCard({ onDeposit, onRedeem }: Props) {
  const pos = useUserPosition();
  const { stats } = useVaultData();

  if (!pos.connected) return null;

  return (
    <section className="rounded-2xl bg-surface p-6 shadow-surface">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-3">Your position</p>
          <div className="mt-1.5 text-[30px] font-semibold leading-none tracking-tight text-ink">
            <LiveValue
              base={pos.valueMon}
              apy={stats.netApy}
              format={{ maximumFractionDigits: 4, minimumFractionDigits: 4 }}
              suffix=" MON"
            />
          </div>
          <div className="mt-1.5 tnum text-sm text-ink-3">
            {fmtUsd(pos.valueUsd)} · {fmtMon(pos.iMonBalance)} iMON
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-ink-3">Earned</p>
          <p className="mt-0.5 tnum font-medium text-success">+{fmtMon(pos.earnedMon)} MON</p>
        </div>
      </div>

      <div className="mt-5 flex gap-2.5">
        <button
          onClick={onDeposit}
          className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.99]"
        >
          Deposit
        </button>
        <button
          onClick={onRedeem}
          className="flex-1 rounded-lg bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-surface transition-colors hover:bg-muted active:scale-[0.99]"
        >
          Redeem
        </button>
      </div>
    </section>
  );
}
