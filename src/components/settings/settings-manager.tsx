"use client";

import { useState } from "react";
import {
  Bell,
  Gauge,
  KeyRound,
  Monitor,
  Palette,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useSession } from "@/components/providers/session-provider";
import { AppearancePanel } from "./appearance-panel";
import { ProfilePanel } from "./profile-panel";
import { SecurityPanel } from "./security-panel";
import { PreferencesPanel } from "./preferences-panel";
import { cn } from "@/lib/utils";

type TabKey = "profile" | "appearance" | "security" | "trading";

const TABS: { key: TabKey; label: string; icon: LucideIcon; hint: string }[] = [
  { key: "profile", label: "Profile", icon: UserRound, hint: "Name, contact details and verification" },
  { key: "appearance", label: "Appearance", icon: Palette, hint: "Theme, accent colour and motion" },
  { key: "security", label: "Security", icon: KeyRound, hint: "Password and active sessions" },
  { key: "trading", label: "Trading & alerts", icon: Gauge, hint: "Order defaults and notifications" },
];

const MOBILE_ICONS: Record<TabKey, LucideIcon> = {
  profile: UserRound,
  appearance: Palette,
  security: KeyRound,
  trading: Bell,
};

/** Settings shell: a sticky section rail on desktop, scrollable tabs on mobile. */
export function SettingsManager() {
  const { user, isAdmin } = useSession();
  const [tab, setTab] = useState<TabKey>("profile");
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const MobileIcon = MOBILE_ICONS[tab];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={`Manage ${user.name.split(" ")[0]}'s account, appearance and trading defaults.`}
        actions={
          isAdmin ? (
            <a
              href="/admin"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-4 text-[13px] font-medium text-accent transition-colors hover:border-accent/50"
            >
              <Monitor className="size-4" aria-hidden />
              Admin console
            </a>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        {/* Section rail */}
        <nav
          aria-label="Settings sections"
          className="lg:sticky lg:top-24"
        >
          {/* Mobile: horizontal tabs */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-current={tab === key}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors",
                  tab === key
                    ? "border-accent/40 bg-accent-soft text-accent"
                    : "border-border bg-fill-1 text-muted"
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {/* Desktop: vertical rail */}
          <ul className="hidden gap-1 lg:flex lg:flex-col">
            {TABS.map(({ key, label, icon: Icon, hint }) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setTab(key)}
                  aria-current={tab === key}
                  className={cn(
                    "group flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                    tab === key
                      ? "border-accent/40 bg-accent-soft"
                      : "border-transparent hover:border-border hover:bg-fill-1"
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      tab === key ? "text-accent" : "text-muted group-hover:text-foreground"
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-[12.5px] font-medium",
                        tab === key ? "text-foreground" : "text-muted group-hover:text-foreground"
                      )}
                    >
                      {label}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] leading-snug text-faint">
                      {hint}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Panel */}
        <section aria-labelledby="settings-panel-title" className="min-w-0 max-w-3xl">
          <h2 id="settings-panel-title" className="sr-only">
            {active.label}
          </h2>
          <div className="mb-4 flex items-center gap-2 lg:hidden">
            <MobileIcon className="size-4 text-accent" aria-hidden />
            <p className="text-[12.5px] font-semibold text-foreground">{active.label}</p>
            <p className="text-[11px] text-faint">· {active.hint}</p>
          </div>

          {tab === "profile" && <ProfilePanel />}
          {tab === "appearance" && <AppearancePanel />}
          {tab === "security" && <SecurityPanel />}
          {tab === "trading" && <PreferencesPanel />}
        </section>
      </div>
    </div>
  );
}
