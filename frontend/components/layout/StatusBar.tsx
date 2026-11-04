"use client";

import { useEffect, useState } from "react";
import { useVaultData } from "@/lib/useVaultData";
import { fmtPct } from "@/lib/format";

export function StatusBar() {
  const { stats } = useVaultData();
  const [now, setNow] = useState("");
  const cap = stats.capBpsMax / 100;

  // The one quiet "alive" detail — a live clock.
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-10 max-w-[1600px] items-center justify-between px-4 text-xs text-ink-3 sm:px-8 lg:px-12">
        {/* Stable indicator + safety popover on hover/focus */}
        <div className="group relative">
          <button
            className="inline-flex items-center gap-1.5 outline-none"
            aria-label="App status and safety"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            <span className="text-ink-2">Stable</span>
          </button>

          <div className="pointer-events-none absolute bottom-full left-0 mb-3 w-80 origin-bottom-left translate-y-1 scale-95 rounded-2xl bg-surface p-4 opacity-0 shadow-pop transition-all duration-200 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink">Safety</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Deposits open
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
              A hard cap means no single token can be more than{" "}
              <b className="font-semibold text-ink">{cap}%</b> of the basket. If one fails, the
              most it can cost you is its slice &mdash; the others keep working.
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
              A fast exploit can&rsquo;t be dodged, only capped. A chain-level failure hits every
              token together.
            </p>
            <div className="mt-3 flex justify-between rounded-xl bg-bg p-2.5 text-[13px]">
              <span className="text-ink-3">Max loss if one token fails</span>
              <span className="tnum font-semibold text-warning">&le; {cap}%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 tnum">
          <span className="hidden sm:inline">Net APY {fmtPct(stats.netApy)}</span>
          <span className="hidden sm:inline text-ink-4">·</span>
          <span>Monad 143</span>
          <span className="text-ink-4">·</span>
          <span className="text-ink-4">as of {now || "—"}</span>
        </div>
      </div>
    </div>
  );
}
