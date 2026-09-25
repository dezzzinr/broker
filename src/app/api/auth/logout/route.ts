import { NextResponse } from "next/server";
import { signOut } from "@/lib/server/services/auth.service";
import { assertSameOrigin, handleApiError } from "@/lib/server/http";
import {
  getSessionUserWithToken,
  requestMeta,
  SESSION_COOKIE,
} from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout — destroys the current session server-side. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const meta = await requestMeta();
    const { user, token } = await getSessionUserWithToken();
    signOut(token, user, meta);

    const res = NextResponse.json({ ok: true, data: { signedOut: true } });
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
