"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, type NavItem } from "./nav-config";
import { cn } from "@/lib/utils";

function NavItemLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-xl border px-3 text-[13px] font-medium transition-all duration-200",
        active
          ? "border-accent/25 bg-white/[0.06] text-foreground shadow-[0_0_20px_-8px_var(--accent-glow),inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "border-transparent text-muted hover:bg-white/[0.04] hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "size-[17px] shrink-0 transition-colors",
          active ? "text-accent" : "text-faint group-hover:text-muted"
        )}
        aria-hidden
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
          {item.badge}
        </span>
      )}
      {item.count !== undefined && (
        <span className="flex min-w-[18px] items-center justify-center rounded-full bg-negative/15 px-1.5 py-0.5 text-[10px] font-semibold text-negative">
          {item.count}
        </span>
      )}
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-col gap-6">
      {NAV_GROUPS.map((group, gi) => (
        <div key={`${group.label}-${gi}`}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavItemLink
                key={item.label}
                item={item}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
