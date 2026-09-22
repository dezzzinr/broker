"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { SearchBox } from "@/components/shared/search-box";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-drawer"
          onClick={() => setOpen((o) => !o)}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white/[0.03] text-muted transition-colors hover:text-foreground"
        >
          {open ? <X className="size-4.5 size-[18px]" aria-hidden /> : <Menu className="size-[18px]" aria-hidden />}
        </button>
        <SearchBox className="flex-1" />
        <Link
          href="/settings"
          aria-label="Open settings"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-accent text-xs font-semibold text-white"
        >
          J
        </Link>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" id="mobile-drawer">
          <div
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className={cn(
              "absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-border bg-sidebar shadow-2xl",
              "animate-slide-in-left"
            )}
          >
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
              <Link href="/dashboard" aria-label="Quantix home">
                <Logo />
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-border bg-elevated/70 p-3.5">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-accent text-xs font-semibold text-white"
              >
                J
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-foreground">Welcome Back, Jason</p>
                <p className="mt-0.5 truncate text-[11px] text-faint">Last login: 15 Jun 2025</p>
              </div>
            </div>
            <nav aria-label="Mobile primary" className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
