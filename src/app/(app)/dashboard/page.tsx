"use client";

import { useEffect, useState } from "react";
import { Globe, Pause, Play, RefreshCcw } from "lucide-react";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { CryptoTicker } from "@/components/market/crypto-ticker";
import { CryptoCard } from "@/components/market/crypto-card";
import { CoinDetailsDialog } from "@/components/market/coin-details-dialog";
import { MarketOverview } from "@/components/market/market-overview";
import { GlowDot } from "@/components/shared/glow-dot";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";

const FEATURED_IDS = ["bitcoin", "ethereum", "solana"];

function LastUpdatedLabel() {
  const { lastUpdated } = useLiveMarket();
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <span suppressHydrationWarning>
      {lastUpdated ? timeAgo(lastUpdated) : "loading…"}
    </span>
  );
}

function LiveStatusPill() {
  const { isLive, setIsLive } = useLiveMarket();
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium " +
          (isLive
            ? "border-positive/25 bg-positive/10 text-positive"
            : "border-border bg-fill-1 text-muted")
        }
      >
        <GlowDot color={isLive ? "var(--positive)" : "var(--muted)"} pulse={isLive} />
        {isLive ? "Live" : "Paused"}
      </span>
      <span className="hidden text-xs text-faint sm:inline">
        Last update: <LastUpdatedLabel />
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={isLive ? "Pause live updates" : "Resume live updates"}
        onClick={() => setIsLive(!isLive)}
      >
        {isLive ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
      </Button>
    </div>
  );
}

export default function DashboardPage() {
  const { coins, loading, error, refresh } = useLiveMarket();
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const featured = FEATURED_IDS.map((id) => coins.find((c) => c.id === id)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c)
  );

  return (
    <div className="animate-fade-in">
      <CryptoTicker className="animate-fade-up" />

      {/* Hero */}
      <section aria-labelledby="live-updates-title" className="mt-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent-soft shadow-[0_0_24px_-8px_var(--accent-glow)]">
            <Globe className="size-5 text-accent" aria-hidden />
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] size-1.5 rounded-full bg-accent animate-orbit"
            />
          </div>
          <div>
            <h1 id="live-updates-title" className="text-[26px] font-semibold leading-[1.12] tracking-tight text-foreground sm:text-3xl">
              Live Crypto
              <br />
              <span className="text-gradient">Updates</span>
            </h1>
          </div>
        </div>
        <LiveStatusPill />
      </section>

      {/* Featured cards */}
      <section aria-label="Featured cryptocurrencies" className="mt-6">
        {error ? (
          <EmptyState
            icon={RefreshCcw}
            title="Market data unavailable"
            description={error + " The market service may be temporarily unreachable."}
            action={
              <Button variant="secondary" size="sm" onClick={refresh}>
                <RefreshCcw className="size-3.5" aria-hidden />
                Try again
              </Button>
            }
          />
        ) : loading && featured.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[196px] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featured.map((coin, i) => (
              <CryptoCard key={coin.id} coin={coin} index={i} onViewDetails={(c) => setDetailsId(c.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Market overview */}
      <MarketOverview className="mt-12" />

      <CoinDetailsDialog coinId={detailsId} onClose={() => setDetailsId(null)} />
    </div>
  );
}
