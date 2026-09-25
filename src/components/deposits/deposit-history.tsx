"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { FundStatusBadge } from "@/components/shared/fund-status-badge";
import { MethodIcon } from "@/components/shared/method-icon";
import { useToast } from "@/components/providers/toast-provider";
import { formatDateTime, formatUSD, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FundRequest, FundStatus } from "@/lib/types/platform";

type StatusFilter = "all" | FundStatus;

const PAGE_SIZE = 8;

/** The user's own deposit + withdrawal requests with live status. */
export function DepositHistory({
  initial,
  kind,
  onKindChange,
  onChanged,
  refreshing = false,
}: {
  initial: { rows: FundRequest[]; total: number };
  kind: "all" | "deposit" | "withdrawal";
  onKindChange: (kind: "all" | "deposit" | "withdrawal") => void;
  onChanged: () => void;
  refreshing?: boolean;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState(initial.rows);
  const [total, setTotal] = useState(initial.total);

  // The parent refetches after a deposit is submitted or cancelled.
  useEffect(() => {
    setRows(initial.rows);
    setTotal(initial.total);
  }, [initial.rows, initial.total]);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load(nextPage = page, nextStatus = status, nextKind = kind) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        kind: nextKind,
        status: nextStatus,
        page: String(nextPage),
      });
      const data = await api<{ rows: FundRequest[]; total: number }>(
        `/api/deposits?${params.toString()}`
      );
      setRows(data.rows);
      setTotal(data.total);
    } catch {
      /* keep the previous page visible */
    } finally {
      setLoading(false);
    }
  }

  async function cancel(request: FundRequest) {
    setBusyId(request.id);
    try {
      await api(`/api/deposits/${request.id}`, { method: "DELETE" });
      toast({
        title: "Request cancelled",
        description:
          request.kind === "withdrawal"
            ? `${formatUSD(request.amount)} was returned to your USD balance.`
            : "The deposit was withdrawn from the review queue.",
        variant: "success",
      });
      await load();
      onChanged();
    } catch (err) {
      toast({
        title: "Could not cancel",
        description: err instanceof ApiRequestError ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card id="deposit-history" className="scroll-mt-24">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            Funding history
          </h2>
          <p className="mt-0.5 text-[11.5px] text-faint">
            {total} request{total === 1 ? "" : "s"} · statuses update as administrators review them
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            ariaLabel="Filter by request type"
            size="sm"
            value={kind}
            onChange={(v) => {
              onKindChange(v);
              setPage(1);
              void load(1, status, v);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "deposit", label: "Deposits" },
              { value: "withdrawal", label: "Payouts" },
            ]}
          />
          <Tabs
            ariaLabel="Filter by status"
            size="sm"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
              void load(1, v);
            }}
            options={[
              { value: "all", label: "Any" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
        </div>
      </div>

      {(loading || refreshing) && rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-14 text-[13px] text-muted">
          <Loader2 className="size-4 animate-spin-slow" aria-hidden />
          Loading requests…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          className="m-4 border-0 bg-transparent"
          icon={kind === "withdrawal" ? ArrowUpFromLine : ArrowDownToLine}
          title="No requests yet"
          description="When you submit a manual deposit or request a payout it appears here with its review status."
        />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((request) => {
            const open = expanded === request.id;
            return (
              <li key={request.id} className={cn("px-4 py-3.5 transition-colors sm:px-5", open && "bg-fill-1")}>
                <div className="flex items-start gap-3">
                  <MethodIcon
                    kind={request.kind === "withdrawal" ? "bank" : request.methodKind}
                    size={36}
                    className={cn(
                      "rounded-xl",
                      request.kind === "withdrawal" && "border-info/25 bg-info/10 text-info"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="truncate text-[13px] font-semibold text-foreground">
                        {request.kind === "deposit" ? "Deposit" : "Withdrawal"} ·{" "}
                        {formatUSD(request.amount)}
                      </p>
                      <FundStatusBadge status={request.status} />
                      {request.hasProof && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-fill-1 px-2 py-0.5 text-[10px] font-medium text-muted">
                          <FileText className="size-3" aria-hidden />
                          Proof
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[11.5px] text-muted">
                      {request.methodName} ·{" "}
                      <span className="font-mono">{request.reference}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-faint">
                      {timeAgo(new Date(request.submittedAt))} · {formatDateTime(request.submittedAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-[14px] font-semibold tabular-nums text-foreground">
                      {request.kind === "withdrawal" ? "−" : "+"}
                      {formatUSD(request.kind === "withdrawal" ? request.amount : request.credit)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {request.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId === request.id}
                          onClick={() => void cancel(request)}
                          className="h-7 px-2 text-[11px] text-negative hover:bg-negative/10 hover:text-negative"
                        >
                          {busyId === request.id ? (
                            <Loader2 className="size-3.5 animate-spin-slow" aria-hidden />
                          ) : (
                            <XCircle className="size-3.5" aria-hidden />
                          )}
                          Cancel
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : request.id)}
                        aria-expanded={open}
                        className="rounded-lg border border-border bg-fill-1 px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-fill-2 hover:text-foreground"
                      >
                        {open ? "Hide" : "Details"}
                      </button>
                    </div>
                  </div>
                </div>

                {open && (
                  <dl className="mt-3 grid gap-2 rounded-xl border border-border bg-background/60 p-3 sm:grid-cols-2">
                    <Detail label="Reference" value={request.reference} mono />
                    <Detail label="Method" value={request.methodName} />
                    <Detail label="Amount" value={formatUSD(request.amount)} />
                    <Detail label="Fee" value={request.fee > 0 ? formatUSD(request.fee) : "None"} />
                    <Detail
                      label={request.kind === "withdrawal" ? "Paid out" : "Credited"}
                      value={formatUSD(request.credit)}
                    />
                    <Detail label="Sent from" value={request.payerName || "—"} />
                    {request.destination && <Detail label="Destination" value={request.destination} />}
                    <Detail label="Attachment" value={request.proofName ?? "None"} />
                    {request.note && <Detail label="Your note" value={request.note} full />}
                    {request.reviewNote && (
                      <Detail
                        label={request.status === "rejected" ? "Rejection reason" : "Reviewer note"}
                        value={request.reviewNote}
                        tone={request.status === "rejected" ? "negative" : "positive"}
                        full
                      />
                    )}
                    {request.reviewedAt && (
                      <Detail
                        label="Reviewed"
                        value={`${formatDateTime(request.reviewedAt)}${request.reviewerName ? ` · ${request.reviewerName}` : ""}`}
                        full
                      />
                    )}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
          <p className="text-[11.5px] text-faint">
            Page {page} of {pages} · {total} total
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Previous page"
              disabled={page <= 1 || loading}
              onClick={() => {
                const next = page - 1;
                setPage(next);
                void load(next);
              }}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Next page"
              disabled={page >= pages || loading}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                void load(next);
              }}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Detail({
  label,
  value,
  mono,
  tone,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "positive" | "negative";
  full?: boolean;
}) {
  return (
    <div className={cn("min-w-0", full && "sm:col-span-2")}>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-faint">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 break-words text-[12.5px] text-foreground",
          mono && "font-mono",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
