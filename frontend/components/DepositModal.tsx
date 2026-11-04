"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Modal } from "./ui/Modal";
import { useUserPosition } from "@/lib/useUserPosition";
import { useVaultData } from "@/lib/useVaultData";
import { fmtMon, fmtPct } from "@/lib/format";

type Step = "form" | "approving" | "depositing" | "done";

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-ink-3">{k}</span>
      <span className="tnum font-medium text-ink">{v}</span>
    </div>
  );
}

export function DepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pos = useUserPosition();
  const { stats } = useVaultData();

  const tokens = pos.wallet.length ? pos.wallet : [{ symbol: "MON", balance: 0 }];
  const [asset, setAsset] = useState(tokens[0]?.symbol ?? "MON");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("form");

  const bal = tokens.find((t) => t.symbol === asset)?.balance ?? 0;
  const amt = parseFloat(amount) || 0;
  const tooMuch = amt > bal;
  const estIMon = useMemo(() => (amt > 0 ? amt / stats.navPerShare : 0), [amt, stats.navPerShare]);

  function close() {
    setStep("form");
    setAmount("");
    onClose();
  }

  function submit() {
    setStep("approving");
    setTimeout(() => setStep("depositing"), 900);
    setTimeout(() => {
      setStep("done");
      toast.success(`Deposited — received ~${fmtMon(estIMon)} iMON`);
    }, 1900);
  }

  return (
    <Modal open={open} onClose={close} title="Deposit">
      {step === "done" ? (
        <div className="py-2 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-success-bg text-success">
            <Check size={22} />
          </div>
          <p className="font-semibold text-ink">Deposited</p>
          <p className="mt-1 text-sm text-ink-3">You received ~{fmtMon(estIMon)} iMON.</p>
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
              <span>Asset</span>
              <span className="tnum">
                Balance: {fmtMon(bal, 4)} {asset}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tokens.map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => setAsset(t.symbol)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    asset === t.symbol
                      ? "bg-accent-tint font-medium text-accent"
                      : "bg-muted text-ink-2 hover:text-ink"
                  }`}
                >
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 rounded-lg bg-bg px-3 py-2.5 shadow-surface">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.0"
                className="tnum w-full bg-transparent text-lg text-ink outline-none placeholder:text-ink-4"
              />
              <button
                onClick={() => setAmount(String(bal))}
                className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-ink-2 hover:text-ink"
              >
                MAX
              </button>
            </div>
            {tooMuch && <p className="mt-1 text-xs text-error">Exceeds your balance.</p>}
          </div>

          <div className="rounded-xl bg-bg p-3 text-sm">
            <Row k="You'll receive" v={`~${fmtMon(estIMon)} iMON`} />
            <Row k="Net APY" v={fmtPct(stats.netApy)} />
            <Row k="Deposit fee" v="0.00%" />
            <Row k="Network" v="Monad (143)" />
          </div>

          <button
            disabled={amt <= 0 || tooMuch || step !== "form"}
            onClick={submit}
            className="w-full rounded-lg bg-accent py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {step === "approving" ? "Approving…" : step === "depositing" ? "Depositing…" : "Deposit"}
          </button>
          <p className="text-center text-xs text-ink-4">Demo flow — mock data while the vault is built.</p>
        </div>
      )}
    </Modal>
  );
}
