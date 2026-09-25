import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, requestMeta, SESSION_COOKIE, type SessionUser } from "./auth";
import { db } from "./db";

/** API helpers: errors, JSON envelopes, auth guards, CSRF and rate limiting. */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new ApiError(400, message, fields);
export const unauthorized = (message = "You need to sign in to continue.") =>
  new ApiError(401, message);
export const forbidden = (message = "You do not have access to this resource.") =>
  new ApiError(403, message);
export const notFound = (message = "Not found.") => new ApiError(404, message);
export const conflict = (message: string) => new ApiError(409, message);
export const tooMany = (message = "Too many attempts. Please slow down.") =>
  new ApiError(429, message);

/** Normalises thrown values into a JSON error envelope. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { ok: false, error: error.message, fields: error.fields ?? null },
      { status: error.status }
    );
  }
  if (error instanceof z.ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fields[key]) fields[key] = issue.message;
    }
    return NextResponse.json(
      { ok: false, error: "Please check the highlighted fields.", fields },
      { status: 422 }
    );
  }
  console.error("[quantix:api]", error);
  return NextResponse.json(
    { ok: false, error: "Something went wrong on our side. Please try again." },
    { status: 500 }
  );
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

/** Guard for API routes — returns the signed-in user or throws 401. */
export async function requireApiUser(): Promise<SessionUser & { ip: string; userAgent: string }> {
  const [user, meta] = await Promise.all([getSessionUser(), requestMeta()]);
  if (!user) throw unauthorized();
  return { ...user, ...meta };
}

/** Guard for admin-only API routes — throws 401/403 as appropriate. */
export async function requireApiAdmin(): Promise<SessionUser & { ip: string; userAgent: string }> {
  const user = await requireApiUser();
  if (user.role !== "admin") throw forbidden("Administrator access is required.");
  return user;
}

/**
 * CSRF protection for mutating endpoints.
 * The session cookie is SameSite=Lax; we additionally require the request to
 * be same-origin so cross-site form posts cannot reach state-changing routes.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  const site = req.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "none") return;
  if (!origin) return; // non-browser clients (curl, server-to-server)
  try {
    const url = new URL(origin);
    if (host && url.host === host) return;
  } catch {
    /* fall through */
  }
  throw new ApiError(403, "Cross-origin request blocked.");
}

/* ------------------------------ rate limiting --------------------------- */

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

/**
 * Fixed-window limiter. In-memory per server instance, which is enough for a
 * single-node deployment; swap for Redis when scaling horizontally.
 */
export function rateLimit(key: string, limit: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
} {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/** Periodically drop stale buckets so the map can't grow without bound. */
if (typeof setInterval !== "undefined" && !(globalThis as { __qxSweeper?: boolean }).__qxSweeper) {
  (globalThis as { __qxSweeper?: boolean }).__qxSweeper = true;
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }, 60_000);
  timer.unref?.();
}

/** Records a login attempt and reports whether the identifier is locked out. */
export function registerLoginAttempt(identifier: string, ip: string, success: boolean): void {
  db()
    .prepare(
      `INSERT INTO login_attempts (id, identifier, ip, success, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      `la_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`,
      identifier.toLowerCase(),
      ip.slice(0, 64),
      success ? 1 : 0,
      new Date().toISOString()
    );
}

export function loginLockout(identifier: string, ip: string, windowMinutes = 15, max = 8): {
  locked: boolean;
  retryAfter: number;
} {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const row = db()
    .prepare(
      `SELECT COUNT(*) AS failures, MAX(created_at) AS latest
         FROM login_attempts
        WHERE (identifier = ? OR ip = ?) AND success = 0 AND created_at > ?`
    )
    .get(identifier.toLowerCase(), ip, since) as { failures: number; latest: string | null };

  if (row.failures < max) return { locked: false, retryAfter: 0 };
  const latest = row.latest ? new Date(row.latest).getTime() : Date.now();
  const retryAfter = Math.max(
    1,
    Math.ceil((latest + windowMinutes * 60_000 - Date.now()) / 1000)
  );
  return { locked: true, retryAfter };
}

export function clearLoginAttempts(identifier: string): void {
  db()
    .prepare("DELETE FROM login_attempts WHERE identifier = ?")
    .run(identifier.toLowerCase());
}

/* -------------------------------- parsing ------------------------------- */

export async function readJson<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Expected a JSON body.");
  }
  return schema.parse(body);
}

export async function readForm(req: Request): Promise<FormData> {
  try {
    return await req.formData();
  } catch {
    throw badRequest("Expected multipart/form-data.");
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
