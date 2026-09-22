"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Home,
  LifeBuoy,
  LogOut,
  User,
} from "lucide-react";
import { SearchBox } from "@/components/shared/search-box";
import { DropdownMenu, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/providers/toast-provider";
import { findNavItem } from "./nav-config";

function Breadcrumbs() {
  const pathname = usePathname();
  const found = findNavItem(pathname);
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
      <Link
        href="/dashboard"
        aria-label="Home"
        className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
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

export function TopHeader() {
  const { toast } = useToast();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-xl lg:flex">
      <Breadcrumbs />
      <div className="flex items-center gap-2.5">
        <SearchBox />
        <DropdownMenu
          ariaLabel="Notifications"
          trigger={
            <span className="relative flex size-9 items-center justify-center">
              <Bell className="size-[17px]" aria-hidden />
              <span
                className="absolute right-2 top-2 size-1.5 rounded-full bg-negative shadow-[0_0_6px_var(--negative)]"
                aria-hidden
              />
              <span className="sr-only">2 unread notifications</span>
            </span>
          }
          contentClassName="w-[300px]"
        >
          {(close) => (
            <>
              <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
                Notifications
              </p>
              <DropdownItem
                onClick={() => {
                  close();
                  router.push("/support");
                }}
                className="items-start"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-negative" aria-hidden />
                <span>
                  <span className="block text-xs font-medium text-foreground">
                    Maintenance window on Sunday
                  </span>
                  <span className="text-[11px] text-faint">Analytics engine upgrade · 2 days ago</span>
                </span>
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  close();
                  router.push("/support");
                }}
                className="items-start"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-negative" aria-hidden />
                <span>
                  <span className="block text-xs font-medium text-foreground">
                    New beta: correlation matrix
                  </span>
                  <span className="text-[11px] text-faint">Available in Analytics · 4 days ago</span>
                </span>
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                onClick={() => {
                  close();
                  router.push("/support");
                }}
              >
                <LifeBuoy className="size-4" aria-hidden />
                View all in Support
              </DropdownItem>
            </>
          )}
        </DropdownMenu>
        <DropdownMenu
          ariaLabel="Account menu"
          trigger={
            <span className="flex size-9 items-center justify-center rounded-full bg-gradient-accent text-xs font-semibold text-white ring-1 ring-accent/40 transition-shadow hover:shadow-[0_0_16px_-4px_var(--accent-glow)]">
              J
            </span>
          }
          contentClassName="w-[220px]"
        >
          {(close) => (
            <>
              <div className="px-2.5 py-2">
                <p className="text-[13px] font-medium text-foreground">Jason Moreau</p>
                <p className="text-[11px] text-faint">jason@quantix.app</p>
              </div>
              <DropdownSeparator />
              <DropdownItem
                onClick={() => {
                  close();
                  router.push("/settings");
                }}
              >
                <User className="size-4" aria-hidden />
                Profile settings
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  close();
                  router.push("/support");
                }}
              >
                <LifeBuoy className="size-4" aria-hidden />
                Help & support
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                className="text-negative hover:bg-negative/10 hover:text-negative"
                onClick={() => {
                  close();
                  toast({
                    title: "Signed out (demo)",
                    description: "Authentication is simulated in this preview build.",
                    variant: "info",
                  });
                }}
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </DropdownItem>
            </>
          )}
        </DropdownMenu>
      </div>
    </header>
  );
}
