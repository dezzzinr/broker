"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "@/lib/types";
import { ValueTooltip } from "./chart-tooltip";

/** Standard dark-theme area chart for portfolio/performance series. */
export function AreaChartPanel({
  data,
  height = 280,
  valueFormatter,
  xTickFormatter,
  yTickFormatter,
  color = "var(--accent)",
  className,
}: {
  data: ChartPoint[];
  height?: number;
  valueFormatter?: (v: number) => string;
  xTickFormatter?: (t: number) => string;
  yTickFormatter?: (v: number) => string;
  color?: string;
  className?: string;
}) {
  const gradId = useId();
  const fmt = valueFormatter ?? ((v: number) => `$${v.toFixed(2)}`);

  return (
    <div style={{ height }} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(t: number) =>
              xTickFormatter
                ? xTickFormatter(t)
                : new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })
            }
            stroke="var(--chart-axis)"
            tick={{ fontSize: 10, fill: "var(--faint)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
            dy={8}
          />
          <YAxis
            tickFormatter={(v: number) =>
              yTickFormatter ? yTickFormatter(v) : `$${Intl.NumberFormat("en", { notation: "compact" }).format(v)}`
            }
            stroke="var(--chart-axis)"
            tick={{ fontSize: 10, fill: "var(--faint)" }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <RechartsTooltip
            cursor={{ stroke: "var(--chart-cursor)", strokeDasharray: "3 3" }}
            content={
              <ValueTooltip
                valueFormatter={(v) => fmt(v)}
                labelFormatter={(l) =>
                  new Date(Number(l)).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })
                }
              />
            }
          />
          <Area
            type="monotone"
            dataKey="v"
            name="Value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            animationDuration={900}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
