"use client";

import { useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { Eye, EyeOff } from "lucide-react";
import { useVaultData } from "@/lib/useVaultData";
import { useUserPosition } from "@/lib/useUserPosition";
import { fmtMon, fmtPct } from "@/lib/format";
import { HealthChip } from "./ui/HealthChip";

const HORIZONS = [1, 5, 10, 30, 60];

export function AllocationBasket() {
  const { basket, stats } = useVaultData();
  const pos = useUserPosition();

  const principal = pos.connected ? pos.valueMon : 25_000;
  const [weights, setWeights] = useState<number[]>(() => basket.map((a) => a.weightBps / 100));
  const [years, setYears] = useState(10);
  const [reveal, setReveal] = useState(true);

  const blendedApy = useMemo(
    () => basket.reduce((acc, a, i) => acc + (weights[i] / 100) * a.apy, 0),
    [basket, weights],
  );
  const netApy = blendedApy * (1 - stats.yieldFeeBps / 10_000);
  const projected = principal * Math.pow(1 + netApy, years);
  const earned = projected - principal;

  // Drag one slider; the rest rebalance proportionally so the mix always sums to 100%.
  function setWeight(i: number, v: number) {
    const clamped = Math.max(0, Math.min(100, v));
    const others = weights.reduce((s, w, j) => (j === i ? s : s + w), 0);
    const remaining = 100 - clamped;
    setWeights(
      weights.map((w, j) => {
        if (j === i) return clamped;
        if (others <= 0) return remaining / (weights.length - 1);
        return w * (remaining / others);
      }),
    );
  }

  return (
    <section className="rounded-3xl bg-surface p-6 shadow-surface">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-ink">Your mix</h2>
        <span className="text-sm text-ink-3">
          Blended net APY <b className="tnum font-bold text-ink">{fmtPct(netApy)}</b>
        </span>
      </div>
      <p className="mb-6 text-sm text-ink-3">
        Drag to rebalance across Monad&rsquo;s staking tokens &mdash; the projection updates live.
      </p>

      <div className="flex flex-col gap-5">
        {basket.map((a, i) => (
          <div key={a.symbol}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-semibold text-ink">{a.symbol}</span>
                <span className="truncate text-xs text-ink-3">{a.provider}</span>
                <HealthChip status={a.health} />
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <span className="tnum text-ink-3">{fmtPct(a.apy)}</span>
                <span className="tnum w-11 text-right font-bold text-ink">{Math.round(weights[i])}%</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={a.capBps / 100}
              step={1}
              value={Math.round(weights[i])}
              onChange={(e) => setWeight(i, Number(e.target.value))}
              aria-label={`${a.symbol} allocation`}
              className="imon-range w-full"
            />
          </div>
        ))}
      </div>

      {/* Projection — the number that should feel big */}
      <div className="mt-7 rounded-2xl bg-bg p-5">
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

        <div className="mt-4 text-[clamp(32px,6vw,52px)] font-bold leading-none tracking-tight text-ink">
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
          <p className="mt-2 tnum text-sm font-medium text-success">
            +{fmtMon(earned, 0)} MON earned over {years} year{years > 1 ? "s" : ""}
          </p>
        )}
        <p className="mt-3 text-[11px] text-ink-4">
          Projection compounds today&rsquo;s blended net APY; real yields vary. Not a guarantee.
        </p>
      </div>
    </section>
  );
}
