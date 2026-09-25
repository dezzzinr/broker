import { cn } from "@/lib/utils";
import type { PublicUser } from "@/lib/types/platform";

/** Initials for a display name: "Amara Okafor" → "AO". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Q";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar derived from the account's stored hue, so every user keeps a stable,
 * distinct colour across the app and the admin console.
 */
export function UserAvatar({
  user,
  size = 36,
  className,
  ring = true,
}: {
  user: Pick<PublicUser, "name" | "avatarHue">;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const hue = user.avatarHue || 265;
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none",
        ring && "ring-1 ring-border-strong",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.36)),
        background: `linear-gradient(135deg, hsl(${hue} 78% 58%), hsl(${(hue + 38) % 360} 74% 48%))`,
        boxShadow: `0 0 18px -6px hsl(${hue} 80% 55% / 0.65)`,
      }}
    >
      {initialsOf(user.name)}
    </span>
  );
}
