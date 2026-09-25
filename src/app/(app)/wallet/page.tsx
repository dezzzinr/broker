"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Clock3,
  Coins,
  Info,
  Loader2,
  Wallet as WalletIcon,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useWallet } from "@/components/providers/wallet-provider";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { CoinIcon } from "@/components/shared/coin-icon";
import { PercentageBadge } from "@/components/shared/percentage-badge";
import { FundStatusBadge } from "@/components/shared/fund-status-badge";
import { MethodIcon, METHOD_LABELS } from "@/components/shared/method-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
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
import { formatAmount, formatPrice, formatUSD, timeAgo } from "@/lib/format";
import type { DepositMethod } from "@/lib/types/platform";

const CASH_ASSETS = new Set(["USD", "USDT"]);

export default function WalletPage() {
  const { balances, transactions, fundRequests, loading, error, refresh } = useWallet();
  const { coins } = useLiveMarket();
  const { toast } = useToast();

  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const coinBySymbol = useMemo(
    () => new Map(coins.map((coin) => [coin.symbol.toUpperCase(), coin])),
    [coins]
  );

  const prices = useMemo(() => {
    const map = new Map<string, number>();
    for (const coin of coins) map.set(coin.symbol.toUpperCase(), coin.price);
    map.set("USD", 1);
    map.set("USDT", 1);
    return map;
  }, [coins]);

  const holdings = useMemo(() => {
    const rows = balances
      .map((balance) => {
        const price = prices.get(balance.asset.toUpperCase()) ?? 0;
        const value = balance.amount * price;
        const coin = coinBySymbol.get(balance.asset.toUpperCase());
        const isCash = CASH_ASSETS.has(balance.asset.toUpperCase());
        const pnl =
          !isCash && balance.avgCost > 0 ? ((price - balance.avgCost) / balance.avgCost) * 100 : 0;
        return { ...balance, price, value, pnl, isCash, coin };
      })
      .filter((row) => row.amount > 0 || row.isCash)
      .sort((a, b) => b.value - a.value);

    const total = rows.reduce((sum, row) => sum + row.value, 0);
    return { rows, total };
  }, [balances, prices, coinBySymbol]);

  const cash = holdings.rows
    .filter((row) => row.isCash)
    .reduce((sum, row) => sum + row.value, 0);
  const cryptoValue = holdings.total - cash;

  const pending = fundRequests.filter((request) => request.status === "pending");
  const pendingValue = pending
    .filter((request) => request.kind === "deposit")
    .reduce((sum, request) => sum + request.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet"
        description="Your real balances on Quantix — funded by manual deposits you submit and settled by every trade you place."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setWithdrawOpen(true)}>
              <ArrowUpFromLine className="size-4" aria-hidden />
              Withdraw
            </Button>
            <Link
              href="/deposits"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-accent px-4 text-[13px] font-medium text-on-accent shadow-[0_4px_16px_-6px_var(--accent-glow)] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <ArrowDownToLine className="size-4" aria-hidden />
              Deposit
            </Link>
          </>
        }
      />

      {error && (
        <Alert variant="error" title="Could not load your wallet">
          {error}{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => void refresh()}>
            Try again
          </button>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[118px] rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Total balance"
              value={formatUSD(holdings.total)}
              icon={WalletIcon}
              footer={`${holdings.rows.filter((r) => !r.isCash).length} crypto asset(s) held`}
            />
            <StatCard
              label="Available cash"
              value={formatUSD(cash)}
              icon={Coins}
              footer="Ready to trade or withdraw"
            />
            <StatCard
              label="Crypto holdings"
              value={formatUSD(cryptoValue)}
              footer={
                holdings.total > 0
                  ? `${((cryptoValue / holdings.total) * 100).toFixed(1)}% of your wallet`
                  : "No positions yet"
              }
            />
            <StatCard
              label="Pending funding"
              value={formatUSD(pendingValue)}
              icon={Clock3}
              footer={
                pending.length === 0
                  ? "Nothing under review"
                  : `${pending.length} request(s) with the team`
              }
            />
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        {/* Holdings */}
        <Card className="overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-[14px] font-semibold text-foreground">Holdings</h2>
              <p className="mt-0.5 text-[11.5px] text-faint">
                Valued at live market prices · updates as the feed ticks
              </p>
            </div>
            <Link
              href="/portfolio"
              className="text-[12px] font-medium text-accent underline-offset-2 hover:underline"
            >
              Portfolio breakdown →
            </Link>
          </header>

          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : holdings.rows.length === 0 ? (
            <EmptyState
              className="m-4 border-0 bg-transparent"
              icon={WalletIcon}
              title="Your wallet is empty"
              description="Make a manual deposit and upload your proof of payment — once an administrator approves it, the funds appear here instantly."
              action={
                <Link
                  href="/deposits"
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-accent px-4 text-[13px] font-medium text-on-accent"
                >
                  <ArrowDownToLine className="size-4" aria-hidden />
                  Start a deposit
                </Link>
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Allocation</TableHead>
                      <TableHead className="text-right">Unrealised P&amp;L</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holdings.rows.map((row) => {
                      const share = holdings.total > 0 ? (row.value / holdings.total) * 100 : 0;
                      return (
                        <TableRow key={row.asset}>
                          <TableCell>
                            <span className="flex items-center gap-2.5">
                              <CoinIcon
                                symbol={row.coin?.symbol ?? row.asset}
                                color={row.coin?.color ?? "var(--accent)"}
                                size={30}
                              />
                              <span className="min-w-0">
                                <span className="block text-[13px] font-semibold text-foreground">
                                  {row.coin?.name ?? row.asset}
                                </span>
                                <span className="block text-[10.5px] text-faint">{row.asset}</span>
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[13px] text-foreground">
                            {formatAmount(row.amount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[12.5px] text-muted">
                            {row.price > 0 ? formatPrice(row.price) : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[13px] font-semibold text-foreground">
                            {formatUSD(row.value)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="ml-auto flex w-28 flex-col items-end gap-1">
                              <span className="text-[11.5px] tabular-nums text-muted">
                                {share.toFixed(1)}%
                              </span>
                              <span className="h-1.5 w-full overflow-hidden rounded-full bg-fill-2">
                                <span
                                  className="block h-full rounded-full bg-accent transition-[width] duration-500"
                                  style={{ width: `${Math.min(100, share)}%` }}
                                />
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {row.isCash || row.avgCost === 0 ? (
                              <span className="text-[12px] text-faint">—</span>
                            ) : (
                              <span className="inline-flex flex-col items-end gap-0.5">
                                <PercentageBadge value={row.pnl} size="sm" />
                                <span className="text-[10.5px] tabular-nums text-faint">
                                  avg {formatPrice(row.avgCost)}
                                </span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/trade?coin=${row.coin?.id ?? ""}`}
                              className={cn(
                                "inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-accent/40 hover:text-accent",
                                !row.coin && "pointer-events-none opacity-40"
                              )}
                              aria-label={`Trade ${row.asset}`}
                            >
                              <ArrowLeftRight className="size-3.5" aria-hidden />
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-border md:hidden">
                {holdings.rows.map((row) => {
                  const share = holdings.total > 0 ? (row.value / holdings.total) * 100 : 0;
                  return (
                    <li key={row.asset} className="flex items-center gap-3 px-4 py-3.5">
                      <CoinIcon
                        symbol={row.coin?.symbol ?? row.asset}
                        color={row.coin?.color ?? "var(--accent)"}
                        size={34}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-foreground">
                          {row.coin?.name ?? row.asset}
                        </p>
                        <p className="text-[11px] tabular-nums text-faint">
                          {formatAmount(row.amount)} {row.asset} · {share.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12.5px] font-semibold tabular-nums text-foreground">
                          {formatUSD(row.value)}
                        </p>
                        {!row.isCash && row.avgCost > 0 ? (
                          <PercentageBadge value={row.pnl} size="sm" />
                        ) : (
                          <p className="text-[10.5px] tabular-nums text-faint">
                            {row.price > 0 ? formatPrice(row.price) : "—"}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        {/* Right rail */}
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-3.5">
              <h2 className="text-[13px] font-semibold text-foreground">Funding status</h2>
              <Link
                href="/deposits"
                className="text-[11.5px] font-medium text-accent underline-offset-2 hover:underline"
              >
                Manage
              </Link>
            </header>
            {loading ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            ) : fundRequests.length === 0 ? (
              <p className="px-5 py-8 text-center text-[12px] text-muted">
                No deposits or withdrawals yet.{" "}
                <Link href="/deposits" className="text-accent underline-offset-2 hover:underline">
                  Submit your first deposit
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {fundRequests.slice(0, 4).map((request) => (
                  <li key={request.id} className="flex items-center gap-3 px-5 py-3">
                    <MethodIcon kind={request.methodKind} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-foreground">
                        {request.kind === "deposit" ? "Deposit" : "Withdrawal"} ·{" "}
                        {formatUSD(request.amount)}
                      </p>
                      <p className="truncate text-[10.5px] text-faint">
                        {request.methodName || "Manual"} ·{" "}
                        {timeAgo(new Date(request.submittedAt))}
                      </p>
                    </div>
                    <FundStatusBadge status={request.status} showDot={false} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-3.5">
              <h2 className="text-[13px] font-semibold text-foreground">Recent movements</h2>
              <Link
                href="/transactions"
                className="text-[11.5px] font-medium text-accent underline-offset-2 hover:underline"
              >
                All activity
              </Link>
            </header>
            {loading ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="px-5 py-8 text-center text-[12px] text-muted">
                Approved deposits, trades and adjustments appear here.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {transactions.slice(0, 6).map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border",
                        entry.type === "withdrawal" || entry.type === "sell"
                          ? "border-negative/25 bg-negative/10 text-negative"
                          : "border-positive/25 bg-positive/10 text-positive"
                      )}
                    >
                      {entry.type === "withdrawal" ? (
                        <ArrowUpFromLine className="size-3.5" aria-hidden />
                      ) : entry.type === "sell" ? (
                        <ArrowLeftRight className="size-3.5" aria-hidden />
                      ) : (
                        <ArrowDownToLine className="size-3.5" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] text-foreground">
                        {entry.note || entry.type}
                      </p>
                      <p className="text-[10.5px] text-faint">{timeAgo(new Date(entry.createdAt))}</p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-[12px] font-semibold tabular-nums",
                        entry.type === "withdrawal" || entry.type === "sell"
                          ? "text-negative"
                          : "text-positive"
                      )}
                    >
                      {entry.type === "withdrawal" || entry.type === "sell" ? "−" : "+"}
                      {formatAmount(entry.amount)} {entry.asset}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <WithdrawDialog
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        cashBalance={cash}
        onDone={() => void refresh()}
        toast={toast}
      />
    </div>
  );
}

/* ------------------------------ withdraw ------------------------------- */

function WithdrawDialog({
  open,
  onClose,
  cashBalance,
  onDone,
  toast,
}: {
  open: boolean;
  onClose: () => void;
  cashBalance: number;
  onDone: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [withdrawalEnabled, setWithdrawalEnabled] = useState(true);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [methodId, setMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingMethods(true);
    (async () => {
      try {
        const data = await api<{
          methods: DepositMethod[];
          limits: { withdrawalEnabled: boolean };
        }>("/api/deposit-methods");
        if (cancelled) return;
        setMethods(data.methods);
        setWithdrawalEnabled(data.limits.withdrawalEnabled);
        setMethodId((prev) => prev || data.methods[0]?.id || "");
      } catch {
        if (!cancelled) setError("Could not load payout methods. Please try again.");
      } finally {
        if (!cancelled) setLoadingMethods(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const method = methods.find((m) => m.id === methodId) ?? null;
  const value = Number.parseFloat(amount) || 0;
  const fee = method ? Math.round(value * method.feePercent) / 100 : 0;
  const payout = Math.max(0, value - fee);
  const exceeds = value > cashBalance + 1e-9;

  function close() {
    if (submitting) return;
    setAmount("");
    setDestination("");
    setNote("");
    setError(null);
    setFieldErrors({});
    onClose();
  }

  async function submit() {
    if (!method) {
      setError("Choose a payout method.");
      return;
    }
    if (!(value > 0)) {
      setFieldErrors({ amount: "Enter an amount greater than zero." });
      return;
    }
    if (exceeds) {
      setFieldErrors({ amount: `You can withdraw up to ${formatUSD(cashBalance)}.` });
      return;
    }
    if (destination.trim().length < 4) {
      setFieldErrors({ destination: "Enter the account or address to pay out to." });
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api("/api/deposits", {
        method: "POST",
        body: {
          methodId: method.id,
          amount: value,
          destination: destination.trim(),
          note: note.trim(),
        },
      });
      toast({
        title: "Withdrawal requested",
        description: `${formatUSD(value)} is escrowed while an administrator processes the payout.`,
        variant: "success",
      });
      close();
      onDone();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        if (err.fields) setFieldErrors(err.fields);
      } else {
        setError("Could not submit this withdrawal.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Request a withdrawal"
      description="Funds are held in escrow as soon as you submit, and released to your payout details once an administrator approves the request."
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={submitting || !withdrawalEnabled}>
            {submitting && <Loader2 className="size-4 animate-spin-slow" aria-hidden />}
            Submit request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {!withdrawalEnabled && (
          <Alert variant="warning" title="Withdrawals are paused">
            The platform is not accepting payout requests right now. Please contact support or try
            again later.
          </Alert>
        )}

        {loadingMethods ? (
          <Skeleton className="h-9 rounded-lg" />
        ) : methods.length === 0 ? (
          <Alert variant="info">
            No payout methods have been published yet. An administrator must add at least one
            deposit method before withdrawals can be processed.
          </Alert>
        ) : (
          <div className="space-y-1.5">
            <Label>Payout method</Label>
            <Select
              ariaLabel="Payout method"
              value={methodId}
              onChange={setMethodId}
              options={methods.map((m) => ({
                value: m.id,
                label: `${m.name} · ${m.currency}`,
                hint: METHOD_LABELS[m.kind],
              }))}
            />
            {method && (
              <p className="text-[11px] text-faint">
                {METHOD_LABELS[method.kind]} ·{" "}
                {method.feePercent > 0 ? `${method.feePercent}% fee` : "no fee"} ·{" "}
                {method.processingTime || "processed manually"}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="withdraw-amount">Amount (USD)</Label>
            <Input
              id="withdraw-amount"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setFieldErrors((prev) => ({ ...prev, amount: "" }));
              }}
              placeholder="0.00"
              aria-invalid={Boolean(fieldErrors.amount)}
            />
            {fieldErrors.amount ? (
              <p className="text-[11px] text-negative">{fieldErrors.amount}</p>
            ) : (
              <p className="text-[11px] text-faint">Available: {formatUSD(cashBalance)}</p>
            )}
          </div>

          <div className="flex items-end gap-1.5">
            {[25, 50, 100].map((pct) => (
              <Button
                key={pct}
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setAmount(((cashBalance * pct) / 100).toFixed(2))}
              >
                {pct}%
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="withdraw-destination">Payout details</Label>
          <Input
            id="withdraw-destination"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setFieldErrors((prev) => ({ ...prev, destination: "" }));
            }}
            placeholder={
              method?.kind === "crypto"
                ? "Destination wallet address"
                : "Account name · account number · bank"
            }
            aria-invalid={Boolean(fieldErrors.destination)}
          />
          {fieldErrors.destination && (
            <p className="text-[11px] text-negative">{fieldErrors.destination}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="withdraw-note">Note for the review team (optional)</Label>
          <Textarea
            id="withdraw-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything that helps us process this payout faster"
            className="min-h-[70px]"
            maxLength={600}
          />
        </div>

        {value > 0 && (
          <dl className="space-y-2 rounded-xl border border-border bg-surface p-3.5 text-[12px]">
            <div className="flex justify-between">
              <dt className="text-muted">Amount requested</dt>
              <dd className="font-medium tabular-nums text-foreground">{formatUSD(value)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">
                Method fee{method && method.feePercent > 0 ? ` (${method.feePercent}%)` : ""}
              </dt>
              <dd className="tabular-nums text-muted">−{formatUSD(fee)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="text-muted">You receive</dt>
              <dd className="font-semibold tabular-nums text-positive">{formatUSD(payout)}</dd>
            </div>
          </dl>
        )}

        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-faint">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Rejected requests are refunded to your wallet automatically. Track progress under{" "}
          <Link href="/deposits" className="text-accent underline-offset-2 hover:underline">
            Deposits → Payouts
          </Link>
          .
        </p>
      </div>
    </Dialog>
  );
}
