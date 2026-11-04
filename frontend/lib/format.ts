// Number formatting helpers. Keep display tabular (see components) and consistent.

export const fmtMon = (n: number, dp = 2): string =>
  n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const fmtUsd = (n: number): string =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtCompactUsd = (n: number): string =>
  "$" + Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);

export const fmtPct = (dec: number, dp = 2): string => (dec * 100).toFixed(dp) + "%";

export const bpsToPct = (b: number): string => b / 100 + "%";

export const shortAddr = (addr: string): string =>
  addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
