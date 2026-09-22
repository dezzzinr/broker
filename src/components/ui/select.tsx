"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
}

/** Custom dark-theme listbox select with full keyboard support. */
export function Select({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  buttonClassName,
  contentClassName,
  size = "default",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  className?: string;
  buttonClassName?: string;
  contentClassName?: string;
  size?: "default" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  useEffect(() => {
    if (open) {
      const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [open, active]);

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(a + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(options[active].value);
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          setActive(Math.max(0, options.findIndex((o) => o.value === value)));
          setOpen((o) => !o);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-white/[0.03] text-left transition-colors hover:border-border-strong",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:border-accent/50",
          size === "lg" ? "h-11 px-3.5 text-sm" : "h-9 px-3 text-[13px]",
          buttonClassName
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {current?.icon}
          <span className="truncate font-medium text-foreground">{current?.label ?? "Select…"}</span>
          {current?.hint && <span className="truncate text-xs text-muted">{current.hint}</span>}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-border bg-elevated p-1.5 shadow-[var(--shadow-pop)] animate-scale-in",
            contentClassName
          )}
        >
          {options.map((opt, i) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                data-active={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(opt.value)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                  i === active ? "bg-white/[0.06] text-foreground" : "text-muted",
                  selected && "text-foreground"
                )}
              >
                {opt.icon}
                <span className="flex-1 truncate font-medium">{opt.label}</span>
                {opt.hint && <span className="text-xs text-muted">{opt.hint}</span>}
                {selected && <Check className="size-3.5 text-accent" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
