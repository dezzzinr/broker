"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

export type AccentName = "violet" | "blue" | "emerald" | "amber";
export type OrderTypePref = "market" | "limit";

export interface AppSettings {
  accent: AccentName;
  reduceMotion: boolean;
  defaultOrderType: OrderTypePref;
  slippage: number;
  confirmOrders: boolean;
  notifications: {
    priceAlerts: boolean;
    orderFills: boolean;
    weeklyDigest: boolean;
    productNews: boolean;
  };
  twoFactor: boolean;
  profile: { name: string; email: string };
}

export const DEFAULT_SETTINGS: AppSettings = {
  accent: "violet",
  reduceMotion: false,
  defaultOrderType: "limit",
  slippage: 0.5,
  confirmOrders: true,
  notifications: {
    priceAlerts: true,
    orderFills: true,
    weeklyDigest: false,
    productNews: true,
  },
  twoFactor: false,
  profile: { name: "Jason Moreau", email: "jason@quantix.app" },
};

interface SettingsApi {
  settings: AppSettings;
  hydrated: boolean;
  update: (patch: Partial<AppSettings>) => void;
  updateNotification: (key: keyof AppSettings["notifications"], value: boolean) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsApi | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings, hydrated] = useLocalStorage<AppSettings>(
    "quantix:settings",
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

  const update = (patch: Partial<AppSettings>) =>
    setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, ...patch }));

  const updateNotification = (key: keyof AppSettings["notifications"], value: boolean) =>
    setSettings((prev) => ({
      ...DEFAULT_SETTINGS,
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));

  const reset = () => setSettings(DEFAULT_SETTINGS);

  // Apply appearance prefs to <html> (post-commit, CSR only)
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = merged.accent;
    root.dataset.motion = merged.reduceMotion ? "reduced" : "full";
  }, [merged.accent, merged.reduceMotion]);

  return (
    <SettingsContext.Provider value={{ settings: merged, hydrated, update, updateNotification, reset }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
