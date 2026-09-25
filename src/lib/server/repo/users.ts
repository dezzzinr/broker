import "server-only";
import { db, transaction } from "../db";
import { hashPassword } from "../crypto";
import { newId } from "../ids";
import type { AdminUserRow, PublicUser, UserRole } from "@/lib/types/platform";

/** Maps a raw `users` row onto the public wire type (never exposes the hash). */
export function mapUser(row: Record<string, unknown>): PublicUser {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: row.role as PublicUser["role"],
    status: row.status as PublicUser["status"],
    kycStatus: (row.kyc_status ?? "unverified") as PublicUser["kycStatus"],
    phone: String(row.phone ?? ""),
    country: String(row.country ?? ""),
    avatarHue: Number(row.avatar_hue ?? 265),
    twoFactor: Boolean(row.two_factor),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastLoginAt: (row.last_login_at as string | null) ?? null,
    lastLoginIp: (row.last_login_ip as string | null) ?? null,
  };
}

/** Account repository — registration, lookup, admin management. */

const AVATAR_HUES = [265, 215, 165, 35, 340, 190, 285, 120];

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
  phone?: string;
  country?: string;
  kycStatus?: PublicUser["kycStatus"];
}

export function createUser(input: CreateUserInput): PublicUser {
  const now = new Date().toISOString();
  const id = newId("usr");
  const hue = AVATAR_HUES[Math.floor(Math.random() * AVATAR_HUES.length)];

  transaction(() => {
    db()
      .prepare(
        `INSERT INTO users
           (id, email, name, password_hash, role, status, kyc_status, phone, country,
            avatar_hue, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.email.toLowerCase().trim(),
        input.name.trim(),
        hashPassword(input.password),
        input.role ?? "user",
        input.kycStatus ?? "unverified",
        input.phone ?? "",
        input.country ?? "",
        hue,
        now,
        now
      );
    // Every account opens with the platform's base currencies at zero.
    const assets = ["USD", "USDT", "BTC", "ETH", "SOL"];
    const stmt = db().prepare(
      `INSERT INTO balances (user_id, asset, amount, avg_cost, updated_at) VALUES (?, ?, 0, 0, ?)`
    );
    for (const asset of assets) stmt.run(id, asset, now);
  });

  const user = findById(id);
  if (!user) throw new Error("Failed to create user");
  return user;
}

export function findById(id: string): PublicUser | null {
  const row = db().prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapUser(row) : null;
}

export function findByEmail(email: string): (PublicUser & { passwordHash: string }) | null {
  const row = db()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase().trim()) as Record<string, unknown> | undefined;
  if (!row) return null;
  return { ...mapUser(row), passwordHash: String(row.password_hash) };
}

export function emailExists(email: string): boolean {
  const row = db()
    .prepare("SELECT 1 AS one FROM users WHERE email = ?")
    .get(email.toLowerCase().trim()) as { one: number } | undefined;
  return Boolean(row);
}

export interface ListUsersParams {
  query?: string;
  status?: "all" | PublicUser["status"];
  role?: "all" | UserRole;
  sort?: "created" | "name" | "deposits" | "balance" | "lastLogin";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

const SORT_SQL: Record<NonNullable<ListUsersParams["sort"]>, string> = {
  created: "u.created_at",
  name: "u.name",
  deposits: "deposits_usd",
  balance: "balance_usd",
  lastLogin: "COALESCE(u.last_login_at, u.created_at)",
};

export function listUsers(params: ListUsersParams = {}): { rows: AdminUserRow[]; total: number } {
  const {
    query = "",
    status = "all",
    role = "all",
    sort = "created",
    dir = "desc",
    page = 1,
    pageSize = 25,
  } = params;

  const where: string[] = [];
  const args: (string | number)[] = [];
  if (query.trim()) {
    where.push("(u.email LIKE ? OR u.name LIKE ? OR u.id LIKE ?)");
    const like = `%${query.trim()}%`;
    args.push(like, like, like);
  }
  if (status !== "all") {
    where.push("u.status = ?");
    args.push(status);
  }
  if (role !== "all") {
    where.push("u.role = ?");
    args.push(role);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const order = `${SORT_SQL[sort] ?? SORT_SQL.created} ${dir === "asc" ? "ASC" : "DESC"}`;

  const total = (
    db().prepare(`SELECT COUNT(*) AS c FROM users u ${whereSql}`).get(...args) as { c: number }
  ).c;

  const rows = db()
    .prepare(
      `SELECT u.*,
              COALESCE((SELECT SUM(b.amount * CASE WHEN b.asset IN ('USD','USDT') THEN 1 ELSE 0 END)
                          FROM balances b WHERE b.user_id = u.id), 0) AS balance_usd,
              COALESCE((SELECT SUM(f.amount) FROM fund_requests f
                         WHERE f.user_id = u.id AND f.kind = 'deposit' AND f.status = 'approved'), 0)
                AS deposits_usd,
              (SELECT COUNT(*) FROM fund_requests f
                WHERE f.user_id = u.id AND f.kind = 'deposit' AND f.status = 'pending')
                AS pending_deposits,
              (SELECT COUNT(*) FROM transactions t
                WHERE t.user_id = u.id AND t.type IN ('buy','sell')) AS trades,
              (SELECT MAX(a.created_at) FROM activity_logs a WHERE a.user_id = u.id)
                AS last_activity_at
         FROM users u
         ${whereSql}
        ORDER BY ${order}
        LIMIT ? OFFSET ?`
    )
    .all(...args, pageSize, (page - 1) * pageSize) as Record<string, unknown>[];

  return { rows: rows.map(toAdminRow), total };
}

export function getAdminUser(id: string): AdminUserRow | null {
  const row = db()
    .prepare(
      `SELECT u.*,
              COALESCE((SELECT SUM(b.amount * CASE WHEN b.asset IN ('USD','USDT') THEN 1 ELSE 0 END)
                          FROM balances b WHERE b.user_id = u.id), 0) AS balance_usd,
              COALESCE((SELECT SUM(f.amount) FROM fund_requests f
                         WHERE f.user_id = u.id AND f.kind = 'deposit' AND f.status = 'approved'), 0)
                AS deposits_usd,
              (SELECT COUNT(*) FROM fund_requests f
                WHERE f.user_id = u.id AND f.kind = 'deposit' AND f.status = 'pending')
                AS pending_deposits,
              (SELECT COUNT(*) FROM transactions t
                WHERE t.user_id = u.id AND t.type IN ('buy','sell')) AS trades,
              (SELECT MAX(a.created_at) FROM activity_logs a WHERE a.user_id = u.id)
                AS last_activity_at
         FROM users u WHERE u.id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? toAdminRow(row) : null;
}

function toAdminRow(row: Record<string, unknown>): AdminUserRow {
  return {
    ...mapUser(row),
    balanceUsd: Number(row.balance_usd ?? 0),
    depositsUsd: Number(row.deposits_usd ?? 0),
    pendingDeposits: Number(row.pending_deposits ?? 0),
    trades: Number(row.trades ?? 0),
    lastActivityAt: (row.last_activity_at as string | null) ?? null,
  };
}

export interface UpdateUserPatch {
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  role?: UserRole;
  status?: PublicUser["status"];
  kycStatus?: PublicUser["kycStatus"];
  twoFactor?: boolean;
}

export function updateUser(id: string, patch: UpdateUserPatch): PublicUser | null {
  const sets: string[] = ["updated_at = ?"];
  const args: (string | number | null)[] = [new Date().toISOString()];

  if (patch.name !== undefined) {
    sets.push("name = ?");
    args.push(patch.name.trim());
  }
  if (patch.email !== undefined) {
    sets.push("email = ?");
    args.push(patch.email.toLowerCase().trim());
  }
  if (patch.phone !== undefined) {
    sets.push("phone = ?");
    args.push(patch.phone.trim());
  }
  if (patch.country !== undefined) {
    sets.push("country = ?");
    args.push(patch.country.trim());
  }
  if (patch.role !== undefined) {
    sets.push("role = ?");
    args.push(patch.role);
  }
  if (patch.status !== undefined) {
    sets.push("status = ?");
    args.push(patch.status);
  }
  if (patch.kycStatus !== undefined) {
    sets.push("kyc_status = ?");
    args.push(patch.kycStatus);
  }
  if (patch.twoFactor !== undefined) {
    sets.push("two_factor = ?");
    args.push(patch.twoFactor ? 1 : 0);
  }
  args.push(id);
  db().prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...args);
  return findById(id);
}

export function setPassword(id: string, password: string): void {
  db()
    .prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
    .run(hashPassword(password), new Date().toISOString(), id);
}

export function recordLogin(id: string, ip: string): void {
  db()
    .prepare("UPDATE users SET last_login_at = ?, last_login_ip = ? WHERE id = ?")
    .run(new Date().toISOString(), ip.slice(0, 64), id);
}

export function deleteUser(id: string): void {
  transaction(() => {
    db().prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
    db().prepare("DELETE FROM balances WHERE user_id = ?").run(id);
    db().prepare("DELETE FROM notifications WHERE user_id = ?").run(id);
    db().prepare("DELETE FROM transactions WHERE user_id = ?").run(id);
    db().prepare("DELETE FROM fund_requests WHERE user_id = ?").run(id);
    db().prepare("UPDATE activity_logs SET user_id = NULL WHERE user_id = ?").run(id);
    db().prepare("DELETE FROM users WHERE id = ?").run(id);
  });
}

export function countAdmins(): number {
  const row = db()
    .prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND status = 'active'")
    .get() as { c: number };
  return row.c;
}
