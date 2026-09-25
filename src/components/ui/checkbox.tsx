"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
  id,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-2.5 select-none",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <span className="relative flex size-[18px] shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          className="peer absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        <span
          aria-hidden
          className={cn(
            "flex size-[18px] items-center justify-center rounded-[6px] border transition-all duration-150",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
            checked
              ? "border-accent bg-gradient-accent text-on-accent"
              : "border-border-strong bg-fill-1 text-transparent"
          )}
        >
          {checked ? <Check className="size-3" strokeWidth={3} /> : <Minus className="size-3 opacity-0" />}
        </span>
      </span>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-[13px] leading-snug text-foreground">{label}</span>}
          {description && (
            <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}
