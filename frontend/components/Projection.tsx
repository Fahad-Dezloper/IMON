"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { Eye, EyeOff } from "lucide-react";
import { fmtMon, fmtPct } from "@/lib/format";

const HORIZONS = [1, 5, 10, 30, 60];

export function Projection({ principal, netApy }: { principal: number; netApy: number }) {
  const [years, setYears] = useState(10);
  const [reveal, setReveal] = useState(true);

  const projected = principal * Math.pow(1 + netApy, years);
  const earned = projected - principal;

  return (
    <div className="flex flex-col rounded-3xl bg-surface p-6 shadow-surface">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-3">
          Hold {fmtMon(principal, 0)} MON for
        </p>
        <button
          onClick={() => setReveal((r) => !r)}
          aria-label={reveal ? "Hide projection" : "Reveal projection"}
          className="rounded-md p-1 text-ink-4 transition-colors hover:bg-muted hover:text-ink-2"
        >
          {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {HORIZONS.map((y) => (
          <button
            key={y}
            onClick={() => setYears(y)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              years === y ? "bg-accent text-white" : "bg-muted text-ink-2 hover:text-ink"
            }`}
          >
            {y}Y
          </button>
        ))}
      </div>

      <div className="mt-6 text-[clamp(36px,5vw,60px)] font-bold leading-none tracking-tight text-ink">
        {reveal ? (
          <>
            <NumberFlow value={Math.round(projected)} format={{ maximumFractionDigits: 0 }} className="tnum" />
            <span className="ml-2 text-xl font-semibold text-ink-3">MON</span>
          </>
        ) : (
          <span className="text-ink-4">••••••</span>
        )}
      </div>
      {reveal && (
        <p className="mt-3 tnum text-sm font-medium text-success">
          +{fmtMon(earned, 0)} MON earned over {years} year{years > 1 ? "s" : ""}
        </p>
      )}

      <p className="mt-auto pt-6 text-[11px] leading-relaxed text-ink-4">
        Blended net APY {fmtPct(netApy)}. Compounds today&rsquo;s rate; real yields vary. Not a
        guarantee.
      </p>
    </div>
  );
}
