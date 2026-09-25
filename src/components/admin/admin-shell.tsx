"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LogOut, Menu, X } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { adminNavGroups } from "@/components/layout/nav-config";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AccountMenu, NotificationsMenu } from "@/components/layout/top-header";
import { useSession } from "@/components/providers/session-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Administrator console shell — its own navigation, branding and mobile chrome
 * so operators never confuse the control panel with the trader app.
 */
export function AdminShell({
  children,
  pending,
}: {
  children: ReactNode;
  pending: number;
}) {
  const pathname = usePathname();
  const { user, signOut, signingOut } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const groups = adminNavGroups({ pending });

  return (
    <div className="min-h-dvh">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-elevated focus:px-4 focus:py-2 focus:text-sm focus:text-foreground"
      >
        Skip to console
      </a>

      {/* Desktop sidebar */}
      <aside
        aria-label="Admin navigation"
        className="fixed inset-y-0 left-0 z-40 hidden w-[258px] flex-col border-r border-border bg-sidebar lg:flex"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-5">
          <LogoMark size={30} />
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              Quantix
            </span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-accent">
              Control panel
            </span>
          </span>
        </div>

        <div className="mx-4 mt-4 mb-4 flex items-center gap-3 rounded-xl border border-accent/25 bg-accent-soft p-3">
          <UserAvatar user={user} size={38} />
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold text-foreground">{user.name}</p>
            <p className="mt-0.5 truncate text-[10.5px] font-medium uppercase tracking-wide text-accent">
              Administrator
            </p>
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-4">
          <SidebarNav groups={groups} />
        </div>

        <div className="space-y-2 border-t border-border p-4">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "w-full justify-center"
            )}
          >
            <LayoutGrid className="size-4" aria-hidden />
            View trader app
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="flex h-8 w-full items-center justify-center gap-2 rounded-lg text-[12.5px] font-medium text-faint transition-colors hover:bg-negative/10 hover:text-negative disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-xl sm:px-4 lg:hidden">
        <button
          type="button"
          aria-label={open ? "Close console menu" : "Open console menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-fill-1 text-muted"
        >
          {open ? <X className="size-[18px]" aria-hidden /> : <Menu className="size-[18px]" aria-hidden />}
        </button>
        <span className="flex min-w-0 items-center gap-2">
          <LogoMark size={22} />
          <span className="truncate text-[13.5px] font-semibold text-foreground">
            Control panel
          </span>
        </span>
        <span className="ml-auto flex items-center gap-0.5">
          <NotificationsMenu />
          <AccountMenu />
        </span>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-[var(--overlay)] backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Console navigation"
            className="absolute inset-y-0 left-0 flex w-[290px] max-w-[88vw] animate-slide-in-left flex-col border-r border-border bg-sidebar shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
              <span className="flex items-center gap-2.5">
                <LogoMark size={26} />
                <span className="flex flex-col leading-none">
                  <span className="text-[14px] font-semibold text-foreground">Quantix</span>
                  <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-accent">
                    Control panel
                  </span>
                </span>
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-fill-2 hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-accent/25 bg-accent-soft p-3">
              <UserAvatar user={user} size={34} />
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold text-foreground">{user.name}</p>
                <p className="truncate text-[10.5px] text-muted">{user.email}</p>
              </div>
            </div>

            <nav className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6">
              <SidebarNav groups={groups} onNavigate={() => setOpen(false)} />
            </nav>

            <div className="flex items-center gap-2 border-t border-border p-4 pb-safe">
              <ThemeToggle className="border border-border bg-fill-1" />
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-fill-1 text-[12.5px] font-semibold text-muted"
              >
                Trader app
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-fill-1 text-[12.5px] font-medium text-muted hover:bg-negative/10 hover:text-negative"
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-dvh flex-col lg:pl-[258px]">
        <div className="sticky top-0 z-30 hidden h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-xl lg:flex">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent">
              <LayoutGrid className="size-3" aria-hidden />
              Admin
            </span>
            <AdminBreadcrumb pathname={pathname} groups={groups} />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              <LayoutGrid className="size-4" aria-hidden />
              Trader app
            </Link>
            <ThemeToggle />
            <NotificationsMenu />
            <AccountMenu />
          </div>
        </div>

        <main
          id="admin-content"
          className="mx-auto w-full max-w-[1500px] flex-1 px-3 pb-10 pt-4 sm:px-5 lg:px-8 lg:pt-7"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminBreadcrumb({
  pathname,
  groups,
}: {
  pathname: string;
  groups: ReturnType<typeof adminNavGroups>;
}) {
  const match = groups
    .flatMap((g) => g.items.map((item) => ({ group: g.label, item })))
    .find(({ item }) =>
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname === item.href || pathname.startsWith(`${item.href}/`)
    );

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
      <Link href="/admin" className="text-muted transition-colors hover:text-foreground">
        Console
      </Link>
      <span className="text-faint" aria-hidden>
        /
      </span>
      {match && <span className="hidden text-muted sm:inline">{match.group}</span>}
      {match && (
        <span className="hidden text-faint sm:inline" aria-hidden>
          /
        </span>
      )}
      <span aria-current="page" className="truncate font-medium text-foreground">
        {match?.item.label ?? "Overview"}
      </span>
    </nav>
  );
}
