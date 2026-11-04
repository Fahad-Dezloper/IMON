"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronLeft, Layers, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { useConnect } from "wagmi";

const STEPS = [
  {
    icon: Layers,
    eyebrow: "ONE TOKEN",
    title: "One token for all of Monad staking.",
    body: "iMON is a single token that holds a balanced basket of Monad's liquid staking tokens. Instead of picking one and tracking it, you hold iMON and get the whole basket — kept in balance automatically.",
    note: undefined as string | undefined,
  },
  {
    icon: RefreshCw,
    eyebrow: "AUTO-COMPOUNDING",
    title: "It grows on its own, and you can leave anytime.",
    body: "Rewards from every staking token in the basket are collected and reinvested for you — no claiming, no manual restaking. iMON is always redeemable: burn it to get the underlying basket back whenever you want.",
    note: undefined,
  },
  {
    icon: ShieldCheck,
    eyebrow: "WHAT TO KNOW",
    title: "Bounded risk, stated plainly.",
    body: "A hard per-token cap limits how much of iMON any single staking token can become — so a problem with one token can't sink the whole position. This caps the downside; it doesn't remove it. iMON is a smart contract, not a deposit: value can fall and yields vary.",
    note: "Non-custodial. You hold the keys. Redeemable for the underlying basket at all times.",
  },
];

export function OnboardingGate() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const reduce = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { connect, connectors, isPending } = useConnect();

  const isLast = step === STEPS.length - 1;
  const S = STEPS[step];
  const Icon = S.icon;

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const go = (d: number) => {
    setDir(d);
    setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + d)));
  };
  const doConnect = () => connectors[0] && connect({ connector: connectors[0] });

  const variants = {
    enter: (d: number) => ({ x: reduce ? 0 : d * 24, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: reduce ? 0 : d * -24, opacity: 0 }),
  };

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />
        <Dialog.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          aria-describedby="ob-body"
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(90vh,620px)] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-surface shadow-pop focus:outline-none"
        >
          <Dialog.Title className="sr-only">Welcome to iMON</Dialog.Title>

          <div className="flex items-center gap-2 px-6 pt-6">
            <span className="text-sm font-semibold text-ink">iMON</span>
            <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
              Monad
            </span>
          </div>

          <div className="flex-1 px-6 py-6">
            <div className="relative min-h-[224px]">
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div
                  key={step}
                  custom={dir}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-tint text-accent">
                    <Icon size={24} />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wider text-ink-3">{S.eyebrow}</p>
                  <h2
                    ref={headingRef}
                    tabIndex={-1}
                    className="mt-1 text-2xl font-semibold tracking-tight text-ink outline-none"
                  >
                    {S.title}
                  </h2>
                  <p id="ob-body" className="mt-3 text-[15px] leading-relaxed text-ink-2">
                    {S.body}
                  </p>
                  {S.note && <p className="mt-3 text-xs leading-relaxed text-ink-3">{S.note}</p>}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
            <div role="group" aria-label="Onboarding progress" className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  aria-current={i === step ? "step" : undefined}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === step ? "w-5 bg-accent" : "w-1.5 bg-ink/15"
                  }`}
                />
              ))}
            </div>
            <span className="sr-only" aria-live="polite">{`Step ${step + 1} of ${STEPS.length}`}</span>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => go(-1)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-ink-3 transition-colors hover:bg-muted hover:text-ink-2"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              <button
                onClick={isLast ? doConnect : () => go(1)}
                disabled={isLast && (isPending || !connectors[0])}
                aria-label={isLast ? "Connect wallet" : "Next step"}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isLast ? (
                  <>
                    <Wallet size={16} />
                    {isPending ? "Connecting…" : "Connect Wallet"}
                  </>
                ) : (
                  <>
                    Next <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
