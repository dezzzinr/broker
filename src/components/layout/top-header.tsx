"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ChevronRight,
  Home,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Settings as SettingsIcon,
  User as UserIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { SearchBox } from "@/components/shared/search-box";
import { UserAvatar } from "@/components/shared/user-avatar";
import { DropdownMenu, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown-menu";
import { useSession } from "@/components/providers/session-provider";
import { findNavItem } from "./nav-config";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { timeAgo } from "@/lib/format";
import type { AppNotification } from "@/lib/types/platform";
import { cn } from "@/lib/utils";

function Breadcrumbs() {
  const pathname = usePathname();
  const found = findNavItem(pathname);
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
      <Link
        href="/dashboard"
        aria-label="Home"
        className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-fill-2 hover:text-foreground"
      >
        <Home className="size-4" aria-hidden />
      </Link>
      <ChevronRight className="size-3.5 shrink-0 text-faint" aria-hidden />
      {found ? (
        <>
          <span className="hidden text-muted sm:inline">{found.group.label}</span>
          <span className="hidden text-faint sm:inline" aria-hidden>/</span>
          <span aria-current="page" className="truncate font-medium text-foreground">
            {found.item.label}
          </span>
        </>
      ) : (
        <span aria-current="page" className="font-medium text-foreground">
          Quantix
        </span>
      )}
    </nav>
  );
}

const KIND_DOT: Record<AppNotification["kind"], string> = {
  info: "bg-info",
  success: "bg-positive",
  warning: "bg-warning",
  error: "bg-negative",
};

export function NotificationsMenu() {
  const router = useRouter();
  const { unreadNotifications, setUnread } = useSession();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ notifications: AppNotification[]; unread: number }>(
        "/api/notifications"
      );
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      /* the bell simply stays empty */
    } finally {
      setLoading(false);
    }
  }, [setUnread]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 45_000);
    return () => clearInterval(interval);
  }, [load]);

  const markAll = async () => {
    try {
      const data = await api<{ unread: number }>("/api/notifications", {
        method: "POST",
        body: { all: true },
      });
      setUnread(data.unread);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* ignore */
    }
  };

  return (
    <DropdownMenu
      ariaLabel="Notifications"
      trigger={
        <span className="relative flex size-9 items-center justify-center">
          <Bell className="size-[17px]" aria-hidden />
          {unreadNotifications > 0 && (
            <>
              <span
                className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-negative shadow-[0_0_6px_var(--negative)]"
                aria-hidden
              />
              <span className="sr-only">{unreadNotifications} unread notifications</span>
            </>
          )}
        </span>
      }
      contentClassName="w-[330px]"
    >
      {(close) => (
        <>
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
              Notifications
            </p>
            {unreadNotifications > 0 && (
              <button
                type="button"
                onClick={() => void markAll()}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent-soft"
              >
                <Check className="size-3" aria-hidden />
                Mark all read
              </button>
            )}
          </div>

          {loading && items.length === 0 ? (
            <p className="px-2.5 py-6 text-center text-xs text-faint">Loading notifications…</p>
          ) : items.length === 0 ? (
            <p className="px-2.5 py-6 text-center text-xs text-faint">
              You are all caught up.
            </p>
          ) : (
            <div className="no-scrollbar max-h-[320px] overflow-y-auto">
              {items.map((n) => (
                <DropdownItem
                  key={n.id}
                  className={cn("items-start", !n.read && "bg-accent-soft/40")}
                  onClick={async () => {
                    close();
                    if (!n.read) {
                      try {
                        const data = await api<{ unread: number }>("/api/notifications", {
                          method: "POST",
                          body: { id: n.id },
                        });
                        setUnread(data.unread);
                        setItems((prev) =>
                          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
                        );
                      } catch {
                        /* ignore */
                      }
                    }
                    router.push(n.href ?? "/support");
                  }}
                >
                  <span
                    className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", KIND_DOT[n.kind])}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-foreground">{n.title}</span>
                    {n.body && (
                      <span className="mt-0.5 block line-clamp-2 text-[11px] leading-relaxed text-muted">
                        {n.body}
                      </span>
                    )}
                    <span className="mt-0.5 block text-[10px] text-faint">
                      {timeAgo(new Date(n.createdAt))}
                    </span>
                  </span>
                </DropdownItem>
              ))}
            </div>
          )}

          <DropdownSeparator />
          <DropdownItem
            onClick={() => {
              close();
              router.push("/support");
            }}
          >
            <LifeBuoy className="size-4" aria-hidden />
            Help &amp; support
          </DropdownItem>
        </>
      )}
    </DropdownMenu>
  );
}

export function AccountMenu() {
  const router = useRouter();
  const { user, signOut, signingOut, isAdmin } = useSession();

  return (
    <DropdownMenu
      ariaLabel="Account menu"
      trigger={<UserAvatar user={user} size={32} />}
      contentClassName="w-[240px]"
    >
      {(close) => (
        <>
          <div className="px-2.5 py-2">
            <p className="truncate text-[13px] font-medium text-foreground">{user.name}</p>
            <p className="truncate text-[11px] text-faint">{user.email}</p>
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-fill-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {isAdmin ? "Administrator" : "Trader"}
            </p>
          </div>
          <DropdownSeparator />
          <DropdownItem
            onClick={() => {
              close();
              router.push("/settings");
            }}
          >
            <UserIcon className="size-4" aria-hidden />
            Profile &amp; security
          </DropdownItem>
          <DropdownItem
            onClick={() => {
              close();
              router.push("/wallet");
            }}
          >
            <SettingsIcon className="size-4" aria-hidden />
            Wallet settings
          </DropdownItem>
          {isAdmin && (
            <DropdownItem
              onClick={() => {
                close();
                router.push("/admin");
              }}
            >
              <LayoutGrid className="size-4" aria-hidden />
              Control panel
            </DropdownItem>
          )}
          <DropdownItem
            onClick={() => {
              close();
              router.push("/support");
            }}
          >
            <LifeBuoy className="size-4" aria-hidden />
            Help &amp; support
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            className="text-negative hover:bg-negative/10 hover:text-negative"
            disabled={signingOut}
            onClick={() => {
              close();
              void signOut();
            }}
          >
            <LogOut className="size-4" aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </DropdownItem>
        </>
      )}
    </DropdownMenu>
  );
}

export function TopHeader() {
  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-xl lg:flex">
      <Breadcrumbs />
      <div className="flex items-center gap-2">
        <SearchBox />
        <ThemeToggle />
        <NotificationsMenu />
        <AccountMenu />
      </div>
    </header>
  );
}

export function HeaderActions({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <ThemeToggle />
      <NotificationsMenu />
      <AccountMenu />
    </div>
  );
}
