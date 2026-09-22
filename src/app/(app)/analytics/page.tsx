"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Scale, Target, Zap } from "lucide-react";
import type { TimeRange } from "@/lib/types";
import type { AnalyticsData } from "@/lib/services/portfolio.service";
import { portfolioService } from "@/lib/services";
import { formatCompactUSD, formatUSD } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { TimeRangeTabs } from "@/components/shared/time-range-tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChartPanel } from "@/components/charts/area-chart-panel";
import { BarChartPanel } from "@/components/charts/bar-chart-panel";
import { WinLossRadial } from "@/components/charts/win-loss-radial";
import { cn } from "@/lib/utils";

const RANGE_NOTE: Record<TimeRange, string> = {
  "1D": "Intraday session",
  "7D": "Trailing week",
  "1M": "Trailing month",
  "3M": "Trailing quarter",
  "1Y": "Trailing year",
  ALL: "All available history",
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>("3M");
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    portfolioService
      .getAnalytics(range)
      .then((a) => {
        if (!cancelled) setData(a);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [range]);

  const plBars = useMemo(
    () => (data ? data.monthlyPL.map((m) => ({ label: m.month, value: m.pl })) : []),
    [data]
  );
  const volumeBars = useMemo(
    () => (data ? data.monthlyVolume.map((m) => ({ label: m.month, value: m.volume })) : []),
    [data]
  );

  const chips = useMemo(
    () => [
      { icon: Activity, label: "Total trades", value: data ? String(data.stats.totalTrades) : null },
      { icon: Target, label: "Win rate", value: data ? `${data.stats.winRate}%` : null },
      { icon: Scale, label: "Profit factor", value: data ? data.stats.profitFactor.toFixed(2) : null },
      { icon: Clock3, label: "Avg hold", value: data ? `${data.stats.avgHoldHours} h` : null },
      { icon: Zap, label: "Sharpe", value: data ? data.stats.sharpe.toFixed(2) : null },
    ],
    [data]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Deep-dive into trading performance, risk and execution quality."
        actions={<TimeRangeTabs value={range} onChange={setRange} />}
      />

      {/* KPI chips */}
      <Card className="p-2">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {chips.map((chip) => {
            const Icon = chip.icon;
            return (
              <div key={chip.label} className="rounded-xl p-4 transition-colors hover:bg-white/[0.02]">
                <dt className="flex items-center gap-2 text-[11px] font-medium text-muted">
                  <Icon className="size-3.5 text-accent" aria-hidden />
                  {chip.label}
                </dt>
                <dd className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">
                  {chip.value ?? <Skeleton className="h-6 w-14" />}
                </dd>
              </div>
            );
          })}
        </dl>
      </Card>

      {/* Performance + win/loss */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="p-5 pb-0">
            <h2 className="text-[15px] font-semibold text-foreground">Portfolio performance</h2>
            <p className="mt-0.5 text-xs text-muted">{RANGE_NOTE[range]} · simulated equity curve</p>
          </div>
          <div className="p-4">
            {data ? (
              <AreaChartPanel data={data.performance} height={280} />
            ) : (
              <Skeleton className="h-[280px] rounded-xl" />
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="p-5 pb-0">
            <h2 className="text-[15px] font-semibold text-foreground">Win / loss</h2>
            <p className="mt-0.5 text-xs text-muted">Closed positions</p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-5">
            {data ? (
              <>
                <WinLossRadial value={data.stats.winRate} />
                <div className="w-full space-y-2.5">
                  {[
                    { label: "Wins", count: data.stats.wins, color: "var(--positive)", pct: data.stats.winRate },
                    { label: "Losses", count: data.stats.losses, color: "var(--negative)", pct: 100 - data.stats.winRate },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3 text-[12px]">
                      <span className="w-12 text-muted">{row.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${row.pct}%`, backgroundColor: row.color }}
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums text-foreground">{row.count}</span>
                    </div>
                  ))}
                </div>
                <div className="grid w-full grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-positive/20 bg-positive/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-faint">Best trade</p>
                    <p className="mt-1 text-[14px] font-semibold tabular-nums text-positive">
                      +{formatUSD(data.stats.bestTrade)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-negative/20 bg-negative/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-faint">Worst trade</p>
                    <p className="mt-1 text-[14px] font-semibold tabular-nums text-negative">
                      −{formatUSD(Math.abs(data.stats.worstTrade))}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <Skeleton className="h-[280px] w-full rounded-xl" />
            )}
          </div>
        </Card>
      </div>

      {/* Monthly P/L + volume */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="p-5 pb-0">
            <h2 className="text-[15px] font-semibold text-foreground">Profit / loss by month</h2>
            <p className="mt-0.5 text-xs text-muted">Realized, last 12 months</p>
          </div>
          <div className="p-4">
            {plBars.length > 0 ? (
              <BarChartPanel
                data={plBars}
                height={250}
                signedBars
                valueFormatter={(v) => formatCompactUSD(v)}
              />
            ) : (
              <Skeleton className="h-[250px] rounded-xl" />
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5 pb-0">
            <h2 className="text-[15px] font-semibold text-foreground">Trading volume</h2>
            <p className="mt-0.5 text-xs text-muted">Monthly notional traded</p>
          </div>
          <div className="p-4">
            {volumeBars.length > 0 ? (
              <BarChartPanel
                data={volumeBars}
                height={250}
                valueFormatter={(v) => formatCompactUSD(v)}
              />
            ) : (
              <Skeleton className="h-[250px] rounded-xl" />
            )}
          </div>
        </Card>
      </div>

      <p className={cn("text-center text-[11px] text-faint")}>
        Analytics are computed from simulated demo activity.
      </p>
    </div>
  );
}
