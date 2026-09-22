"use client";

import { useCallback } from "react";
import { Copy, Eye, Star } from "lucide-react";
import type { Coin } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { PercentageBadge } from "@/components/shared/percentage-badge";
import { CoinIcon } from "@/components/shared/coin-icon";
import { CryptoChart } from "./crypto-chart";
import { useToast } from "@/components/providers/toast-provider";
import { useWatchlist } from "@/components/providers/watchlist-provider";
import {
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown-menu";

export function CryptoCard({
  coin,
  index = 0,
  onViewDetails,
  className,
}: {
  coin: Coin;
  index?: number;
  onViewDetails?: (coin: Coin) => void;
  className?: string;
}) {
  const { toast } = useToast();
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(coin.id);

  const copyPrice = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatPrice(coin.price));
      toast({ title: "Price copied", description: `${coin.pair} · ${formatPrice(coin.price)}`, variant: "success" });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard is unavailable in this browser.", variant: "error" });
    }
  }, [coin.pair, coin.price, toast]);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-pop)]",
        "animate-fade-up",
        className
      )}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      {/* coin-tinted glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-60 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(120% 90% at 82% -10%, ${coin.color}14, transparent 70%)`,
        }}
      />

      <header className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CoinIcon symbol={coin.symbol} color={coin.color} size={38} />
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold leading-tight text-foreground">{coin.name}</h3>
            <p className="mt-0.5 text-[11px] font-medium tracking-wide text-faint">{coin.pair}</p>
          </div>
        </div>
        <DropdownMenu
          ariaLabel={`${coin.name} options`}
          trigger={<span className="flex size-7 items-center justify-center text-lg leading-none tracking-widest">⋯</span>}
          triggerClassName="opacity-60 transition-opacity hover:opacity-100 group-hover:opacity-100 size-7"
        >
          {(close) => (
            <>
              <DropdownItem
                onClick={() => {
                  close();
                  onViewDetails?.(coin);
                }}
              >
                <Eye className="size-4" aria-hidden />
                View details
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  close();
                  toggle(coin.id);
                  toast({
                    title: watched ? "Removed from watchlist" : "Added to watchlist",
                    description: coin.name,
                    variant: "success",
                  });
                }}
              >
                <Star className={cn("size-4", watched && "fill-warning text-warning")} aria-hidden />
                {watched ? "Remove from watchlist" : "Add to watchlist"}
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem onClick={copyPrice}>
                <Copy className="size-4" aria-hidden />
                Copy price
              </DropdownItem>
            </>
          )}
        </DropdownMenu>
      </header>

      <div className="relative mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <AnimatedNumber
          value={coin.price}
          format={formatPrice}
          className="text-[22px] font-semibold tracking-tight text-foreground"
        />
        <PercentageBadge value={coin.change24h} tooltip="24 hour change" />
      </div>

      <div className="relative mt-3 -mx-1">
        <CryptoChart data={coin.chartData} color={coin.color} height={72} interactive />
      </div>
    </article>
  );
}
