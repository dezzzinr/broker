"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Fingerprint,
  LogIn,
  MonitorCog,
  ShieldAlert,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import type { ActivityCategory, ActivityLog, ActivitySeverity } from "@/lib/types/platform";

const CATEGORY_ICON: Record<ActivityCategory, LucideIcon> = {
  auth: LogIn,
  account: UserCog,
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  trade: ArrowLeftRight,
  admin: MonitorCog,
  security: ShieldAlert,
};

const SEVERITY_STYLE: Record<ActivitySeverity, { icon: string; dot: string }> = {
  info: { icon: "text-muted", dot: "bg-info" },
  success: { icon: "text-positive", dot: "bg-positive" },
  warning: { icon: "text-warning", dot: "bg-warning" },
  critical: { icon: "text-negative", dot: "bg-negative" },
};

/** One row of the platform activity stream. */
export function ActivityRow({
  entry,
  showUser = true,
  compact = false,
}: {
  entry: ActivityLog;
  showUser?: boolean;
  compact?: boolean;
}) {
  const Icon = CATEGORY_ICON[entry.category] ?? Fingerprint;
  const severity = SEVERITY_STYLE[entry.severity] ?? SEVERITY_STYLE.info;
  const actor = entry.actor && entry.actor.id !== entry.userId ? entry.actor : null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-0 hover:bg-fill-1 sm:px-5",
        compact && "py-2.5"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-fill-1",
          severity.icon
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] leading-snug text-foreground">{entry.summary}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] text-faint">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-border bg-fill-1 px-1.5 py-px font-medium uppercase tracking-wide",
              severity.icon
            )}
          >
            <span className={cn("size-1 rounded-full", severity.dot)} aria-hidden />
            {entry.category}
          </span>
          <code className="rounded bg-fill-1 px-1.5 py-px font-mono text-[10px] text-muted">
            {entry.action}
          </code>
          <span title={new Date(entry.createdAt).toISOString()}>
            {timeAgo(new Date(entry.createdAt))}
          </span>
          {showUser && entry.user && (
            <Link
              href={`/admin/users/${entry.user.id}`}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              {entry.user.name}
            </Link>
          )}
          {actor && <span>by {actor.name}</span>}
          {entry.ip && <span className="font-mono">{entry.ip}</span>}
        </div>
      </div>
    </div>
  );
}
