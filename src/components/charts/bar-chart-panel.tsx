"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ValueTooltip } from "./chart-tooltip";

export interface BarDatum {
  label: string;
  value: number;
  /** Optional override color (e.g. signed P/L bars) */
  color?: string;
}

/** Rounded dark-theme bar chart; colors bars by sign when `signedBars`. */
export function BarChartPanel({
  data,
  height = 240,
  valueFormatter,
  signedBars = false,
  color = "var(--accent)",
  className,
}: {
  data: BarDatum[];
  height?: number;
  valueFormatter?: (v: number) => string;
  signedBars?: boolean;
  color?: string;
  className?: string;
}) {
  const gradId = useId();
  const fmt = valueFormatter ?? ((v: number) => String(v));
  const hasNegative = data.some((d) => d.value < 0);

  return (
    <div style={{ height }} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={color} stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="rgba(255,255,255,0.25)"
            tick={{ fontSize: 10, fill: "var(--faint)" }}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            tickFormatter={(v: number) => fmt(v)}
            stroke="rgba(255,255,255,0.25)"
            tick={{ fontSize: 10, fill: "var(--faint)" }}
            tickLine={false}
            axisLine={false}
            width={52}
            domain={hasNegative ? ["auto", "auto"] : undefined}
          />
          <RechartsTooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            content={<ValueTooltip valueFormatter={(v) => fmt(v)} />}
          />
          <Bar dataKey="value" name="Value" radius={[5, 5, hasNegative ? 0 : 5, hasNegative ? 0 : 5]} animationDuration={800} maxBarSize={38}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.color ?? (signedBars ? (d.value >= 0 ? "var(--positive)" : "var(--negative)") : `url(#${gradId})`)}
                fillOpacity={0.9}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
