import { getBalances } from "@/lib/server/repo/wallet";
import { listFundRequests } from "@/lib/server/repo/funds";
import { handleApiError, ok, requireApiUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** GET /api/deposits/summary — funding headline figures for the current user. */
export async function GET() {
  try {
    const user = await requireApiUser();

    const balances = getBalances(user.id);
    const cash =
      (balances.find((b) => b.asset === "USD")?.amount ?? 0) +
      (balances.find((b) => b.asset === "USDT")?.amount ?? 0);

    const all = listFundRequests({ userId: user.id, pageSize: 500 });
    const deposits = all.rows.filter((r) => r.kind === "deposit");
    const pending = deposits.filter((r) => r.status === "pending");
    const approved = deposits.filter((r) => r.status === "approved");
    const rejected = deposits.filter((r) => r.status === "rejected");
    const withdrawals = all.rows.filter((r) => r.kind === "withdrawal");

    return ok({
      cash,
      pendingCount: pending.length,
      pendingValue: pending.reduce((sum, r) => sum + r.amount, 0),
      approvedCount: approved.length,
      approvedValue: approved.reduce((sum, r) => sum + r.credit, 0),
      rejectedCount: rejected.length,
      withdrawalsPending: withdrawals.filter((r) => r.status === "pending").length,
      lastApproved: approved[0] ?? null,
      totalRequests: all.total,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
