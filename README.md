# Quantix — AI-Powered Trading

A production-quality cryptocurrency trading dashboard built with **Next.js 15**, **TypeScript**,
**Tailwind CSS v4**, **shadcn-style UI primitives**, **Lucide icons** and **Recharts**.

> ⚠️ **Demo notice** — Quantix is a UI demonstration. Market data is simulated, and trading,
> deposits, withdrawals and transfers are illustrative only. No real funds, custody or
> exchange connectivity is implemented anywhere in this codebase.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /dashboard
npm run build      # production build (Turbopack)
npm run start      # serve the production build
npm run lint
```

## Routes

| Route | Description |
| --- | --- |
| `/dashboard` | Ticker, live crypto cards, market overview table |
| `/portfolio` | Total value, P/L, performance chart, allocation, holdings |
| `/wallet` | Balances, deposit/withdraw/transfer (simulated), assets |
| `/watchlist` | Add/remove coins, live prices, mini charts — persisted to `localStorage` |
| `/trade` | Demo trading interface (buy/sell, order types, order book) |
| `/transactions` | Filterable history with status badges |
| `/insights` | AI signals, weekly brief, 14-day forecast |
| `/analytics` | Performance, monthly P/L, volume, win/loss, time filters |
| `/market-trends` | Sentiment, dominance, trending, gainers/losers |
| `/support` | Announcements, FAQ, contact form (simulated) |
| `/settings` | Profile, appearance, notifications, security, trading prefs (persisted) |
| `/api/crypto`, `/api/crypto/[id]`, `/api/transactions` | REST endpoints over the mock data |

## Architecture

```
src/
├── app/                  # App Router pages, route groups, API handlers
│   ├── (app)/            # Shell layout (sidebar + header) shared by all pages
│   └── api/              # REST endpoints over the data layer
├── components/
│   ├── layout/           # Sidebar, TopHeader, MobileNav, AppShell, Logo
│   ├── market/           # Ticker, CryptoCard, CryptoChart, MarketTable…
│   ├── charts/           # Recharts panels (area, bars, donut, gauges, forecast)
│   ├── providers/        # Live market feed, watchlist, settings, toasts
│   ├── shared/           # StatCard, badges, skeletons, empty states…
│   └── ui/               # shadcn-style primitives (button, card, dialog…)
└── lib/
    ├── data/             # Deterministic mock datasets
    ├── services/         # CryptoService / PortfolioService abstractions
    ├── hooks/            # useLocalStorage…
    └── format.ts         # Number/date formatting utilities
```

### Swapping in a real API

UI components never touch data sources directly — they consume
`cryptoService` / `portfolioService` from `src/lib/services`. To connect a real backend:

```bash
NEXT_PUBLIC_CRYPTO_API_URL=https://your-endpoint/api/crypto npm run dev
```

or implement `CryptoService` against CoinGecko / an exchange WebSocket and update the
singleton in `src/lib/services/index.ts`. No component changes are required.

## Design system

- Dark-first theme (background `#08090D`, sidebar `#11131A`, cards `#111319`)
- Subtle borders `rgba(255,255,255,0.07)`, violet→indigo accent with soft glows
- Accent color, reduced motion and trading preferences persist to `localStorage`
- Fully responsive from 320 px: fixed sidebar on desktop, drawer navigation on mobile,
  scrollable tables and ticker

## Quality checks

- `npx tsc --noEmit` — clean
- `npm run lint` — clean
- `npm run build` — all 18 routes compile (static + dynamic API)
