import { formatUnits, parseUnits } from "viem";

// --- display formatters (our UI) ---
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

// --- bigint helpers (live on-chain reads + the classic view) ---
export function formatToken(value: bigint | undefined, digits = 4): string {
  if (value === undefined) return "—";
  const n = Number(formatUnits(value, 18));
  if (!Number.isFinite(n)) return formatUnits(value, 18);
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function parseToken(input: string): bigint | null {
  const trimmed = input.trim();
  if (!trimmed || Number.isNaN(Number(trimmed))) return null;
  try {
    return parseUnits(trimmed, 18);
  } catch {
    return null;
  }
}

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
