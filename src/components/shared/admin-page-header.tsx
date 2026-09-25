"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Console page header: title, live status, description and actions. */
export function AdminPageHeader({
  title,
  description,
  actions,
  live,
  syncing,
  meta,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  live?: boolean;
  syncing?: boolean;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 animate-fade-up lg:flex-row lg:items-end lg:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-[26px]">
            {title}
          </h1>
          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-positive/25 bg-positive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-positive">
              <span className="size-1.5 animate-pulse-dot rounded-full bg-positive" aria-hidden />
              Live
            </span>
          )}
          {syncing && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-faint">
              <Loader2 className="size-3 animate-spin-slow" aria-hidden />
              syncing
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-muted">{description}</p>
        )}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-faint">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
