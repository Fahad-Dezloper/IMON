"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useState, type ComponentProps } from "react";

const YEAR_SECONDS = 365 * 24 * 60 * 60;

interface LiveValueProps {
  /** Starting amount. */
  base: number;
  /** Annual growth rate (decimal) used to tick the value up in real time. */
  apy: number;
  format: Intl.NumberFormatOptions;
  suffix?: string;
  className?: string;
}

/**
 * A number that ticks up in real time at `apy` (yield accruing), rendered with
 * NumberFlow so each change rolls smoothly. Emil's rule: finance figures use a
 * tween, not a spring. Honors prefers-reduced-motion (static value, no ticking).
 */
export function LiveValue({ base, apy, format, suffix, className }: LiveValueProps) {
  const [value, setValue] = useState(base);

  useEffect(() => {
    setValue(base);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || apy <= 0) return;
    const perSecond = (base * apy) / YEAR_SECONDS;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      setValue(base + perSecond * ((Date.now() - startedAt) / 1000));
    }, 1500);
    return () => window.clearInterval(id);
  }, [base, apy]);

  return (
    <span className={className}>
      <NumberFlow
        value={value}
        format={format as ComponentProps<typeof NumberFlow>["format"]}
        willChange
        className="tnum"
      />
      {suffix}
    </span>
  );
}
