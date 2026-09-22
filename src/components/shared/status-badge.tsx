import { cn } from "@/lib/utils";
import type { TransactionStatus } from "@/lib/types";

const STYLES: Record<TransactionStatus, string> = {
  completed: "border-positive/20 bg-positive/10 text-positive",
  pending: "border-warning/20 bg-warning/10 text-warning",
  failed: "border-negative/20 bg-negative/10 text-negative",
};

const DOTS: Record<TransactionStatus, string> = {
  completed: "bg-positive",
  pending: "bg-warning animate-pulse-dot",
  failed: "bg-negative",
};

const LABELS: Record<TransactionStatus, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize",
        STYLES[status]
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOTS[status])} aria-hidden />
      {LABELS[status]}
    </span>
  );
}
