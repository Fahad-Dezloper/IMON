"use client";

import { AlertTriangle, Layers, RefreshCw, ShieldCheck } from "lucide-react";
import { useVaultData } from "@/lib/useVaultData";

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl bg-surface p-5 shadow-surface">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-tint text-accent">
        <Icon size={20} />
      </div>
      <h3 className="mt-3 font-bold text-ink">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{body}</p>
    </div>
  );
}

export function SafetyView() {
  const { stats, basket } = useVaultData();
  const cap = stats.capBpsMax / 100;

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-4">
      <div className="rounded-3xl bg-surface p-6 shadow-surface">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-ink">Safety</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Deposits open
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">
          iMON is built to <b className="font-semibold text-ink">bound</b> losses, not promise they
          can&rsquo;t happen. Here&rsquo;s exactly what protects you &mdash; and what doesn&rsquo;t.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Feature
          icon={ShieldCheck}
          title={`Hard ${cap}% cap`}
          body={`No single token can exceed ${cap}% of the basket. The most one failure can cost you is its slice.`}
        />
        <Feature
          icon={Layers}
          title="Fault isolation"
          body="Each token is independent. If one breaks, the others keep earning and new deposits auto-pause."
        />
        <Feature
          icon={RefreshCw}
          title="Always redeemable"
          body="Redeem returns your pro-rata slice with no oracle and no cap check — the exit always works."
        />
      </div>

      <div className="rounded-3xl bg-surface p-6 shadow-surface">
        <h2 className="text-base font-bold text-ink">Per-token caps</h2>
        <div className="mt-3 flex flex-col divide-y divide-line">
          {basket.map((a) => (
            <div key={a.symbol} className="flex items-center justify-between py-2.5 text-sm">
              <span className="font-medium text-ink">
                {a.symbol} <span className="text-ink-3">· {a.provider}</span>
              </span>
              <span className="tnum text-ink-2">
                cap {a.capBps / 100}% · now {Math.round(a.weightBps / 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-3xl bg-warning-bg p-5">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
        <p className="text-sm leading-relaxed text-ink-2">
          <b className="font-semibold text-ink">Honest limits.</b> A fast exploit or admin-key drain
          happens in one block — a cap can bound it, not dodge it. A Monad-level or shared price-feed
          failure hits every token at once, so diversification can&rsquo;t help there. iMON is
          a smart contract, not a deposit.
        </p>
      </div>
    </div>
  );
}
