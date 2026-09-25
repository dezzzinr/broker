"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, BrainCircuit, Gauge, Sparkles } from "lucide-react";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { FORECAST_META, INSIGHT_SIGNALS, WEEKLY_BRIEF } from "@/lib/data/insights";
import { generateSeries } from "@/lib/random";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { CoinIcon } from "@/components/shared/coin-icon";
import { SentimentGauge } from "@/components/charts/sentiment-gauge";
import { ForecastChart, type ForecastPoint } from "@/components/charts/forecast-chart";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SENTIMENT } from "@/lib/data/market";

const STANCE_STYLES: Record<string, string> = {
  bullish: "border-positive/25 bg-positive/10 text-positive",
  bearish: "border-negative/25 bg-negative/10 text-negative",
  neutral: "border-border bg-fill-2 text-muted",
};

export default function InsightsPage() {
  const { getCoin, loading } = useLiveMarket();
  const btc = getCoin("bitcoin");

  const forecast = useMemo<ForecastPoint[]>(() => {
    if (!btc) return [];
    const history = generateSeries({
      seed: "insights-fx-history-v1",
      points: 42,
      end: btc.price,
      drift: 0.03,
      volatility: 0.006,
      stepMs: 24 * 60 * 60 * 1000,
    });
    const horizon = FORECAST_META.horizonDays;
    const lastT = history[history.length - 1].t;
    const points: ForecastPoint[] = history.map((p) => ({
      t: p.t,
      base: p.v,
      expected: p.v,
      low: p.v,
      band: 0,
    }));
    for (let i = 1; i <= horizon; i++) {
      const frac = i / horizon;
      const expected = btc.price * (1 + FORECAST_META.expected * frac);
      const low = btc.price * (1 + FORECAST_META.confidenceLow * frac);
      const high = btc.price * (1 + FORECAST_META.confidenceHigh * frac);
      points.push({
        t: lastT + i * 24 * 60 * 60 * 1000,
        base: Number.NaN,
        expected,
        low,
        band: high - low,
      });
    }
    // Recharts handles gaps via connectNulls=false default: NaN breaks line — acceptable
    return points;
  }, [btc]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        description="AI-generated market signals and the weekly brief. Simulated analytics for the demo build."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent">
            <BrainCircuit className="size-3.5" aria-hidden />
            Quantix AI
          </span>
        }
      />

      {/* Weekly brief */}
      <Card className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-accent-soft blur-3xl"
        />
        <div className="p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            <Sparkles className="size-4 text-accent" aria-hidden />
            Quantix AI weekly brief
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 lg:grid-cols-2">
            {WEEKLY_BRIEF.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-accent" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Signals */}
      <section aria-labelledby="signals-title">
        <h2 id="signals-title" className="text-[15px] font-semibold text-foreground">
          Active signals
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {INSIGHT_SIGNALS.map((sig, i) => {
            const coin = getCoin(sig.coinId);
            return (
              <Card
                key={sig.id}
                className="flex flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-border-strong"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {coin ? (
                      <CoinIcon symbol={coin.symbol} color={coin.color} size={30} />
                    ) : (
                      <Skeleton className="size-[30px] rounded-full" />
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate text-[13px] font-semibold text-foreground">{sig.title}</h3>
                      {coin && <p className="text-[11px] text-faint">{coin.pair}</p>}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider capitalize",
                      STANCE_STYLES[sig.stance]
                    )}
                  >
                    {sig.stance}
                  </span>
                </div>
                <p className="mt-3 flex-1 text-[12.5px] leading-relaxed text-muted">{sig.summary}</p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-faint">
                      Confidence · {sig.timeframe}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">{sig.confidence}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fill-2">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        sig.stance === "bullish"
                          ? "bg-positive/80"
                          : sig.stance === "bearish"
                            ? "bg-negative/80"
                            : "bg-accent/80"
                      )}
                      style={{ width: `${sig.confidence}%` }}
                    />
                  </div>
                </div>
                {coin && (
                  <Link
                    href={`/trade?coin=${coin.id}`}
                    className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-accent transition-colors hover:text-foreground"
                  >
                    Open {coin.pair}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Forecast + sentiment */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-0">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">14-day forecast · BTC</h2>
              <p className="mt-0.5 text-xs text-muted">Expected path with shaded confidence band</p>
            </div>
            <div className="flex gap-2 text-[11px]">
              <span className="rounded-full border border-positive/20 bg-positive/10 px-2.5 py-1 font-medium text-positive">
                Expected +{(FORECAST_META.expected * 100).toFixed(1)}%
              </span>
              <span className="rounded-full border border-border bg-fill-1 px-2.5 py-1 font-medium text-muted">
                Band {(FORECAST_META.confidenceLow * 100).toFixed(1)}% → +{(FORECAST_META.confidenceHigh * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="p-4">
            {loading && !btc ? (
              <Skeleton className="h-[260px] rounded-xl" />
            ) : (
              <ForecastChart data={forecast} height={260} valueFormatter={(v) => formatPrice(v)} />
            )}
          </div>
          <p className="px-5 pb-4 text-[11px] leading-relaxed text-faint">
            Forecasts are generated from simulated models and must not be interpreted as financial advice.
          </p>
        </Card>

        <Card>
          <div className="p-5 pb-0">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Gauge className="size-4 text-accent" aria-hidden />
              Sentiment snapshot
            </h2>
            <p className="mt-0.5 text-xs text-muted">Where the crowd stands today</p>
          </div>
          <div className="p-5">
            <SentimentGauge value={SENTIMENT.value} caption="Fear &amp; Greed · simulated" />
            <p className="mt-4 text-center text-[12px] leading-relaxed text-muted">
              Greed readings above 70 have historically preceded short-term pullbacks — Quantix AI
              recommends sizing positions conservatively.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
