/** Mock content for Insights, Support and static copy. */

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

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  unread: boolean;
  category: "Maintenance" | "Product" | "Security";
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "an-1",
    title: "Scheduled maintenance — analytics engine upgrade",
    body: "We are upgrading the Quantix analytics engine on Sunday, 02:00–04:00 UTC. Dashboards remain available; AI signals may be briefly delayed.",
    date: "2026-09-20T09:00:00Z",
    unread: true,
    category: "Maintenance",
  },
  {
    id: "an-2",
    title: "New in beta: cross-asset correlation matrix",
    body: "Analytics now includes a rolling 30-day correlation matrix across your portfolio assets, updated hourly. Find it under Analytics → Correlations.",
    date: "2026-09-18T14:30:00Z",
    unread: true,
    category: "Product",
  },
  {
    id: "an-3",
    title: "Security reminder: enable 2FA",
    body: "Keep your demo account safe. Two-factor authentication can be enabled from Settings → Security at any time.",
    date: "2026-09-10T08:00:00Z",
    unread: false,
    category: "Security",
  },
];

export const FAQS = [
  {
    q: "Is Quantix connected to real funds or exchanges?",
    a: "No. Quantix is a demonstration interface running on simulated market data. Orders, deposits and withdrawals are illustrative only and never touch real money.",
  },
  {
    q: "How are the AI signals generated?",
    a: "Signals combine deterministic mock analytics in this demo. In production, the same UI is designed to consume model outputs from the Quantix signal service.",
  },
  {
    q: "Can I connect a real exchange account later?",
    a: "Yes. The data layer isolates market/account services behind a CryptoService interface, so a licensed exchange integration can be added without rewriting the UI.",
  },
  {
    q: "Where is my watchlist stored?",
    a: "Your watchlist and UI preferences are persisted locally in your browser (localStorage). Clearing site data resets them.",
  },
  {
    q: "How do I report an issue?",
    a: "Use the contact form on this page. In this demo, submissions are simulated and no message is actually sent.",
  },
];
