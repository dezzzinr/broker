"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Coins,
  PieChart as PieChartIcon,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";
import { useWallet } from "@/components/providers/wallet-provider";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { PercentageBadge } from "@/components/shared/percentage-badge";
import { CoinIcon } from "@/components/shared/coin-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { AssetAllocation } from "@/components/charts/asset-allocation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatAmount, formatPrice, formatUSD } from "@/lib/format";
import type { AllocationSlice } from "@/lib/types";

const CASH_ASSETS = new Set(["USD", "USDT"]);
const CASH_COLOR = "var(--chart-track)";

export default function PortfolioPage() {
  const { balances, loading, error, refresh } = useWallet();
  const { coins, loading: marketLoading } = useLiveMarket();

  const coinBySymbol = useMemo(
    () => new Map(coins.map((coin) => [coin.symbol.toUpperCase(), coin])),
    [coins]
  );

  const positions = useMemo(() => {
    const rows = balances
      .map((balance) => {
        const coin = coinBySymbol.get(balance.asset.toUpperCase());
        const isCash = CASH_ASSETS.has(balance.asset.toUpperCase());
        const price = isCash ? 1 : (coin?.price ?? 0);
        const value = balance.amount * price;
        const cost = isCash ? balance.amount : balance.amount * balance.avgCost;
        const pnl = value - cost;
        const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
        const dayChange = isCash ? 0 : value * ((coin?.change24h ?? 0) / 100);
        return {
          asset: balance.asset,
          amount: balance.amount,
          avgCost: isCash ? 1 : balance.avgCost,
          price,
          value,
          cost,
          pnl,
          pnlPct,
          dayChange,
          isCash,
          coin,
        };
      })
      .filter((row) => row.value > 0.0001 || row.amount > 0)
      .sort((a, b) => b.value - a.value);

    const total = rows.reduce((sum, row) => sum + row.value, 0);
    const cost = rows.reduce((sum, row) => sum + row.cost, 0);
    const dayChange = rows.reduce((sum, row) => sum + row.dayChange, 0);
    const cash = rows.filter((row) => row.isCash).reduce((sum, row) => sum + row.value, 0);

    return { rows, total, cost, dayChange, cash, pnl: total - cost };
  }, [balances, coinBySymbol]);

  const slices = useMemo<AllocationSlice[]>(
    () =>
      positions.rows
        .filter((row) => row.value > 0)
        .map((row) => ({
          id: row.asset,
          label: row.asset,
          value: row.value,
          color: row.isCash ? CASH_COLOR : (row.coin?.color ?? "var(--accent)"),
        })),
    [positions.rows]
  );

  const dayPct = positions.total > 0 ? (positions.dayChange / positions.total) * 100 : 0;
  const pnlPct = positions.cost > 0 ? (positions.pnl / positions.cost) * 100 : 0;
  const investedShare = positions.total > 0 ? ((positions.total - positions.cash) / positions.total) * 100 : 0;
  const isLoading = loading || (marketLoading && coins.length === 0);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Portfolio" description="Track balances, allocation and performance." />
        <EmptyState
          icon={PieChartIcon}
          title="Could not load your portfolio"
          description={error}
          action={
            <Button variant="secondary" size="sm" onClick={() => void refresh()}>
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
        title="Portfolio"
        description="Everything you hold on Quantix, valued live — cash from approved deposits plus the positions your trades have built."
        actions={
          <>
            <Link
              href="/trade"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-fill-2 px-4 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong hover:bg-fill-3"
            >
              <ArrowLeftRight className="size-4" aria-hidden />
              Trade
            </Link>
            <Link
              href="/deposits"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-accent px-4 text-[13px] font-medium text-on-accent shadow-[0_4px_16px_-6px_var(--accent-glow)] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <ArrowDownToLine className="size-4" aria-hidden />
              Deposit
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[118px] rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Portfolio value"
              value={formatUSD(positions.total)}
              icon={WalletIcon}
              delta={dayPct}
              footer={`${positions.rows.length} asset(s) held`}
            />
            <StatCard
              label="Unrealised P&L"
              value={`${positions.pnl >= 0 ? "+" : "−"}${formatUSD(Math.abs(positions.pnl))}`}
              icon={TrendingUp}
              delta={pnlPct}
              footer={`Cost basis ${formatUSD(positions.cost)}`}
            />
            <StatCard
              label="24h change"
              value={`${positions.dayChange >= 0 ? "+" : "−"}${formatUSD(Math.abs(positions.dayChange))}`}
              footer="Across your crypto positions"
            />
            <StatCard
              label="Cash available"
              value={formatUSD(positions.cash)}
              icon={Coins}
              footer={`${investedShare.toFixed(1)}% invested`}
            />
          </>
        )}
      </div>

      {!isLoading && positions.rows.length === 0 ? (
        <EmptyState
          icon={PieChartIcon}
          title="Your portfolio is empty"
          description="Fund your account with a manual deposit and place your first trade — your allocation and performance will build up here."
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
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          {/* Positions */}
          <Card className="overflow-hidden">
            <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-[14px] font-semibold text-foreground">Positions</h2>
                <p className="mt-0.5 text-[11.5px] text-faint">
                  P&amp;L is measured against your average purchase price
                </p>
              </div>
              <Link
                href="/wallet"
                className="text-[12px] font-medium text-accent underline-offset-2 hover:underline"
              >
                Wallet →
              </Link>
            </header>

            {isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-5">Asset</TableHead>
                        <TableHead className="text-right">Holdings</TableHead>
                        <TableHead className="text-right">Avg cost</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="pr-5 text-right">P&amp;L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {positions.rows.map((row) => (
                        <TableRow key={row.asset}>
                          <TableCell className="pl-5">
                            <span className="flex items-center gap-2.5">
                              <CoinIcon
                                symbol={row.coin?.symbol ?? row.asset}
                                color={row.coin?.color ?? "var(--accent)"}
                                size={30}
                              />
                              <span className="min-w-0">
                                <span className="block text-[13px] font-semibold text-foreground">
                                  {row.coin?.name ?? (row.isCash ? `${row.asset} cash` : row.asset)}
                                </span>
                                <span className="block text-[10.5px] text-faint">
                                  {row.isCash
                                    ? "Available to trade"
                                    : `${((row.value / (positions.total || 1)) * 100).toFixed(1)}% of portfolio`}
                                </span>
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[13px] text-foreground">
                            {formatAmount(row.amount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[12.5px] text-muted">
                            {row.isCash ? "—" : formatPrice(row.avgCost)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[12.5px] text-muted">
                            {row.price > 0 ? formatPrice(row.price) : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[13px] font-semibold text-foreground">
                            {formatUSD(row.value)}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            {row.isCash ? (
                              <span className="text-[12px] text-faint">—</span>
                            ) : (
                              <span className="inline-flex flex-col items-end gap-0.5">
                                <PercentageBadge value={row.pnlPct} size="sm" />
                                <span
                                  className={cn(
                                    "text-[10.5px] tabular-nums",
                                    row.pnl >= 0 ? "text-positive" : "text-negative"
                                  )}
                                >
                                  {row.pnl >= 0 ? "+" : "−"}
                                  {formatUSD(Math.abs(row.pnl))}
                                </span>
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <ul className="divide-y divide-border md:hidden">
                  {positions.rows.map((row) => (
                    <li key={row.asset} className="flex items-center gap-3 px-4 py-3.5">
                      <CoinIcon
                        symbol={row.coin?.symbol ?? row.asset}
                        color={row.coin?.color ?? "var(--accent)"}
                        size={34}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-foreground">
                          {row.coin?.name ?? (row.isCash ? `${row.asset} cash` : row.asset)}
                        </p>
                        <p className="text-[11px] tabular-nums text-faint">
                          {formatAmount(row.amount)} {row.asset} ·{" "}
                          {((row.value / (positions.total || 1)) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12.5px] font-semibold tabular-nums text-foreground">
                          {formatUSD(row.value)}
                        </p>
                        {row.isCash ? (
                          <p className="text-[10.5px] text-faint">cash</p>
                        ) : (
                          <PercentageBadge value={row.pnlPct} size="sm" />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {/* Allocation */}
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <PieChartIcon className="size-4 text-accent" aria-hidden />
                <h2 className="text-[14px] font-semibold text-foreground">Allocation</h2>
              </div>
              {isLoading || slices.length === 0 ? (
                <Skeleton className="mt-4 h-[190px] rounded-xl" />
              ) : (
                <div className="mt-4">
                  <AssetAllocation
                    slices={slices}
                    centerLabel="Total value"
                    centerValue={formatUSD(positions.total)}
                  />
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="text-[14px] font-semibold text-foreground">24h movers</h2>
              <p className="mt-0.5 text-[11.5px] text-faint">
                How your holdings moved over the last 24 hours
              </p>
              {isLoading ? (
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-9 rounded-lg" />
                  <Skeleton className="h-9 rounded-lg" />
                </div>
              ) : positions.rows.filter((row) => !row.isCash).length === 0 ? (
                <p className="mt-4 text-[12px] leading-relaxed text-muted">
                  You hold no crypto positions yet.{" "}
                  <Link href="/trade" className="text-accent underline-offset-2 hover:underline">
                    Open the trade terminal
                  </Link>{" "}
                  to buy your first asset.
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {positions.rows
                    .filter((row) => !row.isCash)
                    .sort((a, b) => (b.coin?.change24h ?? 0) - (a.coin?.change24h ?? 0))
                    .slice(0, 5)
                    .map((row) => (
                      <li key={row.asset} className="flex items-center gap-3">
                        <CoinIcon
                          symbol={row.coin?.symbol ?? row.asset}
                          color={row.coin?.color ?? "var(--accent)"}
                          size={26}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-medium text-foreground">
                            {row.coin?.name ?? row.asset}
                          </span>
                          <span className="block text-[10.5px] tabular-nums text-faint">
                            {formatUSD(row.value)}
                          </span>
                        </span>
                        <span className="text-right">
                          <PercentageBadge value={row.coin?.change24h ?? 0} size="sm" />
                          <span
                            className={cn(
                              "mt-0.5 block text-[10.5px] tabular-nums",
                              row.dayChange >= 0 ? "text-positive" : "text-negative"
                            )}
                          >
                            {row.dayChange >= 0 ? "+" : "−"}
                            {formatUSD(Math.abs(row.dayChange))}
                          </span>
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
