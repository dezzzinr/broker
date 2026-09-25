import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { generateToken, hashToken } from "./crypto";

export { hashToken };
import { mapUser } from "./repo/users";
import type { PublicUser } from "@/lib/types/platform";

/**
 * Session management + server-side guards.
 *
 * Sessions are 256-bit opaque tokens stored hashed in SQLite and delivered in
 * an `httpOnly`, `SameSite=Lax` cookie with a 30-day sliding expiry. Password
 * verification lives in `./crypto`; this module owns the request lifecycle.
 */

export const SESSION_COOKIE = "quantix_session";
export const SESSION_TTL_DAYS = 30;

export function createSession(
  userId: string,
  ip = "",
  userAgent = ""
): { token: string; expiresAt: Date } {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  db()
    .prepare(
      `INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      hashToken(token),
      userId,
      now.toISOString(),
      expiresAt.toISOString(),
      now.toISOString(),
      ip.slice(0, 64),
      userAgent.slice(0, 256)
    );
  return { token, expiresAt };
}

export interface SessionUser extends PublicUser {
  sessionId: string;
}

export function readSession(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const row = db()
    .prepare(
      `SELECT s.id AS session_id, s.expires_at, s.ip AS session_ip, s.user_agent AS session_ua, u.*
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.id = ?`
    )
    .get(hashToken(token)) as
    | (Record<string, unknown> & { session_id: string; expires_at: string })
    | undefined;

  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db().prepare("DELETE FROM sessions WHERE id = ?").run(row.session_id);
    return null;
  }
  if (row.status !== "active") {
    // Suspended accounts lose every session immediately.
    db().prepare("DELETE FROM sessions WHERE user_id = ?").run(row.id);
    return null;
  }
  return { ...mapUser(row), sessionId: row.session_id };
}

/** Sliding expiry — only rewrite `expires_at` when it is within a week of lapsing. */
export function touchSession(sessionId: string): void {
  const now = new Date().toISOString();
  db()
    .prepare(
      `UPDATE sessions
          SET last_seen_at = ?,
              expires_at = CASE
                WHEN julianday(expires_at) - julianday(?) < 7
                  THEN datetime(?, '+' || ? || ' days')
                ELSE expires_at
              END
        WHERE id = ?`
    )
    .run(now, now, now, SESSION_TTL_DAYS, sessionId);
}

export function destroySession(token: string | undefined | null): void {
  if (!token) return;
  db().prepare("DELETE FROM sessions WHERE id = ?").run(hashToken(token));
}

export function destroyAllSessions(userId: string, exceptToken?: string): number {
  const keep = exceptToken ? hashToken(exceptToken) : null;
  const info = keep
    ? db().prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?").run(userId, keep)
    : db().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  return info.changes;
}

export function purgeExpiredSessions(): void {
  db().prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
}

export function listSessions(userId: string) {
  const rows = db()
    .prepare(
      `SELECT id, created_at, expires_at, last_seen_at, ip, user_agent
         FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC`
    )
    .all(userId) as {
    id: string;
    created_at: string;
    expires_at: string;
    last_seen_at: string;
    ip: string;
    user_agent: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    lastSeenAt: r.last_seen_at,
    ip: r.ip,
    userAgent: r.user_agent,
  }));
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

/** Current session user for RSC + route handlers. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const user = readSession(token);
  if (user) touchSession(user.sessionId);
  return user;
}

/** Convenience for API routes: returns `[user, token]`. */
export async function getSessionUserWithToken(): Promise<{
  user: SessionUser | null;
  token: string | null;
}> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  const user = readSession(token);
  if (user) touchSession(user.sessionId);
  return { user, token };
}

/** RSC guard — redirects unauthenticated visitors to the sign-in page. */
export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** RSC guard for the admin console. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/dashboard?reason=forbidden");
  return user;
}

export async function requestMeta(): Promise<{ ip: string; userAgent: string }> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for") ?? "";
  const ip = (forwarded.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
  return { ip, userAgent: h.get("user-agent") ?? "" };
}
