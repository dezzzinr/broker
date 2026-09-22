"use client";

import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import type { Coin } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatCompactUSD, formatPrice } from "@/lib/format";
import { useWatchlist } from "@/components/providers/watchlist-provider";
import { useToast } from "@/components/providers/toast-provider";
import { CoinIcon } from "@/components/shared/coin-icon";
import { PercentageBadge } from "@/components/shared/percentage-badge";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function MarketTable({
  coins,
  className,
}: {
  coins: Coin[];
  className?: string;
}) {
  const router = useRouter();
  const { isWatched, toggle } = useWatchlist();
  const { toast } = useToast();

  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table className="min-w-[780px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 pl-5">#</TableHead>
            <TableHead>Coin</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">
              <Tooltip content="Change over 7 days">7D%</Tooltip>
            </TableHead>
            <TableHead className="text-right">
              <Tooltip content="Change over 24 hours">24H%</Tooltip>
            </TableHead>
            <TableHead className="text-right">Market Cap</TableHead>
            <TableHead className="text-right">Volume (24H)</TableHead>
            <TableHead className="w-14 pr-5 text-right">
              <span className="sr-only">Watchlist</span>
              <Tooltip content="Add to watchlist">
                <Star className="ml-auto size-3.5" aria-hidden />
              </Tooltip>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coins.map((coin) => {
            const watched = isWatched(coin.id);
            return (
              <TableRow
                key={coin.id}
                onClick={() => router.push(`/trade?coin=${coin.id}`)}
                className="cursor-pointer"
              >
                <TableCell className="pl-5 tabular-nums text-faint">{coin.rank}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <CoinIcon symbol={coin.symbol} color={coin.color} size={30} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-foreground">{coin.name}</p>
                      <p className="text-[11px] text-faint">{coin.symbol}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-foreground">
                  {formatPrice(coin.price)}
                </TableCell>
                <TableCell className="text-right">
                  <PercentageBadge value={coin.change7d} size="sm" withIcon={false} />
                </TableCell>
                <TableCell className="text-right">
                  <PercentageBadge value={coin.change24h} size="sm" withIcon={false} />
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted">
                  {formatCompactUSD(coin.marketCap)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted">
                  {formatCompactUSD(coin.volume24h)}
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <button
                    type="button"
                    aria-pressed={watched}
                    aria-label={
                      watched ? `Remove ${coin.name} from watchlist` : `Add ${coin.name} to watchlist`
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(coin.id);
                      toast({
                        title: watched ? "Removed from watchlist" : "Added to watchlist",
                        description: coin.name,
                        variant: "success",
                      });
                    }}
                    className="inline-flex size-7 items-center justify-center rounded-lg text-faint transition-colors hover:bg-white/[0.06] hover:text-warning"
                  >
                    <Star className={cn("size-4", watched && "fill-warning text-warning")} aria-hidden />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function MarketTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-0" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border/60 px-5 py-4 last:border-0">
          <div className="h-3 w-4 skeleton-shimmer rounded" />
          <div className="size-[30px] rounded-full skeleton-shimmer" />
          <div className="space-y-1.5">
            <div className="h-3 w-24 rounded skeleton-shimmer" />
            <div className="h-2 w-10 rounded skeleton-shimmer" />
          </div>
          <div className="ml-auto flex items-center gap-10">
            <div className="h-3 w-20 rounded skeleton-shimmer" />
            <div className="h-5 w-14 rounded-full skeleton-shimmer" />
            <div className="h-5 w-14 rounded-full skeleton-shimmer" />
            <div className="h-3 w-16 rounded skeleton-shimmer" />
            <div className="h-3 w-16 rounded skeleton-shimmer" />
            <div className="h-3 w-6 rounded skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
