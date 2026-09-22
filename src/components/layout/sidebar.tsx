"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast-provider";
import { USER } from "@/lib/data/portfolio";

export function Sidebar() {
  const { toast } = useToast();

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
      <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-border bg-elevated/70 p-3.5">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-accent text-sm font-semibold text-white shadow-[0_0_16px_-4px_var(--accent-glow)]"
        >
          J
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">
            Welcome Back, {USER.name}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-faint">Last login: {USER.lastLogin}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-4">
        <SidebarNav />
      </div>

      {/* Upgrade card */}
      <div className="p-4">
        <div className="relative overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-br from-accent-soft to-transparent p-4">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-8 size-20 rounded-full bg-accent/20 blur-2xl"
          />
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-accent" aria-hidden />
            <p className="text-[13px] font-semibold text-foreground">Quantix Pro</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Unlock real-time AI signals, custom alerts & unlimited history.
          </p>
          <Button
            size="sm"
            className="mt-3 w-full"
            onClick={() =>
              toast({
                title: "Pro plan is part of the demo",
                description: "Plan upgrades are simulated in this preview build.",
                variant: "info",
              })
            }
          >
            Upgrade
          </Button>
        </div>
      </div>
    </aside>
  );
}
