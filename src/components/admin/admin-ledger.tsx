"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, Download, Loader2, RefreshCcw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { AdminPageHeader } from "@/components/shared/admin-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { StatCard } from "@/components/shared/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatAmount, formatDateTime, formatUSD } from "@/lib/format";
import type { LedgerEntry, LedgerType } from "@/lib/types/platform";

const PAGE_SIZE = 25;

const TYPES: { value: LedgerType | "all"; label: string }[] = [
  { value: "all", label: "Every movement" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "buy", label: "Buys" },
  { value: "sell", label: "Sells" },
  { value: "adjustment", label: "Admin adjustments" },
  { value: "transfer", label: "Transfers" },
  { value: "reward", label: "Rewards" },
];

const TYPE_STYLE: Record<LedgerType, { text: string; sign: 1 | -1 }> = {
  deposit: { text: "text-positive", sign: 1 },
  withdrawal: { text: "text-negative", sign: -1 },
  buy: { text: "text-info", sign: 1 },
  sell: { text: "text-warning", sign: -1 },
  adjustment: { text: "text-accent", sign: 1 },
  transfer: { text: "text-muted", sign: 1 },
  reward: { text: "text-positive", sign: 1 },
};

/** Every balance movement on the platform, with per-asset reconciliation. */
export function AdminLedger() {
  const [rows, setRows] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [type, setType] = useState<LedgerType | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setSyncing(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          type,
          q: query.trim(),
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        const data = await api<{ rows: LedgerEntry[]; total: number }>(
          `/api/admin/ledger?${params.toString()}`
        );
        setRows(data.rows);
        setTotal(data.total);
      } catch {
        /* keep previous rows */
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [type, query, page]
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, page]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      void load();
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const perAsset = useMemo(() => {
    const map = new Map<string, { net: number; entries: number; fees: number }>();
    for (const row of rows) {
      const current = map.get(row.asset) ?? { net: 0, entries: 0, fees: 0 };
      current.net += (TYPE_STYLE[row.type]?.sign ?? 1) * row.amount;
      current.fees += row.fee;
      current.entries += 1;
      map.set(row.asset, current);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].entries - a[1].entries);
  }, [rows]);

  function exportCsv() {
    const header = ["timestamp", "user", "type", "asset", "amount", "price", "fee", "status", "note", "ref"];
    const lines = rows.map((row) =>
      [
        row.createdAt,
        row.user?.email ?? row.userId,
        row.type,
        row.asset,
        row.amount,
        row.price,
        row.fee,
        row.status,
        `"${(row.note ?? "").replace(/"/g, '""')}"`,
        row.refId ?? "",
      ].join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quantix-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Balance ledger"
        description="The double-entry record behind every wallet — deposits credited, withdrawals escrowed, trades settled and administrator adjustments applied."
        syncing={syncing}
        meta={`${total.toLocaleString("en-US")} entries`}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="size-4" aria-hidden />
              Export page
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void load(true)} disabled={syncing}>
              <RefreshCcw className={cn("size-4", syncing && "animate-spin-slow")} aria-hidden />
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Ledger entries" value={String(total)} icon={BookOpenCheck} footer="All accounts, all assets" />
        {perAsset.slice(0, 3).map(([asset, stats]) => (
          <StatCard
            key={asset}
            label={`${asset} net on page`}
            value={`${stats.net >= 0 ? "+" : "−"}${formatAmount(Math.abs(stats.net))}`}
            footer={`${stats.entries} entries · ${formatUSD(stats.fees)} fees`}
          />
        ))}
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search note, reference or account…"
              aria-label="Search ledger"
              className="pl-9"
            />
          </div>
          <Select
            ariaLabel="Movement type"
            value={type}
            onChange={(v) => {
              setType(v as LedgerType | "all");
              setPage(1);
            }}
            options={TYPES}
            className="w-auto sm:min-w-[12rem]"
          />
        </div>
      </Card>

      {loading ? (
        <Card className="flex items-center justify-center gap-2 py-20 text-[13px] text-muted">
          <Loader2 className="size-4 animate-spin-slow" aria-hidden />
          Loading ledger…
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="No ledger entries"
          description="Balance movements appear here as soon as deposits are approved, trades settle or an administrator adjusts a wallet."
          action={
            <Button variant="secondary" size="sm" onClick={() => { setQuery(""); setType("all"); setPage(1); }}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint lg:flex">
              <span className="w-40">When</span>
              <span className="flex-1">Account</span>
              <span className="w-24">Type</span>
              <span className="w-36 text-right">Amount</span>
              <span className="w-24 text-right">Fee</span>
              <span className="w-24">Status</span>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((row) => {
                const style = TYPE_STYLE[row.type] ?? TYPE_STYLE.transfer;
                return (
                  <li
                    key={row.id}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-fill-1 sm:items-center sm:px-5"
                  >
                    <span className="hidden w-40 shrink-0 text-[11.5px] tabular-nums text-muted lg:block">
                      {formatDateTime(row.createdAt)}
                    </span>

                    <span className="min-w-0 flex-1">
                      {row.user ? (
                        <Link
                          href={`/admin/users/${row.user.id}`}
                          className="block truncate text-[12.5px] font-medium text-foreground underline-offset-2 hover:text-accent hover:underline"
                        >
                          {row.user.name}
                        </Link>
                      ) : (
                        <span className="block truncate text-[12.5px] font-medium text-muted">
                          Deleted account
                        </span>
                      )}
                      <span className="block truncate text-[10.5px] text-faint">
                        {row.user?.email ?? row.userId}
                        {row.note ? ` · ${row.note}` : ""}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-[10.5px] text-faint lg:hidden">
                        {formatDateTime(row.createdAt)}
                        <span className={cn("font-semibold uppercase tracking-wide", style.text)}>
                          {row.type}
                        </span>
                        <span className="uppercase">{row.status}</span>
                      </span>
                    </span>

                    <span className="hidden w-24 shrink-0 sm:block">
                      <span
                        className={cn(
                          "inline-flex rounded-full border border-border bg-fill-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          style.text
                        )}
                      >
                        {row.type}
                      </span>
                    </span>

                    <span className="w-32 shrink-0 text-right sm:w-36">
                      <span className={cn("block text-[12.5px] font-semibold tabular-nums", style.text)}>
                        {style.sign > 0 ? "+" : "−"}
                        {formatAmount(row.amount)} {row.asset}
                      </span>
                      {row.price > 0 && (
                        <span className="block text-[10.5px] tabular-nums text-faint">
                          @ {formatUSD(row.price)}
                        </span>
                      )}
                    </span>

                    <span className="hidden w-24 shrink-0 text-right text-[11.5px] tabular-nums text-muted lg:block">
                      {row.fee > 0 ? formatUSD(row.fee) : "—"}
                    </span>

                    <span className="hidden w-24 shrink-0 sm:block">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          row.status === "completed"
                            ? "border-positive/25 bg-positive/10 text-positive"
                            : row.status === "pending"
                              ? "border-warning/30 bg-warning/10 text-warning"
                              : "border-negative/25 bg-negative/10 text-negative"
                        )}
                      >
                        {row.status}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} label="entries" />
        </>
      )}
    </div>
  );
}
