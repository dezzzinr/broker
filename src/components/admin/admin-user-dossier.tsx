"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Fingerprint,
  Globe2,
  Loader2,
  Mail,
  Pencil,
  Phone,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserRoundX,
  Wallet,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { AdminPageHeader } from "@/components/shared/admin-page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { FundStatusBadge } from "@/components/shared/fund-status-badge";
import { MethodIcon } from "@/components/shared/method-icon";
import { ActivityRow } from "@/components/admin/activity-row";
import { AdminUserActions } from "@/components/admin/admin-user-actions";
import { ReviewDialog } from "@/components/admin/review-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";
import { formatAmount, formatDateTime, formatUSD, timeAgo } from "@/lib/format";
import type {
  ActivityLog,
  AdminUserRow,
  Balance,
  FundRequest,
  KycStatus,
  LedgerEntry,
} from "@/lib/types/platform";

interface Dossier {
  user: AdminUserRow;
  balances: Balance[];
  fundRequests: FundRequest[];
  fundTotal: number;
  transactions: LedgerEntry[];
  transactionTotal: number;
  activity: ActivityLog[];
  activityTotal: number;
  isSelf: boolean;
}

const KYC_OPTIONS: { value: KycStatus; label: string }[] = [
  { value: "unverified", label: "Unverified" },
  { value: "pending", label: "Pending review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

const KYC_STYLE: Record<KycStatus, string> = {
  verified: "border-positive/25 bg-positive/10 text-positive",
  pending: "border-warning/30 bg-warning/10 text-warning",
  rejected: "border-negative/25 bg-negative/10 text-negative",
  unverified: "border-border bg-fill-2 text-muted",
};

/** Full account file for one trader: identity, wallets, funding, ledger, activity. */
export function AdminUserDossier({ userId }: { userId: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<Dossier | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<"funding" | "ledger" | "activity">("funding");
  const [reviewing, setReviewing] = useState<FundRequest | null>(null);
  const [editing, setEditing] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", country: "" });
  const [prices, setPrices] = useState<Record<string, number>>({});

  const load = useCallback(
    async (silent = false) => {
      if (silent) setSyncing(true);
      else setLoading(true);
      try {
        const result = await api<Dossier>(`/api/admin/users/${userId}`);
        setData(result);
        setNotFound(false);
        if (!silent) {
          setProfile({
            name: result.user.name,
            email: result.user.email,
            phone: result.user.phone ?? "",
            country: result.user.country ?? "",
          });
        }
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 404) setNotFound(true);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Best-effort market prices so crypto holdings can be valued in USD.
  // /api/crypto answers with a bare array (no envelope), so it is fetched directly.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/crypto?symbols=BTC,ETH,SOL,BNB,XRP,ADA,DOGE,LTC,LINK,AVAX,DOT");
        if (!response.ok) return;
        const coins = (await response.json()) as { symbol: string; price: number }[];
        if (cancelled || !Array.isArray(coins)) return;
        const map: Record<string, number> = {};
        for (const coin of coins) map[String(coin.symbol).toUpperCase()] = Number(coin.price) || 0;
        setPrices(map);
      } catch {
        /* valuation is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    if (!data) return { cash: 0, holdings: 0, portfolio: 0 };
    let cash = 0;
    let holdings = 0;
    for (const balance of data.balances) {
      if (balance.asset === "USD" || balance.asset === "USDT") cash += balance.amount;
      else holdings += balance.amount * (prices[balance.asset.toUpperCase()] ?? 0);
    }
    return { cash, holdings, portfolio: cash + holdings };
  }, [data, prices]);

  async function saveProfile() {
    if (!data) return;
    setEditBusy(true);
    setEditError(null);
    try {
      await api(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: {
          name: profile.name.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim(),
          country: profile.country.trim(),
        },
      });
      toast({ title: "Profile updated", description: profile.name.trim(), variant: "success" });
      setEditing(false);
      await load(true);
    } catch (err) {
      setEditError(err instanceof ApiRequestError ? err.message : "Could not save the profile.");
    } finally {
      setEditBusy(false);
    }
  }

  async function setKyc(kycStatus: KycStatus) {
    try {
      await api(`/api/admin/users/${userId}`, { method: "PATCH", body: { kycStatus } });
      toast({
        title: `KYC set to ${kycStatus}`,
        description: data?.user.name,
        variant: kycStatus === "verified" ? "success" : "info",
      });
      await load(true);
    } catch (err) {
      toast({
        title: "Could not update KYC",
        description: err instanceof ApiRequestError ? err.message : "Please try again.",
        variant: "error",
      });
    }
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-2 py-24 text-[13px] text-muted">
        <Loader2 className="size-4 animate-spin-slow" aria-hidden />
        Loading account file…
      </Card>
    );
  }

  if (notFound || !data) {
    return (
      <EmptyState
        icon={UserRoundX}
        title="Account not found"
        description="This account may have been deleted by another administrator."
        action={
          <Button variant="secondary" size="sm" onClick={() => router.push("/admin/users")}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to accounts
          </Button>
        }
      />
    );
  }

  const { user } = data;
  const pendingCount = data.fundRequests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/users")}>
          <ArrowLeft className="size-4" aria-hidden />
          Accounts
        </Button>
        <span className="text-[11.5px] text-faint">/ {user.email}</span>
      </div>

      <AdminPageHeader
        title={user.name}
        description={`Account ${user.id} · joined ${formatDateTime(user.createdAt)}`}
        syncing={syncing}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => void load(true)} disabled={syncing}>
              <RefreshCcw className={cn("size-4", syncing && "animate-spin-slow")} aria-hidden />
              Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden />
              Edit profile
            </Button>
            <AdminUserActions user={user} align="end" onChanged={() => void load(true)} />
          </>
        }
      />

      {data.isSelf && (
        <Alert variant="info" title="This is your own account">
          Role, status and deletion controls are disabled to keep at least one administrator and a
          clean audit trail.
        </Alert>
      )}

      {user.status === "suspended" && (
        <Alert variant="error" title="Account suspended">
          This trader cannot sign in, trade or submit funding requests until you reactivate the
          account.
        </Alert>
      )}

      {/* Identity card */}
      <Card className="p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <UserAvatar user={user} size={64} />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
                  user.role === "admin"
                    ? "border-accent/30 bg-accent-soft text-accent"
                    : "border-border bg-fill-2 text-muted"
                )}
              >
                {user.role === "admin" ? (
                  <ShieldCheck className="size-3" aria-hidden />
                ) : (
                  <Wallet className="size-3" aria-hidden />
                )}
                {user.role === "admin" ? "Administrator" : "Trader"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
                  user.status === "active"
                    ? "border-positive/25 bg-positive/10 text-positive"
                    : "border-negative/25 bg-negative/10 text-negative"
                )}
              >
                {user.status === "active" ? (
                  <BadgeCheck className="size-3" aria-hidden />
                ) : (
                  <ShieldAlert className="size-3" aria-hidden />
                )}
                {user.status}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
                  KYC_STYLE[user.kycStatus]
                )}
              >
                KYC · {user.kycStatus}
              </span>
              {user.twoFactor && (
                <span className="inline-flex items-center gap-1 rounded-full border border-info/25 bg-info/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-info">
                  <Smartphone className="size-3" aria-hidden />
                  2FA on
                </span>
              )}
            </div>

            <dl className="grid gap-x-6 gap-y-2 text-[12px] sm:grid-cols-2">
              <Detail icon={Mail} label="Email" value={user.email} href={`mailto:${user.email}`} />
              <Detail icon={Phone} label="Phone" value={user.phone || "Not provided"} />
              <Detail icon={Globe2} label="Country" value={user.country || "Not provided"} />
              <Detail icon={Fingerprint} label="Account ID" value={user.id} mono />
              <Detail
                icon={CalendarDays}
                label="Last sign-in"
                value={
                  user.lastLoginAt
                    ? `${formatDateTime(user.lastLoginAt)} · ${timeAgo(new Date(user.lastLoginAt))}`
                    : "Never signed in"
                }
              />
              <Detail
                icon={ShieldAlert}
                label="Last IP"
                value={user.lastLoginIp || "Unknown"}
                mono
              />
            </dl>

            {user.kycStatus !== "verified" && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button size="sm" variant="positive" onClick={() => void setKyc("verified")}>
                  <BadgeCheck className="size-4" aria-hidden />
                  Verify identity
                </Button>
                {user.kycStatus !== "rejected" && (
                  <Button size="sm" variant="negative" onClick={() => void setKyc("rejected")}>
                    Reject KYC
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Cash balance"
          value={formatUSD(totals.cash)}
          icon={Wallet}
          footer="USD + USDT wallets"
        />
        <StatCard
          label="Estimated portfolio"
          value={formatUSD(totals.portfolio)}
          footer={totals.holdings > 0 ? `${formatUSD(totals.holdings)} in crypto holdings` : "Cash only"}
        />
        <StatCard
          label="Lifetime deposits"
          value={formatUSD(user.depositsUsd)}
          footer={`${pendingCount} request(s) awaiting review`}
        />
        <StatCard
          label="Trades executed"
          value={String(user.trades)}
          footer={`${data.transactionTotal} ledger entries`}
        />
      </div>

      {/* Wallets */}
      <Card className="overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-[13px] font-semibold text-foreground">Wallets</h2>
          <span className="text-[11px] text-faint">
            {prices && Object.keys(prices).length > 0
              ? "Valued at current market prices"
              : "Live prices unavailable"}
          </span>
        </header>
        {data.balances.length === 0 ? (
          <p className="px-5 py-8 text-center text-[12.5px] text-muted">No wallets recorded.</p>
        ) : (
          <ul className="divide-y divide-border">
            {[...data.balances]
              .sort((a, b) => b.amount - a.amount)
              .map((balance) => {
                const price =
                  balance.asset === "USD" || balance.asset === "USDT"
                    ? 1
                    : (prices[balance.asset.toUpperCase()] ?? 0);
                return (
                  <li
                    key={balance.asset}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-foreground">{balance.asset}</p>
                      <p className="text-[10.5px] tabular-nums text-faint">
                        {price > 0 ? `${formatUSD(price)} each` : "Price unavailable"}
                        {balance.avgCost > 0 && ` · avg cost ${formatUSD(balance.avgCost)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12.5px] font-semibold tabular-nums text-foreground">
                        {formatAmount(balance.amount)}
                      </p>
                      <p className="text-[10.5px] tabular-nums text-faint">
                        {formatUSD(balance.amount * price)}
                      </p>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </Card>

      {/* Tabs */}
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4 sm:px-5">
          <Tabs<"funding" | "ledger" | "activity">
            ariaLabel="Account records"
            value={tab}
            onChange={setTab}
            options={[
              { value: "funding", label: "Funding", badge: String(data.fundTotal) },
              { value: "ledger", label: "Ledger", badge: String(data.transactionTotal) },
              { value: "activity", label: "Activity", badge: String(data.activityTotal) },
            ]}
          />
        </div>

        {tab === "funding" &&
          (data.fundRequests.length === 0 ? (
            <p className="px-5 py-12 text-center text-[12.5px] text-muted">
              No deposit or withdrawal requests from this account yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.fundRequests.map((request) => (
                <li
                  key={request.id}
                  className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-fill-1 sm:flex-row sm:items-center sm:px-5"
                >
                  <MethodIcon kind={request.methodKind} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-foreground">
                      {request.kind === "deposit" ? "Deposit" : "Withdrawal"} ·{" "}
                      {formatUSD(request.amount)} {request.asset}
                    </p>
                    <p className="mt-0.5 truncate text-[10.5px] text-faint">
                      {request.methodName || "Manual"} · ref{" "}
                      <code className="font-mono">{request.reference || "—"}</code> ·{" "}
                      {timeAgo(new Date(request.submittedAt))}
                      {request.reviewerName ? ` · reviewed by ${request.reviewerName}` : ""}
                    </p>
                    {request.reviewNote && (
                      <p className="mt-1 line-clamp-2 text-[11px] italic text-muted">
                        “{request.reviewNote}”
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <FundStatusBadge status={request.status} />
                    {request.status === "pending" && (
                      <Button size="sm" variant="secondary" onClick={() => setReviewing(request)}>
                        Review
                      </Button>
                    )}
                    {request.status !== "pending" && (
                      <Button size="sm" variant="ghost" onClick={() => setReviewing(request)}>
                        Details
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ))}

        {tab === "ledger" &&
          (data.transactions.length === 0 ? (
            <p className="px-5 py-12 text-center text-[12.5px] text-muted">
              No balance movements recorded for this account.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.transactions.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-foreground">
                      {entry.note || entry.type}
                    </span>
                    <span className="block text-[10.5px] text-faint">
                      {formatDateTime(entry.createdAt)} · {entry.type} ·{" "}
                      <Link
                        href="/admin/ledger"
                        className="text-accent underline-offset-2 hover:underline"
                      >
                        view in ledger
                      </Link>
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[12.5px] font-semibold tabular-nums",
                      entry.type === "withdrawal" || entry.type === "sell"
                        ? "text-negative"
                        : "text-positive"
                    )}
                  >
                    {entry.type === "withdrawal" || entry.type === "sell" ? "−" : "+"}
                    {formatAmount(entry.amount)} {entry.asset}
                  </span>
                </li>
              ))}
            </ul>
          ))}

        {tab === "activity" &&
          (data.activity.length === 0 ? (
            <p className="px-5 py-12 text-center text-[12.5px] text-muted">
              No activity recorded for this account.
            </p>
          ) : (
            <div>
              {data.activity.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} showUser={false} />
              ))}
              {data.activityTotal > data.activity.length && (
                <p className="border-t border-border px-5 py-3 text-center text-[11.5px] text-faint">
                  Showing the {data.activity.length} most recent of{" "}
                  {data.activityTotal.toLocaleString("en-US")} events.{" "}
                  <Link
                    href={`/admin/activity?q=${encodeURIComponent(user.email)}`}
                    className="text-accent underline-offset-2 hover:underline"
                  >
                    Search the full log
                  </Link>
                </p>
              )}
            </div>
          ))}
      </Card>

      {/* Edit profile */}
      {editing && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close profile editor"
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm animate-fade-in"
            onClick={() => !editBusy && setEditing(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit profile"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-elevated shadow-[var(--shadow-pop)] animate-scale-in"
          >
            <header className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Edit profile</h2>
              <p className="mt-0.5 text-[11.5px] text-faint">
                Changes are written to the audit log and the trader is notified.
              </p>
            </header>
            <div className="space-y-4 px-5 py-4">
              {editError && <Alert variant="error">{editError}</Alert>}
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Full name</Label>
                <Input
                  id="edit-name"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+234 …"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-country">Country</Label>
                  <Input
                    id="edit-country"
                    value={profile.country}
                    onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
                    placeholder="Nigeria"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>KYC status</Label>
                <Select
                  ariaLabel="KYC status"
                  value={user.kycStatus}
                  onChange={(v) => void setKyc(v as KycStatus)}
                  options={KYC_OPTIONS}
                />
              </div>
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-border bg-card/60 px-5 py-3.5">
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={editBusy}>
                Cancel
              </Button>
              <Button onClick={() => void saveProfile()} disabled={editBusy}>
                {editBusy && <Loader2 className="size-4 animate-spin-slow" aria-hidden />}
                Save profile
              </Button>
            </footer>
          </div>
        </div>
      )}

      {reviewing && (
        <ReviewDialog
          request={reviewing}
          onClose={() => setReviewing(null)}
          onResolved={() => {
            setReviewing(null);
            void load(true);
          }}
        />
      )}

      <p className="text-center text-[11.5px] text-faint">
        Administrator actions on this account are attributed to you.{" "}
        <Link href="/admin/activity" className="text-accent underline-offset-2 hover:underline">
          Open the platform activity log
        </Link>
        .
      </p>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  href,
  mono,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
}) {
  const content = (
    <>
      <dt className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wide text-faint">
        <Icon className="size-3" aria-hidden />
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-[12px] text-foreground",
          mono && "font-mono text-[11.5px]"
        )}
        title={value}
      >
        {value}
      </dd>
    </>
  );
  return href ? (
    <a href={href} className="min-w-0 hover:text-accent">
      {content}
    </a>
  ) : (
    <div className="min-w-0">{content}</div>
  );
}
