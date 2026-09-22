"use client";

import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

/** Compact win-rate radial gauge. */
export function WinLossRadial({
  value,
  label = "Win rate",
  size = 168,
}: {
  value: number;
  label?: string;
  size?: number;
}) {
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={[{ name: label, value }]}
          innerRadius="76%"
          outerRadius="96%"
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          <RadialBar
            dataKey="value"
            cornerRadius={12}
            fill="var(--accent)"
            background={{ fill: "rgba(255,255,255,0.06)" }}
            animationDuration={900}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="text-2xl font-semibold tabular-nums text-foreground">{value.toFixed(1)}%</span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-faint">{label}</span>
      </div>
    </div>
  );
}
