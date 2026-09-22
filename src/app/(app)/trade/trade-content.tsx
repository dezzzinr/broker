"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, FlaskConical, Info } from "lucide-react";
import { DEMO_BALANCES } from "@/lib/data/portfolio";
import type { Coin } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatAmount, formatCompactUSD, formatPrice, formatUSD } from "@/lib/format";
import { generateSeries, hashSeed, mulberry32 } from "@/lib/random";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PageHeader } from "@/components/shared/page-header";
import { PercentageBadge } from "@/components/shared/percentage-badge";
import { CoinIcon } from "@/components/shared/coin-icon";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AreaChartPanel } from "@/components/charts/area-chart-panel";

const RANGES = ["24H", "7D", "1M"] as const;
type ChartRange = (typeof RANGES)[number];

const RANGE_CFG: Record<ChartRange, { points: number; drift: number; vol: number; stepHours: number }> = {
  "24H": { points: 24, drift: 0.004, vol: 0.003, stepHours: 1 },
  "7D": { points: 56, drift: 0.018, vol: 0.006, stepHours: 3 },
  "1M": { points: 60, drift: 0.045, vol: 0.012, stepHours: 12 },
};

const BOOK_DEPTH = 7;
const FEE_RATE = 0.001;

function trimAmount(v: number): string {
  if (!isFinite(v) || v <= 0) return "";
  const decimals = v >= 1000 ? 2 : v >= 1 ? 4 : 6;
  return String(Number(v.toFixed(decimals)));
}

