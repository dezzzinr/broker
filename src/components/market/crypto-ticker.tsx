"use client";

import { useRouter } from "next/navigation";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { CoinIcon } from "@/components/shared/coin-icon";
import { PercentageBadge } from "@/components/shared/percentage-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";

/** Horizontal strip of live pairs; scrollable on narrow screens. */
export function CryptoTicker({ className }: { className?: string }) {
  const router = useRouter();
  const { coins, loading } = useLiveMarket();

  return (
    <div
      className={
        "overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]" +
        (className ? ` ${className}` : "")
      }
    >
      <div className="no-scrollbar flex overflow-x-auto" role="list" aria-label="Live crypto ticker">
        {loading && coins.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex shrink-0 items-center gap-2.5 border-r border-border px-4 py-3.5">
                <Skeleton className="size-6 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-2 w-12" />
                </div>
              </div>
            ))
          : coins.map((coin) => (
              <button
                key={coin.id}
                type="button"
                role="listitem"
                onClick={() => router.push(`/trade?coin=${coin.id}`)}
                aria-label={`${coin.pair} — ${formatPrice(coin.price)}, ${coin.change24h.toFixed(2)}% today. Open trade page.`}
                className="flex shrink-0 items-center gap-2.5 border-r border-border px-4 py-3 text-left transition-colors last:border-r-0 hover:bg-white/[0.03] focus-visible:bg-white/[0.05] focus-visible:outline-none"
              >
                <CoinIcon symbol={coin.symbol} color={coin.color} size={24} />
                <span className="flex flex-col">
                  <span className="whitespace-nowrap text-[12px] font-semibold text-foreground">{coin.pair}</span>
                  <span className="whitespace-nowrap text-[11px] tabular-nums text-muted">
                    {formatPrice(coin.price)}
                  </span>
                </span>
                <PercentageBadge value={coin.change24h} size="sm" withIcon={false} />
              </button>
            ))}
      </div>
    </div>
  );
}
