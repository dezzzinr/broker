import { listActivity, listActivityActions } from "@/lib/server/repo/activity";
import { handleApiError, ok, requireApiAdmin } from "@/lib/server/http";
import type { ActivityCategory, ActivitySeverity } from "@/lib/types/platform";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/activity — the platform-wide action stream.
 * `?userId=&category=&action=&severity=&q=&since=&until=&page=`
 */
export async function GET(req: Request) {
  try {
    await requireApiAdmin();
    const url = new URL(req.url);

    const result = listActivity({
      userId: url.searchParams.get("userId") ?? undefined,
      category: (url.searchParams.get("category") ?? "all") as ActivityCategory | "all",
      action: url.searchParams.get("action") ?? undefined,
      severity: (url.searchParams.get("severity") ?? "all") as ActivitySeverity | "all",
      query: url.searchParams.get("q") ?? "",
      since: url.searchParams.get("since") ?? undefined,
      until: url.searchParams.get("until") ?? undefined,
      page: Math.max(1, Number(url.searchParams.get("page") ?? 1)),
      pageSize: Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? 25))),
    });

    return ok({ ...result, actions: listActivityActions() });
  } catch (error) {
    return handleApiError(error);
  }
}
