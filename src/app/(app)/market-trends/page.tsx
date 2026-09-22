"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Flame, Globe2, TrendingDown, TrendingUp } from "lucide-react";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { DOMINANCE, GLOBAL_STATS, SENTIMENT, TRENDING_META } from "@/lib/data/market";
import { formatCompactUSD, formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { PercentageBadge } from "@/components/shared/percentage-badge";
import { CoinIcon } from "@/components/shared/coin-icon";
import { CryptoChart } from "@/components/market/crypto-chart";
import { SentimentGauge } from "@/components/charts/sentiment-gauge";
import { AssetAllocation } from "@/components/charts/asset-allocation";
import { BarChartPanel } from "@/components/charts/bar-chart-panel";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function MarketTrendsPage() {
  const { coins, loading } = useLiveMarket();
  const byId = useMemo(() => new Map(coins.map((c) => [c.id, c])), [coins]);

  const gainers = useMemo(
    () => [...coins].filter((c) => c.change24h > 0).sort((a, b) => b.change24h - a.change24h).slice(0, 4),
    [coins]
  );
  const losers = useMemo(
    () => [...coins].filter((c) => c.change24h < 0).sort((a, b) => a.change24h - b.change24h).slice(0, 4),
    [coins]
  );
  const volumeBars = useMemo(
    () =>
      [...coins]
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, 8)
        .map((c) => ({ label: c.symbol, value: c.volume24h })),
    [coins]
  );

  const globalStats = [
    { label: "Total Market Cap", value: `$${(GLOBAL_STATS.totalMarketCap / 1e12).toFixed(2)}T` },
    { label: "24h Volume", value: `$${(GLOBAL_STATS.totalVolume24h / 1e9).toFixed(1)}B` },
    { label: "BTC Dominance", value: `${GLOBAL_STATS.btcDominance}%` },
    { label: "Active Coins", value: GLOBAL_STATS.activeCoins.toLocaleString("en-US") },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Trends"
        description="Cross-market structure, sentiment and capital rotation at a glance."
      />

      {/* Global stats strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {globalStats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs font-medium text-muted">{s.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Sentiment + dominance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <div className="p-5 pb-0">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Globe2 className="size-4 text-accent" aria-hidden />
              Market sentiment
            </h2>
            <p className="mt-0.5 text-xs text-muted">Fear &amp; Greed index</p>
          </div>
          <div className="p-5 pt-2">
            <SentimentGauge value={SENTIMENT.value} caption="Updated daily · simulated index" />
            <div className="mt-4 flex items-end justify-between gap-1" aria-hidden>
              {SENTIMENT.history.map((h) => (
                <div key={h.d} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn(
                      "w-full max-w-[18px] rounded-sm",
                      h.v >= 70 ? "bg-positive/70" : h.v >= 45 ? "bg-warning/60" : "bg-negative/60"
                    )}
                    style={{ height: `${Math.max(6, (h.v / 100) * 44)}px` }}
                  />
                  <span className="text-[9px] text-faint">{h.d}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-5 pb-0">
            <h2 className="text-[15px] font-semibold text-foreground">Market dominance</h2>
            <p className="mt-0.5 text-xs text-muted">Share of total market capitalization</p>
          </div>
          <div className="p-5">
            <AssetAllocation
              slices={DOMINANCE.map((d) => ({ id: d.id, label: d.label, value: d.value, color: d.color }))}
              centerLabel="BTC"
              centerValue={`${GLOBAL_STATS.btcDominance}%`}
              valueFormatter={(v) => `${v.toFixed(1)}%`}
              showLegendValues={false}
            />
          </div>
        </Card>

        <Card>
          <div className="p-5 pb-0">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Flame className="size-4 text-accent" aria-hidden />
              Trending coins
            </h2>
            <p className="mt-0.5 text-xs text-muted">Highest attention score</p>
          </div>
          <ul className="p-3">
            {TRENDING_META.map((t, i) => {
              const coin = byId.get(t.coinId);
              if (!coin) return null;
              return (
                <li key={t.coinId}>
                  <Link
                    href={`/trade?coin=${coin.id}`}
                    className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="w-4 text-center text-[12px] tabular-nums text-faint">{i + 1}</span>
                    <CoinIcon symbol={coin.symbol} color={coin.color} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground">{coin.name}</p>
                      <p className="truncate text-[11px] text-faint">{t.tag}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-semibold tabular-nums text-foreground">{t.score}</p>
                      <p
                        className={cn(
                          "flex items-center justify-end gap-0.5 text-[10px] tabular-nums",
                          t.rankDelta >= 0 ? "text-positive" : "text-negative"
                        )}
                      >
                        {t.rankDelta >= 0 ? <TrendingUp className="size-2.5" aria-hidden /> : <TrendingDown className="size-2.5" aria-hidden />}
                        {Math.abs(t.rankDelta)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* Gainers / losers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[
          { title: "Top gainers", icon: TrendingUp, rows: gainers, accent: "text-positive" },
          { title: "Top losers", icon: TrendingDown, rows: losers, accent: "text-negative" },
        ].map((panel) => {
          const Icon = panel.icon;
          return (
            <Card key={panel.title}>
              <div className="p-5 pb-0">
                <h2 className={cn("flex items-center gap-2 text-[15px] font-semibold text-foreground")}>
                  <Icon className={cn("size-4", panel.accent)} aria-hidden />
                  {panel.title}
                </h2>
              </div>
              <div className="divide-y divide-border/60">
                {loading && coins.length === 0
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-4">
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))
                  : panel.rows.map((coin) => (
                      <Link
                        key={coin.id}
                        href={`/trade?coin=${coin.id}`}
                        className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.025]"
                      >
                        <CoinIcon symbol={coin.symbol} color={coin.color} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-foreground">
                            {coin.name} <span className="ml-1 text-[11px] font-normal text-faint">{coin.symbol}</span>
                          </p>
                          <p className="text-[12px] tabular-nums text-muted">{formatPrice(coin.price)}</p>
                        </div>
                        <div className="hidden w-24 sm:block">
                          <CryptoChart data={coin.chartData.slice(-32)} color={coin.color} height={34} showLastDot={false} />
                        </div>
                        <PercentageBadge value={coin.change24h} size="sm" />
                      </Link>
                    ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Volume */}
      <Card>
        <div className="p-5 pb-0">
          <h2 className="text-[15px] font-semibold text-foreground">Trading volume (24h)</h2>
          <p className="mt-0.5 text-xs text-muted">Notional volume by asset, simulated</p>
        </div>
        <div className="p-4">
          {volumeBars.length > 0 ? (
            <BarChartPanel data={volumeBars} height={260} valueFormatter={(v) => formatCompactUSD(v)} />
          ) : (
            <Skeleton className="h-[260px] rounded-xl" />
          )}
        </div>
      </Card>
    </div>
  );
}
