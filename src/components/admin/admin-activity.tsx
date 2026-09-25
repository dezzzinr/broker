"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  Filter,
  Loader2,
  RefreshCcw,
  ScrollText,
  Search,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { AdminPageHeader } from "@/components/shared/admin-page-header";
import { ActivityRow } from "@/components/admin/activity-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { ActivityLog } from "@/lib/types/platform";

const PAGE_SIZE = 25;

const CATEGORIES = [
  { value: "all", label: "Every event" },
  { value: "auth", label: "Authentication" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "trade", label: "Trades" },
  { value: "account", label: "Account changes" },
  { value: "admin", label: "Admin actions" },
  { value: "security", label: "Security" },
];

const SEVERITIES = [
  { value: "all", label: "Any severity" },
  { value: "info", label: "Informational" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
];

/** Platform-wide audit stream with filters, day grouping and CSV export. */
export function AdminActivity() {
  const [rows, setRows] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setSyncing(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          category,
          severity,
          q: query.trim(),
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (from) params.set("since", new Date(`${from}T00:00:00`).toISOString());
        if (to) params.set("until", new Date(`${to}T23:59:59`).toISOString());
        const data = await api<{ rows: ActivityLog[]; total: number }>(
          `/api/admin/activity?${params.toString()}`
        );
        setRows(data.rows);
        setTotal(data.total);
      } catch {
        /* keep whatever is already on screen */
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [category, severity, query, from, to, page]
  );

  // Initial + filter/page driven loads.
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, severity, page, from, to]);

  // Debounced free-text search.
  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      void load();
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Quiet background refresh while the console is open.
  useEffect(() => {
    const interval = setInterval(() => void load(true), 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, severity, query, from, to, page]);

  // Group by day so the log reads like a timeline.
  const groups = useMemo(() => {
    const map = new Map<string, ActivityLog[]>();
    for (const entry of rows) {
      const day = entry.createdAt.slice(0, 10);
      const bucket = map.get(day) ?? [];
      bucket.push(entry);
      map.set(day, bucket);
    }
    return Array.from(map.entries());
  }, [rows]);

  const filtersActive = query.trim() !== "" || from !== "" || to !== "" || severity !== "all";

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setSeverity("all");
    setFrom("");
    setTo("");
    setPage(1);
  }

  function exportCsv() {
    const header = ["timestamp", "category", "severity", "action", "actor", "user", "summary", "ip"];
    const lines = rows.map((entry) =>
      [
        entry.createdAt,
        entry.category,
        entry.severity,
        entry.action,
        entry.actor?.name ?? "system",
        entry.user?.email ?? "—",
        `"${entry.summary.replace(/"/g, '""')}"`,
        entry.ip || "—",
      ].join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quantix-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Activity log"
        description="An append-only record of everything that happens on the platform — sign-ins, funding reviews, trades, settings changes and administrative actions."
        live
        syncing={syncing}
        meta={
          <>
            <span>{total.toLocaleString("en-US")} events match this filter</span>
            <span className="hidden sm:inline">·</span>
            <span>Auto-refreshes every 30 seconds</span>
          </>
        }
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

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events, users, emails or actions…"
              aria-label="Search activity"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              ariaLabel="Event category"
              value={category}
              onChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
              options={CATEGORIES}
              className="w-auto min-w-[9.5rem] flex-1 sm:flex-none"
            />
            <Button
              variant={showFilters || filtersActive ? "default" : "secondary"}
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
            >
              <Filter className="size-4" aria-hidden />
              More filters
              {filtersActive && (
                <span className="ml-0.5 rounded-full bg-on-accent/20 px-1.5 text-[9.5px] font-semibold">
                  on
                </span>
              )}
            </Button>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-4" aria-hidden />
                Clear
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="activity-severity">Severity</Label>
              <Select
                ariaLabel="Severity"
                value={severity}
                onChange={(v) => {
                  setSeverity(v);
                  setPage(1);
                }}
                options={SEVERITIES}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-from">From</Label>
              <Input
                id="activity-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-to">To</Label>
              <Input
                id="activity-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="sm:col-span-3">
              <Tabs<"all" | "auth" | "deposit" | "trade" | "admin" | "security">
                ariaLabel="Quick category filters"
                size="sm"
                className="flex-wrap"
                value={category as "all" | "auth" | "deposit" | "trade" | "admin" | "security"}
                onChange={(v) => {
                  setCategory(v);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All" },
                  { value: "auth", label: "Auth" },
                  { value: "deposit", label: "Deposits" },
                  { value: "trade", label: "Trades" },
                  { value: "admin", label: "Admin" },
                  { value: "security", label: "Security" },
                ]}
              />
            </div>
          </div>
        )}
      </Card>

      {loading ? (
        <Card className="flex items-center justify-center gap-2 py-20 text-[13px] text-muted">
          <Loader2 className="size-4 animate-spin-slow" aria-hidden />
          Loading activity…
        </Card>
      ) : total === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No events recorded"
          description="Nothing matches these filters yet — user actions appear here the moment they happen."
          action={
            filtersActive || category !== "all" ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map(([day, entries]) => (
            <section key={day}>
              <div className="mb-2 flex items-center gap-3 px-1">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
                  {formatDate(day)}
                </h2>
                <span className="h-px flex-1 bg-border" aria-hidden />
                <span className="text-[10.5px] tabular-nums text-faint">
                  {entries.length} event{entries.length === 1 ? "" : "s"}
                </span>
              </div>
              <Card className="overflow-hidden">
                {entries.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} showUser />
                ))}
              </Card>
            </section>
          ))}

          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} label="events" />
        </div>
      )}

      <p className="text-center text-[11.5px] text-faint">
        Money movements are tracked separately in the{" "}
        <Link href="/admin/ledger" className="text-accent underline-offset-2 hover:underline">
          balance ledger
        </Link>
        .
      </p>
    </div>
  );
}
