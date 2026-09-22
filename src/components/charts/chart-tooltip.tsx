"use client";

/** Shared dark tooltip content for Recharts charts. */
export function ValueTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  items,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }[];
  label?: string | number;
  labelFormatter?: (label: string | number, payload?: unknown) => string;
  valueFormatter?: (value: number, entry?: { dataKey?: string | number; name?: string }) => string;
  /** Only render these dataKeys (order preserved); default: all */
  items?: (string | number)[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const filtered = items ? payload.filter((p) => items.includes(p.dataKey as string | number)) : payload;

  return (
    <div className="rounded-xl border border-border bg-elevated px-3 py-2 shadow-[var(--shadow-pop)]">
      {label !== undefined && labelFormatter && (
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-faint">
          {labelFormatter(label, payload)}
        </p>
      )}
      <div className="space-y-0.5">
        {filtered.map((entry, i) => {
          const raw = typeof entry.value === "number" ? entry.value : Number(entry.value);
          return (
            <div key={i} className="flex items-center gap-2 text-[12px]">
              {entry.color && (
                <span className="size-1.5 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
              )}
              {entry.name && <span className="text-muted">{entry.name}</span>}
              <span className="ml-auto font-semibold tabular-nums text-foreground">
                {valueFormatter ? valueFormatter(raw, entry) : String(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
