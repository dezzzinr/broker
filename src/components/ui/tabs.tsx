"use client";

import { cn } from "@/lib/utils";

export interface TabOption<T extends string> {
  value: T;
  label: string;
  /** Optional trailing badge content (e.g. count) */
  badge?: string;
}

/** Segmented control used for filters and time ranges. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  size = "default",
}: {
  value: T;
  onChange: (value: T) => void;
  options: TabOption<T>[];
  ariaLabel: string;
  className?: string;
  size?: "default" | "sm";
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl border border-border bg-white/[0.03] p-1",
        className
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              selected
                ? "bg-white/[0.08] text-foreground shadow-[0_1px_8px_-2px_rgba(0,0,0,0.6)] ring-1 ring-border-strong"
                : "text-muted hover:text-foreground"
            )}
          >
            {opt.label}
            {opt.badge && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[10px] leading-none",
                  selected ? "bg-accent-soft text-accent" : "bg-white/[0.07] text-muted"
                )}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
