"use client";

import { useVaultData } from "@/lib/useVaultData";
import { fmtMon } from "@/lib/format";

export function ActivityFeed() {
  const { activity } = useVaultData();

  return (
    <section className="rounded-3xl bg-surface p-6 shadow-surface">
      <h2 className="mb-3 text-base font-semibold text-ink">Recent activity</h2>
      <ul className="flex flex-col divide-y divide-line">
        {activity.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  a.kind === "deposit" ? "bg-accent" : "bg-ink-4"
                }`}
              />
              <span className="tnum text-ink-2">{a.who}</span>
              <span className="truncate text-ink-3">
                {a.kind} · {a.asset}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="tnum text-ink">{fmtMon(a.amountMon)} MON</span>
              <span className="text-xs text-ink-4">{a.ago}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
