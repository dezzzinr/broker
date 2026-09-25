"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { Logo, LogoMark } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { MOBILE_TABS, navGroupsFor } from "./nav-config";
import { SearchBox } from "@/components/shared/search-box";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NotificationsMenu } from "./top-header";
import { useSession } from "@/components/providers/session-provider";
import { useWallet } from "@/components/providers/wallet-provider";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Mobile chrome: sticky top bar, slide-in drawer and a bottom tab bar. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, firstName, isAdmin, signOut, signingOut } = useSession();
  const { pendingDeposits } = useWallet();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const groups = navGroupsFor(user, { pendingDeposits });

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-drawer"
            onClick={() => setOpen((o) => !o)}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-fill-1 text-muted transition-colors hover:text-foreground"
          >
            {open ? <X className="size-[18px]" aria-hidden /> : <Menu className="size-[18px]" aria-hidden />}
          </button>

          <Link href="/dashboard" aria-label="Quantix home" className="flex min-w-0 items-center gap-2">
            <LogoMark size={24} />
            <span className="truncate text-[14px] font-semibold tracking-tight text-foreground">
              Quantix
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-0.5">
            <NotificationsMenu />
            <Link href="/settings" aria-label="Open settings" className="ml-1 block">
              <UserAvatar user={user} size={30} />
            </Link>
          </div>
        </div>

        <div className="border-t border-border/60 px-3 py-2 sm:px-4">
          <SearchBox />
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" id="mobile-drawer">
          <div
            className="absolute inset-0 animate-fade-in bg-[var(--overlay)] backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 flex w-[300px] max-w-[88vw] animate-slide-in-left flex-col border-r border-border bg-sidebar shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
              <Link href="/dashboard" aria-label="Quantix home">
                <Logo />
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-fill-2 hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="mx-4 mb-4 rounded-xl border border-border bg-elevated/70 p-3.5">
              <div className="flex items-center gap-3">
                <UserAvatar user={user} size={38} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {firstName}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-faint">{user.email}</p>
                </div>
              </div>
              {user.lastLoginAt && (
                <p className="mt-2.5 truncate text-[10.5px] text-faint">
                  Last sign-in {formatDateTime(user.lastLoginAt)}
                </p>
              )}
            </div>

            <nav
              aria-label="Mobile primary"
              className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6"
            >
              <SidebarNav groups={groups} onNavigate={() => setOpen(false)} />
            </nav>

            <div className="flex items-center gap-2 border-t border-border p-4 pb-safe">
              <ThemeToggle className="border border-border bg-fill-1" />
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex h-9 flex-1 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft text-[12.5px] font-semibold text-accent"
                >
                  Control panel
                </Link>
              )}
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={signingOut}
                className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-fill-1 text-[12.5px] font-medium text-muted transition-colors hover:bg-negative/10 hover:text-negative disabled:opacity-60"
              >
                <LogOut className="size-4" aria-hidden />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileTabBar pathname={pathname} pendingDeposits={pendingDeposits} />
    </>
  );
}

function MobileTabBar({
  pathname,
  pendingDeposits,
}: {
  pathname: string;
  pendingDeposits: number;
}) {
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/92 pb-safe backdrop-blur-xl lg:hidden"
    >
      <div className="grid grid-cols-4">
        {MOBILE_TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
                active ? "text-accent" : "text-faint hover:text-muted"
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-5 top-0 h-[2px] rounded-b-full bg-gradient-accent"
                />
              )}
              <span className="relative">
                <Icon className="size-[19px]" aria-hidden />
                {tab.href === "/deposits" && pendingDeposits > 0 && (
                  <span
                    aria-hidden
                    className="absolute -right-1.5 -top-1 flex min-w-[15px] items-center justify-center rounded-full bg-negative px-1 text-[9px] font-bold leading-[15px] text-white"
                  >
                    {pendingDeposits > 9 ? "9+" : pendingDeposits}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
