"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Coin } from "@/lib/types";
import { cryptoService } from "@/lib/services";
import { jitterPrice } from "@/lib/random";

const TICK_MS = 5000;

interface LiveMarketApi {
  coins: Coin[];
  byId: Map<string, Coin>;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isLive: boolean;
  setIsLive: (v: boolean) => void;
  getCoin: (id: string) => Coin | undefined;
  refresh: () => void;
}

const LiveMarketContext = createContext<LiveMarketApi | null>(null);

/**
 * Simulated realtime market feed.
 * Loads coins through the CryptoService, then applies small random price
 * ticks on an interval. A real WebSocket feed can later push into the same
 * context without touching consumers.
 */
export function LiveMarketProvider({ children }: { children: ReactNode }) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  // Initial + manual loads
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    cryptoService
      .getCoins()
      .then((data) => {
        if (cancelled) return;
        setCoins(data);
        setLastUpdated(new Date());
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load market data.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  // Simulated ticks (paused when tab is hidden or feed paused)
  useEffect(() => {
    if (!isLive || coins.length === 0) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      setCoins((prev) =>
        prev.map((c) => {
          const price = jitterPrice(c.price);
          const deltaPct = c.price > 0 ? ((price - c.price) / c.price) * 100 : 0;
          const chartData = c.chartData.length ? [...c.chartData] : c.chartData;
          if (chartData.length) {
            chartData[chartData.length - 1] = { t: chartData[chartData.length - 1].t, v: price };
          }
          return { ...c, price, change24h: c.change24h + deltaPct, chartData };
        })
      );
      setLastUpdated(new Date());
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [isLive, coins.length]);

  const byId = useMemo(() => new Map(coins.map((c) => [c.id, c])), [coins]);
  const getCoin = useCallback((id: string) => byId.get(id), [byId]);

  const api = useMemo(
    () => ({ coins, byId, loading, error, lastUpdated, isLive, setIsLive, getCoin, refresh }),
    [coins, byId, loading, error, lastUpdated, isLive, getCoin, refresh]
  );

  return <LiveMarketContext.Provider value={api}>{children}</LiveMarketContext.Provider>;
}

export function useLiveMarket() {
  const ctx = useContext(LiveMarketContext);
  if (!ctx) throw new Error("useLiveMarket must be used within LiveMarketProvider");
  return ctx;
}
