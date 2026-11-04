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
    body: "Hold the whole basket of Monad's staking tokens in a single token — balanced for you, automatically.",
  },
  {
    icon: RefreshCw,
    eyebrow: "AUTO-COMPOUNDING",
    title: "It grows on its own.",
    body: "Rewards auto-compound in the background. Redeem anytime for the underlying basket.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "WHAT TO KNOW",
    title: "Bounded risk, stated plainly.",
    body: "A hard per-token cap limits how much any one token can cost you. It caps the downside — it doesn't remove it.",
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
    enter: (d: number) => ({ x: reduce ? 0 : d * 28, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: reduce ? 0 : d * -28, opacity: 0 }),
  };

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[3px]" />
        <Dialog.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          aria-describedby="ob-body"
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(92vh,560px)] w-[min(94vw,620px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[32px] bg-surface shadow-pop focus:outline-none"
        >
          <Dialog.Title className="sr-only">Welcome to iMON</Dialog.Title>

          <div className="px-10 pt-9">
            <span className="text-base font-bold tracking-tight text-ink">iMON</span>
          </div>

          <div className="flex-1 px-10 py-8">
            <div className="relative min-h-[216px]">
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div
                  key={step}
                  custom={dir}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-tint text-accent">
                    <Icon size={28} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">{S.eyebrow}</p>
                  <h2
                    ref={headingRef}
                    tabIndex={-1}
                    className="mt-2 text-[30px] font-bold leading-[1.15] tracking-tight text-ink outline-none"
                  >
                    {S.title}
                  </h2>
                  <p id="ob-body" className="mt-3 max-w-[30rem] text-[15px] leading-relaxed text-ink-3">
                    {S.body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-10 py-6">
            <div role="group" aria-label="Onboarding progress" className="flex gap-2">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  aria-current={i === step ? "step" : undefined}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === step ? "w-6 bg-accent" : "w-1.5 bg-ink/15"
                  }`}
                />
              ))}
            </div>
            <span className="sr-only" aria-live="polite">{`Step ${step + 1} of ${STEPS.length}`}</span>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => go(-1)}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-3 transition-colors hover:bg-muted hover:text-ink-2"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              <button
                onClick={isLast ? doConnect : () => go(1)}
                disabled={isLast && (isPending || !connectors[0])}
                aria-label={isLast ? "Connect wallet" : "Next step"}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
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
