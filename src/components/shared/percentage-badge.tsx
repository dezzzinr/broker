import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";
import { Tooltip } from "@/components/ui/tooltip";

/** Green/red pill for signed percentage values. */
export function PercentageBadge({
  value,
  size = "md",
  withIcon = true,
  tooltip,
  className,
}: {
  value: number;
  size?: "sm" | "md";
  withIcon?: boolean;
  tooltip?: string;
  className?: string;
}) {
  const positive = value > 0;
  const neutral = value === 0;
  const Icon = positive ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;

  const pill = (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border font-medium tabular-nums",
        size === "sm" ? "px-1.5 py-px text-[11px]" : "px-2 py-0.5 text-xs",
        positive && "border-positive/20 bg-positive/10 text-positive",
        !positive && !neutral && "border-negative/20 bg-negative/10 text-negative",
        neutral && "border-border bg-fill-2 text-muted",
        className
      )}
    >
      {withIcon && <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden />}
      {formatPercent(value)}
    </span>
  );

  return tooltip ? <Tooltip content={tooltip}>{pill}</Tooltip> : pill;
}
