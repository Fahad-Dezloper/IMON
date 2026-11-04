"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronLeft, Layers, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { useConnect } from "wagmi";

const PITCH_URL = "https://claude.ai/artifact/PVQeRuj12JBRk3cJABxbC5";
const EASE = [0.23, 1, 0.32, 1] as const;

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

  const goto = useCallback((next: number) => {
    const clamped = Math.min(STEPS.length - 1, Math.max(0, next));
    setStep((cur) => {
      setDir(clamped >= cur ? 1 : -1);
      return clamped;
    });
  }, []);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const doConnect = () => connectors[0] && connect({ connector: connectors[0] });

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" && !isLast) {
      e.preventDefault();
      goto(step + 1);
    } else if (e.key === "ArrowLeft" && step > 0) {
      e.preventDefault();
      goto(step - 1);
    }
  };

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-[2px]" />
        <Dialog.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onKeyDown={onKeyDown}
          aria-describedby="ob-body"
          className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 focus:outline-none"
        >
          <motion.div
            layout={!reduce}
            transition={{ layout: { duration: 0.34, ease: EASE } }}
            className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-pop"
          >
            <Dialog.Title className="sr-only">Welcome to iMON</Dialog.Title>

            {/* header — wordmark + step counter on one baseline */}
            <div className="flex items-center justify-between px-8 pt-7">
              <span className="text-[15px] font-extrabold tracking-tight text-ink">iMON</span>
              <span className="tnum text-[13px] font-semibold text-ink-4">
                {step + 1} / {STEPS.length}
              </span>
            </div>

            {/* body — one left gutter, height animates via parent layout */}
            <div className="px-8 pt-6">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: reduce ? 0 : dir * 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.24, ease: EASE }}
                className="flex flex-col items-start"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-tint text-accent">
                  <Icon size={24} strokeWidth={2.2} />
                </span>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-4">{S.eyebrow}</p>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="mt-2 text-[25px] font-extrabold leading-[1.18] tracking-[-0.01em] text-ink outline-none"
                >
                  {S.title}
                </h2>
                <p id="ob-body" className="mt-2.5 text-[15px] leading-[1.55] text-ink-2">
                  {S.body}
                </p>
                {step === 0 && (
                  <a
                    href={PITCH_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-accent-deep"
                  >
                    See the pitch deck <ArrowRight size={17} strokeWidth={2.4} />
                  </a>
                )}
              </motion.div>
            </div>

            {/* footer — clickable stepper + nav, same gutter */}
            <div className="mt-6 flex items-center justify-between gap-3 px-8 pb-7">
              <div role="tablist" aria-label="Steps" className="flex items-center gap-1">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === step}
                    aria-label={`Go to step ${i + 1}`}
                    onClick={() => goto(i)}
                    className="group flex h-6 items-center px-1"
                  >
                    <span
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step ? "w-7 bg-accent" : "w-1.5 bg-ink/15 group-hover:bg-ink/35"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                {step > 0 && (
                  <button
                    onClick={() => goto(step - 1)}
                    className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-ink-3 transition-colors hover:bg-muted hover:text-ink"
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                )}
                <button
                  onClick={isLast ? doConnect : () => goto(step + 1)}
                  disabled={isLast && (isPending || !connectors[0])}
                  aria-label={isLast ? "Connect wallet" : "Next step"}
                  className="flex h-10 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-bold text-white transition-colors hover:bg-ink/85 active:scale-[0.98] disabled:opacity-50"
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
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
