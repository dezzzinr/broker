"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { AdminPageHeader } from "@/components/shared/admin-page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { AdminUserActions } from "./admin-user-actions";
import { formatCompactUSD, formatDateTime, formatUSD, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminUserRow } from "@/lib/types/platform";

const PAGE_SIZE = 15;

type SortKey = "created" | "name" | "deposits" | "balance" | "lastLogin";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "created", label: "Newest first" },
  { value: "lastLogin", label: "Last sign-in" },
  { value: "balance", label: "Largest balance" },
  { value: "deposits", label: "Most deposited" },
  { value: "name", label: "Name (A–Z)" },
];

export function AdminUsers() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [role, setRole] = useState<"all" | "user" | "admin">("all");
  const [sort, setSort] = useState<SortKey>("created");
  const [page, setPage] = useState(1);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setSyncing(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          status,
          role,
          sort,
          dir: sort === "name" ? "asc" : "desc",
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        const data = await api<{ rows: AdminUserRow[]; total: number }>(
          `/api/admin/users?${params.toString()}`
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
    [query, status, role, sort, page]
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, role, sort, page]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      void load();
    }, 320);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const totals = rows.reduce(
    (acc, u) => ({
      balance: acc.balance + u.balanceUsd,
      deposits: acc.deposits + u.depositsUsd,
      suspended: acc.suspended + (u.status === "suspended" ? 1 : 0),
      admins: acc.admins + (u.role === "admin" ? 1 : 0),
    }),
    { balance: 0, deposits: 0, suspended: 0, admins: 0 }
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Accounts"
        description="Every registered trader and administrator, with balances, funding history and the actions you can take on each account."
        syncing={syncing}
        actions={
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={syncing}>
            <RefreshCcw className={cn("size-4", syncing && "animate-spin-slow")} aria-hidden />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Matching accounts" value={String(total)} icon={Users} footer="Across every role and status" />
        <StatCard
          label="Cash on this page"
          value={formatCompactUSD(totals.balance)}
          icon={ShieldCheck}
          footer="USD + USDT balances"
        />
        <StatCard
          label="Deposited on this page"
          value={formatCompactUSD(totals.deposits)}
          icon={Users}
          footer="Approved deposits only"
        />
        <StatCard
          label="Suspended here"
          value={String(totals.suspended)}
          icon={Ban}
          footer={`${totals.admins} administrator(s) in view`}
        />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs<"all" | "active" | "suspended">
              ariaLabel="Filter by status"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
              ]}
            />
            <Tabs<"all" | "user" | "admin">
              ariaLabel="Filter by role"
              size="sm"
              value={role}
              onChange={(v) => {
                setRole(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Any role" },
                { value: "user", label: "Traders" },
                { value: "admin", label: "Admins" },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email or ID…"
                aria-label="Search accounts"
                className="pl-9"
              />
            </div>
            <Select
              ariaLabel="Sort accounts"
              value={sort}
              onChange={(v) => {
                setSort(v as SortKey);
                setPage(1);
              }}
              options={SORTS}
              className="sm:w-44"
            />
          </div>
        </div>

        {/* Column headings (desktop) */}
        <div className="hidden items-center gap-4 border-b border-border px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint lg:flex">
          <span className="flex-1">Account</span>
          <span className="w-28 text-right">Cash</span>
          <span className="w-28 text-right">Deposited</span>
          <span className="w-20 text-right">Trades</span>
          <span className="w-36">Last active</span>
          <span className="w-10" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-muted">
            <Loader2 className="size-4 animate-spin-slow" aria-hidden />
            Loading accounts…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            className="m-4 border-0 bg-transparent"
            icon={UserRound}
            title="No accounts match"
            description="Try a different search term, or clear the status and role filters."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                  setRole("all");
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((u) => (
              <li
                key={u.id}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-fill-1 sm:px-5"
              >
                <Link
                  href={`/admin/users/${u.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <UserAvatar user={u} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-[13px] font-semibold text-foreground">
                        {u.name}
                      </span>
                      {u.role === "admin" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-accent">
                          <ShieldCheck className="size-2.5" aria-hidden />
                          Admin
                        </span>
                      )}
                      <StatusPill status={u.status} />
                      {u.pendingDeposits > 0 && (
                        <span className="rounded-full border border-warning/30 bg-warning/10 px-1.5 py-px text-[9.5px] font-semibold text-warning">
                          {u.pendingDeposits} pending
                        </span>
                      )}
                      {u.kycStatus === "verified" && (
                        <span className="hidden rounded-full border border-positive/25 bg-positive/10 px-1.5 py-px text-[9.5px] font-semibold text-positive sm:inline">
                          KYC
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-faint">
                      {u.email}
                      {u.country ? ` · ${u.country}` : ""}
                    </span>
                  </span>
                </Link>

                <span className="hidden w-28 text-right text-[12.5px] font-semibold tabular-nums text-foreground lg:block">
                  {formatUSD(u.balanceUsd)}
                </span>
                <span className="hidden w-28 text-right text-[12.5px] tabular-nums text-muted lg:block">
                  {formatUSD(u.depositsUsd)}
                </span>
                <span className="hidden w-20 text-right text-[12.5px] tabular-nums text-muted lg:block">
                  {u.trades}
                </span>
                <span className="hidden w-36 lg:block">
                  <span className="block text-[11.5px] text-muted">
                    {u.lastActivityAt ? timeAgo(new Date(u.lastActivityAt)) : "Never"}
                  </span>
                  {u.lastLoginAt && (
                    <span className="block text-[10.5px] text-faint">
                      {formatDateTime(u.lastLoginAt)}
                    </span>
                  )}
                </span>

                <AdminUserActions user={u} onChanged={() => void load(true)} compact />
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onChange={(p) => {
            setPage(p);
            router.prefetch("/admin/users");
          }}
          disabled={loading}
          label="accounts"
        />
      </Card>
    </div>
  );
}

function StatusPill({ status }: { status: AdminUserRow["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide",
        status === "active"
          ? "border-positive/25 bg-positive/10 text-positive"
          : "border-negative/25 bg-negative/10 text-negative"
      )}
    >
      <span
        className={cn("size-1 rounded-full", status === "active" ? "bg-positive" : "bg-negative")}
        aria-hidden
      />
      {status}
    </span>
  );
}
