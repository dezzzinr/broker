"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

export type AccentName =
  | "violet"
  | "blue"
  | "emerald"
  | "teal"
  | "cyan"
  | "amber"
  | "rose"
  | "fuchsia";
export type ThemeName = "dark" | "light" | "system";
export type OrderTypePref = "market" | "limit";

export interface AppSettings {
  accent: AccentName;
  theme: ThemeName;
  reduceMotion: boolean;
  defaultOrderType: OrderTypePref;
  slippage: number;
  confirmOrders: boolean;
  notifications: {
    priceAlerts: boolean;
    orderFills: boolean;
    weeklyDigest: boolean;
    productNews: boolean;
    depositUpdates: boolean;
  };
  twoFactor: boolean;
  profile: { name: string; email: string; phone: string; country: string };
}

export const ACCENT_CHOICES: { value: AccentName; label: string; swatch: string }[] = [
  { value: "violet", label: "Violet", swatch: "#8B5CF6" },
  { value: "blue", label: "Azure", swatch: "#4F8CFF" },
  { value: "emerald", label: "Emerald", swatch: "#2DD4A7" },
  { value: "teal", label: "Teal", swatch: "#14B8A6" },
  { value: "cyan", label: "Cyan", swatch: "#22D3EE" },
  { value: "amber", label: "Amber", swatch: "#F59E0B" },
  { value: "rose", label: "Rose", swatch: "#FB5D78" },
  { value: "fuchsia", label: "Fuchsia", swatch: "#D946EF" },
];

export const DEFAULT_SETTINGS: AppSettings = {
  accent: "violet",
  theme: "dark",
  reduceMotion: false,
  defaultOrderType: "limit",
  slippage: 0.5,
  confirmOrders: true,
  notifications: {
    priceAlerts: true,
    orderFills: true,
    weeklyDigest: false,
    productNews: true,
    depositUpdates: true,
  },
  twoFactor: false,
  profile: { name: "", email: "", phone: "", country: "" },
};

interface SettingsApi {
  settings: AppSettings;
  hydrated: boolean;
  /** Resolved theme after applying the "system" preference. */
  resolvedTheme: "dark" | "light";
  update: (patch: Partial<AppSettings>) => void;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  updateNotification: (key: keyof AppSettings["notifications"], value: boolean) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsApi | null>(null);

const STORAGE_KEY = "quantix:settings";

function systemPrefersLight(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

/** Applies theme/accent/motion to <html> — also used by the pre-paint script. */
export function applyAppearance(
  root: HTMLElement,
  settings: Pick<AppSettings, "theme" | "accent" | "reduceMotion">
) {
  const resolved =
    settings.theme === "system" ? (systemPrefersLight() ? "light" : "dark") : settings.theme;
  root.dataset.theme = resolved;
  root.dataset.accent = settings.accent;
  root.dataset.motion = settings.reduceMotion ? "reduced" : "full";
  root.style.colorScheme = resolved;
  return resolved;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings, hydrated] = useLocalStorage<AppSettings>(
    STORAGE_KEY,
    DEFAULT_SETTINGS
  );

  const merged = useMemo<AppSettings>(
    () => ({
      ...DEFAULT_SETTINGS,
      ...settings,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...settings.notifications },
      profile: { ...DEFAULT_SETTINGS.profile, ...settings.profile },
    }),
    [settings]
  );

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  const update = useCallback(
    (patch: Partial<AppSettings>) =>
      setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...patch })),
    [setSettings]
  );

  const updateNotification = useCallback(
    (key: keyof AppSettings["notifications"], value: boolean) =>
      setSettings((prev) => ({
        ...DEFAULT_SETTINGS,
        ...prev,
        notifications: { ...prev.notifications, [key]: value },
      })),
    [setSettings]
  );

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [setSettings]);

  // Apply appearance prefs to <html> (post-commit, CSR only)
  useEffect(() => {
    const root = document.documentElement;
    const resolved = applyAppearance(root, merged);
    setResolvedTheme(resolved);
    window.dispatchEvent(new CustomEvent("quantix:themechange", { detail: resolved }));
  }, [merged.theme, merged.accent, merged.reduceMotion, merged]);

  // Follow OS changes while in "system" mode
  useEffect(() => {
    if (merged.theme !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const resolved = applyAppearance(document.documentElement, merged);
      setResolvedTheme(resolved);
      window.dispatchEvent(new CustomEvent("quantix:themechange", { detail: resolved }));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [merged]);

  const setTheme = useCallback((theme: ThemeName) => update({ theme }), [update]);
  const toggleTheme = useCallback(
    () => update({ theme: resolvedTheme === "dark" ? "light" : "dark" }),
    [update, resolvedTheme]
  );

  const api = useMemo(
    () => ({
      settings: merged,
      hydrated,
      resolvedTheme,
      update,
      setTheme,
      toggleTheme,
      updateNotification,
      reset,
    }),
    [merged, hydrated, resolvedTheme, update, setTheme, toggleTheme, updateNotification, reset]
  );

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
