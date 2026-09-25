/** Number/date formatting helpers used across the UI. */

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });

const cache = new Map<string, Intl.NumberFormat>();
function formatter(min: number, max: number) {
  const key = `${min}-${max}`;
  if (!cache.has(key)) cache.set(key, nf(min, max));
  return cache.get(key)!;
}

/** "$109,687.60" */
export function formatUSD(value: number, decimals = 2): string {
  return `$${formatter(decimals, decimals).format(value)}`;
}

/** Adaptive decimal places: 109,687.60 · 2,687.32 · 0.7412 · 0.00002310 */
export function formatPrice(value: number): string {
  const abs = Math.abs(value);
  if (abs === 0) return "$0.00";
  if (abs >= 1) return `$${formatter(2, 2).format(value)}`;
  if (abs >= 0.01) return `$${formatter(4, 4).format(value)}`;
  return `$${value.toFixed(8).replace(/0+$/, "")}`;
}

/** "$2.17T" / "$84.2B" / "$660.4M" */
export function formatCompactUSD(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${sign}$${formatter(abs >= 1e13 ? 1 : 2, 2).format(abs / 1e12)}T`;
  if (abs >= 1e9) return `${sign}$${formatter(2, 2).format(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}$${formatter(1, 1).format(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}$${formatter(1, 1).format(abs / 1e3)}K`;
  return `${sign}$${formatter(0, 2).format(abs)}`;
}

/** Plain compact number: "58,200" → "58.2K" */
export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${formatter(1, 1).format(value / 1e9)}B`;
  if (abs >= 1e6) return `${formatter(1, 1).format(value / 1e6)}M`;
  if (abs >= 1e3) return `${formatter(1, 1).format(value / 1e3)}K`;
  return formatter(0, 2).format(value);
}

/** Adaptive amount: 0.5234 BTC · 4.8721 ETH · 8,450.00 USDT */
export function formatAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return formatter(2, 2).format(value);
  if (abs >= 1) return formatter(4, 4).format(value);
  if (abs === 0) return "0";
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

/** "+1.09%" / "-2.01%" */
export function formatPercent(value: number, decimals = 2): string {
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${formatter(decimals, decimals).format(value)}%`;
}

/** Signed percent without the % sign, for compact UI. */
export function formatSigned(value: number, decimals = 2): string {
  return `${value > 0 ? "+" : ""}${formatter(decimals, decimals).format(value)}`;
}

/** "18 Sep 2026, 14:32" (UTC-stable for SSR/CSR consistency). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${date}, ${time}`;
}

/** "18 Sep 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "just now" · "2 min ago" · "3 h ago" · "5 d ago" */
export function timeAgo(from: Date, now: Date = new Date()): string {
  const s = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));
  if (s < 15) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} d ago`;
}

/** Server-safe currency formatter used in emails, notifications and logs. */
export function money(value: number, decimals = 2): string {
  return formatUSD(Number.isFinite(value) ? value : 0, decimals);
}
