"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSettings, type ThemeName } from "@/components/providers/settings-provider";
import { cn } from "@/lib/utils";

/** Single-tap dark/light switch used in every header. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useSettings();
  const light = resolvedTheme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
      title={light ? "Switch to dark theme" : "Switch to light theme"}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-fill-2 hover:text-foreground",
        className
      )}
    >
      {light ? <Moon className="size-[17px]" aria-hidden /> : <Sun className="size-[17px]" aria-hidden />}
    </button>
  );
}

/** Three-way control (light / dark / follow system) for the settings page. */
export function ThemeSegmented({ className }: { className?: string }) {
  const { settings, setTheme } = useSettings();

  const options: { value: ThemeName; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("inline-flex items-center gap-0.5 rounded-xl border border-border bg-fill-1 p-1", className)}
    >
      {options.map((option) => {
        const active = settings.theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
              active
                ? "bg-fill-3 text-foreground shadow-[var(--shadow-soft)]"
                : "text-muted hover:text-foreground"
            )}
          >
            <option.icon className="size-3.5" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
