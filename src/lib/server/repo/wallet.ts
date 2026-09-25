import "server-only";
import { db, transaction } from "../db";
import type { Balance } from "@/lib/types/platform";

/**
 * Wallet repository.
 *
 * Balances are the single source of truth for what a user owns. `USD` is the
 * fiat account funded by manual deposits; `USDT`/`BTC`/… are trading assets.
 * Average cost is maintained on credit so portfolio P/L stays accurate.
 */

const QUOTE_ASSETS = new Set(["USD", "USDT"]);

export function getBalances(userId: string): Balance[] {
  const rows = db()
    .prepare("SELECT * FROM balances WHERE user_id = ? ORDER BY asset ASC")
    .all(userId) as Record<string, unknown>[];
  return rows.map((r) => ({
    asset: String(r.asset),
    amount: Number(r.amount),
    avgCost: Number(r.avg_cost),
    updatedAt: String(r.updated_at),
  }));
}

export function getBalance(userId: string, asset: string): Balance | null {
  const row = db()
    .prepare("SELECT * FROM balances WHERE user_id = ? AND asset = ?")
    .get(userId, asset) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    asset: String(row.asset),
    amount: Number(row.amount),
    avgCost: Number(row.avg_cost),
    updatedAt: String(row.updated_at),
  };
}

export function getAmount(userId: string, asset: string): number {
  return getBalance(userId, asset)?.amount ?? 0;
}

function upsert(
  userId: string,
  asset: string,
  amount: number,
  avgCost: number,
  now = new Date().toISOString()
): void {
  db()
    .prepare(
      `INSERT INTO balances (user_id, asset, amount, avg_cost, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, asset)
       DO UPDATE SET amount = excluded.amount,
                     avg_cost = excluded.avg_cost,
                     updated_at = excluded.updated_at`
    )
    .run(userId, asset, amount, avgCost, now);
}

/** Adds funds, blending the average cost basis for non-quote assets. */
export function credit(
  userId: string,
  asset: string,
  amount: number,
  unitCost?: number
): Balance {
  if (amount <= 0) throw new Error("credit amount must be positive");
  const now = new Date().toISOString();
  const current = getBalance(userId, asset) ?? {
    asset,
    amount: 0,
    avgCost: 0,
    updatedAt: now,
  };
  const nextAmount = current.amount + amount;
  let nextAvg = current.avgCost;
  if (!QUOTE_ASSETS.has(asset) && unitCost !== undefined && unitCost > 0) {
    nextAvg =
      current.amount > 0
        ? (current.amount * current.avgCost + amount * unitCost) / nextAmount
        : unitCost;
  } else if (QUOTE_ASSETS.has(asset)) {
    nextAvg = 1;
  }
  upsert(userId, asset, nextAmount, nextAvg, now);
  return { asset, amount: nextAmount, avgCost: nextAvg, updatedAt: now };
}

/** Removes funds. Throws when the wallet cannot cover the amount. */
export function debit(userId: string, asset: string, amount: number): Balance {
  if (amount <= 0) throw new Error("debit amount must be positive");
  const current = getBalance(userId, asset);
  const held = current?.amount ?? 0;
  if (held + 1e-9 < amount) {
    throw new Error(`Insufficient ${asset} balance`);
  }
  const now = new Date().toISOString();
  const nextAmount = Math.max(0, held - amount);
  const nextAvg = nextAmount === 0 ? 0 : (current?.avgCost ?? 0);
  upsert(userId, asset, nextAmount, nextAvg, now);
  return { asset, amount: nextAmount, avgCost: nextAvg, updatedAt: now };
}

/** Admin override — sets an exact balance (used by "adjust balance"). */
export function setBalance(
  userId: string,
  asset: string,
  amount: number,
  avgCost?: number
): Balance {
  const now = new Date().toISOString();
  const current = getBalance(userId, asset);
  const cost =
    avgCost !== undefined
      ? avgCost
      : QUOTE_ASSETS.has(asset)
        ? 1
        : (current?.avgCost ?? 0);
  upsert(userId, asset, Math.max(0, amount), cost, now);
  return { asset, amount: Math.max(0, amount), avgCost: cost, updatedAt: now };
}

export function ensureAssets(userId: string, assets: string[]): void {
  const now = new Date().toISOString();
  transaction(() => {
    for (const asset of assets) {
      db()
        .prepare(
          `INSERT INTO balances (user_id, asset, amount, avg_cost, updated_at)
           VALUES (?, ?, 0, ?, ?)
           ON CONFLICT(user_id, asset) DO NOTHING`
        )
        .run(userId, asset, QUOTE_ASSETS.has(asset) ? 1 : 0, now);
    }
  });
}

/** Executes a spot trade atomically: quote out/in, base in/out, ledger entry. */
export function executeTrade(input: {
  userId: string;
  side: "buy" | "sell";
  baseAsset: string;
  quoteAsset: string;
  baseAmount: number;
  price: number;
  fee: number;
  note?: string;
}): { txId: string; base: Balance; quote: Balance } {
  const { userId, side, baseAsset, quoteAsset, baseAmount, price, fee, note } = input;
  if (baseAmount <= 0 || price <= 0) throw new Error("Invalid order size");

  const gross = baseAmount * price;
  const txId = `tx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  transaction(() => {
    let base: Balance;
    let quote: Balance;
    if (side === "buy") {
      const needed = gross + fee;
      const held = getAmount(userId, quoteAsset);
      if (held + 1e-9 < needed) {
        throw new Error(
          `Insufficient ${quoteAsset} balance — you need ${needed.toFixed(2)} but hold ${held.toFixed(2)}`
        );
      }
      debit(userId, quoteAsset, needed);
      base = credit(userId, baseAsset, baseAmount, price);
      quote = getBalance(userId, quoteAsset)!;
    } else {
      const held = getAmount(userId, baseAsset);
      if (held + 1e-9 < baseAmount) {
        throw new Error(
          `Insufficient ${baseAsset} balance — you hold ${held.toFixed(6)}`
        );
      }
      debit(userId, baseAsset, baseAmount);
      credit(userId, quoteAsset, gross - fee);
      base = getBalance(userId, baseAsset)!;
      quote = getBalance(userId, quoteAsset)!;
    }

    db()
      .prepare(
        `INSERT INTO transactions (id, user_id, type, asset, amount, price, fee, status, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`
      )
      .run(
        txId,
        userId,
        side,
        baseAsset,
        baseAmount,
        price,
        fee,
        note ?? `${side === "buy" ? "Bought" : "Sold"} ${baseAmount} ${baseAsset}`,
        new Date().toISOString()
      );

    return { base, quote };
  });

  return {
    txId,
    base: getBalance(userId, baseAsset)!,
    quote: getBalance(userId, quoteAsset)!,
  };
}

export const STABLE_ASSETS = QUOTE_ASSETS;
