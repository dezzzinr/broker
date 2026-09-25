import "server-only";
import { db } from "../db";
import type { LedgerEntry, LedgerType } from "@/lib/types/platform";

/**
 * The ledger — every balance movement (trades, deposits, withdrawals and
 * administrator adjustments) is recorded here and shown on the user's
 * Transactions page and in the admin console.
 */

export function addLedgerEntry(input: {
  userId: string;
  type: LedgerType;
  asset: string;
  amount: number;
  price?: number;
  fee?: number;
  status?: LedgerEntry["status"];
  note?: string;
  refId?: string | null;
}): LedgerEntry {
  const now = new Date().toISOString();
  const id = `tx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  db()
    .prepare(
      `INSERT INTO transactions (id, user_id, type, asset, amount, price, fee, status, note, ref_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.userId,
      input.type,
      input.asset,
      input.amount,
      input.price ?? 0,
      input.fee ?? 0,
      input.status ?? "completed",
      input.note ?? "",
      input.refId ?? null,
      now
    );
  return getLedgerEntry(id)!;
}

export function getLedgerEntry(id: string): LedgerEntry | null {
  const row = db()
    .prepare(
      `SELECT t.*, u.name AS user_name, u.email AS user_email
         FROM transactions t JOIN users u ON u.id = t.user_id WHERE t.id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapLedger(row) : null;
}

export interface ListLedgerParams {
  userId?: string;
  type?: LedgerType | "all";
  query?: string;
  page?: number;
  pageSize?: number;
}

export function listLedger(
  params: ListLedgerParams = {}
): { rows: LedgerEntry[]; total: number } {
  const { userId, type = "all", query = "", page = 1, pageSize = 25 } = params;
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (userId) {
    where.push("t.user_id = ?");
    args.push(userId);
  }
  if (type !== "all") {
    where.push("t.type = ?");
    args.push(type);
  }
  if (query.trim()) {
    where.push("(t.note LIKE ? OR t.asset LIKE ? OR u.name LIKE ? OR u.email LIKE ?)");
    const like = `%${query.trim()}%`;
    args.push(like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const from = `FROM transactions t JOIN users u ON u.id = t.user_id`;

  const total = (
    db().prepare(`SELECT COUNT(*) AS c ${from} ${whereSql}`).get(...args) as { c: number }
  ).c;

  const rows = db()
    .prepare(
      `SELECT t.*, u.name AS user_name, u.email AS user_email
         ${from} ${whereSql}
        ORDER BY t.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...args, pageSize, (page - 1) * pageSize) as Record<string, unknown>[];

  return { rows: rows.map(mapLedger), total };
}

function mapLedger(row: Record<string, unknown>): LedgerEntry {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: row.type as LedgerType,
    asset: String(row.asset),
    amount: Number(row.amount),
    price: Number(row.price ?? 0),
    fee: Number(row.fee ?? 0),
    status: (row.status ?? "completed") as LedgerEntry["status"],
    note: String(row.note ?? ""),
    refId: (row.ref_id as string | null) ?? null,
    createdAt: String(row.created_at),
    user: row.user_email
      ? {
          id: String(row.user_id),
          name: String(row.user_name),
          email: String(row.user_email),
        }
      : undefined,
  };
}
