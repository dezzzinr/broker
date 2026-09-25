import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { DepositsManager, type DepositSummary } from "@/components/deposits/deposits-manager";
import { requireUser } from "@/lib/server/auth";
import { listMethods } from "@/lib/server/repo/methods";
import { listFundRequests } from "@/lib/server/repo/funds";
import { getPlatformSettings } from "@/lib/server/repo/settings";
import { getBalances } from "@/lib/server/repo/wallet";

export const metadata: Metadata = {
  title: "Deposits",
  description: "Fund your Quantix account with a manual deposit reviewed by our operations team.",
};

export const dynamic = "force-dynamic";

export default async function DepositsPage() {
  const user = await requireUser("/deposits");
  const platform = getPlatformSettings();
  const methods = listMethods(false);
  const history = listFundRequests({ userId: user.id, pageSize: 8 });

  const balances = getBalances(user.id);
  const cash =
    (balances.find((b) => b.asset === "USD")?.amount ?? 0) +
    (balances.find((b) => b.asset === "USDT")?.amount ?? 0);

  const all = listFundRequests({ userId: user.id, pageSize: 200 });
  const deposits = all.rows.filter((r) => r.kind === "deposit");
  const pending = deposits.filter((r) => r.status === "pending");
  const approved = deposits.filter((r) => r.status === "approved");

  const summary: DepositSummary = {
    cash,
    pendingCount: pending.length,
    pendingValue: pending.reduce((sum, r) => sum + r.amount, 0),
    approvedCount: approved.length,
    approvedValue: approved.reduce((sum, r) => sum + r.credit, 0),
    rejectedCount: deposits.filter((r) => r.status === "rejected").length,
    withdrawalsPending: all.rows.filter((r) => r.kind === "withdrawal" && r.status === "pending")
      .length,
    lastApproved: approved[0] ?? null,
    totalRequests: all.total,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deposits"
        description="Fund your account manually: choose a payment method published by our team, send the money, then upload your proof of payment for review."
      />
      <DepositsManager
        methods={methods}
        limits={{
          minDeposit: platform.minDeposit,
          maxDeposit: platform.maxDeposit,
          withdrawalEnabled: platform.withdrawalEnabled,
        }}
        kycStatus={user.kycStatus}
        supportEmail={platform.supportEmail}
        initialSummary={summary}
        initialHistory={{ rows: history.rows, total: history.total }}
      />
    </div>
  );
}
