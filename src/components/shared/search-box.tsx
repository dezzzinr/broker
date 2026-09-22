"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { CoinIcon } from "@/components/shared/coin-icon";
import { PercentageBadge } from "@/components/shared/percentage-badge";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const { coins } = useLiveMarket();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return coins
      .filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
      .slice(0, 6);
  }, [coins, query]);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const go = (id: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/trade?coin=${id}`);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint"
          aria-hidden
        />
        <input
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="coin-search-results"
          aria-label="Search cryptocurrencies"
          placeholder="Search coins…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) go(results[0].id);
          }}
          className={cn(
            "h-9 w-full rounded-lg border border-border bg-white/[0.03] pl-9 pr-3 text-[13px] text-foreground transition-colors",
            "placeholder:text-faint focus-visible:border-accent/50 focus-visible:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25",
            "[&::-webkit-search-cancel-button]:appearance-none",
            className?.includes("w-") ? "" : "sm:w-60"
          )}
        />
      </div>
      {open && query.trim() && (
        <div
          id="coin-search-results"
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-elevated p-1.5 shadow-[var(--shadow-pop)] animate-scale-in sm:min-w-[300px]"
        >
          {results.length === 0 ? (
            <p className="px-2.5 py-3 text-[13px] text-muted">
              No results for “{query.trim()}”.
            </p>
          ) : (
            results.map((coin) => (
              <button
                key={coin.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => go(coin.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.05]"
              >
                <CoinIcon symbol={coin.symbol} color={coin.color} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-foreground">{coin.name}</span>
                  <span className="block text-[11px] text-faint">{coin.pair}</span>
                </span>
                <span className="text-right">
                  <span className="block text-[13px] tabular-nums text-foreground">{formatPrice(coin.price)}</span>
                  <PercentageBadge value={coin.change24h} size="sm" withIcon={false} />
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
