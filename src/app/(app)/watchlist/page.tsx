"use client";

import { useMemo, useState } from "react";
import { Plus, Star } from "lucide-react";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { useWatchlist } from "@/components/providers/watchlist-provider";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CryptoCard } from "@/components/market/crypto-card";
import { CoinDetailsDialog } from "@/components/market/coin-details-dialog";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchlistPage() {
  const { coins, loading } = useLiveMarket();
  const { ids, hydrated, add } = useWatchlist();
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [addId, setAddId] = useState("");

  const watched = useMemo(
    () =>
      ids
        .map((id) => coins.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [ids, coins]
  );

  const addable = coins.filter((c) => !ids.includes(c.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Watchlist"
        description="Coins you are tracking. Your list is stored locally in this browser."
        actions={
          <div className="flex items-center gap-2">
            <Select
              ariaLabel="Choose a coin to add"
              value={addId}
              onChange={setAddId}
              options={
                addable.length > 0
                  ? addable.map((c) => ({ value: c.id, label: c.name, hint: c.pair }))
                  : [{ value: "", label: "All coins added", hint: "" }]
              }
              className="w-52"
              buttonClassName={addable.length === 0 ? "opacity-60" : ""}
            />
            <Button
              disabled={!addId || addable.length === 0}
              onClick={() => {
                if (!addId) return;
                add(addId);
                setAddId("");
              }}
            >
              <Plus className="size-4" aria-hidden />
              Add
            </Button>
          </div>
        }
      />

      {loading && coins.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[196px] rounded-2xl" />
          ))}
        </div>
      ) : hydrated && watched.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Your watchlist is empty"
          description="Add coins above or tap the star on any market row to start tracking prices, changes and 7-day charts."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {watched.map((coin, i) => (
            <CryptoCard
              key={coin.id}
              coin={coin}
              index={i}
              onViewDetails={(c) => setDetailsId(c.id)}
            />
          ))}
        </div>
      )}

      <CoinDetailsDialog coinId={detailsId} onClose={() => setDetailsId(null)} />
    </div>
  );
}
