"use client";

import type { CSSProperties } from "react";
import { Check, Monitor, Moon, Palette, Sun, Waves } from "lucide-react";
import {
  ACCENT_CHOICES,
  useSettings,
  type AccentName,
  type ThemeName,
} from "@/components/providers/settings-provider";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const THEMES: { value: ThemeName; label: string; icon: typeof Moon; hint: string }[] = [
  { value: "dark", label: "Dark", icon: Moon, hint: "Low-light trading floor" },
  { value: "light", label: "Light", icon: Sun, hint: "Bright, high contrast" },
  { value: "system", label: "System", icon: Monitor, hint: "Follows your device" },
];

/** Theme, accent colour and motion preferences — stored on this device. */
export function AppearancePanel() {
  const { settings, update, resolvedTheme } = useSettings();

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-accent" aria-hidden />
          <h2 className="text-[14px] font-semibold text-foreground">Appearance</h2>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Theme and accent are applied instantly and remembered on this device.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {THEMES.map(({ value, label, icon: Icon, hint }) => {
            const active = settings.theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => update({ theme: value })}
                aria-pressed={active}
                className={cn(
                  "group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-200",
                  active
                    ? "border-accent/50 bg-accent-soft shadow-[0_0_0_1px_var(--accent-border)]"
                    : "border-border bg-fill-1 hover:border-border-strong hover:bg-fill-2"
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg border",
                      active
                        ? "border-accent/40 bg-accent/15 text-accent"
                        : "border-border bg-elevated text-muted group-hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {active && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-accent text-on-accent">
                      <Check className="size-3" aria-hidden />
                    </span>
                  )}
                </span>
                <span className="mt-2.5 block text-[12.5px] font-semibold text-foreground">
                  {label}
                </span>
                <span className="mt-0.5 block text-[11px] text-faint">{hint}</span>

                {/* Mini preview strip */}
                <span
                  aria-hidden
                  className={cn(
                    "mt-3 flex h-8 gap-1 rounded-lg border border-border p-1",
                    value === "light" || (value === "system" && resolvedTheme === "light")
                      ? "bg-[hsl(240_20%_98%)]"
                      : "bg-[hsl(240_12%_8%)]"
                  )}
                >
                  <span className="flex-1 rounded bg-positive/70" />
                  <span className="flex-1 rounded bg-negative/70" />
                  <span
                    className="flex-1 rounded"
                    style={{ background: "var(--accent)", opacity: 0.85 }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-[11.5px] text-faint">
          Currently rendering the <span className="text-muted">{resolvedTheme}</span> theme
          {settings.theme === "system" ? " (following your system preference)" : ""}.
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Waves className="size-4 text-accent" aria-hidden />
          <h2 className="text-[14px] font-semibold text-foreground">Accent colour</h2>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Eight accent palettes recolour buttons, links, charts and glows across the whole app.
        </p>

        <div className="mt-4 grid grid-cols-4 gap-2.5 sm:grid-cols-8">
          {ACCENT_CHOICES.map((accent) => {
            const active = settings.accent === accent.value;
            return (
              <button
                key={accent.value}
                type="button"
                onClick={() => update({ accent: accent.value as AccentName })}
                aria-pressed={active}
                aria-label={`${accent.label} accent`}
                className={cn(
                  "group flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all duration-200",
                  active
                    ? "border-accent/50 bg-accent-soft"
                    : "border-border bg-fill-1 hover:border-border-strong hover:bg-fill-2"
                )}
              >
                <span
                  className="flex size-8 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-card transition-transform duration-200 group-hover:scale-105"
                  style={{ background: accent.swatch, "--tw-ring-color": accent.swatch } as CSSProperties}
                >
                  {active && <Check className="size-4 text-white drop-shadow" aria-hidden />}
                </span>
                <span
                  className={cn(
                    "text-[10.5px] font-medium",
                    active ? "text-foreground" : "text-faint"
                  )}
                >
                  {accent.label}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-6 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground">Reduce motion</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Disables chart animations, pulses and transitions. Helpful for motion sensitivity or
              slow devices.
            </p>
          </div>
          <Switch
            ariaLabel="Reduce motion"
            checked={settings.reduceMotion}
            onCheckedChange={(v) => update({ reduceMotion: v })}
          />
        </div>
      </Card>
    </div>
  );
}
