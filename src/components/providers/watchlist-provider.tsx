"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

const STORAGE_KEY = "quantix:watchlist";
export const DEFAULT_WATCHLIST = ["bitcoin", "ethereum", "solana", "cardano"];

interface WatchlistApi {
  ids: string[];
  hydrated: boolean;
  isWatched: (id: string) => boolean;
  toggle: (id: string) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const WatchlistContext = createContext<WatchlistApi | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds, hydrated] = useLocalStorage<string[]>(STORAGE_KEY, DEFAULT_WATCHLIST);

  const toggle = useCallback(
    (id: string) =>
      setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setIds]
  );
  const add = useCallback(
    (id: string) => setIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
    [setIds]
  );
  const remove = useCallback((id: string) => setIds((prev) => prev.filter((x) => x !== id)), [setIds]);
  const clear = useCallback(() => setIds([]), [setIds]);
  const isWatched = useCallback((id: string) => ids.includes(id), [ids]);

  const api = useMemo(
    () => ({ ids, hydrated, isWatched, toggle, add, remove, clear }),
    [ids, hydrated, isWatched, toggle, add, remove, clear]
  );

  return <WatchlistContext.Provider value={api}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used within WatchlistProvider");
  return ctx;
}
