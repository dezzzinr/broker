import { cn } from "@/lib/utils";

/** Small pulsing status dot used for live indicators. */
export function GlowDot({
  color = "var(--accent)",
  className,
  pulse = true,
}: {
  color?: string;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span className={cn("relative inline-flex size-2", className)} aria-hidden>
      {pulse && (
        <span
          className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
          style={{ backgroundColor: color, animationDuration: "2.2s" }}
        />
      )}
      <span
        className="relative inline-flex size-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px 1px ${color}` }}
      />
    </span>
  );
}
