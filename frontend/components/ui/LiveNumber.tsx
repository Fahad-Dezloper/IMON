"use client";

import { useEffect, useRef, useState } from "react";

const YEAR_SECONDS = 365 * 24 * 60 * 60;

interface LiveNumberProps {
  /** Starting amount. */
  base: number;
  /** Annual growth rate (decimal) used to tick the number up in real time. */
  apy: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * A number that grows in real time at `apy`, to show yield accruing (the Monad
 * fast-block emotional hook). Falls back to a static value when the viewer prefers
 * reduced motion. Uses tabular figures so digits don't jitter.
 */
export function LiveNumber({ base, apy, decimals = 4, prefix = "", suffix = "", className }: LiveNumberProps) {
  const [value, setValue] = useState(base);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(base);
      return;
    }
    const perSecond = (base * apy) / YEAR_SECONDS;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      setValue(base + (perSecond * (t - start)) / 1000);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [base, apy]);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
