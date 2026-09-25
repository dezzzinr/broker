"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity as ActivityIcon,
  ArrowDownToLine,
  ArrowRight,
  BadgeDollarSign,
  Hourglass,
  LineChart,
  RefreshCcw,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { AdminPageHeader } from "@/components/shared/admin-page-header";
import { StatCard } from "@/components/shared/stat-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { FundStatusBadge } from "@/components/shared/fund-status-badge";
import { MethodIcon } from "@/components/shared/method-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { AreaChartPanel } from "@/components/charts/area-chart-panel";
import { BarChartPanel } from "@/components/charts/bar-chart-panel";
import { AssetAllocation } from "@/components/charts/asset-allocation";
import { ActivityRow } from "./activity-row";
import { formatCompactUSD, formatDateTime, formatUSD, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  ActivityLog,
  FundRequest,
  PlatformStats,
  PublicUser,
} from "@/lib/types/platform";

interface StatsResponse {
  stats: PlatformStats;
  wallets: { asset: string; amount: number; users: number }[];
  recentUsers: {
    id: string;
    name: string;
    email: string;
    role: PublicUser["role"];
    status: PublicUser["status"];
    created_at: string;
    last_login_at: string | null;
  }[];
  recentActivity: ActivityLog[];
  pendingRequests: FundRequest[];
  pendingTotal: number;
  pendingValue: number;
}

const STATUS_COLORS: Record<string, string> = {
  approved: "var(--positive)",
  pending: "var(--warning)",
  rejected: "var(--negative)",
  cancelled: "var(--faint)",
};

