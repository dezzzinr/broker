import "server-only";
import { db } from "../db";
import { newId } from "../ids";
import type { AppNotification } from "@/lib/types/platform";

/* ------------------------------ notifications --------------------------- */

export interface PushNotificationInput {
  userId: string;
  title: string;
  body?: string;
  kind?: AppNotification["kind"];
  href?: string | null;
}

export function pushNotification(input: PushNotificationInput): AppNotification {
  const now = new Date().toISOString();
  const id = newId("ntf");
  db()
    .prepare(
      `INSERT INTO notifications (id, user_id, title, body, kind, href, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .run(
      id,
      input.userId,
      input.title,
      input.body ?? "",
      input.kind ?? "info",
      input.href ?? null,
      now
    );
  // Keep the table bounded — 100 most recent per user is plenty for the bell.
  db()
    .prepare(
      `DELETE FROM notifications
        WHERE user_id = ? AND id NOT IN (
          SELECT id FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
        )`
    )
    .run(input.userId, input.userId);
  return getNotification(id)!;
}

export function getNotification(id: string): AppNotification | null {
  const row = db().prepare("SELECT * FROM notifications WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapNotification(row) : null;
}

export function listNotifications(userId: string, limit = 20): AppNotification[] {
  const rows = db()
    .prepare(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId, limit) as Record<string, unknown>[];
  return rows.map(mapNotification);
}

export function unreadCount(userId: string): number {
  const row = db()
    .prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0")
    .get(userId) as { c: number };
  return row.c;
}

export function markRead(id: string, userId: string): void {
  db().prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?").run(id, userId);
}

export function markAllRead(userId: string): number {
  return db()
    .prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0")
    .run(userId).changes;
}

function mapNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    body: String(row.body ?? ""),
    kind: (row.kind ?? "info") as AppNotification["kind"],
    href: (row.href as string | null) ?? null,
    read: Boolean(row.read),
    createdAt: String(row.created_at),
  };
}
