"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  FileWarning,
  Hourglass,
  Loader2,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "@/lib/api";
import { AdminPageHeader } from "@/components/shared/admin-page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { FundStatusBadge } from "@/components/shared/fund-status-badge";
import { MethodIcon } from "@/components/shared/method-icon";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { ReviewDialog } from "./review-dialog";
import { formatDateTime, formatUSD, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FundKind, FundRequest, FundStatus } from "@/lib/types/platform";

const PAGE_SIZE = 12;

type KindFilter = FundKind | "all";
type StatusFilter = FundStatus | "all";

export function ReviewQueue() {
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");
  const initialKind = (searchParams.get("kind") as KindFilter) || "all";

  const [rows, setRows] = useState<FundRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingValue, setPendingValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [kind, setKind] = useState<KindFilter>(initialKind);
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FundRequest | null>(null);
  const [onlyMissingProof, setOnlyMissingProof] = useState(false);

  const load = useCallback(
    async (opts: { silent?: boolean; nextPage?: number } = {}) => {
      const target = opts.nextPage ?? page;
      if (opts.silent) setSyncing(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          kind,
          status,
          q: query.trim(),
          page: String(target),
          pageSize: String(PAGE_SIZE),
        });
        const data = await api<{ rows: FundRequest[]; total: number; pendingValue: number }>(
          `/api/admin/funds?${params.toString()}`
        );
        setRows(data.rows);
        setTotal(data.total);
        setPendingValue(data.pendingValue);
      } catch {
        /* keep the previous list on error */
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [kind, status, query, page]
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, status, page]);

  // Debounced search
  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      void load();
    }, 320);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Poll so newly submitted deposits appear without a manual refresh
  useEffect(() => {
    const interval = setInterval(() => void load({ silent: true }), 20_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, status, page]);

  // Deep link: /admin/deposits?focus=<id>
  useEffect(() => {
    if (!focus) return;
    const match = rows.find((r) => r.id === focus);
    if (match) {
      setSelected(match);
      return;
    }
    api<{ request: FundRequest }>(`/api/admin/funds/${focus}`)
      .then((data) => setSelected(data.request))
      .catch(() => undefined);
  }, [focus, rows]);

  const visible = useMemo(
    () => (onlyMissingProof ? rows.filter((r) => !r.hasProof) : rows),
    [rows, onlyMissingProof]
  );

  const counts = useMemo(() => {
    const pending = rows.filter((r) => r.status === "pending");
    return {
      pending: pending.length,
      missingProof: rows.filter((r) => !r.hasProof).length,
      oldest: pending.length
        ? pending.reduce((a, b) => (a.submittedAt < b.submittedAt ? a : b))
        : null,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Funding reviews"
        description="Process manual deposits and withdrawal requests. Approving credits the user's wallet instantly; rejecting refunds any escrowed funds and notifies them with your reason."
        live
        syncing={syncing}
        actions={
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={syncing}>
            <RefreshCcw className={cn("size-4", syncing && "animate-spin-slow")} aria-hidden />
            Refresh queue
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="In the queue"
          value={String(total)}
          icon={Hourglass}
          footer={`${formatUSD(pendingValue)} awaiting a decision`}
        />
        <StatCard
          label="On this page"
          value={String(counts.pending)}
          icon={ArrowDownToLine}
          footer="Pending rows currently loaded"
        />
        <StatCard
          label="Missing proof"
          value={String(counts.missingProof)}
          icon={FileWarning}
          footer="Submitted without an attachment"
        />
        <StatCard
          label="Oldest waiting"
          value={counts.oldest ? timeAgo(new Date(counts.oldest.submittedAt)) : "—"}
          icon={Hourglass}
          footer={counts.oldest ? counts.oldest.reference : "Nothing waiting"}
        />
      </div>

      <Card>
        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Tabs<KindFilter>
                ariaLabel="Request type"
                value={kind}
                onChange={(v) => {
                  setKind(v);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All" },
                  { value: "deposit", label: "Deposits" },
                  { value: "withdrawal", label: "Payouts" },
                ]}
              />
              <Tabs<StatusFilter>
                ariaLabel="Status"
                size="sm"
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  setPage(1);
                }}
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                  { value: "cancelled", label: "Cancelled" },
                  { value: "all", label: "All" },
                ]}
              />
            </div>

            <div className="flex flex-1 items-center gap-2 lg:max-w-sm">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search reference, name or email…"
                  aria-label="Search requests"
                  className="pl-9"
                />
              </div>
              <Button
                variant={onlyMissingProof ? "default" : "outline"}
                size="icon"
                aria-label="Only show requests missing proof"
                aria-pressed={onlyMissingProof}
                onClick={() => setOnlyMissingProof((v) => !v)}
                title="Only requests without proof"
              >
                <SlidersHorizontal className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-muted">
            <Loader2 className="size-4 animate-spin-slow" aria-hidden />
            Loading requests…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            className="m-4 border-0 bg-transparent"
            icon={Hourglass}
            title={status === "pending" ? "The queue is clear" : "No matching requests"}
            description={
              status === "pending"
                ? "Every funding request has been processed. New submissions appear here within seconds."
                : "Adjust the filters or search terms to find what you are looking for."
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((request) => (
              <li key={request.id}>
                <button
                  type="button"
                  onClick={() => setSelected(request)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-fill-1 sm:px-5"
                >
                  <MethodIcon kind={request.kind === "withdrawal" ? "bank" : request.methodKind} size={38} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-[13px] font-semibold text-foreground">
                        {request.user?.name ?? "Deleted account"}
                      </span>
                      <FundStatusBadge status={request.status} />
                      {request.kind === "withdrawal" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-info/25 bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info">
                          <ArrowUpFromLine className="size-3" aria-hidden />
                          Payout
                        </span>
                      )}
                      {!request.hasProof && request.kind === "deposit" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-negative/25 bg-negative/10 px-2 py-0.5 text-[10px] font-medium text-negative">
                          <FileWarning className="size-3" aria-hidden />
                          No proof
                        </span>
                      )}
                    </div>

                    <p className="mt-1 truncate text-[11.5px] text-muted">
                      {request.methodName} · <span className="font-mono">{request.reference}</span>
                      {request.payerName ? ` · from ${request.payerName}` : ""}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-faint">
                      <span>{timeAgo(new Date(request.submittedAt))}</span>
                      <span className="hidden sm:inline">{formatDateTime(request.submittedAt)}</span>
                      {request.reviewNote && (
                        <span className="truncate italic">“{request.reviewNote}”</span>
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-[14px] font-semibold tabular-nums text-foreground">
                      {formatUSD(request.amount)}
                    </span>
                    <span className="text-[10.5px] text-faint">
                      credit {formatUSD(request.credit)}
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-lg border border-border bg-fill-1 px-2 py-1 text-[11px] font-medium text-muted">
                      Review
                      <ExternalLink className="size-3" aria-hidden />
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onChange={setPage}
          disabled={loading}
          label="requests"
        />
      </Card>

      {selected && (
        <ReviewDialog
          request={selected}
          onClose={() => setSelected(null)}
          onResolved={(updated) => {
            setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setSelected(null);
            void load({ silent: true });
          }}
        />
      )}

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-faint">
        <UserAvatar user={{ name: "Audit", avatarHue: 200 }} size={20} ring={false} />
        Every decision is written to the activity log with your administrator identity, the user
        affected and the reason you entered.{" "}
        <Link href="/admin/activity" className="font-medium text-accent underline-offset-2 hover:underline">
          Open the activity log
        </Link>
      </p>
    </div>
  );
}
