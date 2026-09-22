"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/** Original Quantix mark — an abstract geometric "Q" (diamond, tail, core). */
export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <path
        d="M16 3.5L26.5 16 16 28.5 5.5 16 16 3.5Z"
        stroke={`url(#${id})`}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M20 20L26.5 26.5" stroke={`url(#${id})`} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.4" fill={`url(#${id})`} />
    </svg>
  );
}

export function Logo({
  size = 30,
  showTagline = true,
  className,
}: {
  size?: number;
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">Quantix</span>
        {showTagline && (
          <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.16em] text-faint">
            AI-Powered Trading
          </span>
        )}
      </span>
    </span>
  );
}
