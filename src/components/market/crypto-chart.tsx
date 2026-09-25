"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  YAxis,
} from "recharts";
import type { ChartPoint } from "@/lib/types";
import { formatPrice } from "@/lib/format";

/**
 * Thin, glowing sparkline with a soft gradient fill.
 * `interactive` enables a price tooltip on hover.
 */
export function CryptoChart({
  data,
  color,
  height = 64,
  lineWidth = 1.75,
  interactive = false,
  showLastDot = true,
  className,
}: {
  data: ChartPoint[];
  color: string;
  height?: number;
  lineWidth?: number;
  interactive?: boolean;
  showLastDot?: boolean;
  className?: string;
}) {
  const gradId = useId();
  if (data.length === 0) return <div style={{ height }} className={className} />;

  const values = data.map((d) => d.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.12 || max * 0.002;

  return (
    <div style={{ height }} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.26} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[min - pad, max + pad]} />
          {interactive && (
            <RechartsTooltip
              cursor={{ stroke: "var(--chart-cursor)", strokeWidth: 1, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as ChartPoint;
                return (
                  <div className="rounded-lg border border-border bg-elevated px-2.5 py-1.5 shadow-[var(--shadow-pop)]">
                    <p className="text-[12px] font-semibold tabular-nums text-foreground">
                      {formatPrice(p.v)}
                    </p>
                    <p className="text-[10px] text-faint">
                      {new Date(p.t).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })}
                    </p>
                  </div>
                );
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={lineWidth}
            fill={`url(#${gradId})`}
            isAnimationActive
            animationDuration={900}
            dot={
              showLastDot
                ? (props) => {
                    const { cx, cy, index } = props as { cx?: number; cy?: number; index: number };
                    const isLast = index === data.length - 1 && cx !== undefined && cy !== undefined;
                    return (
                      <g key="last-dot">
                        {isLast ? (
                          <>
                            <circle cx={cx} cy={cy} r={5.5} fill={color} opacity={0.22} />
                            <circle
                              cx={cx}
                              cy={cy}
                              r={2.6}
                              fill={color}
                              stroke="var(--card)"
                              strokeWidth={1.4}
                              style={{ filter: `drop-shadow(0 0 5px ${color})` }}
                            />
                          </>
                        ) : null}
                      </g>
                    );
                  }
                : false
            }
            activeDot={interactive ? { r: 3.5, strokeWidth: 0, fill: color } : false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
