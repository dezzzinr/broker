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

export interface AllocationSlice {
  id: string;
  label: string;
  value: number;
  color: string;
}

export type TimeRange = "1D" | "7D" | "1M" | "3M" | "1Y" | "ALL";
