/** Mock market-trend datasets: sentiment, dominance, trending metadata. */

export const SENTIMENT = {
  value: 72,
  label: "Greed",
  updatedAt: "2026-09-22T08:00:00Z",
  history: [
    { d: "Mon", v: 61 },
    { d: "Tue", v: 58 },
    { d: "Wed", v: 64 },
    { d: "Thu", v: 66 },
    { d: "Fri", v: 70 },
    { d: "Sat", v: 68 },
    { d: "Sun", v: 72 },
  ],
};

export const DOMINANCE = [
  { id: "btc", label: "Bitcoin", value: 54.2, color: "#F7931A" },
  { id: "eth", label: "Ethereum", value: 13.1, color: "#627EEA" },
  { id: "sol", label: "Solana", value: 4.1, color: "#9945FF" },
  { id: "other", label: "Others", value: 28.6, color: "#3A3F4E" },
];

export const TRENDING_META: { coinId: string; score: number; rankDelta: number; tag: string }[] = [
  { coinId: "chainlink", score: 98, rankDelta: 4, tag: "Whale accumulation" },
  { coinId: "solana", score: 92, rankDelta: 2, tag: "DEX volume surge" },
  { coinId: "bitcoin", score: 87, rankDelta: 0, tag: "ETF inflows" },
  { coinId: "avalanche", score: 74, rankDelta: 6, tag: "Subnet launch" },
  { coinId: "litecoin", score: 66, rankDelta: 1, tag: "Halving momentum" },
  { coinId: "xrp", score: 58, rankDelta: -3, tag: "Ledger activity" },
];

export const GLOBAL_STATS = {
  totalMarketCap: 3.42e12,
  totalVolume24h: 1.28e11,
  btcDominance: 54.2,
  ethDominance: 13.1,
  activeCoins: 17_284,
  fearGreed: 72,
};
