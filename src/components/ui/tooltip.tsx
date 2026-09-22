import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Lightweight CSS tooltip. Shows on hover and keyboard focus. */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-elevated px-2.5 py-1.5 text-[11px] font-medium text-foreground opacity-0 shadow-[var(--shadow-pop)] transition-all duration-150",
          "group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "top" ? "bottom-full mb-2 translate-y-1 group-hover/tt:translate-y-0" : "top-full mt-2 -translate-y-1 group-hover/tt:translate-y-0",
          "max-md:hidden"
        )}
      >
        {content}
      </span>
    </span>
  );
}
