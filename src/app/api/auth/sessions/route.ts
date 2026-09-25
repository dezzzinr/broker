import { NextResponse } from "next/server";
import {
  destroyAllSessions,
  getSessionUserWithToken,
  hashToken,
  listSessions,
} from "@/lib/server/auth";
import * as activity from "@/lib/server/repo/activity";
import { assertSameOrigin, handleApiError, ok, unauthorized } from "@/lib/server/http";
import { requestMeta } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** GET /api/auth/sessions — devices currently signed in to this account. */
export async function GET() {
  try {
    const { user, token } = await getSessionUserWithToken();
    if (!user) throw unauthorized();
    const currentId = token ? hashToken(token) : null;
    const sessions = listSessions(user.id).map((s) => ({
      ...s,
      current: s.id === currentId,
    }));
    return ok({ sessions });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/auth/sessions — revokes every session except the current one. */
export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const meta = await requestMeta();
    const { user, token } = await getSessionUserWithToken();
    if (!user) throw unauthorized();

    const revoked = destroyAllSessions(user.id, token ?? undefined);
    activity.logActivity({
      actionKey: "sessionRevoked",
      userId: user.id,
      summary: `Signed out ${revoked} other device(s)`,
      severity: "critical",
      ...meta,
    });

    return NextResponse.json({ ok: true, data: { revoked } });
  } catch (error) {
    return handleApiError(error);
  }
}
