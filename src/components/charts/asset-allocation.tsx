"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { AllocationSlice } from "@/lib/types";
import { formatCompactUSD } from "@/lib/format";
import { ValueTooltip } from "./chart-tooltip";

/** Donut allocation chart with a legend list. */
export function AssetAllocation({
  slices,
  centerLabel,
  centerValue,
  height = 190,
  valueFormatter = formatCompactUSD,
  showLegendValues = true,
}: {
  slices: AllocationSlice[];
  centerLabel: string;
  centerValue: string;
  height?: number;
  valueFormatter?: (v: number) => string;
  showLegendValues?: boolean;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative w-full max-w-[210px] shrink-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <RechartsTooltip
              content={<ValueTooltip valueFormatter={(v) => valueFormatter(v)} />}
            />
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="94%"
              paddingAngle={3}
              cornerRadius={5}
              stroke="none"
              animationDuration={800}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
          <span className="text-[10px] font-medium uppercase tracking-wider text-faint">{centerLabel}</span>
          <span className="mt-0.5 text-[15px] font-semibold tabular-nums text-foreground">{centerValue}</span>
        </div>
      </div>
      <ul className="w-full space-y-2.5">
        {slices.map((s) => (
          <li key={s.id} className="flex items-center gap-2.5 text-[13px]">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            <span className="font-medium text-foreground">{s.label}</span>
            {showLegendValues && (
              <span className="ml-auto tabular-nums text-muted">{valueFormatter(s.value)}</span>
            )}
            <span className="w-12 text-right tabular-nums text-faint">
              {((s.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
