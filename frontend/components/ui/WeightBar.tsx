interface WeightBarProps {
  weightBps: number;
  capBps: number;
}

/** Current weight as a filled bar with the hard cap drawn as a tick. Fill turns amber
 *  as it nears the cap — color used only as that signal. */
export function WeightBar({ weightBps, capBps }: WeightBarProps) {
  const weightPct = weightBps / 100;
  const capPct = capBps / 100;
  const nearCap = weightBps >= capBps * 0.9;

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${nearCap ? "bg-warning" : "bg-accent"}`}
          style={{ width: `${Math.min(weightPct, 100)}%`, transition: "width 240ms var(--ease-out)" }}
        />
        <div
          className="absolute top-[-3px] h-[14px] w-px bg-ink/25"
          style={{ left: `calc(${Math.min(capPct, 100)}% - 0.5px)` }}
          title={`cap ${capPct}%`}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-ink-3">
        {weightPct.toFixed(0)}%
      </span>
    </div>
  );
}
