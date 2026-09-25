import { getBalances } from "@/lib/server/repo/wallet";
import { listLedger } from "@/lib/server/repo/ledger";
import { listFundRequests } from "@/lib/server/repo/funds";
import { handleApiError, ok, requireApiUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/wallet — the signed-in user's balances, recent ledger entries and
 * funding requests, in one round trip (used by Wallet, Portfolio and Trade).
 */
export async function GET() {
  try {
    const user = await requireApiUser();
    const balances = getBalances(user.id);
    const ledger = listLedger({ userId: user.id, pageSize: 12 });
    const funds = listFundRequests({ userId: user.id, pageSize: 8 });

    return ok({
      balances,
      transactions: ledger.rows,
      totalTransactions: ledger.total,
      fundRequests: funds.rows,
      pendingDeposits: funds.rows.filter((r) => r.status === "pending").length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
