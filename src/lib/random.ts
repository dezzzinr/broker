/** Deterministic pseudo-random helpers so SSR and client render identical data. */

export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded normal-ish value in [-1, 1]. */
export function seededNoise(rng: () => number): number {
  return rng() * 2 - 1;
}

export interface SeriesOptions {
  seed: string;
  points: number;
  /** Value the series should end at (current price). */
  end: number;
  /** Total fractional drift over the whole window, e.g. 0.08 = +8% */
  drift: number;
  /** Per-step volatility, e.g. 0.006 */
  volatility: number;
  /** Step interval in ms (default 3h) */
  stepMs?: number;
  /** End timestamp (default: Date.now()) */
  endAt?: number;
}

/**
 * Generates a deterministic random-walk price series that terminates at `end`.
 * The walk is produced backwards from the end value for stability.
 */
export function generateSeries({
  seed,
  points,
  end,
  drift,
  volatility,
  stepMs = 3 * 60 * 60 * 1000,
  endAt,
}: SeriesOptions) {
  const rng = mulberry32(hashSeed(seed));
  const endTs = endAt ?? 1_790_035_200_000; // fixed epoch (2026-09-22T00:00Z) keeps SSR/CSR identical
  const out: { t: number; v: number }[] = new Array(points);
  let v = end;
  for (let i = points - 1; i >= 0; i--) {
    out[i] = { t: endTs - (points - 1 - i) * stepMs, v };
    const step = seededNoise(rng) * volatility * v + (drift / points) * v * -1;
    v = Math.max(v + step, end * 0.35);
  }
  return out;
}

/** Jitter a price by a small percentage, bounded to stay realistic. */
export function jitterPrice(price: number, maxPct = 0.0018): number {
  const delta = (Math.random() * 2 - 1) * maxPct * price;
  const next = price + delta;
  // Keep prices above zero and avoid zero-net movement so updates are visible.
  return Math.max(next, price * 0.9);
}
