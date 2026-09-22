"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * localStorage-backed state with SSR-safe lazy hydration.
 * The first render always uses `initial`; the stored value is applied
 * after mount so server and client markup never diverge.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // corrupted or unavailable storage — keep initial
    }
    setHydrated(true);
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // storage full/blocked — state still updates in memory
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, set, hydrated] as const;
}
