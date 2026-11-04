"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { LstAsset } from "@/lib/types";
import { fmtPct } from "@/lib/format";
import { HealthChip } from "@/components/ui/HealthChip";

interface Props {
  asset: LstAsset;
  weight: number;
  onWeight?: (v: number) => void;
  compact?: boolean;
}

function Art({ asset, compact }: { asset: LstAsset; compact?: boolean }) {
  const [imgOk, setImgOk] = useState(true);
  const gid = `glyph-${asset.symbol}`;
  const showLogo = Boolean(asset.logo) && imgOk;

  return (
    <div className={`relative m-2 overflow-hidden rounded-2xl bg-surface ${compact ? "h-24" : "h-40"}`}>
      <svg
        viewBox="0 0 300 160"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={gid} cx="35%" cy="30%" r="85%">
            <stop offset="0%" stopColor="#9b99ff" />
            <stop offset="50%" stopColor="#716ef3" />
            <stop offset="100%" stopColor="#f5a800" />
          </radialGradient>
        </defs>
        <circle cx="150" cy="160" r="150" fill="var(--color-accent)" opacity="0.08" />
        <circle cx="150" cy="160" r="120" fill="var(--color-accent)" opacity="0.16" />
        <circle cx="150" cy="160" r="92" fill="var(--color-accent)" opacity="0.28" />
        <circle cx="150" cy="160" r="64" fill="#0a0a0f" />
        {!showLogo && <circle cx="150" cy="160" r="34" fill={`url(#${gid})`} />}
      </svg>

      {showLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.logo}
          alt={asset.symbol}
          onError={() => setImgOk(false)}
          className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-surface object-cover ${
            compact ? "bottom-1 h-10 w-10" : "bottom-2 h-16 w-16"
          }`}
        />
      )}

      <div
        className={`absolute inline-flex items-center gap-1.5 rounded-full bg-surface shadow-surface ${
          compact ? "right-2 top-2 px-2 py-0.5" : "right-3 top-3 px-2.5 py-1"
        }`}
      >
        <span className="h-2.5 w-4 rounded-full bg-success" />
        <span className={`tnum font-bold text-ink ${compact ? "text-xs" : "text-sm"}`}>
          {fmtPct(asset.apy)}
          {compact ? "" : " APY"}
        </span>
      </div>
    </div>
  );
}

export function LstCard({ asset, weight, onWeight, compact }: Props) {
  const capPct = asset.capBps / 100;
  const interactive = Boolean(onWeight) && !compact;

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl bg-bone shadow-surface">
      <Art asset={asset} compact={compact} />

      <div className={`flex flex-col ${compact ? "gap-2 px-4 pb-4 pt-1" : "gap-3 px-5 pb-5 pt-1"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={`font-bold text-ink ${compact ? "text-base" : "text-lg"}`}>{asset.symbol}</h3>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-3">
              <span>{asset.provider}</span>
              <span className="text-ink-4">·</span>
              <HealthChip status={asset.health} />
            </div>
          </div>
          {!compact && (
            <span className="text-ink-4" aria-hidden="true">
              <ArrowUpRight size={18} />
            </span>
          )}
        </div>

        {!compact && <p className="text-[13px] leading-relaxed text-ink-2">{asset.about}</p>}

        <div className={compact ? "" : "mt-1"}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-ink-3">Allocation</span>
            <span className="tnum font-bold text-ink">
              {Math.round(weight)}%
              {!compact && <span className="font-normal text-ink-4"> / max {capPct}%</span>}
            </span>
          </div>
          {interactive ? (
            <input
              type="range"
              min={0}
              max={capPct}
              step={1}
              value={Math.round(weight)}
              onChange={(e) => onWeight?.(Number(e.target.value))}
              aria-label={`${asset.symbol} allocation`}
              className="imon-range w-full"
            />
          ) : (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(weight, 100)}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
