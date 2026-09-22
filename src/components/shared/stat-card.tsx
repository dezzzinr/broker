import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { PercentageBadge } from "./percentage-badge";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  icon?: LucideIcon;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("group relative overflow-hidden p-5 hover:border-border-strong", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-accent-soft opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        {Icon && (
          <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-elevated text-muted transition-colors group-hover:text-accent">
            <Icon className="size-4" aria-hidden />
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <span className="text-[22px] font-semibold tracking-tight text-foreground tabular-nums sm:text-2xl">
          {value}
        </span>
        {delta !== undefined && <PercentageBadge value={delta} size="sm" />}
      </div>
      {footer && <div className="mt-2 text-[11px] text-faint">{footer}</div>}
    </Card>
  );
}
