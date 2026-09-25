import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  info: {
    icon: Info,
    className: "border-info/25 bg-info/10 text-info",
  },
  success: {
    icon: CheckCircle2,
    className: "border-positive/25 bg-positive/10 text-positive",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  error: {
    icon: XCircle,
    className: "border-negative/30 bg-negative/10 text-negative",
  },
} as const;

export type AlertVariant = keyof typeof VARIANTS;

/** Inline callout used for form errors, review notes and platform notices. */
export function Alert({
  variant = "info",
  title,
  children,
  className,
  icon: IconOverride,
}: {
  variant?: AlertVariant;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
}) {
  const config = VARIANTS[variant];
  const Icon = IconOverride ?? config.icon;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-3.5 text-[13px] leading-relaxed",
        config.className,
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}
