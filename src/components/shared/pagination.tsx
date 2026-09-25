"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Compact pager shared by every admin table and the user history lists. */
export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  disabled,
  className,
  label = "records",
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5",
        className
      )}
    >
      <p className="text-[11.5px] text-faint">
        Showing <span className="font-medium text-muted tabular-nums">{from}</span>–
        <span className="font-medium text-muted tabular-nums">{to}</span> of{" "}
        <span className="font-medium text-muted tabular-nums">{total}</span> {label}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Previous page"
          disabled={disabled || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <span className="min-w-[74px] text-center text-[11.5px] font-medium tabular-nums text-muted">
          {page} / {pages}
        </span>
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Next page"
          disabled={disabled || page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
