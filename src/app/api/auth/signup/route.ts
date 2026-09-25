import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/server/validation";
import { signUp } from "@/lib/server/services/auth.service";
import {
  ApiError,
  assertSameOrigin,
  handleApiError,
  rateLimit,
  readJson,
  tooMany,
} from "@/lib/server/http";
import { requestMeta, sessionCookieOptions, SESSION_COOKIE } from "@/lib/server/auth";
import { getPlatformSettings } from "@/lib/server/repo/settings";

export const dynamic = "force-dynamic";

/** POST /api/auth/signup — creates an account and signs the user straight in. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);

    const meta = await requestMeta();
    const limit = rateLimit(`signup:${meta.ip}`, 5, 10 * 60_000);
    if (!limit.allowed) throw tooMany("Too many accounts created from this device. Try again later.");

    const input = await readJson(req, signupSchema);
    if (!getPlatformSettings().registrationsOpen) {
      throw new ApiError(403, "Registrations are currently closed. Please contact support.");
    }

    const { user, token, expiresAt } = signUp(
      {
        name: input.name,
        email: input.email,
        password: input.password,
        country: input.country,
        phone: input.phone,
      },
      meta
    );

    const res = NextResponse.json({ ok: true, data: { user } }, { status: 201 });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
