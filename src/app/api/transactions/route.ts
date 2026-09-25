import { listLedger } from "@/lib/server/repo/ledger";
import { handleApiError, ok, requireApiUser } from "@/lib/server/http";
import type { LedgerType } from "@/lib/types/platform";

export const dynamic = "force-dynamic";

/**
 * GET /api/transactions — the signed-in user's ledger.
 * `?type=buy|sell|deposit|withdrawal|transfer|adjustment|reward&page=1`
 */
export async function GET(req: Request) {
  try {
    const user = await requireApiUser();
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") ?? "all") as LedgerType | "all";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? 50)));
    const query = url.searchParams.get("q") ?? "";

    const result = listLedger({ userId: user.id, type, page, pageSize, query });
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
