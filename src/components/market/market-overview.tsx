"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { useWatchlist } from "@/components/providers/watchlist-provider";
import { FilterTabs, type MarketFilter } from "@/components/shared/filter-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { MarketTable, MarketTableSkeleton } from "./market-table";

export function MarketOverview({ className }: { className?: string }) {
  const { coins, loading } = useLiveMarket();
  const { ids: watchlistIds } = useWatchlist();
  const [filter, setFilter] = useState<MarketFilter>("all");

  const rows = useMemo(() => {
    switch (filter) {
      case "gainers":
        return coins.filter((c) => c.change24h > 0).sort((a, b) => b.change24h - a.change24h);
      case "losers":
        return coins.filter((c) => c.change24h < 0).sort((a, b) => a.change24h - b.change24h);
      case "favorites": {
        const set = new Set(watchlistIds);
        return coins.filter((c) => set.has(c.id)).sort((a, b) => a.rank - b.rank);
      }
      default:
        return coins;
    }
  }, [coins, filter, watchlistIds]);

  return (
    <section aria-labelledby="market-overview-title" className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            <span className="relative flex size-1.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
            Live Updates
          </p>
          <h2 id="market-overview-title" className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Market Overview
          </h2>
        </div>
        <FilterTabs value={filter} onChange={setFilter} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        {loading && coins.length === 0 ? (
          <MarketTableSkeleton />
        ) : rows.length === 0 ? (
          <div className="p-0">
            <EmptyState
              icon={Star}
              title={filter === "favorites" ? "No favorites yet" : "Nothing to show"}
              description={
                filter === "favorites"
                  ? "Star coins in the table or on any card and they will appear here."
                  : "No coins match the selected filter right now — check back soon."
              }
              action={
                filter === "favorites" ? (
                  <Button variant="secondary" size="sm" onClick={() => setFilter("all")}>
                    Browse all coins
                  </Button>
                ) : undefined
              }
              className="border-0 bg-transparent"
            />
          </div>
        ) : (
          <MarketTable coins={rows} />
        )}
      </div>
    </section>
  );
}
