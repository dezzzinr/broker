# Quantix — trading platform with a real account system and admin control centre

Quantix is a Next.js 15 trading platform where accounts, wallets, manual deposits and trades are
**real, persisted state**: traders sign up, fund their accounts by uploading proof of payment, and
administrators run the platform from a separate control centre that reviews every request and
monitors every action.

Built with **Next.js 15 (App Router, Turbopack)**, **React 19**, **TypeScript**, **Tailwind CSS v4**,
**better-sqlite3**, **Zod**, **Recharts** and shadcn-style UI primitives.

> **Scope note** — account data, balances, funding requests, orders and the audit log are real and
> persisted in SQLite. Market *prices* stream from a self-contained simulated feed
> (`NEXT_PUBLIC_CRYPTO_API_URL` can point it at a live REST endpoint), and no funds leave the
> platform: a "deposit" is an administrator-approved credit to the internal wallet ledger.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (Turbopack)
npm run start      # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run db:info    # row counts per table
npm run db:reset   # delete the database and re-seed it
```

The database is created and seeded automatically on first run at `data/quantix.db`
(override with `QUANTIX_DB_PATH`). Uploaded proofs of payment are stored as BLOBs in the same file.

### Seeded accounts

| Role | Email | Password | Lands on |
| --- | --- | --- | --- |
| Administrator | `admin@quantix.app` | `Admin@12345` | `/admin` |
| Trader (verified) | `jason@quantix.app` | `Demo@12345` | `/dashboard` |

Eight further trader personas are seeded with balances, funding history and ledger entries so the
console and analytics have something to show. Login cards on `/login` fill these in with one tap.

## Trader app

| Route | Description |
| --- | --- |
| `/login`, `/signup` | Real authentication — scrypt-hashed passwords, cookie sessions, rate-limited |
| `/dashboard` | Live ticker, featured markets, full market overview table |
| `/watchlist` | Starred markets with live prices and sparklines — persisted per browser |
| `/trade` | Order ticket that settles against your real balances (market/limit, 0.1% fee) |
| `/portfolio` | Positions, cost basis, unrealised P&L, allocation donut, 24h movers |
| `/wallet` | Balances by asset, funding status, recent movements, withdrawal requests |
| `/deposits` | Manual deposit wizard: pick a method, upload proof, track reviews |
| `/transactions` | Your ledger — filterable, searchable, paginated, CSV export |
| `/analytics` | Realised P&L, win rate, profit factor, monthly volume — computed from your ledger |
| `/insights`, `/market-trends` | Signals, forecast, sentiment and dominance (simulated feed) |
| `/support` | Platform announcements, FAQ, support tickets routed to administrators |
| `/settings` | Profile, appearance (theme/accent/motion), security (password, sessions), trading prefs |

### Manual deposit flow

1. An administrator publishes funding methods in `/admin/methods` — bank accounts, crypto wallets,
   mobile-money lines — each with its own currency, limits, fee, processing time and instructions.
2. The trader picks a method in the deposit wizard, sends the money off-platform, then submits the
   amount, payer name and **proof of payment** (PNG/JPG/WEBP/GIF/HEIC/PDF up to 6 MB).
3. The request enters the admin review queue as `pending`. Nothing is credited yet.
4. An administrator opens the request, inspects the proof (image/PDF preview with zoom) and approves
   or rejects it with a note. Approval credits the wallet inside one SQLite transaction, writes the
   ledger entry, notifies the trader and records the decision in the audit log. Rejection does the
   same without the credit.
5. Withdrawals work in reverse: the amount is **escrowed** (debited) on submission, released on
   approval, refunded automatically on rejection.

## Admin control centre (`/admin`)

Guarded by `requireAdmin()` in the route-group layout — administrators only, with a separate shell.

| Route | Description |
| --- | --- |
| `/admin` | Platform KPIs, deposit volume chart, status mix, signups, review-queue preview, custody snapshot |
| `/admin/deposits` | Review queue: filter by kind/status/missing proof, search, 20s auto-refresh, proof viewer, approve/reject with notes, `?focus=<id>` deep links |
| `/admin/users` | Searchable account list — balances, lifetime deposits, pending count, trades, last activity |
| `/admin/users/[id]` | Account dossier: identity, KYC, wallets, funding requests, ledger, activity, and every admin action |
| `/admin/activity` | Append-only audit log grouped by day, filterable by category/severity/date, CSV export |
| `/admin/ledger` | Every balance movement across all accounts with per-asset reconciliation |
| `/admin/methods` | Create, edit, preview, reorder, enable/disable and delete funding methods |
| `/admin/announcements` | Publish to the trader notice board or broadcast an in-app notification to everyone |
| `/admin/settings` | Platform name, support email, registrations, deposit limits, auto-approve threshold, withdrawals switch, maintenance mode |

Administrator powers on any account: adjust a balance (credited/debited with a mandatory reason),
reset a password (signs the user out everywhere), suspend/reactivate, promote/demote, set KYC
status, edit profile, delete. Self-protection rules prevent an administrator from suspending,
demoting or deleting their own account, and the platform always keeps at least one administrator.

## Architecture

```
src/
├── app/
│   ├── (auth)/            # /login, /signup — redirects away when already signed in
│   ├── (app)/             # trader shell (sidebar, header, bottom nav) + requireUser()
│   ├── (admin)/admin/     # admin console shell + requireAdmin()
│   └── api/               # REST handlers, all returning { ok, data } or { ok, error, fields }
├── components/
│   ├── admin/             # console shell, overview, review queue/dialog, user management
│   ├── auth/              # login/signup forms, password field, auth shell
│   ├── deposits/          # deposit wizard, proof upload, history, manager
│   ├── settings/          # appearance, profile, security, preferences panels
│   ├── layout/            # AppShell, Sidebar, TopHeader, MobileNav, nav config
│   ├── providers/         # session, wallet, settings, live market, watchlist, toasts
│   ├── charts/, market/, shared/, ui/
├── lib/
│   ├── server/
│   │   ├── db.ts          # better-sqlite3 bootstrap, schema, WAL, transaction helper
│   │   ├── seed.ts        # personas, methods, funding history, ledger, activity
│   │   ├── auth.ts        # cookie sessions (30d), requireUser/requireAdmin RSC guards
│   │   ├── crypto.ts      # scrypt hashing + timing-safe comparison
│   │   ├── http.ts        # envelopes, ApiError, CSRF (same-origin), rate limiting
│   │   ├── validation.ts  # Zod schemas for every write endpoint
│   │   ├── repo/          # users, wallet, funds, methods, ledger, activity, notifications, settings, stats
│   │   └── services/      # auth, deposit, trade, admin — the transactional business logic
│   ├── api.ts             # typed client fetch helper (ApiRequestError carries field errors)
│   ├── types/platform.ts  # wire types shared by server and client
│   └── format.ts, hooks/, data/, services/ (market feed only)
├── middleware.ts          # cookie-presence routing only; enforcement lives in RSC + handlers
└── scripts/               # db-info, db-reset (run with the react-server condition)
```

### Data model

`users`, `sessions`, `balances`, `deposit_methods`, `fund_requests` (with proof BLOB),
`transactions` (the ledger), `activity_logs`, `notifications`, `announcements`, `app_settings`,
`login_attempts` — SQLite with WAL and foreign keys enabled. Money only ever moves inside a
`transaction(() => …)` block, so a wallet debit, its ledger entry and the audit record are atomic.

### Security

- Passwords: `scrypt` with a per-user salt, compared in constant time. The hash is never spread
  into an API payload — routes return `publicUser()`.
- Sessions: httpOnly `quantix_session` cookie, 30-day TTL, stored as a SHA-256 hash; revoking all
  other devices is one click in Settings → Security.
- Authorisation: `middleware.ts` only checks cookie presence for fast redirects; the real guards are
  `requireUser()` / `requireAdmin()` in layouts and `requireApiUser()` / `requireApiAdmin()` in
  handlers. Non-admins get `403` from `/api/admin/*` and a redirect from `/admin`.
- Writes are CSRF-protected (`assertSameOrigin`), Zod-validated and rate-limited per user
  (sign-in, sign-up, deposits, withdrawals, trades, password changes, support tickets).
- Every sensitive action is written to `activity_logs` with actor, subject, IP, user agent and
  structured metadata.

## Design system

- **Dark and light themes** with a full token set per theme (`data-theme` on `<html>`), applied by a
  pre-paint script so there is no flash of the wrong theme.
- **Eight accent palettes** (violet, azure, emerald, teal, cyan, amber, rose, fuchsia), each with
  tuned light-mode values for contrast, plus a reduced-motion mode (`data-motion="reduced"`).
- Appearance, trading defaults, notification switches and the watchlist persist in `localStorage`
  (`quantix:settings`, `quantix:watchlist`); account data lives on the server.
- Responsive from 320 px: fixed sidebar on desktop, drawer navigation plus a bottom tab bar with
  safe-area padding on mobile; every table degrades to a stacked card list.

## Quality checks

- `npx tsc --noEmit` — clean
- `npm run lint` — clean
- `npm run build` — all trader, admin and API routes compile
- Verified end-to-end against the dev server: signup → deposit with proof → admin approval → wallet
  credit → trade → withdrawal escrow → approval/rejection refund, plus admin account actions,
  audit logging and notification delivery.
