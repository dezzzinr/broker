import { listLedger } from "@/lib/server/repo/ledger";
import { handleApiError, ok, requireApiAdmin } from "@/lib/server/http";
import type { LedgerType } from "@/lib/types/platform";

export const dynamic = "force-dynamic";

/** GET /api/admin/ledger — every balance movement across all accounts. */
export async function GET(req: Request) {
  try {
    await requireApiAdmin();
    const url = new URL(req.url);

    const result = listLedger({
      userId: url.searchParams.get("userId") ?? undefined,
      type: (url.searchParams.get("type") ?? "all") as LedgerType | "all",
      query: url.searchParams.get("q") ?? "",
      page: Math.max(1, Number(url.searchParams.get("page") ?? 1)),
      pageSize: Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? 25))),
    });

    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
