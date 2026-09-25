"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  BadgeDollarSign,
  Download,
  Gift,
  Loader2,
  ReceiptText,
  RefreshCcw,
  Search,
  ShoppingCart,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatAmount, formatDateTime, formatUSD, timeAgo } from "@/lib/format";
import type { LedgerEntry, LedgerType } from "@/lib/types/platform";

const PAGE_SIZE = 20;

const TYPE_ICONS: Record<LedgerType, typeof ShoppingCart> = {
  buy: ShoppingCart,
  sell: ArrowLeftRight,
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  transfer: ArrowLeftRight,
  adjustment: BadgeDollarSign,
  reward: Gift,
};

const TYPE_STYLES: Record<LedgerType, string> = {
  buy: "text-positive bg-positive/10 border-positive/20",
  sell: "text-warning bg-warning/10 border-warning/20",
  deposit: "text-info bg-info/10 border-info/20",
  withdrawal: "text-negative bg-negative/10 border-negative/20",
  transfer: "text-muted bg-fill-2 border-border",
  adjustment: "text-accent bg-accent-soft border-accent/25",
  reward: "text-accent bg-accent-soft border-accent/25",
};

const CREDIT_TYPES = new Set<LedgerType>(["deposit", "buy", "reward"]);

const FILTER_OPTIONS: { value: LedgerType | "all"; label: string }[] = [
  { value: "all", label: "Every movement" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "buy", label: "Buys" },
  { value: "sell", label: "Sells" },
  { value: "adjustment", label: "Adjustments" },
];

