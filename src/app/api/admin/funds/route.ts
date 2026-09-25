import { listFundRequests } from "@/lib/server/repo/funds";
import { handleApiError, ok, requireApiAdmin } from "@/lib/server/http";
import type { FundKind, FundStatus } from "@/lib/types/platform";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/funds — the review queue.
 * `?kind=deposit|withdrawal|all&status=pending|approved|rejected|cancelled&q=&page=`
 */
export async function GET(req: Request) {
  try {
    await requireApiAdmin();
    const url = new URL(req.url);

    const result = listFundRequests({
      kind: (url.searchParams.get("kind") ?? "all") as FundKind | "all",
      status: (url.searchParams.get("status") ?? "pending") as FundStatus | "all",
      query: url.searchParams.get("q") ?? "",
      page: Math.max(1, Number(url.searchParams.get("page") ?? 1)),
      pageSize: Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? 20))),
    });

    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
