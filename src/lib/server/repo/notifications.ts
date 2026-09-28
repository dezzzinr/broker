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

export async function pushNotification(input: PushNotificationInput): Promise<AppNotification> {
  const now = new Date().toISOString();
  const id = newId("ntf");
  await db()
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
  await db()
    .prepare(
      `DELETE FROM notifications
        WHERE user_id = ? AND id NOT IN (
          SELECT id FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
        )`
    )
    .run(input.userId, input.userId);
  return (await getNotification(id))!;
}

export async function getNotification(id: string): Promise<AppNotification | null> {
  const row = (await db().prepare("SELECT * FROM notifications WHERE id = ?").get(id)) as
    | Record<string, unknown>
    | undefined;
  return row ? mapNotification(row) : null;
}

export async function listNotifications(userId: string, limit = 20): Promise<AppNotification[]> {
  const rows = (await db()
    .prepare(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId, limit)) as Record<string, unknown>[];
  return rows.map(mapNotification);
}

export async function unreadCount(userId: string): Promise<number> {
  const row = (await db()
    .prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0")
    .get(userId)) as { c: number };
  return row.c;
}

export async function markRead(id: string, userId: string): Promise<void> {
  await db()
    .prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?")
    .run(id, userId);
}

export async function markAllRead(userId: string): Promise<number> {
  const info = await db()
    .prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0")
    .run(userId);
  return info.changes;
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