export default function TransactionsPage() {
  const [rows, setRows] = useState<LedgerEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<LedgerType | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setSyncing(true);
      try {
        const params = new URLSearchParams({
          type: filter,
          q: query.trim(),
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        const data = await api<{ rows: LedgerEntry[]; total: number }>(
          `/api/transactions?${params.toString()}`
        );
        setRows(data.rows);
        setTotal(data.total);
      } catch {
        setRows((prev) => prev ?? []);
      } finally {
        setSyncing(false);
      }
    },
    [filter, query, page]
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      void load();
    }, 320);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const summary = useMemo(() => {
    const list = rows ?? [];
    const credited = list
      .filter((entry) => CREDIT_TYPES.has(entry.type))
      .reduce((sum, entry) => sum + entry.amount * (entry.price || 1), 0);
    const debited = list
      .filter((entry) => entry.type === "withdrawal" || entry.type === "sell")
      .reduce((sum, entry) => sum + entry.amount * (entry.price || 1), 0);
    const fees = list.reduce((sum, entry) => sum + (entry.fee ?? 0), 0);
    return { credited, debited, fees };
  }, [rows]);

  function exportCsv() {
    const list = rows ?? [];
    const header = ["timestamp", "type", "asset", "amount", "price", "fee", "status", "note", "reference"];
    const lines = list.map((entry) =>
      [
        entry.createdAt,
        entry.type,
        entry.asset,
        entry.amount,
        entry.price,
        entry.fee,
        entry.status,
        `"${(entry.note ?? "").replace(/"/g, '""')}"`,
        entry.refId ?? "",
      ].join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quantix-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const loading = rows === null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Your complete balance ledger — deposits credited, withdrawals escrowed, trades settled and any administrator adjustments."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => void load(true)} disabled={syncing}>
              <RefreshCcw className={cn("size-4", syncing && "animate-spin-slow")} aria-hidden />
              Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={loading || (rows?.length ?? 0) === 0}>
              <Download className="size-4" aria-hidden />
              Export CSV
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[118px] rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard label="Entries" value={String(total)} icon={ReceiptText} footer="Across your whole account" />
            <StatCard label="Credited on page" value={formatUSD(summary.credited)} footer="Deposits, buys and rewards" />
            <StatCard label="Debited on page" value={formatUSD(summary.debited)} footer="Withdrawals and sells" />
            <StatCard label="Fees on page" value={formatUSD(summary.fees)} footer="0.1% per settled trade" />
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            ariaLabel="Filter by type"
            value={filter}
            onChange={(value) => {
              setFilter(value as LedgerType | "all");
              setPage(1);
            }}
            options={FILTER_OPTIONS}
            className="w-full sm:w-52"
          />
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notes or references…"
              aria-label="Search transactions"
              className="pl-9"
            />
          </div>
        </div>
        <p className="text-xs text-faint" aria-live="polite">
          {syncing ? "Syncing…" : `${total} record${total === 1 ? "" : "s"}`}
        </p>
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-11 rounded-lg" />
            ))}
          </div>
        ) : (rows?.length ?? 0) === 0 ? (
          <EmptyState
            className="m-4 border-0 bg-transparent"
            icon={ReceiptText}
            title="No transactions yet"
            description={
              filter === "all" && !query
                ? "Once you deposit funds or place a trade, every movement is recorded here."
                : "Nothing matches this filter. Try a different type or clear your search."
            }
            action={
              filter === "all" && !query ? (
                <Link
                  href="/deposits"
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-accent px-4 text-[13px] font-medium text-on-accent"
                >
                  <ArrowDownToLine className="size-4" aria-hidden />
                  Make a deposit
                </Link>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFilter("all");
                    setQuery("");
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">When</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="pr-5 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows!.map((entry) => {
                    const Icon = TYPE_ICONS[entry.type] ?? ArrowLeftRight;
                    const credit = CREDIT_TYPES.has(entry.type);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="pl-5 whitespace-nowrap">
                          <span className="block tabular-nums text-[12.5px] text-foreground">
                            {formatDateTime(entry.createdAt)}
                          </span>
                          <span className="block text-[10.5px] text-faint">
                            {timeAgo(new Date(entry.createdAt))}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
                              TYPE_STYLES[entry.type]
                            )}
                          >
                            <Icon className="size-3" aria-hidden />
                            {entry.type}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <span className="block truncate text-[12.5px] text-foreground">
                            {entry.note || `${entry.type} · ${entry.asset}`}
                          </span>
                          {entry.refId && (
                            <span className="block truncate font-mono text-[10.5px] text-faint">
                              {entry.refId}
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums text-[13px] font-semibold",
                            credit ? "text-positive" : "text-negative"
                          )}
                        >
                          {credit ? "+" : "−"}
                          {formatAmount(entry.amount)} {entry.asset}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[12.5px] text-muted">
                          {entry.price > 0 ? formatUSD(entry.price) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[12.5px] text-muted">
                          {entry.fee > 0 ? formatUSD(entry.fee) : "—"}
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
                              entry.status === "completed"
                                ? "border-positive/25 bg-positive/10 text-positive"
                                : entry.status === "pending"
                                  ? "border-warning/30 bg-warning/10 text-warning"
                                  : "border-negative/25 bg-negative/10 text-negative"
                            )}
                          >
                            {entry.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile list */}
            <ul className="divide-y divide-border md:hidden">
              {rows!.map((entry) => {
                const Icon = TYPE_ICONS[entry.type] ?? ArrowLeftRight;
                const credit = CREDIT_TYPES.has(entry.type);
                return (
                  <li key={entry.id} className="flex items-start gap-3 px-4 py-3.5">
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border",
                        TYPE_STYLES[entry.type]
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-foreground">
                        {entry.note || `${entry.type} · ${entry.asset}`}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-faint">
                        {formatDateTime(entry.createdAt)} · {entry.status}
                        {entry.fee > 0 ? ` · fee ${formatUSD(entry.fee)}` : ""}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-right text-[12.5px] font-semibold tabular-nums",
                        credit ? "text-positive" : "text-negative"
                      )}
                    >
                      {credit ? "+" : "−"}
                      {formatAmount(entry.amount)}
                      <span className="block text-[10px] font-normal text-faint">{entry.asset}</span>
                    </p>
                  </li>
                );
              })}
            </ul>

            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} label="transactions" />
          </>
        )}
      </Card>

      {loading && (
        <p className="flex items-center justify-center gap-2 text-[11.5px] text-faint">
          <Loader2 className="size-3.5 animate-spin-slow" aria-hidden />
          Loading your ledger…
        </p>
      )}
    </div>
  );
}
