"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownToLine, LayoutGrid, LogOut, ShieldCheck } from "lucide-react";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { navGroupsFor } from "./nav-config";
import { UserAvatar } from "@/components/shared/user-avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/providers/session-provider";
import { useWallet } from "@/components/providers/wallet-provider";
import { formatDateTime } from "@/lib/format";

export function Sidebar() {
  const { user, firstName, signOut, signingOut, isAdmin, pendingReviews } = useSession();
  const { pendingDeposits } = useWallet();
  const pathname = usePathname();

  const groups = navGroupsFor(user, { pendingDeposits });

  return (
    <aside
      aria-label="Sidebar"
      className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col border-r border-border bg-sidebar lg:flex"
    >
      {/* Brand */}
      <div className="px-5 pb-5 pt-6">
        <Link href="/dashboard" aria-label="Quantix home" className="inline-flex rounded-lg">
          <Logo />
        </Link>
      </div>

      {/* Profile */}
      <div className="mx-4 mb-4 rounded-xl border border-border bg-elevated/70 p-3.5">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">
              Welcome back, {firstName}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-faint">{user.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={
              isAdmin
                ? "inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent"
                : "inline-flex items-center gap-1 rounded-full border border-border bg-fill-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted"
            }
          >
            {isAdmin && <ShieldCheck className="size-3" aria-hidden />}
            {isAdmin ? "Administrator" : user.kycStatus === "verified" ? "Verified" : "Trader"}
          </span>
          {user.lastLoginAt && (
            <span className="truncate text-[10px] text-faint">
              {formatDateTime(user.lastLoginAt)}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-4">
        <SidebarNav groups={groups} />
      </div>

      {/* Funding call to action */}
      <div className="p-4">
        <div className="relative overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-br from-accent-soft to-transparent p-4">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-8 size-20 rounded-full bg-accent/20 blur-2xl"
          />
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="size-3.5 text-accent" aria-hidden />
            <p className="text-[13px] font-semibold text-foreground">Fund your account</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Choose a payment method, transfer the amount and upload your proof of payment. Our team
            reviews and credits it.
          </p>
          <Link href="/deposits" className={cn(buttonVariants({ size: "sm" }), "mt-3 w-full")}>
            Make a deposit
          </Link>
        </div>

        {isAdmin && (
          <Link
            href="/admin"
            className={
              pathname.startsWith("/admin")
                ? "mt-3 flex h-9 items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent-soft text-[12.5px] font-semibold text-accent"
                : "mt-3 flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-fill-1 text-[12.5px] font-semibold text-muted transition-colors hover:bg-fill-2 hover:text-foreground"
            }
          >
            <LayoutGrid className="size-4" aria-hidden />
            Control panel
            {pendingReviews > 0 && (
              <span className="ml-auto rounded-full bg-negative/15 px-1.5 text-[10px] font-semibold tabular-nums text-negative">
                {pendingReviews}
              </span>
            )}
          </Link>
        )}

        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl text-[12.5px] font-medium text-faint transition-colors hover:bg-negative/10 hover:text-negative disabled:opacity-60"
        >
          <LogOut className="size-4" aria-hidden />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
