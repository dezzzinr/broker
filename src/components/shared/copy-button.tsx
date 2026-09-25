"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Copies a value to the clipboard with a brief confirmation state. */
export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  className,
  compact = false,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for older browsers / non-secure contexts
        const area = document.createElement("textarea");
        area.value = value;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={`${copied ? copiedLabel : label}: ${value}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border text-[11px] font-medium transition-all",
        copied
          ? "border-positive/35 bg-positive/10 text-positive"
          : "border-border bg-fill-1 text-muted hover:bg-fill-2 hover:text-foreground",
        compact ? "size-7 justify-center px-0" : "px-2 py-1",
        className
      )}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {!compact && (copied ? copiedLabel : label)}
    </button>
  );
}
