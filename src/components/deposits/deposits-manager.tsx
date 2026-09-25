"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  Clock3,
  Hourglass,
  LifeBuoy,
  ShieldCheck,
  UploadCloud,
  Wallet as WalletIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { DepositWizard } from "./deposit-wizard";
import { DepositHistory } from "./deposit-history";
import { formatDateTime, formatUSD } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DepositMethod, FundRequest } from "@/lib/types/platform";

export interface DepositSummary {
  cash: number;
  pendingCount: number;
  pendingValue: number;
  approvedCount: number;
  approvedValue: number;
  rejectedCount: number;
  withdrawalsPending: number;
  lastApproved: FundRequest | null;
  totalRequests: number;
}

const HOW_IT_WORKS = [
  {
    icon: ArrowDownToLine,
    title: "Pick a funding channel",
    body: "Administrators publish the payment methods the platform accepts, with their limits and fees.",
  },
  {
    icon: WalletIcon,
    title: "Send the money yourself",
    body: "Transfer the exact amount from an account in your own name using the details we show you.",
  },
  {
    icon: UploadCloud,
    title: "Upload proof of payment",
    body: "Attach the receipt, screenshot or transaction hash so the team can match your transfer.",
  },
  {
    icon: ShieldCheck,
    title: "An administrator reviews it",
    body: "Approvals credit your USD wallet immediately; rejections always include a reason.",
  },
];

/**
 * Client half of the deposits route: owns the wizard, the history list and the
 * headline figures, refetching them after every mutation.
 */
export function DepositsManager({
  methods,
  limits,
  kycStatus,
  supportEmail,
  initialSummary,
  initialHistory,
}: {
  methods: DepositMethod[];
  limits: { minDeposit: number; maxDeposit: number; withdrawalEnabled: boolean };
  kycStatus: string;
  supportEmail: string;
  initialSummary: DepositSummary;
  initialHistory: { rows: FundRequest[]; total: number };
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [history, setHistory] = useState(initialHistory);
  const [kind, setKind] = useState<"all" | "deposit" | "withdrawal">("all");
  const [refreshing, setRefreshing] = useState(false);

  const reloadSummary = useCallback(async () => {
    try {
      const data = await api<DepositSummary>("/api/deposits/summary");
      setSummary(data);
    } catch {
      /* keep the previous figures */
    }
  }, []);

  const reloadHistory = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ kind, status: "all", page: "1" });
      const data = await api<{ rows: FundRequest[]; total: number }>(
        `/api/deposits?${params.toString()}`
      );
      setHistory(data);
    } catch {
      /* keep the previous list */
    } finally {
      setRefreshing(false);
    }
  }, [kind]);

  const refreshAll = useCallback(async () => {
    await Promise.all([reloadSummary(), reloadHistory()]);
  }, [reloadSummary, reloadHistory]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Cash balance"
          value={formatUSD(summary.cash)}
          icon={WalletIcon}
          footer="Available to trade or withdraw"
        />
        <StatCard
          label="Under review"
          value={formatUSD(summary.pendingValue)}
          icon={Hourglass}
          footer={
            summary.pendingCount
              ? `${summary.pendingCount} request${summary.pendingCount === 1 ? "" : "s"} awaiting an administrator`
              : "Nothing in the review queue"
          }
        />
        <StatCard
          label="Total credited"
          value={formatUSD(summary.approvedValue)}
          icon={ArrowDownToLine}
          footer={`${summary.approvedCount} approved deposit${summary.approvedCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Last credited"
          value={summary.lastApproved ? formatUSD(summary.lastApproved.credit) : "—"}
          icon={Clock3}
          footer={
            summary.lastApproved
              ? formatDateTime(summary.lastApproved.reviewedAt ?? summary.lastApproved.submittedAt)
              : "No approved deposits yet"
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
        <DepositWizard methods={methods} limits={limits} onSubmitted={() => void refreshAll()} />

        <div className="space-y-5">
          <Card>
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-[14px] font-semibold tracking-tight text-foreground">
                How manual deposits work
              </h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                Every deposit is matched by a human reviewer — never by an automated guess.
              </p>
            </div>
            <ol className="divide-y divide-border">
              {HOW_IT_WORKS.map((step, index) => (
                <li key={step.title} className="flex gap-3 px-5 py-3.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent-soft text-accent">
                    <step.icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 text-[12.5px] font-semibold text-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-faint">
                        Step {index + 1}
                      </span>
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="border-accent/20 bg-gradient-to-br from-accent-soft to-transparent">
            <div className="p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-accent" aria-hidden />
                <h2 className="text-[13.5px] font-semibold text-foreground">Platform limits</h2>
              </div>
              <dl className="mt-3 space-y-2 text-[12.5px]">
                <LimitRow label="Minimum deposit" value={formatUSD(limits.minDeposit)} />
                <LimitRow label="Maximum per request" value={formatUSD(limits.maxDeposit)} />
                <LimitRow
                  label="Withdrawals"
                  value={limits.withdrawalEnabled ? "Open" : "Paused"}
                  tone={limits.withdrawalEnabled ? "positive" : "negative"}
                />
                <LimitRow label="Verification" value={kycStatus} capitalize />
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                Questions about a specific transfer? Message{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  {supportEmail}
                </a>{" "}
                and quote your reference.
              </p>
              <Link
                href="/support"
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-3 w-full")}
              >
                <LifeBuoy className="size-4" aria-hidden />
                Contact support
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <DepositHistory
        initial={history}
        kind={kind}
        onKindChange={setKind}
        onChanged={() => void reloadSummary()}
        refreshing={refreshing}
      />
    </div>
  );
}

function LimitRow({
  label,
  value,
  tone,
  capitalize,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd
        className={cn(
          "font-semibold tabular-nums text-foreground",
          capitalize && "capitalize",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
