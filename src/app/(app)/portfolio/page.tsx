"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  PieChart as PieChartIcon,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { PortfolioSummary, TimeRange } from "@/lib/types";
import { portfolioService } from "@/lib/services";
import { formatCompactUSD, formatPercent, formatPrice, formatUSD } from "@/lib/format";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { PercentageBadge } from "@/components/shared/percentage-badge";
import { CoinIcon } from "@/components/shared/coin-icon";
import { TimeRangeTabs } from "@/components/shared/time-range-tabs";
import { AreaChartPanel } from "@/components/charts/area-chart-panel";
import { AssetAllocation } from "@/components/charts/asset-allocation";
import { toAllocationSlices } from "@/lib/services/portfolio.service";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function PortfolioPage() {
  const { getCoin, refresh } = useLiveMarket();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>("3M");
  const [performance, setPerformance] = useState<PortfolioSummary["performance"]>([]);

  useEffect(() => {
    let cancelled = false;
    portfolioService
      .getSummary()
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load your portfolio. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPerformance([]);
    portfolioService
      .getAnalytics(range)
      .then((a) => {
        if (!cancelled) setPerformance(a.performance);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [range]);

  // Blend live prices into holdings
  const rows = useMemo(() => {
    if (!summary) return [];
    return summary.holdings.map((h) => {
      const live = getCoin(h.coinId);
      const price = live?.price ?? h.coin.price;
      const value = h.amount * price;
      const cost = h.amount * h.avgCost;
      return {
        ...h,
        coin: live ?? h.coin,
        value,
        pnl: value - cost,
        pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
      };
    });
  }, [summary, getCoin]);

  const liveTotal = rows.reduce((s, r) => s + r.value, 0);
  const liveToday = rows.reduce((s, r) => s + r.value * (r.coin.change24h / 100), 0);

  const allocation = useMemo(
    () =>
      toAllocationSlices({
        ...(summary as PortfolioSummary),
        holdings: rows,
      }),
    [summary, rows]
  );

  if (error) {
    return (
      <div>
        <PageHeader title="Portfolio" description="Track balances, allocation and performance." />
        <EmptyState
          className="mt-8"
          icon={AlertTriangle}
          title="Something went wrong"
          description={error}
          action={
            <Button variant="secondary" size="sm" onClick={refresh}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio"
        description="Your combined holdings across spot and demo accounts. Values update with the live feed."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary ? (
          <>
            <StatCard
              label="Total Portfolio Value"
              value={formatUSD(liveTotal)}
              delta={liveToday !== 0 ? (liveToday / liveTotal) * 100 : 0}
              icon={Wallet}
            />
            <StatCard
              label="Today's Profit / Loss"
              value={
                <span className={liveToday >= 0 ? "text-positive" : "text-negative"}>
                  {liveToday >= 0 ? "+" : "−"}
                  {formatUSD(Math.abs(liveToday))}
                </span>
              }
              icon={TrendingUp}
              footer="Since 00:00 UTC"
            />
            <StatCard
              label="Total Profit / Loss"
              value={
                <span className={summary.totalPL >= 0 ? "text-positive" : "text-negative"}>
                  {summary.totalPL >= 0 ? "+" : "−"}
                  {formatUSD(Math.abs(summary.totalPL))}
                </span>
              }
              delta={summary.totalPLPct}
              icon={PieChartIcon}
              footer={`Cost basis ${formatUSD(summary.totalCost)}`}
            />
            <StatCard
              label="Available Cash"
              value={formatUSD(summary.availableCash)}
              icon={ArrowLeftRight}
              footer="Settled USDT balance"
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-2xl" />)
        )}
      </div>

      {/* Performance + allocation */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-0">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Portfolio performance</h2>
              <p className="mt-0.5 text-xs text-muted">Total value over time</p>
            </div>
            <TimeRangeTabs value={range} onChange={setRange} />
          </div>
          <div className="p-3 pb-4 sm:p-4">
            {performance.length > 0 ? (
              <AreaChartPanel data={performance} height={280} />
            ) : (
              <Skeleton className="h-[280px] rounded-xl" aria-label="Loading performance chart" />
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5 pb-0">
            <h2 className="text-[15px] font-semibold text-foreground">Asset allocation</h2>
            <p className="mt-0.5 text-xs text-muted">By current market value</p>
          </div>
          <div className="p-5">
            {summary ? (
              <AssetAllocation
                slices={allocation}
                centerLabel="Total"
                centerValue={formatCompactUSD(liveTotal)}
              />
            ) : (
              <Skeleton className="h-[220px] rounded-xl" />
            )}
          </div>
        </Card>
      </div>

      {/* Holdings */}
      <Card>
        <div className="p-5 pb-1">
          <h2 className="text-[15px] font-semibold text-foreground">Holdings</h2>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Asset</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Avg cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">P/L</TableHead>
                <TableHead className="pr-5 text-right">Allocation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary
                ? rows.map((row) => (
                    <TableRow key={row.coinId}>
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-3">
                          <CoinIcon symbol={row.coin.symbol} color={row.coin.color} size={30} />
                          <div>
                            <p className="text-[13px] font-medium text-foreground">{row.coin.name}</p>
                            <p className="text-[11px] text-faint">{row.coin.symbol}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted">
                        {row.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted">{formatPrice(row.avgCost)}</TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">{formatPrice(row.coin.price)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-foreground">
                        {formatUSD(row.value)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          <PercentageBadge value={row.pnlPct} size="sm" withIcon={false} />
                          <span
                            className={
                              "text-[11px] tabular-nums " + (row.pnl >= 0 ? "text-positive" : "text-negative")
                            }
                          >
                            {row.pnl >= 0 ? "+" : "−"}
                            {formatUSD(Math.abs(row.pnl))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-5">
                        <div className="ml-auto flex w-32 items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-gradient-accent"
                              style={{ width: `${Math.min(100, row.allocationPct)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-[11px] tabular-nums text-faint">
                            {formatPercent(row.allocationPct, 1)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                : Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
