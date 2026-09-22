import type { Holding } from "@/lib/types";

/** Mock user portfolio — swap with a real account service via PortfolioService. */
export const HOLDINGS: Holding[] = [
  { coinId: "bitcoin", amount: 0.5234, avgCost: 71_240 },
  { coinId: "ethereum", amount: 4.8721, avgCost: 2_218.4 },
  { coinId: "solana", amount: 58.21, avgCost: 121.35 },
  { coinId: "tether", amount: 8_450, avgCost: 1.0 },
];

/** Trading account balances used by the demo trading interface. */
export const DEMO_BALANCES: Record<string, number> = {
  USDT: 12_480.5,
  BTC: 0.5234,
  ETH: 4.8721,
  SOL: 58.21,
};

export const USER = {
  name: "Jason",
  fullName: "Jason Moreau",
  email: "jason@quantix.app",
  lastLogin: "15 Jun 2025",
  tier: "Pro",
};
