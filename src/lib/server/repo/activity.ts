import "server-only";
import { db } from "../db";
import { newId } from "../ids";
import type {
  ActivityCategory,
  ActivityLog,
  ActivitySeverity,
} from "@/lib/types/platform";

/**
 * Activity ledger — the record the admin console monitors.
 *
 * Every meaningful platform action (sign-in, deposit submission, trade,
 * profile change, admin decision…) writes one row with the acting user, the
 * affected user, structured metadata, IP and user agent.
 */

export const ACTIVITY_ACTIONS = {
  signup: { action: "auth.signup", category: "auth", label: "Account created" },
  login: { action: "auth.login", category: "auth", label: "Signed in" },
  loginFailed: { action: "auth.login_failed", category: "security", label: "Failed sign-in" },
  logout: { action: "auth.logout", category: "auth", label: "Signed out" },
  passwordChanged: { action: "account.password_changed", category: "security", label: "Password changed" },
  passwordReset: { action: "account.password_reset", category: "security", label: "Password reset by admin" },
  profileUpdated: { action: "account.profile_updated", category: "account", label: "Profile updated" },
  sessionRevoked: { action: "account.sessions_revoked", category: "security", label: "Sessions revoked" },
  depositSubmitted: { action: "deposit.submitted", category: "deposit", label: "Deposit submitted" },
  depositApproved: { action: "deposit.approved", category: "deposit", label: "Deposit approved" },
  depositRejected: { action: "deposit.rejected", category: "deposit", label: "Deposit rejected" },
  depositCancelled: { action: "deposit.cancelled", category: "deposit", label: "Deposit cancelled" },
  withdrawalSubmitted: { action: "withdrawal.submitted", category: "withdrawal", label: "Withdrawal requested" },
  withdrawalApproved: { action: "withdrawal.approved", category: "withdrawal", label: "Withdrawal approved" },
  withdrawalRejected: { action: "withdrawal.rejected", category: "withdrawal", label: "Withdrawal rejected" },
  tradeExecuted: { action: "trade.executed", category: "trade", label: "Order filled" },
  balanceAdjusted: { action: "admin.balance_adjusted", category: "admin", label: "Balance adjusted" },
  userStatusChanged: { action: "admin.user_status", category: "admin", label: "Account status changed" },
  userRoleChanged: { action: "admin.user_role", category: "admin", label: "Role changed" },
  userDeleted: { action: "admin.user_deleted", category: "admin", label: "Account deleted" },
  methodCreated: { action: "admin.method_created", category: "admin", label: "Deposit method created" },
  methodUpdated: { action: "admin.method_updated", category: "admin", label: "Deposit method updated" },
  methodDeleted: { action: "admin.method_deleted", category: "admin", label: "Deposit method deleted" },
  settingsUpdated: { action: "admin.settings_updated", category: "admin", label: "Platform settings updated" },
  announcementCreated: { action: "admin.announcement_created", category: "admin", label: "Announcement published" },
  announcementDeleted: { action: "admin.announcement_deleted", category: "admin", label: "Announcement removed" },
  supportTicket: { action: "support.ticket", category: "account", label: "Support request" },
} as const satisfies Record<
  string,
  { action: string; category: ActivityCategory; label: string }
>;

export type ActivityActionKey = keyof typeof ACTIVITY_ACTIONS;

export interface LogActivityInput {
  actionKey: ActivityActionKey;
  /** The account this event is about. */
  userId?: string | null;
  /** Who performed it (defaults to the subject). */
  actorId?: string | null;
  summary?: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  severity?: ActivitySeverity;
  ip?: string;
  userAgent?: string;
}

