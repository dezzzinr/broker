"use client";

import { useId } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ValueTooltip } from "./chart-tooltip";

export interface ForecastPoint {
  t: number;
  base: number;
  expected: number;
  low: number;
  band: number;
}

/** AI forecast line with a shaded confidence band. */
export function ForecastChart({
  data,
  height = 240,
  valueFormatter,
  className,
}: {
  data: ForecastPoint[];
  height?: number;
  valueFormatter?: (v: number) => string;
  className?: string;
}) {
  const bandId = useId();
  const fmt = valueFormatter ?? ((v: number) => `$${v.toFixed(0)}`);

  return (
    <div style={{ height }} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={bandId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(t: number) =>
              new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })
            }
            stroke="var(--chart-axis)"
            tick={{ fontSize: 10, fill: "var(--faint)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
            dy={8}
          />
          <YAxis
            domain={[(dataMin: number) => dataMin * 0.995, (dataMax: number) => dataMax * 1.005]}
            tickFormatter={(v: number) => fmt(v)}
            stroke="var(--chart-axis)"
            tick={{ fontSize: 10, fill: "var(--faint)" }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <RechartsTooltip
            cursor={{ stroke: "var(--chart-cursor)", strokeDasharray: "3 3" }}
            content={
              <ValueTooltip
                items={["expected", "low", "high"]}
                valueFormatter={(v) => fmt(v)}
                labelFormatter={(l) =>
                  new Date(Number(l)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })
                }
              />
            }
          />
          <Area
            dataKey="low"
            stackId="band"
            stroke="none"
            fill="transparent"
            isAnimationActive={false}
          />
          <Area
            dataKey="band"
            stackId="band"
            stroke="none"
            fill={`url(#${bandId})`}
            isAnimationActive={false}
            name="Band"
          />
          <Line
            type="monotone"
            dataKey="expected"
            name="Forecast"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="base"
            name="Price"
            stroke="var(--chart-axis)"
            strokeWidth={1.5}
            dot={false}
            animationDuration={900}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
