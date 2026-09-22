/** Core domain types shared across the data layer and UI. */

export interface ChartPoint {
  /** Unix timestamp (ms) */
  t: number;
  /** Value at that point */
  v: number;
}

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  /** Trading pair symbol, e.g. "BTC/USDT" */
  pair: string;
  rank: number;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  /** Brand color used for icons/charts */
  color: string;
  /** Deterministic sparkline series (7d) */
  chartData: ChartPoint[];
}

export type TransactionType =
  | "buy"
  | "sell"
  | "deposit"
  | "withdrawal"
  | "transfer"
  | "reward";

export type TransactionStatus = "completed" | "pending" | "failed";

export interface Transaction {
  id: string;
  date: string; // ISO string
  type: TransactionType;
  assetSymbol: string;
  amount: number;
  price: number; // unit price at execution
  fee: number;
  status: TransactionStatus;
  note?: string;
}

export interface Holding {
  coinId: string;
  amount: number;
  avgCost: number;
}

export interface HoldingRow extends Holding {
  coin: Coin;
  value: number;
  pnl: number;
  pnlPct: number;
  allocationPct: number;
}

export interface PortfolioSummary {
  totalValue: number;
  availableCash: number;
  todayPL: number;
  todayPLPct: number;
  totalPL: number;
  totalPLPct: number;
  totalCost: number;
  performance: ChartPoint[];
  holdings: HoldingRow[];
}

export interface AllocationSlice {
  id: string;
  label: string;
  value: number;
  color: string;
}

export type TimeRange = "1D" | "7D" | "1M" | "3M" | "1Y" | "ALL";
