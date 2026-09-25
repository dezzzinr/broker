import { getPlatformStats, recentUsers, walletTotals } from "@/lib/server/repo/stats";
import { listActivity } from "@/lib/server/repo/activity";
import { listFundRequests } from "@/lib/server/repo/funds";
import { handleApiError, ok, requireApiAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** GET /api/admin/stats — control-panel overview metrics. */
export async function GET() {
  try {
    await requireApiAdmin();
    const stats = getPlatformStats();
    const { rows: activityRows } = listActivity({ pageSize: 12 });
    const { rows: pending, total: pendingTotal, pendingValue } = listFundRequests({
      status: "pending",
      pageSize: 6,
    });

    return ok({
      stats,
      wallets: walletTotals(),
      recentUsers: recentUsers(6),
      recentActivity: activityRows,
      pendingRequests: pending,
      pendingTotal,
      pendingValue,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
