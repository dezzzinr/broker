import { getSessionUser } from "@/lib/server/auth";
import { handleApiError, ok, requireApiUser } from "@/lib/server/http";
import { countActiveSessions } from "@/lib/server/services/auth.service";
import { getBalances } from "@/lib/server/repo/wallet";
import { unreadCount } from "@/lib/server/repo/notifications";
import { countPending } from "@/lib/server/repo/funds";

export const dynamic = "force-dynamic";

/** GET /api/auth/me — the signed-in account plus a snapshot of its context. */
export async function GET() {
  try {
    const user = await requireApiUser();
    return ok({
      user,
      balances: getBalances(user.id),
      unreadNotifications: unreadCount(user.id),
      sessions: countActiveSessions(user.id),
      pendingReviews: user.role === "admin" ? countPending("deposit") + countPending("withdrawal") : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function HEAD() {
  const user = await getSessionUser();
  return new Response(null, { status: user ? 200 : 401 });
}
