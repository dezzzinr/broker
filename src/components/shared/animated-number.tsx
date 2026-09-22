"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/components/providers/settings-provider";

/**
 * Tweens between numeric values with requestAnimationFrame for a subtle
 * "live ticker" feel. Honors the user's reduce-motion preference.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 650,
  className,
}: {
  value: number;
  format: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const { settings } = useSettings();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    if (settings.reduceMotion) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, settings.reduceMotion]);

  useEffect(() => {
    fromRef.current = value;
  }, [value]);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(display)}
    </span>
  );
}
