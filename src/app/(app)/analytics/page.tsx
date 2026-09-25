"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownToLine,
  BarChart3,
  Coins,
  LineChart as LineChartIcon,
  ReceiptText,
  RefreshCcw,
  Scale,
  Target,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import type { TimeRange } from "@/lib/types";
import type { LedgerEntry } from "@/lib/types/platform";
import { formatCompactUSD, formatUSD } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { TimeRangeTabs } from "@/components/shared/time-range-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChartPanel } from "@/components/charts/area-chart-panel";
import { BarChartPanel, type BarDatum } from "@/components/charts/bar-chart-panel";
import { WinLossRadial } from "@/components/charts/win-loss-radial";
import { cn } from "@/lib/utils";

const RANGE_MS: Record<TimeRange, number> = {
  "1D": 24 * 60 * 60 * 1000,
  "7D": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "3M": 90 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
  ALL: Number.POSITIVE_INFINITY,
};

const RANGE_NOTE: Record<TimeRange, string> = {
  "1D": "Last 24 hours",
  "7D": "Trailing week",
  "1M": "Trailing month",
  "3M": "Trailing quarter",
  "1Y": "Trailing year",
  ALL: "All recorded history",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface ClosedTrade {
  asset: string;
  at: number;
  qty: number;
  proceeds: number;
  cost: number;
  fee: number;
  pnl: number;
}

/**
 * Walks the ledger chronologically and applies average-cost accounting so
 * realised P&L is derived from the trader's own fills — not from demo data.
 */
function computeRealised(entries: LedgerEntry[]): ClosedTrade[] {
  const chronological = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const positions = new Map<string, { qty: number; cost: number }>();
  const closed: ClosedTrade[] = [];

  for (const entry of chronological) {
    if (entry.type !== "buy" && entry.type !== "sell") continue;
    const at = new Date(entry.createdAt).getTime();
    const position = positions.get(entry.asset) ?? { qty: 0, cost: 0 };
    const notional = entry.amount * (entry.price || 0);

    if (entry.type === "buy") {
      position.qty += entry.amount;
      position.cost += notional + entry.fee;
      positions.set(entry.asset, position);
      continue;
    }

    const avgCost = position.qty > 0 ? position.cost / position.qty : 0;
    const costOfSale = avgCost * entry.amount;
    const proceeds = notional - entry.fee;
    closed.push({
      asset: entry.asset,
      at,
      qty: entry.amount,
      proceeds,
      cost: costOfSale,
      fee: entry.fee,
      pnl: proceeds - costOfSale,
    });

    position.qty = Math.max(0, position.qty - entry.amount);
    position.cost = Math.max(0, position.cost - costOfSale);
    positions.set(entry.asset, position);
  }

  return closed;
}

function monthKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS[(month ?? 1) - 1]} ${String(year).slice(2)}`;
}

/** Performance analytics computed from the signed-in trader's real ledger. */
export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>("3M");
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchLedger(silent = false) {
    if (silent) setRefreshing(true);
    setError(null);
    try {
      const collected: LedgerEntry[] = [];
      for (let page = 1; page <= 5; page += 1) {
        const data = await api<{ rows: LedgerEntry[]; total: number }>(
          `/api/transactions?type=all&page=${page}&pageSize=100`
        );
        collected.push(...data.rows);
        if (collected.length >= data.total || data.rows.length === 0) break;
      }
      setEntries(collected);
    } catch {
      setError("Could not load your trading history.");
      setEntries((prev) => prev ?? []);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void fetchLedger();
  }, []);

  const closed = useMemo(() => computeRealised(entries ?? []), [entries]);

  const analytics = useMemo(() => {
    const list = entries ?? [];
    const since = Date.now() - RANGE_MS[range];
    const inRange = (timestamp: number) => timestamp >= since;

    const trades = list.filter(
      (entry) => (entry.type === "buy" || entry.type === "sell") && inRange(new Date(entry.createdAt).getTime())
    );
    const buys = trades.filter((entry) => entry.type === "buy");
    const sells = trades.filter((entry) => entry.type === "sell");
    const volume = trades.reduce((sum, entry) => sum + entry.amount * (entry.price || 0), 0);
    const fees = list
      .filter((entry) => inRange(new Date(entry.createdAt).getTime()))
      .reduce((sum, entry) => sum + (entry.fee || 0), 0);
    const deposits = list.filter(
      (entry) => entry.type === "deposit" && inRange(new Date(entry.createdAt).getTime())
    );
    const depositValue = deposits.reduce((sum, entry) => sum + entry.amount, 0);
    const withdrawals = list.filter(
      (entry) => entry.type === "withdrawal" && inRange(new Date(entry.createdAt).getTime())
    );

    const closedInRange = closed.filter((trade) => inRange(trade.at));
    const wins = closedInRange.filter((trade) => trade.pnl > 0);
    const losses = closedInRange.filter((trade) => trade.pnl <= 0);
    const realised = closedInRange.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossProfit = wins.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
    const best = closedInRange.reduce((max, trade) => Math.max(max, trade.pnl), 0);
    const worst = closedInRange.reduce((min, trade) => Math.min(min, trade.pnl), 0);

    // Cumulative realised P&L curve across the selected window.
    const curve: { t: number; v: number }[] = [];
    let running = 0;
    for (const trade of closedInRange) {
      running += trade.pnl;
      curve.push({ t: trade.at, v: running });
    }

    // Monthly buckets.
    const monthlyPnl = new Map<string, number>();
    const monthlyVolume = new Map<string, number>();
    for (const trade of closedInRange) {
      const key = monthKey(trade.at);
      monthlyPnl.set(key, (monthlyPnl.get(key) ?? 0) + trade.pnl);
    }
    for (const entry of trades) {
      const key = monthKey(new Date(entry.createdAt).getTime());
      monthlyVolume.set(key, (monthlyVolume.get(key) ?? 0) + entry.amount * (entry.price || 0));
    }
    const sortedMonths = (map: Map<string, number>) =>
      Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12);

    // Per-asset realised performance.
    const perAsset = new Map<string, { pnl: number; volume: number; trades: number }>();
    for (const trade of closedInRange) {
      const bucket = perAsset.get(trade.asset) ?? { pnl: 0, volume: 0, trades: 0 };
      bucket.pnl += trade.pnl;
      bucket.volume += trade.proceeds;
      bucket.trades += 1;
      perAsset.set(trade.asset, bucket);
    }
    for (const entry of buys) {
      const bucket = perAsset.get(entry.asset) ?? { pnl: 0, volume: 0, trades: 0 };
      bucket.volume += entry.amount * (entry.price || 0);
      bucket.trades += 1;
      perAsset.set(entry.asset, bucket);
    }

    return {
      trades: trades.length,
      buys: buys.length,
      sells: sells.length,
      volume,
      fees,
      depositCount: deposits.length,
      depositValue,
      withdrawalCount: withdrawals.length,
      realised,
      wins: wins.length,
      losses: losses.length,
      winRate: closedInRange.length > 0 ? (wins.length / closedInRange.length) * 100 : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0,
      best,
      worst,
      avgTrade: trades.length > 0 ? volume / trades.length : 0,
      curve,
      monthlyPnl: sortedMonths(monthlyPnl).map(([key, value]) => ({
        label: monthLabel(key),
        value,
      })),
      monthlyVolume: sortedMonths(monthlyVolume).map(([key, value]) => ({
        label: monthLabel(key),
        value,
      })),
      perAsset: Array.from(perAsset.entries())
        .map(([asset, stats]) => ({ asset, ...stats }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 6),
      closedCount: closedInRange.length,
    };
  }, [entries, closed, range]);

  const loading = entries === null;

  const chips = [
    { icon: Activity, label: "Orders filled", value: String(analytics.trades), hint: `${analytics.buys} buys · ${analytics.sells} sells` },
    { icon: Coins, label: "Volume traded", value: formatCompactUSD(analytics.volume), hint: `Avg ${formatUSD(analytics.avgTrade)} per order` },
    { icon: TrendingUp, label: "Realised P&L", value: `${analytics.realised >= 0 ? "+" : "−"}${formatCompactUSD(Math.abs(analytics.realised))}`, hint: `${analytics.closedCount} closed position(s)`, tone: analytics.realised >= 0 ? "positive" : "negative" },
    { icon: ReceiptText, label: "Fees paid", value: formatCompactUSD(analytics.fees), hint: "0.1% per fill" },
    { icon: ArrowDownToLine, label: "Deposited", value: formatCompactUSD(analytics.depositValue), hint: `${analytics.depositCount} approved deposit(s)` },
  ];

  if (error && !loading && (entries?.length ?? 0) === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Performance computed from your own trading history." />
        <EmptyState
          icon={BarChart3}
          title="Analytics unavailable"
          description={error}
          action={
            <Button variant="secondary" size="sm" onClick={() => void fetchLedger(true)}>
              <RefreshCcw className="size-4" aria-hidden />
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Execution quality, realised performance and funding totals — calculated from your real ledger entries."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void fetchLedger(true)} disabled={refreshing}>
              <RefreshCcw className={cn("size-4", refreshing && "animate-spin-slow")} aria-hidden />
              Refresh
            </Button>
            <TimeRangeTabs value={range} onChange={setRange} />
          </div>
        }
      />

      <p className="text-[11.5px] text-faint">
        {RANGE_NOTE[range]}
        {entries && entries.length > 0 ? ` · ${entries.length} ledger entries analysed` : ""}
      </p>

      {/* KPI chips */}
      <Card className="p-2">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {chips.map((chip) => {
            const Icon = chip.icon;
            return (
              <div key={chip.label} className="rounded-xl p-4 transition-colors hover:bg-fill-1">
                <dt className="flex items-center gap-2 text-[11px] font-medium text-muted">
                  <Icon className="size-3.5 text-accent" aria-hidden />
                  {chip.label}
                </dt>
                <dd
                  className={cn(
                    "mt-1.5 text-xl font-semibold tabular-nums",
                    chip.tone === "positive"
                      ? "text-positive"
                      : chip.tone === "negative"
                        ? "text-negative"
                        : "text-foreground"
                  )}
                >
                  {loading ? <Skeleton className="h-6 w-20" /> : chip.value}
                </dd>
                <dd className="mt-0.5 text-[10.5px] text-faint">{chip.hint}</dd>
              </div>
            );
          })}
        </dl>
      </Card>

      {!loading && analytics.trades === 0 && analytics.depositCount === 0 ? (
        <EmptyState
          icon={LineChartIcon}
          title="No analytics yet"
          description="Analytics are built from your deposits and filled orders. Fund your account and place a trade to see performance here."
          action={
            <Link
              href="/deposits"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-accent px-4 text-[13px] font-medium text-on-accent"
            >
              <ArrowDownToLine className="size-4" aria-hidden />
              Make a deposit
            </Link>
          }
        />
      ) : (
        <>
          {/* Realised P&L curve + win/loss */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <div className="p-5 pb-0">
                <h2 className="text-[15px] font-semibold text-foreground">Cumulative realised P&amp;L</h2>
                <p className="mt-0.5 text-xs text-muted">
                  {RANGE_NOTE[range]} · average-cost accounting over your closed positions
                </p>
              </div>
              <div className="p-4">
                {loading ? (
                  <Skeleton className="h-[280px] rounded-xl" />
                ) : analytics.curve.length > 0 ? (
                  <AreaChartPanel
                    data={analytics.curve}
                    height={280}
                    color={analytics.realised >= 0 ? "var(--positive)" : "var(--negative)"}
                    valueFormatter={(v) => `${v >= 0 ? "+" : "−"}${formatUSD(Math.abs(v))}`}
                  />
                ) : (
                  <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-center">
                    <Scale className="size-5 text-faint" aria-hidden />
                    <p className="text-[12.5px] text-muted">
                      No closed positions in this window yet.
                    </p>
                    <p className="max-w-xs text-[11px] text-faint">
                      Realised P&amp;L appears once a sell order settles against an existing position.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="flex flex-col">
              <div className="p-5 pb-0">
                <h2 className="text-[15px] font-semibold text-foreground">Win / loss</h2>
                <p className="mt-0.5 text-xs text-muted">Closed positions in range</p>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-5">
                {loading ? (
                  <Skeleton className="h-[240px] w-full rounded-xl" />
                ) : analytics.closedCount === 0 ? (
                  <p className="py-10 text-center text-[12px] text-muted">
                    No closed positions in this window.
                  </p>
                ) : (
                  <>
                    <WinLossRadial value={Number(analytics.winRate.toFixed(1))} />
                    <div className="w-full space-y-2.5">
                      {[
                        { label: "Wins", count: analytics.wins, color: "var(--positive)", pct: analytics.winRate },
                        { label: "Losses", count: analytics.losses, color: "var(--negative)", pct: 100 - analytics.winRate },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-3 text-[12px]">
                          <span className="w-12 text-muted">{row.label}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fill-2">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${row.pct}%`, backgroundColor: row.color }}
                            />
                          </div>
                          <span className="w-8 text-right tabular-nums text-foreground">
                            {row.count}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2.5">
                      <div className="rounded-xl border border-positive/20 bg-positive/5 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-faint">Best trade</p>
                        <p className="mt-1 text-[14px] font-semibold tabular-nums text-positive">
                          +{formatUSD(analytics.best)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-negative/20 bg-negative/5 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-faint">Worst trade</p>
                        <p className="mt-1 text-[14px] font-semibold tabular-nums text-negative">
                          −{formatUSD(Math.abs(analytics.worst))}
                        </p>
                      </div>
                    </div>
                    <div className="w-full rounded-xl border border-border bg-fill-1 p-3">
                      <p className="flex items-center justify-between text-[11px] text-muted">
                        <span className="flex items-center gap-1.5">
                          <Target className="size-3.5 text-accent" aria-hidden />
                          Profit factor
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums text-foreground">
                          {analytics.profitFactor > 0 ? analytics.profitFactor.toFixed(2) : "—"}
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Monthly P/L + volume */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <div className="p-5 pb-0">
                <h2 className="text-[15px] font-semibold text-foreground">Realised P&amp;L by month</h2>
                <p className="mt-0.5 text-xs text-muted">Closed positions, last 12 months</p>
              </div>
              <div className="p-4">
                {loading ? (
                  <Skeleton className="h-[250px] rounded-xl" />
                ) : analytics.monthlyPnl.length > 0 ? (
                  <BarChartPanel
                    data={analytics.monthlyPnl as BarDatum[]}
                    height={250}
                    signedBars
                    valueFormatter={(v) => `${v >= 0 ? "+" : "−"}${formatCompactUSD(Math.abs(v))}`}
                  />
                ) : (
                  <p className="flex h-[250px] items-center justify-center text-[12px] text-muted">
                    No realised P&amp;L recorded in this window.
                  </p>
                )}
              </div>
            </Card>

            <Card>
              <div className="p-5 pb-0">
                <h2 className="text-[15px] font-semibold text-foreground">Trading volume</h2>
                <p className="mt-0.5 text-xs text-muted">Monthly notional traded</p>
              </div>
              <div className="p-4">
                {loading ? (
                  <Skeleton className="h-[250px] rounded-xl" />
                ) : analytics.monthlyVolume.length > 0 ? (
                  <BarChartPanel
                    data={analytics.monthlyVolume as BarDatum[]}
                    height={250}
                    valueFormatter={(v) => formatCompactUSD(v)}
                  />
                ) : (
                  <p className="flex h-[250px] items-center justify-center text-[12px] text-muted">
                    No orders filled in this window.
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Per asset */}
          <Card className="overflow-hidden">
            <header className="border-b border-border px-5 py-4">
              <h2 className="text-[15px] font-semibold text-foreground">By market</h2>
              <p className="mt-0.5 text-xs text-muted">
                Where your volume and realised results came from in this window
              </p>
            </header>
            {loading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : analytics.perAsset.length === 0 ? (
              <p className="px-5 py-10 text-center text-[12.5px] text-muted">
                No market activity in this window.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {analytics.perAsset.map((row) => (
                  <li key={row.asset} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="w-14 shrink-0 text-[12.5px] font-semibold text-foreground">
                      {row.asset}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-fill-2">
                        <span
                          className="block h-full rounded-full bg-accent transition-[width] duration-700"
                          style={{
                            width: `${
                              analytics.perAsset[0].volume > 0
                                ? (row.volume / analytics.perAsset[0].volume) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </span>
                      <span className="mt-1 block text-[10.5px] text-faint">
                        {row.trades} order(s) · {formatCompactUSD(row.volume)} notional
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-[12.5px] font-semibold tabular-nums",
                        row.pnl > 0 ? "text-positive" : row.pnl < 0 ? "text-negative" : "text-muted"
                      )}
                    >
                      {row.pnl === 0 ? "—" : `${row.pnl > 0 ? "+" : "−"}${formatUSD(Math.abs(row.pnl))}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <p className="text-center text-[11px] text-faint">
        Computed on-device from your ledger entries. Withdrawals in this window:{" "}
        {analytics.withdrawalCount}.
      </p>
    </div>
  );
}
