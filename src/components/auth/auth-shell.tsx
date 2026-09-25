"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, BarChart3, Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { useLiveMarket } from "@/components/providers/live-market-provider";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { formatPrice, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Administrator-reviewed funding",
    body: "Every manual deposit is matched against proof of payment by our operations team before it touches your balance.",
  },
  {
    icon: BarChart3,
    title: "Institutional analytics",
    body: "Live markets, AI signals and performance attribution across every asset you hold.",
  },
  {
    icon: Lock,
    title: "Security by default",
    body: "Hashed credentials, httpOnly sessions, device history and two-factor authentication.",
  },
];

/**
 * Split-screen authentication shell: a live, branded panel beside the form.
 * Collapses to a single column on small screens.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const pathname = usePathname();
  const isSignUp = pathname === "/signup";

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.02fr_minmax(420px,0.98fr)] xl:grid-cols-[1.1fr_minmax(460px,0.9fr)]">
      <BrandPanel />

      <main className="relative flex items-center justify-center px-4 py-8 sm:px-8 lg:py-12">
        <div className="absolute right-4 top-4 flex items-center gap-2 lg:right-6 lg:top-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[420px] animate-fade-up">
          <Link
            href={isSignUp ? "/login" : "/signup"}
            className="mb-8 inline-flex lg:hidden"
            aria-label="Quantix home"
          >
            <Logo />
          </Link>

          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-[30px]">
            {title}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{subtitle}</p>

          <div className="mt-7">{children}</div>

          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

function BrandPanel() {
  const { coins } = useLiveMarket();
  const featured = coins.slice(0, 4);

  return (
    <aside className="relative hidden overflow-hidden border-r border-border bg-sidebar lg:flex lg:flex-col lg:justify-between">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(900px 520px at 18% -8%, var(--accent-glow), transparent 62%), radial-gradient(700px 420px at 105% 108%, color-mix(in oklab, var(--accent-2) 16%, transparent), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(600px 400px at 30% 20%, black, transparent 75%)",
        }}
      />

      <div className="relative p-10 xl:p-14">
        <Logo size={34} />
      </div>

      <div className="relative px-10 xl:px-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
          The trading platform
        </p>
        <h2 className="mt-4 max-w-md text-[34px] font-semibold leading-[1.12] tracking-tight text-foreground xl:text-[40px]">
          Trade with a team that watches every deposit.
        </h2>
        <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-muted">
          Quantix pairs live market intelligence with a real operations console: your manual
          deposits are reviewed, matched and credited by an administrator — not by a black box.
        </p>

        <ul className="mt-9 max-w-md space-y-5">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title} className="flex gap-3.5">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent-soft text-accent">
                <item.icon className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-10 px-10 pb-10 xl:px-14 xl:pb-14">
        <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-[var(--shadow-card)] backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
              Live markets
            </p>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-positive">
              <span className="size-1.5 animate-pulse-dot rounded-full bg-positive" aria-hidden />
              Streaming
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {featured.map((coin) => (
              <div
                key={coin.id}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-fill-1 px-3 py-2.5"
              >
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: coin.color }}
                >
                  {coin.symbol.slice(0, 3)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold tabular-nums text-foreground">
                    {formatPrice(coin.price)}
                  </p>
                  <p
                    className={cn(
                      "text-[10.5px] font-medium tabular-nums",
                      coin.change24h >= 0 ? "text-positive" : "text-negative"
                    )}
                  >
                    {formatPercent(coin.change24h)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AuthSwitchHint({
  text,
  linkLabel,
  href,
  icon: Icon = ArrowRight,
}: {
  text: string;
  linkLabel: string;
  href: string;
  icon?: typeof ArrowRight;
}) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-1.5 text-[13px] text-muted">
      <Icon className="size-3.5 text-faint" aria-hidden />
      {text}
      <Link
        href={href}
        className="font-semibold text-accent underline-offset-4 transition-colors hover:underline"
      >
        {linkLabel}
      </Link>
    </p>
  );
}
