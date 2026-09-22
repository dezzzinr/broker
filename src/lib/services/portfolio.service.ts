import type { AllocationSlice, Coin, PortfolioSummary, TimeRange } from "@/lib/types";
import type { CryptoService } from "./crypto.service";
import { HOLDINGS } from "@/lib/data/portfolio";
import { generateSeries } from "@/lib/random";

const RANGE_CONFIG: Record<TimeRange, { points: number; drift: number; vol: number; stepHours: number }> = {
  "1D": { points: 24, drift: 0.009, vol: 0.0016, stepHours: 1 },
  "7D": { points: 56, drift: 0.021, vol: 0.004, stepHours: 3 },
  "1M": { points: 60, drift: 0.047, vol: 0.008, stepHours: 12 },
  "3M": { points: 90, drift: 0.112, vol: 0.011, stepHours: 24 },
  "1Y": { points: 104, drift: 0.318, vol: 0.017, stepHours: 84 },
  ALL: { points: 104, drift: 0.512, vol: 0.02, stepHours: 168 },
};

export interface AnalyticsData {
  performance: { t: number; v: number }[];
  monthlyPL: { month: string; pl: number }[];
  monthlyVolume: { month: string; volume: number }[];
  stats: {
    winRate: number;
    wins: number;
    losses: number;
    profitFactor: number;
    totalTrades: number;
    avgHoldHours: number;
    bestTrade: number;
    worstTrade: number;
    sharpe: number;
  };
}

export interface PortfolioService {
  getSummary(): Promise<PortfolioSummary>;
  getAnalytics(range: TimeRange): Promise<AnalyticsData>;
}

export class MockPortfolioService implements PortfolioService {
  constructor(private crypto: CryptoService) {}

  async getSummary(): Promise<PortfolioSummary> {
    const coins = await this.crypto.getCoins();
    const byId = new Map(coins.map((c) => [c.id, c]));

    const holdings = HOLDINGS.flatMap((h) => {
      const coin = byId.get(h.coinId);
      if (!coin) return [];
      const value = h.amount * coin.price;
      const cost = h.amount * h.avgCost;
      return [
        {
          ...h,
          coin,
          value,
          pnl: value - cost,
          pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
          allocationPct: 0,
        },
      ];
    });

    const totalValue = holdings.reduce((s, h) => s + h.value, 0);
    const totalCost = holdings.reduce((s, h) => s + h.amount * h.avgCost, 0);
    const todayPL = holdings.reduce(
      (s, h) => s + h.value * (h.coin.change24h / 100),
      0
    );
    for (const h of holdings) {
      h.allocationPct = totalValue > 0 ? (h.value / totalValue) * 100 : 0;
    }

    const perf = generateSeries({
      seed: "portfolio-perf-v1",
      points: 90,
      end: totalValue,
      drift: 0.19,
      volatility: 0.011,
      stepMs: 24 * 60 * 60 * 1000,
    });

    return {
      totalValue,
      availableCash: byId.get("tether")?.price
        ? HOLDINGS.find((h) => h.coinId === "tether")!.amount * byId.get("tether")!.price
        : 0,
      todayPL,
      todayPLPct: (todayPL / totalValue) * 100,
      totalPL: totalValue - totalCost,
      totalPLPct: ((totalValue - totalCost) / totalCost) * 100,
      totalCost,
      performance: perf,
      holdings,
    };
  }

  async getAnalytics(range: TimeRange): Promise<AnalyticsData> {
    const summary = await this.getSummary();
    const cfg = RANGE_CONFIG[range];
    const performance = generateSeries({
      seed: `portfolio-perf-${range}-v1`,
      points: cfg.points,
      end: summary.totalValue,
      drift: cfg.drift,
      volatility: cfg.vol,
      stepMs: cfg.stepHours * 60 * 60 * 1000,
    });

    // Deterministic monthly figures
    const monthlyPL = [
      { month: "Oct", pl: 1842.5 },
      { month: "Nov", pl: -920.4 },
      { month: "Dec", pl: 2610.75 },
      { month: "Jan", pl: 3184.2 },
      { month: "Feb", pl: -1245.6 },
      { month: "Mar", pl: 1987.3 },
      { month: "Apr", pl: 842.1 },
      { month: "May", pl: 2455.8 },
      { month: "Jun", pl: -618.9 },
      { month: "Jul", pl: 3120.4 },
      { month: "Aug", pl: 1876.2 },
      { month: "Sep", pl: 2264.85 },
    ];

    const monthlyVolume = [
      { month: "Oct", volume: 84_200 },
      { month: "Nov", volume: 61_500 },
      { month: "Dec", volume: 118_900 },
      { month: "Jan", volume: 132_400 },
      { month: "Feb", volume: 74_800 },
      { month: "Mar", volume: 96_300 },
      { month: "Apr", volume: 58_200 },
      { month: "May", volume: 102_600 },
      { month: "Jun", volume: 47_900 },
      { month: "Jul", volume: 121_800 },
      { month: "Aug", volume: 108_500 },
      { month: "Sep", volume: 93_700 },
    ];

    return {
      performance,
      monthlyPL,
      monthlyVolume,
      stats: {
        winRate: 63.4,
        wins: 217,
        losses: 125,
        profitFactor: 1.86,
        totalTrades: 342,
        avgHoldHours: 38,
        bestTrade: 4_218.4,
        worstTrade: -1_842.7,
        sharpe: 1.94,
      },
    };
  }
}

export function toAllocationSlices(summary: PortfolioSummary): AllocationSlice[] {
  return summary.holdings.map((h) => ({
    id: h.coinId,
    label: h.coin.symbol,
    value: h.value,
    color: h.coin.color,
  }));
}

export type { Coin };
