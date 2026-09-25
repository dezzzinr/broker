import { cn } from "@/lib/utils";
import type { FundStatus } from "@/lib/types/platform";

const STYLES: Record<FundStatus, string> = {
  pending: "border-warning/25 bg-warning/10 text-warning",
  approved: "border-positive/25 bg-positive/10 text-positive",
  rejected: "border-negative/25 bg-negative/10 text-negative",
  cancelled: "border-border bg-fill-1 text-muted",
};

const DOTS: Record<FundStatus, string> = {
  pending: "bg-warning animate-pulse-dot",
  approved: "bg-positive",
  rejected: "bg-negative",
  cancelled: "bg-faint",
};

const LABELS: Record<FundStatus, string> = {
  pending: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

/** Status pill for deposit / withdrawal requests. */
export function FundStatusBadge({
  status,
  className,
  showDot = true,
}: {
  status: FundStatus;
  className?: string;
  showDot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        STYLES[status],
        className
      )}
    >
      {showDot && <span className={cn("size-1.5 rounded-full", DOTS[status])} aria-hidden />}
      {LABELS[status]}
    </span>
  );
}

export const FUND_STATUS_LABELS = LABELS;
