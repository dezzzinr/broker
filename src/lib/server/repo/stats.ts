import "server-only";
import { db } from "../db";
import type { FundStatus, PlatformStats } from "@/lib/types/platform";

/** Aggregate metrics for the admin overview. */

function daysAgo(days: number, endOf = false): string {
  const d = new Date();
  d.setUTCHours(endOf ? 23 : 0, endOf ? 59 : 0, endOf ? 59 : 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const one = async <T,>(sql: string, ...args: (string | number)[]): Promise<T> =>
    (await db().prepare(sql).get(...args)) as T;

  const users = (await one<{ c: number }>("SELECT COUNT(*) AS c FROM users")).c;
  const activeUsers = (await one<{ c: number }>(
    "SELECT COUNT(*) AS c FROM users WHERE status = 'active'"
  )).c;
  const suspendedUsers = (await one<{ c: number }>(
    "SELECT COUNT(*) AS c FROM users WHERE status = 'suspended'"
  )).c;
  const newUsersToday = (await one<{ c: number }>(
    "SELECT COUNT(*) AS c FROM users WHERE created_at >= ?",
    daysAgo(0)
  )).c;
  const newUsers7d = (await one<{ c: number }>(
    "SELECT COUNT(*) AS c FROM users WHERE created_at >= ?",
    daysAgo(7)
  )).c;
  const sessionsActive = (await one<{ c: number }>(
    `SELECT COUNT(DISTINCT user_id) AS c FROM sessions
      WHERE expires_at > ? AND last_seen_at >= ?`,
    new Date().toISOString(),
    daysAgo(1)
  )).c;

  const fundCount = async (status: FundStatus, kind = "deposit") =>
    one<{ c: number; v: number }>(
      `SELECT COUNT(*) AS c, COALESCE(SUM(amount), 0) AS v FROM fund_requests
        WHERE kind = ? AND status = ?`,
      kind,
      status
    );

  const pendingDeposits = await fundCount("pending");
  const approvedDeposits = await fundCount("approved");
  const rejectedDeposits = await fundCount("rejected");
  const withdrawalsPending = await fundCount("pending", "withdrawal");

  const todayActivity = (await one<{ c: number }>(
    "SELECT COUNT(*) AS c FROM activity_logs WHERE created_at >= ?",
    daysAgo(0)
  )).c;
  const totalActivity = (await one<{ c: number }>("SELECT COUNT(*) AS c FROM activity_logs")).c;
  const tradesToday = (await one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM transactions WHERE type IN ('buy','sell') AND created_at >= ?`,
    daysAgo(0)
  )).c;
  const volumeUsd = (await one<{ v: number }>(
    `SELECT COALESCE(SUM(amount * price), 0) AS v FROM transactions WHERE type IN ('buy','sell')`
  )).v;

  const signupsByDay = (await db()
    .prepare(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS count
         FROM users WHERE created_at >= ?
        GROUP BY day ORDER BY day ASC`
    )
    .all(daysAgo(13))) as { day: string; count: number }[];

  const depositsByDay = (await db()
    .prepare(
      `SELECT substr(submitted_at, 1, 10) AS day,
              COALESCE(SUM(amount), 0) AS value, COUNT(*) AS count
         FROM fund_requests
        WHERE kind = 'deposit' AND submitted_at >= ?
        GROUP BY day ORDER BY day ASC`
    )
    .all(daysAgo(13))) as { day: string; value: number; count: number }[];

  const depositsByMethod = (await db()
    .prepare(
      `SELECT method_name AS method, COALESCE(SUM(amount), 0) AS value, COUNT(*) AS count
         FROM fund_requests WHERE kind = 'deposit' AND status != 'cancelled'
        GROUP BY method_name ORDER BY value DESC LIMIT 6`
    )
    .all()) as { method: string; value: number; count: number }[];

  const depositsByStatus = (await db()
    .prepare(
      `SELECT status, COUNT(*) AS count FROM fund_requests WHERE kind = 'deposit' GROUP BY status`
    )
    .all()) as { status: FundStatus; count: number }[];

  return {
    users,
    activeUsers,
    suspendedUsers,
    newUsersToday,
    newUsers7d,
    sessionsActive,
    pendingDeposits: pendingDeposits.c,
    pendingValue: pendingDeposits.v,
    approvedDeposits: approvedDeposits.c,
    approvedValue: approvedDeposits.v,
    rejectedDeposits: rejectedDeposits.c,
    withdrawalsPending: withdrawalsPending.c,
    todayActivity,
    totalActivity,
    tradesToday,
    volumeUsd,
    signupsByDay: fillDays(signupsByDay, 14, (day) => ({ day, count: 0 })),
    depositsByDay: fillDays(depositsByDay, 14, (day) => ({ day, value: 0, count: 0 })),
    depositsByMethod,
    depositsByStatus,
  };
}

/** Pads a sparse `YYYY-MM-DD` series so charts show a continuous axis. */
function fillDays<T extends { day: string }>(
  rows: T[],
  days: number,
  make: (day: string) => T
): T[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: T[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push(byDay.get(key) ?? make(key));
  }
  return out;
}

/** Recent signups for the admin overview sidebar. */
export async function recentUsers(limit = 6) {
  return (await db()
    .prepare(
      `SELECT id, name, email, role, status, created_at, last_login_at
         FROM users ORDER BY created_at DESC LIMIT ?`
    )
    .all(limit)) as {
    id: string;
    name: string;
    email: string;
    role: "user" | "admin";
    status: "active" | "suspended";
    created_at: string;
    last_login_at: string | null;
  }[];
}

export async function walletTotals(): Promise<
  { asset: string; amount: number; users: number }[]
> {
  return (await db()
    .prepare(
      `SELECT asset, COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS users
         FROM balances WHERE amount > 0 GROUP BY asset ORDER BY amount DESC`
    )
    .all()) as { asset: string; amount: number; users: number }[];
}
