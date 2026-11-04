import { formatUnits, parseUnits } from "viem";

/** Format a 1e18 fixed-point amount for display. */
export function formatToken(value: bigint | undefined, digits = 4): string {
  if (value === undefined) return "—";
  const n = Number(formatUnits(value, 18));
  if (!Number.isFinite(n)) return formatUnits(value, 18);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
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
