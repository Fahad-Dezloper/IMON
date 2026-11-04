"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Modal } from "./ui/Modal";
import { useUserPosition } from "@/lib/useUserPosition";
import { useVaultData } from "@/lib/useVaultData";
import { bpsToPct, fmtMon } from "@/lib/format";

type Step = "form" | "redeeming" | "done";

export function RedeemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pos = useUserPosition();
  const { stats, basket } = useVaultData();

  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("form");

  const amt = parseFloat(amount) || 0;
  const tooMuch = amt > pos.iMonBalance;
  const valueMon = amt * stats.navPerShare;
  const perAsset = useMemo(
    () => basket.map((a) => ({ symbol: a.symbol, exit: a.exit, mon: valueMon * (a.weightBps / 10_000) })),
    [basket, valueMon],
  );

  function close() {
    setStep("form");
    setAmount("");
    onClose();
  }

  function submit() {
    setStep("redeeming");
    setTimeout(() => {
      setStep("done");
      toast.success(`Redeemed — ~${fmtMon(valueMon)} MON across the basket`);
    }, 1400);
  }

  return (
    <Modal open={open} onClose={close} title="Redeem">
      {step === "done" ? (
        <div className="py-2 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-success-bg text-success">
            <Check size={22} />
          </div>
          <p className="font-semibold text-ink">Redeemed</p>
          <p className="mt-1 text-sm text-ink-3">~{fmtMon(valueMon)} MON worth, returned across the basket.</p>
          <button
            onClick={close}
            className="mt-5 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-ink-3">
              <span>iMON to redeem</span>
              <span className="tnum">Balance: {fmtMon(pos.iMonBalance)} iMON</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-bg px-3 py-2.5 shadow-surface">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.0"
                className="tnum w-full bg-transparent text-lg text-ink outline-none placeholder:text-ink-4"
              />
              <button
                onClick={() => setAmount(String(pos.iMonBalance))}
                className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-ink-2 hover:text-ink"
              >
                MAX
              </button>
            </div>
            {tooMuch && <p className="mt-1 text-xs text-error">Exceeds your balance.</p>}
          </div>

          <div className="rounded-xl bg-bg p-3 text-sm">
            <p className="mb-2 text-ink-3">You&rsquo;ll receive your slice of each token:</p>
            {perAsset.map((p) => (
              <div key={p.symbol} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2">
                  <span className="text-ink">{p.symbol}</span>
                  <span className={p.exit === "instant" ? "text-[11px] text-success" : "text-[11px] text-warning"}>
                    {p.exit === "instant" ? "instant" : "short wait"}
                  </span>
                </span>
                <span className="tnum text-ink">{fmtMon(p.mon, 4)} MON</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-line pt-2">
              <span className="text-ink-3">Exit fee</span>
              <span className="tnum font-medium text-ink">{bpsToPct(stats.exitFeeBps)}</span>
            </div>
          </div>

          <button
            disabled={amt <= 0 || tooMuch || step !== "form"}
            onClick={submit}
            className="w-full rounded-lg bg-accent py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {step === "redeeming" ? "Redeeming…" : "Redeem"}
          </button>
          <p className="text-center text-xs text-ink-4">Demo flow — mock data while the vault is built.</p>
        </div>
      )}
    </Modal>
  );
}