export function AdminOverview() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const next = await api<StatsResponse>("/api/admin/stats");
      setData(next);
      setError(null);
    } catch {
      setError("Unable to load console metrics.");
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(true), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const signupSeries = useMemo(
    () =>
      (data?.stats.signupsByDay ?? []).map((d) => ({
        label: new Date(`${d.day}T00:00:00Z`).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          timeZone: "UTC",
        }),
        value: d.count,
      })),
    [data]
  );

  const depositSeries = useMemo(
    () =>
      (data?.stats.depositsByDay ?? []).map((d) => ({
        t: new Date(`${d.day}T00:00:00Z`).getTime(),
        v: d.value,
      })),
    [data]
  );

  const statusSlices = useMemo(
    () =>
      (data?.stats.depositsByStatus ?? [])
        .filter((s) => s.count > 0)
        .map((s) => ({
          id: s.status,
          label: s.status[0].toUpperCase() + s.status.slice(1),
          value: s.count,
          color: STATUS_COLORS[s.status] ?? "var(--accent)",
        })),
    [data]
  );

  const methodBars = useMemo(
    () =>
      (data?.stats.depositsByMethod ?? []).map((m) => ({
        label: m.method.length > 16 ? `${m.method.slice(0, 15)}…` : m.method,
        value: Math.round(m.value),
      })),
    [data]
  );

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Control panel"
        description="Monitor accounts, process manual funding requests and review every action users take on the platform."
        live
        syncing={syncing}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => void load()} disabled={syncing}>
              <RefreshCcw className={cn("size-4", syncing && "animate-spin-slow")} aria-hidden />
              Refresh
            </Button>
            <Link
              href="/admin/deposits"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <Hourglass className="size-4" aria-hidden />
              Review queue
              {(stats?.pendingDeposits ?? 0) > 0 && (
                <span className="ml-1 rounded-full bg-white/25 px-1.5 text-[10px] font-bold tabular-nums">
                  {stats?.pendingDeposits}
                </span>
              )}
            </Link>
          </>
        }
      />

      {error && (
        <EmptyState
          icon={ActivityIcon}
          title="Console unavailable"
          description={error}
          action={
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          }
        />
      )}

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Registered accounts"
          value={stats ? String(stats.users) : "…"}
          icon={Users}
          footer={
            stats
              ? `${stats.activeUsers} active · ${stats.suspendedUsers} suspended · +${stats.newUsers7d} this week`
              : "Loading"
          }
        />
        <StatCard
          label="Awaiting review"
          value={stats ? String(stats.pendingDeposits) : "…"}
          icon={Hourglass}
          footer={stats ? `${formatUSD(stats.pendingValue)} in the queue` : "Loading"}
        />
        <StatCard
          label="Deposits credited"
          value={stats ? formatCompactUSD(stats.approvedValue) : "…"}
          icon={BadgeDollarSign}
          footer={
            stats
              ? `${stats.approvedDeposits} approved · ${stats.rejectedDeposits} rejected`
              : "Loading"
          }
        />
        <StatCard
          label="Actions logged today"
          value={stats ? String(stats.todayActivity) : "…"}
          icon={ActivityIcon}
          footer={
            stats
              ? `${stats.sessionsActive} session(s) active · ${stats.tradesToday} trades today`
              : "Loading"
          }
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                <LineChart className="size-4 text-accent" aria-hidden />
                Deposit volume
              </h2>
              <p className="mt-0.5 text-[11.5px] text-faint">Submitted value per day · last 14 days</p>
            </div>
            <span className="rounded-full border border-border bg-fill-1 px-2.5 py-1 text-[11px] font-medium tabular-nums text-muted">
              {formatCompactUSD(depositSeries.reduce((s, d) => s + d.v, 0))}
            </span>
          </div>
          <div className="px-2 py-4 sm:px-4">
            <AreaChartPanel
              data={depositSeries}
              height={230}
              valueFormatter={(v) => formatUSD(v)}
              xTickFormatter={(t) =>
                new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })
              }
              yTickFormatter={(v) => formatCompactUSD(v)}
            />
          </div>
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <ArrowDownToLine className="size-4 text-accent" aria-hidden />
              Request statuses
            </h2>
            <p className="mt-0.5 text-[11.5px] text-faint">All manual deposits to date</p>
          </div>
          <div className="p-5">
            {statusSlices.length === 0 ? (
              <p className="py-10 text-center text-xs text-faint">No requests yet.</p>
            ) : (
              <AssetAllocation
                slices={statusSlices}
                centerLabel="Requests"
                centerValue={String(statusSlices.reduce((s, x) => s + x.value, 0))}
                height={170}
                valueFormatter={(v) => `${v}`}
              />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <UserPlus className="size-4 text-accent" aria-hidden />
              New accounts
            </h2>
            <p className="mt-0.5 text-[11.5px] text-faint">Sign-ups per day · last 14 days</p>
          </div>
          <div className="px-2 py-4 sm:px-4">
            <BarChartPanel data={signupSeries} height={190} valueFormatter={(v) => `${v}`} />
          </div>
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <Wallet className="size-4 text-accent" aria-hidden />
              Volume by method
            </h2>
            <p className="mt-0.5 text-[11.5px] text-faint">Which channels traders actually use</p>
          </div>
          <div className="px-2 py-4 sm:px-4">
            {methodBars.length === 0 ? (
              <p className="py-10 text-center text-xs text-faint">No deposits yet.</p>
            ) : (
              <BarChartPanel
                data={methodBars}
                height={190}
                valueFormatter={(v) => formatCompactUSD(v)}
              />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                <ShieldCheck className="size-4 text-accent" aria-hidden />
                Newest accounts
              </h2>
              <p className="mt-0.5 text-[11.5px] text-faint">Registrations in real time</p>
            </div>
            <Link
              href="/admin/users"
              className="text-[11.5px] font-medium text-accent underline-offset-2 hover:underline"
            >
              All
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {(data?.recentUsers ?? []).map((u) => (
              <li key={u.id}>
                <Link
                  href={`/admin/users/${u.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-fill-1"
                >
                  <UserAvatar user={{ name: u.name, avatarHue: 265 }} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-foreground">
                      {u.name}
                    </span>
                    <span className="block truncate text-[11px] text-faint">{u.email}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[10.5px] text-faint">
                      {timeAgo(new Date(u.created_at))}
                    </span>
                    <span
                      className={cn(
                        "block text-[10.5px] font-medium",
                        u.status === "active" ? "text-positive" : "text-negative"
                      )}
                    >
                      {u.status}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Review queue + activity */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                <Hourglass className="size-4 text-warning" aria-hidden />
                Needs your decision
              </h2>
              <p className="mt-0.5 text-[11.5px] text-faint">
                {data?.pendingTotal ?? 0} request(s) · {formatUSD(data?.pendingValue ?? 0)} total
              </p>
            </div>
            <Link
              href="/admin/deposits"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent underline-offset-2 hover:underline"
            >
              Open queue
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          {(data?.pendingRequests.length ?? 0) === 0 ? (
            <EmptyState
              className="m-4 border-0 bg-transparent py-10"
              icon={ShieldCheck}
              title="Queue is clear"
              description="Every funding request has been processed. New submissions appear here instantly."
            />
          ) : (
            <ul className="divide-y divide-border">
              {data?.pendingRequests.map((request) => (
                <li key={request.id}>
                  <Link
                    href={`/admin/deposits?focus=${request.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-fill-1"
                  >
                    <MethodIcon kind={request.methodKind} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[12.5px] font-semibold text-foreground">
                          {request.user?.name ?? "Unknown user"}
                        </span>
                        <FundStatusBadge status={request.status} />
                        {!request.hasProof && (
                          <span className="rounded-full border border-negative/25 bg-negative/10 px-2 py-0.5 text-[10px] font-medium text-negative">
                            No proof
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-faint">
                        {request.methodName} · <span className="font-mono">{request.reference}</span>{" "}
                        · {timeAgo(new Date(request.submittedAt))}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[13px] font-semibold tabular-nums text-foreground">
                        {formatUSD(request.amount)}
                      </span>
                      <span className="block text-[10.5px] text-faint">
                        {request.kind === "withdrawal" ? "payout" : "deposit"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                <ActivityIcon className="size-4 text-accent" aria-hidden />
                Latest user actions
              </h2>
              <p className="mt-0.5 text-[11.5px] text-faint">
                {stats ? `${stats.totalActivity.toLocaleString("en-US")} events recorded` : "…"}
              </p>
            </div>
            <Link
              href="/admin/activity"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent underline-offset-2 hover:underline"
            >
              Full log
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {(data?.recentActivity ?? []).map((entry) => (
              <ActivityRow key={entry.id} entry={entry} showUser />
            ))}
            {(data?.recentActivity.length ?? 0) === 0 && (
              <p className="py-10 text-center text-xs text-faint">No activity recorded yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Platform custody snapshot */}
      <Card>
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-[14px] font-semibold text-foreground">Custody snapshot</h2>
          <p className="mt-0.5 text-[11.5px] text-faint">
            Aggregate balances held across every trader account
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 xl:grid-cols-5">
          {(data?.wallets ?? []).map((w) => (
            <div key={w.asset} className="rounded-xl border border-border bg-fill-1 p-3.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-faint">
                {w.asset}
              </p>
              <p className="mt-1 text-[16px] font-semibold tabular-nums text-foreground">
                {w.asset === "USD" || w.asset === "USDT"
                  ? formatCompactUSD(w.amount)
                  : w.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}
              </p>
              <p className="mt-0.5 text-[10.5px] text-faint">
                {w.users} holder{w.users === 1 ? "" : "s"}
              </p>
            </div>
          ))}
          {(data?.wallets.length ?? 0) === 0 && (
            <p className="col-span-full py-6 text-center text-xs text-faint">
              No funded wallets yet.
            </p>
          )}
        </div>
        {stats && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border px-5 py-3 text-[11.5px] text-faint">
            <span>Trading volume: <span className="font-medium text-muted">{formatCompactUSD(stats.volumeUsd)}</span></span>
            <span>Trades today: <span className="font-medium text-muted">{stats.tradesToday}</span></span>
            <span>Payouts pending: <span className="font-medium text-muted">{stats.withdrawalsPending}</span></span>
            <span>Console data refreshed {formatDateTime(new Date().toISOString())}</span>
          </div>
        )}
      </Card>
    </div>
  );
}
