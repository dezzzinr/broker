/** Static editorial content for the Insights page (signals, forecast metadata, weekly brief). */

export interface InsightSignal {
  id: string;
  coinId: string;
  title: string;
  summary: string;
  stance: "bullish" | "bearish" | "neutral";
  confidence: number;
  timeframe: string;
}

export const INSIGHT_SIGNALS: InsightSignal[] = [
  {
    id: "sig-1",
    coinId: "bitcoin",
    title: "BTC holds the 20-day moving average",
    summary:
      "Quantix AI detects sustained support at the 20-day MA with rising spot demand. A daily close above $110.4K opens a measured move toward $118K.",
    stance: "bullish",
    confidence: 78,
    timeframe: "1–2 weeks",
  },
  {
    id: "sig-2",
    coinId: "chainlink",
    title: "LINK whale accumulation accelerating",
    summary:
      "On-chain flows show the largest 30-day accumulation by addresses holding 100K+ LINK since March, historically a medium-term bullish precursor.",
    stance: "bullish",
    confidence: 71,
    timeframe: "2–4 weeks",
  },
  {
    id: "sig-3",
    coinId: "dogecoin",
    title: "DOGE momentum fading",
    summary:
      "Social volume is cooling while exchange inflows increase — a short-term bearish mix. Quantix AI suggests tightening stops below $0.185.",
    stance: "bearish",
    confidence: 64,
    timeframe: "3–10 days",
  },
  {
    id: "sig-4",
    coinId: "ethereum",
    title: "ETH volatility compression",
    summary:
      "Realized volatility sits at a 90-day low. Compression events of this depth have resolved directionally within two weeks in 74% of prior cases.",
    stance: "neutral",
    confidence: 69,
    timeframe: "1–2 weeks",
  },
];

export const WEEKLY_BRIEF = [
  "Total crypto market cap reclaimed $3.4T, led by BTC spot-ETF net inflows of $612M this week.",
  "Solana DEX volumes hit a 6-month high; SOL leads top-10 performance at +8.1% over 7 days.",
  "Stablecoin supply expanded by $1.9B — dry powder for risk assets remains elevated.",
  "Funding rates stay mildly positive across major perps; no overheating signal detected.",
  "Watch: US CPI print on Friday and $24.1B in monthly options expiry next Wednesday.",
];

export const FORECAST_META = {
  horizonDays: 14,
  expected: 0.048,
  confidenceLow: -0.031,
  confidenceHigh: 0.096,
};

/* ------------------------------- Support -------------------------------- */
