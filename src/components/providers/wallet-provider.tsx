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
import { api } from "@/lib/api";
import type { Balance, FundRequest, LedgerEntry } from "@/lib/types/platform";

/**
 * The signed-in user's wallet.
 *
 * Balances are real, per-account figures served from SQLite — deposits credited
 * by an administrator, orders settled by the trade engine and manual
 * adjustments all show up here after `refresh()`.
 */

interface WalletResponse {
  balances: Balance[];
  transactions: LedgerEntry[];
  totalTransactions: number;
  fundRequests: FundRequest[];
  pendingDeposits: number;
}

interface WalletApi {
  balances: Balance[];
  transactions: LedgerEntry[];
  fundRequests: FundRequest[];
  loading: boolean;
  error: string | null;
  /** Fiat/quote balance available for trading and withdrawals. */
  cash: number;
  pendingDeposits: number;
  amount: (asset: string) => number;
  balance: (asset: string) => Balance | undefined;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletApi | null>(null);

const QUOTE_ASSETS = ["USD", "USDT"];

export function WalletProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WalletResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await api<WalletResponse>("/api/wallet");
      setData(next);
      setError(null);
    } catch {
      setError("Unable to load your wallet.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const balances = useMemo(() => data?.balances ?? [], [data]);

  const value = useMemo<WalletApi>(() => {
    const byAsset = new Map(balances.map((b) => [b.asset, b]));
    const cash = QUOTE_ASSETS.reduce((sum, asset) => sum + (byAsset.get(asset)?.amount ?? 0), 0);
    return {
      balances,
      transactions: data?.transactions ?? [],
      fundRequests: data?.fundRequests ?? [],
      loading,
      error,
      cash,
      pendingDeposits: data?.pendingDeposits ?? 0,
      amount: (asset: string) => byAsset.get(asset)?.amount ?? 0,
      balance: (asset: string) => byAsset.get(asset),
      refresh: load,
    };
  }, [balances, data, loading, error, load]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