export function TradeContent({ initialCoinId }: { initialCoinId: string }) {
  const router = useRouter();
  const { coins, getCoin, loading } = useLiveMarket();
  const { settings } = useSettings();
  const { toast } = useToast();

  const coin: Coin | undefined = getCoin(initialCoinId) ?? coins[0];

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">(settings.defaultOrderType);
  const [priceInput, setPriceInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [chartRange, setChartRange] = useState<ChartRange>("7D");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setOrderType(settings.defaultOrderType);
  }, [settings.defaultOrderType]);

  const series = useMemo(() => {
    if (!coin) return [];
    const cfg = RANGE_CFG[chartRange];
    return generateSeries({
      seed: `${coin.id}-${chartRange}-trade`,
      points: cfg.points,
      end: coin.price,
      drift: cfg.drift,
      volatility: cfg.vol,
      stepMs: cfg.stepHours * 60 * 60 * 1000,
    });
  }, [coin, chartRange]);

  const book = useMemo(() => {
    if (!coin) return null;
    const rng = mulberry32(hashSeed(`${coin.id}-book-v3`));
    const mk = (sign: 1 | -1) =>
      Array.from({ length: BOOK_DEPTH }, (_, i) => ({
        price: coin.price * (1 + sign * 0.00045 * (i + 1)),
        amount: Number((0.05 + rng() * 1.35).toFixed(4)),
      }));
    const asks = mk(1).sort((a, b) => b.price - a.price);
    const bids = mk(-1);
    const maxSize = Math.max(...asks.map((a) => a.amount), ...bids.map((b) => b.amount));
    return { asks, bids, maxSize };
  }, [coin]);

  const trades = useMemo(() => {
    if (!coin) return [];
    const rng = mulberry32(hashSeed(`${coin.id}-trades-v3`));
    const now = 1_790_035_200_000;
    return Array.from({ length: 14 }, (_, i) => {
      const buy = rng() > 0.45;
      return {
        time: now - i * 42_000,
        price: coin.price * (1 + (rng() - 0.5) * 0.0016),
        amount: Number((0.008 + rng() * 0.9).toFixed(4)),
        buy,
      };
    });
  }, [coin]);

  if (loading && !coin) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-[360px] rounded-2xl" />
          </div>
          <Skeleton className="h-[560px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!coin) {
    return (
      <PageHeader
        title="Trade"
        description="Market data is unavailable right now. Please refresh or try again from the dashboard."
      />
    );
  }

  const baseSymbol = coin.symbol;
  const quoteSymbol = "USDT";
  const baseBalance = DEMO_BALANCES[baseSymbol] ?? 0;
  const quoteBalance = DEMO_BALANCES[quoteSymbol] ?? 0;

  const limitPrice = orderType === "limit" ? Number.parseFloat(priceInput) || 0 : coin.price;
  const amount = Number.parseFloat(amountInput) || 0;
  const total = amount * limitPrice;
  const fee = total * FEE_RATE;
  const maxAmount =
    side === "buy" ? (quoteBalance * (1 - FEE_RATE)) / (limitPrice || coin.price) : baseBalance;
  const insufficient = side === "buy" ? total + fee > quoteBalance : amount > baseBalance;
  const canSubmit = amount > 0 && limitPrice > 0 && !insufficient;

  const applyPercent = (pct: number) => {
    setAmountInput(trimAmount((maxAmount * pct) / 100));
  };

  const submit = () => {
    if (!canSubmit) return;
    if (settings.confirmOrders) {
      setConfirmOpen(true);
    } else {
      executeDemoOrder();
    }
  };

  const executeDemoOrder = () => {
    setConfirmOpen(false);
    setAmountInput("");
    setPriceInput("");
    toast({
      title: "Demo order submitted",
      description: `${side === "buy" ? "Buy" : "Sell"} ${formatAmount(amount)} ${baseSymbol} — simulated fill, no real order was placed.`,
      variant: "info",
    });
  };

  const stats = [
    { label: "24h Change", node: <PercentageBadge value={coin.change24h} size="sm" /> },
    { label: "7d High", node: <span className="tabular-nums">{formatPrice(Math.max(...coin.chartData.map((p) => p.v)))}</span> },
    { label: "7d Low", node: <span className="tabular-nums">{formatPrice(Math.min(...coin.chartData.map((p) => p.v)))}</span> },
    { label: "Volume (24h)", node: <span className="tabular-nums">{formatCompactUSD(coin.volume24h)}</span> },
    { label: `Available ${quoteSymbol}`, node: <span className="tabular-nums">{formatUSD(quoteBalance)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trade"
        description="Demo trading interface — orders are simulated end-to-end and never sent to a real exchange."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-warning/25 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning">
            <FlaskConical className="size-3.5" aria-hidden />
            Demo Trading
          </span>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left column */}
        <div className="space-y-4">
          {/* Pair summary */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-4">
              <CoinIcon symbol={coin.symbol} color={coin.color} size={44} />
              <div>
                <Select
                  ariaLabel="Select trading pair"
                  value={coin.id}
                  onChange={(id) => router.replace(`/trade?coin=${id}`, { scroll: false })}
                  options={coins.map((c) => ({ value: c.id, label: c.pair, hint: formatPrice(c.price) }))}
                  className="w-44"
                  size="lg"
                  buttonClassName="border-0 bg-white/[0.05] text-base"
                />
              </div>
              <div>
                <AnimatedNumber
                  value={coin.price}
                  format={formatPrice}
                  className="text-2xl font-semibold tracking-tight text-foreground"
                />
                <div className="mt-1 flex items-center gap-2">
                  <PercentageBadge value={coin.change24h} size="sm" />
                  <span className="text-[11px] text-faint">past 24 hours</span>
                </div>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-5">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-faint">{s.label}</dt>
                  <dd className="mt-1 text-[13px] font-medium text-foreground [&_span]:text-[13px]">{s.node}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Price chart */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-0">
              <h2 className="text-[15px] font-semibold text-foreground">{coin.pair} price</h2>
              <div role="tablist" aria-label="Chart range" className="inline-flex rounded-lg border border-border bg-white/[0.03] p-0.5">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    role="tab"
                    aria-selected={chartRange === r}
                    onClick={() => setChartRange(r)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                      chartRange === r ? "bg-white/[0.08] text-foreground" : "text-muted hover:text-foreground"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4">
              <AreaChartPanel data={series} height={300} />
            </div>
          </Card>

          {/* Order book + trades */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-[13px] font-semibold text-foreground">Order book</h3>
              <p className="mt-0.5 text-[11px] text-faint">Simulated depth</p>
              {book && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-faint">
                    <span>Price</span>
                    <span>Amount ({baseSymbol})</span>
                  </div>
                  {book.asks.map((level, i) => (
                    <div key={`a${i}`} className="relative flex h-[26px] items-center justify-between rounded px-2 text-[12px] tabular-nums">
                      <div
                        aria-hidden
                        className="absolute inset-y-0.5 right-0 rounded bg-negative/10"
                        style={{ width: `${(level.amount / book.maxSize) * 100}%` }}
                      />
                      <span className="relative text-negative">{formatPrice(level.price)}</span>
                      <span className="relative text-muted">{level.amount}</span>
                    </div>
                  ))}
                  <div className="my-1.5 flex items-center justify-between rounded-lg border border-border bg-white/[0.03] px-2 py-1.5">
                    <span className="text-[13px] font-semibold tabular-nums text-foreground">{formatPrice(coin.price)}</span>
                    <span className="text-[10px] uppercase tracking-wider text-faint">Spread</span>
                  </div>
                  {book.bids.map((level, i) => (
                    <div key={`b${i}`} className="relative flex h-[26px] items-center justify-between rounded px-2 text-[12px] tabular-nums">
                      <div
                        aria-hidden
                        className="absolute inset-y-0.5 right-0 rounded bg-positive/10"
                        style={{ width: `${(level.amount / book.maxSize) * 100}%` }}
                      />
                      <span className="relative text-positive">{formatPrice(level.price)}</span>
                      <span className="relative text-muted">{level.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-[13px] font-semibold text-foreground">Recent trades</h3>
              <p className="mt-0.5 text-[11px] text-faint">Simulated tape</p>
              <div className="mt-3 max-h-[280px] space-y-1 overflow-y-auto pr-1">
                {trades.map((t, i) => (
                  <div key={i} className="flex items-center justify-between rounded px-2 py-1 text-[12px] tabular-nums odd:bg-white/[0.02]">
                    <span className="text-faint">
                      {new Date(t.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" })}
                    </span>
                    <span className={t.buy ? "text-positive" : "text-negative"}>{formatPrice(t.price)}</span>
                    <span className="text-muted">{t.amount}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Order form */}
        <Card className="lg:sticky lg:top-24">
          <div className="p-5">
            {/* Buy / Sell */}
            <div role="tablist" aria-label="Order side" className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-white/[0.03] p-1">
              {(["buy", "sell"] as const).map((s) => (
                <button
                  key={s}
                  role="tab"
                  aria-selected={side === s}
                  onClick={() => {
                    setSide(s);
                    setAmountInput("");
                  }}
                  className={cn(
                    "flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold capitalize transition-all",
                    side === s && s === "buy" && "bg-positive/15 text-positive ring-1 ring-positive/30",
                    side === s && s === "sell" && "bg-negative/15 text-negative ring-1 ring-negative/30",
                    side !== s && "text-muted hover:text-foreground"
                  )}
                >
                  {s === "buy" ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}
                  {s}
                </button>
              ))}
            </div>

            {/* Order type */}
            <div className="mt-3 flex gap-1 rounded-lg border border-border bg-white/[0.03] p-0.5" role="tablist" aria-label="Order type">
              {(["market", "limit"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={orderType === t}
                  onClick={() => setOrderType(t)}
                  className={cn(
                    "h-7 flex-1 rounded-md text-[11px] font-medium capitalize transition-colors",
                    orderType === t ? "bg-white/[0.08] text-foreground" : "text-muted hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="order-price">Price ({quoteSymbol})</Label>
                <Input
                  id="order-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  disabled={orderType === "market"}
                  placeholder={orderType === "market" ? "Market price" : formatPrice(coin.price)}
                  value={orderType === "market" ? "" : priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="order-amount">Amount ({baseSymbol})</Label>
                  <span className="text-[10px] text-faint">
                    Avail. {side === "buy" ? formatUSD(quoteBalance) : `${formatAmount(baseBalance)} ${baseSymbol}`}
                  </span>
                </div>
                <Input
                  id="order-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  aria-invalid={insufficient}
                />
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyPercent(p)}
                      className="rounded-lg border border-border bg-white/[0.03] py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-foreground"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              <dl className="space-y-2 rounded-xl border border-border bg-surface p-3.5 text-[12px]">
                <div className="flex justify-between">
                  <dt className="text-muted">Est. total</dt>
                  <dd className="font-medium tabular-nums text-foreground">{formatUSD(total)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Fee (0.1%)</dt>
                  <dd className="tabular-nums text-muted">{formatUSD(fee)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <dt className="text-muted">Order value</dt>
                  <dd className="font-semibold tabular-nums text-foreground">{formatUSD(total + fee)}</dd>
                </div>
              </dl>

              {insufficient && (
                <p className="text-[11px] text-negative" role="alert">
                  Insufficient {side === "buy" ? quoteSymbol : baseSymbol} balance for this order.
                </p>
              )}

              <Button
                variant={side === "buy" ? "positive" : "negative"}
                size="lg"
                className="w-full text-sm font-semibold"
                disabled={!canSubmit}
                onClick={submit}
              >
                {side === "buy" ? "Buy" : "Sell"} {baseSymbol}
              </Button>

              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-faint">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Simulated environment. Orders are not routed to any exchange and no real funds are used.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Confirm dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm demo order"
        description="Review the simulated order. Nothing will be sent to a real exchange."
      >
        <dl className="space-y-2 rounded-xl border border-border bg-surface p-4 text-[13px]">
          {[
            ["Side", side === "buy" ? "Buy" : "Sell"],
            ["Pair", coin.pair],
            ["Type", orderType === "market" ? "Market" : "Limit"],
            ["Price", formatPrice(limitPrice)],
            ["Amount", `${formatAmount(amount)} ${baseSymbol}`],
            ["Total incl. fee", formatUSD(total + fee)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium tabular-nums text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning/10 p-3.5">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p className="text-xs leading-relaxed text-warning/90">
            Demo trading only — this does not create a real or binding order.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant={side === "buy" ? "positive" : "negative"} onClick={executeDemoOrder}>
            Confirm {side === "buy" ? "buy" : "sell"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
