"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { generateSeries } from "@/lib/random";
import { cn } from "@/lib/utils";
import { formatCompactNumber, formatPrice } from "@/lib/format";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { useWatchlist } from "@/components/providers/watchlist-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CoinIcon } from "@/components/shared/coin-icon";
import { PercentageBadge } from "@/components/shared/percentage-badge";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { CryptoChart } from "./crypto-chart";

const RANGES = ["24H", "7D", "1M"] as const;
type DialogRange = (typeof RANGES)[number];

const RANGE_CFG: Record<DialogRange, { points: number; drift: number; vol: number; stepHours: number }> = {
  "24H": { points: 24, drift: 0.006, vol: 0.0035, stepHours: 1 },
  "7D": { points: 56, drift: 0.02, vol: 0.006, stepHours: 3 },
  "1M": { points: 60, drift: 0.05, vol: 0.012, stepHours: 12 },
};

export function CoinDetailsDialog({ coinId, onClose }: { coinId: string | null; onClose: () => void }) {
  const { getCoin } = useLiveMarket();
  const { isWatched, toggle } = useWatchlist();
  const { toast } = useToast();
  const [range, setRange] = useState<DialogRange>("7D");

  const coin = coinId ? getCoin(coinId) : null;

  const series = useMemo(() => {
    if (!coin) return [];
    const cfg = RANGE_CFG[range];
    return generateSeries({
      seed: `${coin.id}-${range}-v1`,
      points: cfg.points,
      end: coin.price,
      drift: cfg.drift,
      volatility: cfg.vol,
      stepMs: cfg.stepHours * 60 * 60 * 1000,
    });
  }, [coin, range]);

  const stats = useMemo(() => {
    if (!coin || series.length === 0) return null;
    const values = series.map((p) => p.v);
    return {
      high: Math.max(...values),
      low: Math.min(...values),
    };
  }, [coin, series]);

  return (
    <Dialog
      open={Boolean(coin)}
      onClose={onClose}
      title={coin ? `${coin.name} — ${coin.pair}` : ""}
      description={coin ? `Rank #${coin.rank} by market capitalization` : undefined}
    >
      {coin && stats && (
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <AnimatedNumber
              value={coin.price}
              format={formatPrice}
              className="text-2xl font-semibold tracking-tight text-foreground"
            />
            <PercentageBadge value={coin.change24h} />
            <span className="text-xs text-faint">24H</span>
            <PercentageBadge value={coin.change7d} />
            <span className="text-xs text-faint">7D</span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <div role="tablist" aria-label="Chart range" className="inline-flex rounded-lg border border-border bg-fill-1 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r}
                  role="tab"
                  aria-selected={range === r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                    range === r ? "bg-fill-3 text-foreground" : "text-muted hover:text-foreground"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <Button
              variant={isWatched(coin.id) ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                toggle(coin.id);
                toast({
                  title: isWatched(coin.id) ? "Removed from watchlist" : "Added to watchlist",
                  description: coin.name,
                  variant: "success",
                });
              }}
            >
              <Star className={cn("size-3.5", isWatched(coin.id) && "fill-warning text-warning")} aria-hidden />
              {isWatched(coin.id) ? "Watching" : "Watch"}
            </Button>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-surface p-3">
            <CryptoChart data={series} color={coin.color} height={190} interactive showLastDot={false} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["Market cap", `$${formatCompactNumber(coin.marketCap)}`],
              ["Volume (24H)", `$${formatCompactNumber(coin.volume24h)}`],
              ["Circulating", formatCompactNumber(coin.circulatingSupply)],
              [`${range} high`, formatPrice(stats.high)],
              [`${range} low`, formatPrice(stats.low)],
              ["Pair", coin.pair],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-card p-3">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-faint">{label}</dt>
                <dd className="mt-1 truncate text-[13px] font-semibold tabular-nums text-foreground">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
            <CoinIcon symbol={coin.symbol} color={coin.color} size={34} />
            <p className="text-[11px] leading-relaxed text-muted">
              Prices are simulated for this demo. Open the{" "}
              <Link href={`/trade?coin=${coin.id}`} className="font-medium text-accent hover:underline">
                Trade
              </Link>{" "}
              page to explore the demo order interface.
            </p>
          </div>
        </div>
      )}
    </Dialog>
  );
}
