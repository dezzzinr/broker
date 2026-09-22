"use client";

import { useId } from "react";
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

/** Semi-circular Fear & Greed style gauge (0 = Extreme Fear, 100 = Extreme Greed). */
export function SentimentGauge({
  value,
  size = 210,
  caption,
}: {
  value: number;
  size?: number;
  caption?: string;
}) {
  const gradId = useId();
  const zone =
    value >= 70 ? "Greed" : value >= 55 ? "Bullish" : value >= 45 ? "Neutral" : value >= 25 ? "Fear" : "Extreme Fear";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full" style={{ maxWidth: size, height: size / 1.75 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={[{ name: "Sentiment", value }]}
            innerRadius="72%"
            outerRadius="100%"
            startAngle={180}
            endAngle={0}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--negative)" />
                <stop offset="50%" stopColor="var(--warning)" />
                <stop offset="100%" stopColor="var(--positive)" />
              </linearGradient>
            </defs>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              fill={`url(#${gradId})`}
              background={{ fill: "rgba(255,255,255,0.06)" }}
              animationDuration={900}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center"
          aria-hidden
        >
          <span className="text-[34px] font-semibold leading-none tabular-nums text-foreground">{value}</span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gradient">{zone}</span>
        </div>
      </div>
      {caption && <p className="mt-1 text-[11px] text-faint">{caption}</p>}
      <div className="mt-2 flex w-full max-w-[220px] justify-between text-[10px] font-medium uppercase tracking-wide text-faint">
        <span className="text-negative">Fear</span>
        <span className="text-positive">Greed</span>
      </div>
    </div>
  );
}