export function logActivity(input: LogActivityInput): ActivityLog {
  const def = ACTIVITY_ACTIONS[input.actionKey];
  const now = new Date().toISOString();
  const id = newId("act");
  db()
    .prepare(
      `INSERT INTO activity_logs
        (id, user_id, actor_id, action, category, summary, entity_type, entity_id, meta,
         severity, ip, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.userId ?? null,
      input.actorId ?? input.userId ?? null,
      def.action,
      def.category,
      input.summary ?? def.label,
      input.entityType ?? null,
      input.entityId ?? null,
      JSON.stringify(input.meta ?? {}),
      input.severity ?? defaultSeverity(input.actionKey),
      (input.ip ?? "").slice(0, 64),
      (input.userAgent ?? "").slice(0, 256),
      now
    );

  return getActivity(id)!;
}

function defaultSeverity(key: ActivityActionKey): ActivitySeverity {
  if (key === "loginFailed") return "warning";
  if (key === "userDeleted" || key === "passwordReset" || key === "sessionRevoked") return "critical";
  if (
    key === "signup" ||
    key === "depositApproved" ||
    key === "tradeExecuted" ||
    key === "withdrawalApproved"
  )
    return "success";
  if (key === "depositRejected" || key === "withdrawalRejected" || key === "userStatusChanged")
    return "warning";
  return "info";
}

export function getActivity(id: string): ActivityLog | null {
  const row = db()
    .prepare(
      `SELECT a.*, u.name AS user_name, u.email AS user_email,
              r.name AS actor_name, r.email AS actor_email
         FROM activity_logs a
         LEFT JOIN users u ON u.id = a.user_id
         LEFT JOIN users r ON r.id = a.actor_id
        WHERE a.id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapActivity(row) : null;
}

export interface ListActivityParams {
  userId?: string;
  actorId?: string;
  category?: ActivityCategory | "all";
  action?: string;
  severity?: ActivitySeverity | "all";
  query?: string;
  since?: string;
  until?: string;
  page?: number;
  pageSize?: number;
}

export function listActivity(
  params: ListActivityParams = {}
): { rows: ActivityLog[]; total: number } {
  const {
    userId,
    actorId,
    category = "all",
    action,
    severity = "all",
    query = "",
    since,
    until,
    page = 1,
    pageSize = 30,
  } = params;

  const where: string[] = [];
  const args: (string | number)[] = [];

  if (userId) {
    where.push("(a.user_id = ? OR a.actor_id = ?)");
    args.push(userId, userId);
  }
  if (actorId) {
    where.push("a.actor_id = ?");
    args.push(actorId);
  }
  if (category !== "all") {
    where.push("a.category = ?");
    args.push(category);
  }
  if (action && action !== "all") {
    where.push("a.action = ?");
    args.push(action);
  }
  if (severity !== "all") {
    where.push("a.severity = ?");
    args.push(severity);
  }
  if (since) {
    where.push("a.created_at >= ?");
    args.push(since);
  }
  if (until) {
    where.push("a.created_at <= ?");
    args.push(until);
  }
  if (query.trim()) {
    where.push("(a.summary LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR a.action LIKE ?)");
    const like = `%${query.trim()}%`;
    args.push(like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const from = `FROM activity_logs a
                LEFT JOIN users u ON u.id = a.user_id
                LEFT JOIN users r ON r.id = a.actor_id`;

  const total = (
    db()
      .prepare(
        `SELECT COUNT(*) AS c ${from} ${whereSql.replace(/\bu\./g, "u.").replace(/\ba\./g, "a.")}`
      )
      .get(...args) as { c: number }
  ).c;

  const rows = db()
    .prepare(
      `SELECT a.*, u.name AS user_name, u.email AS user_email,
              r.name AS actor_name, r.email AS actor_email
         ${from} ${whereSql}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?`
    )
    .all(...args, pageSize, (page - 1) * pageSize) as Record<string, unknown>[];

  return { rows: rows.map(mapActivity), total };
}

function mapActivity(row: Record<string, unknown>): ActivityLog {
  let meta: Record<string, unknown> = {};
  try {
    meta = JSON.parse(String(row.meta ?? "{}")) as Record<string, unknown>;
  } catch {
    meta = {};
  }
  return {
    id: String(row.id),
    userId: (row.user_id as string | null) ?? null,
    actorId: (row.actor_id as string | null) ?? null,
    action: String(row.action),
    category: row.category as ActivityCategory,
    summary: String(row.summary),
    entityType: (row.entity_type as string | null) ?? null,
    entityId: (row.entity_id as string | null) ?? null,
    meta,
    severity: (row.severity ?? "info") as ActivitySeverity,
    ip: String(row.ip ?? ""),
    userAgent: String(row.user_agent ?? ""),
    createdAt: String(row.created_at),
    user: row.user_email
      ? { id: String(row.user_id), name: String(row.user_name), email: String(row.user_email) }
      : null,
    actor: row.actor_email
      ? { id: String(row.actor_id), name: String(row.actor_name), email: String(row.actor_email) }
      : null,
  };
}

/** Distinct actions seen so far — powers the admin filter dropdown. */
export function listActivityActions(): { action: string; count: number }[] {
  return db()
    .prepare(
      "SELECT action, COUNT(*) AS count FROM activity_logs GROUP BY action ORDER BY count DESC"
    )
    .all() as { action: string; count: number }[];
}

export function countActivitySince(iso: string, userId?: string): number {
  const row = userId
    ? (db()
        .prepare(
          "SELECT COUNT(*) AS c FROM activity_logs WHERE created_at >= ? AND user_id = ?"
        )
        .get(iso, userId) as { c: number })
    : (db()
        .prepare("SELECT COUNT(*) AS c FROM activity_logs WHERE created_at >= ?")
        .get(iso) as { c: number });
  return row.c;
}

export function deleteActivityForUser(userId: string): void {
  db().prepare("UPDATE activity_logs SET user_id = NULL, actor_id = NULL WHERE user_id = ?").run(
    userId
  );
}
