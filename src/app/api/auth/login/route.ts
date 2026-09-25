import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/server/validation";
import { signIn } from "@/lib/server/services/auth.service";
import { assertSameOrigin, handleApiError, rateLimit, readJson, tooMany } from "@/lib/server/http";
import { requestMeta, sessionCookieOptions, SESSION_COOKIE } from "@/lib/server/auth";
import type { SessionUser } from "@/lib/server/auth";

/** Response shape for the client — the session id stays server-side. */
function publicUser(user: SessionUser) {
  const { sessionId: _sessionId, ...rest } = user;
  void _sessionId;
  return rest;
}

export const dynamic = "force-dynamic";

/** POST /api/auth/login — verifies credentials and issues a session cookie. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);

    const meta = await requestMeta();
    const limit = rateLimit(`login:${meta.ip}`, 20, 10 * 60_000);
    if (!limit.allowed) throw tooMany("Too many sign-in attempts. Please wait a few minutes.");

    const input = await readJson(req, loginSchema);
    const { user, token, expiresAt } = signIn(input.email, input.password, meta);

    const res = NextResponse.json({
      ok: true,
      data: {
        user: publicUser(user),
        home: user.role === "admin" ? "/admin" : "/dashboard",
      },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
