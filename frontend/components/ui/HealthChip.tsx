import type { HealthStatus } from "@/lib/types";

const MAP: Record<HealthStatus, { label: string; dot: string; text: string }> = {
  healthy: { label: "Healthy", dot: "bg-success", text: "text-success" },
  watch: { label: "Watch", dot: "bg-warning", text: "text-warning" },
  flagged: { label: "Flagged", dot: "bg-error", text: "text-error" },
};

export function HealthChip({ status }: { status: HealthStatus }) {
  const s = MAP[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
