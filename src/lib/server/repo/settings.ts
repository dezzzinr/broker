import "server-only";
import { db } from "../db";
import { newId } from "../ids";
import type { Announcement, PlatformSettings } from "@/lib/types/platform";

/** Platform-wide configuration + announcements managed from the admin console. */

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: "Quantix",
  supportEmail: "support@quantix.app",
  registrationsOpen: true,
  minDeposit: 20,
  maxDeposit: 50_000,
  withdrawalEnabled: true,
  autoApproveBelow: 0,
  maintenanceMode: false,
  maintenanceMessage: "We are upgrading our matching engine. Deposits are paused briefly.",
};

const BOOLEAN_KEYS: (keyof PlatformSettings)[] = [
  "registrationsOpen",
  "withdrawalEnabled",
  "maintenanceMode",
];

const KEY_MAP: Record<string, keyof PlatformSettings> = {
  platform_name: "platformName",
  support_email: "supportEmail",
  registrations_open: "registrationsOpen",
  min_deposit: "minDeposit",
  max_deposit: "maxDeposit",
  withdrawal_enabled: "withdrawalEnabled",
  auto_approve_below: "autoApproveBelow",
  maintenance_mode: "maintenanceMode",
  maintenance_message: "maintenanceMessage",
};

const COLUMN_MAP: Record<keyof PlatformSettings, string> = Object.fromEntries(
  Object.entries(KEY_MAP).map(([column, key]) => [key, column])
) as Record<keyof PlatformSettings, string>;

function coerce(key: keyof PlatformSettings, raw: string): string | number | boolean {
  if (BOOLEAN_KEYS.includes(key)) return raw === "1" || raw === "true";
  if (typeof DEFAULT_PLATFORM_SETTINGS[key] === "number") return Number(raw);
  return raw;
}

export function getPlatformSettings(): PlatformSettings {
  const rows = db().prepare("SELECT key, value FROM app_settings").all() as {
    key: string;
    value: string;
  }[];
  const settings: PlatformSettings = { ...DEFAULT_PLATFORM_SETTINGS };
  for (const row of rows) {
    const key = KEY_MAP[row.key];
    if (!key) continue;
    (settings as unknown as Record<string, unknown>)[key] = coerce(key, row.value);
  }
  return settings;
}

export function updatePlatformSettings(
  patch: Partial<PlatformSettings>
): PlatformSettings {
  const now = new Date().toISOString();
  const stmt = db().prepare(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  );
  db().transaction(() => {
    for (const [key, value] of Object.entries(patch)) {
      const column = COLUMN_MAP[key as keyof PlatformSettings];
      if (!column || value === undefined) continue;
      const raw = typeof value === "boolean" ? (value ? "1" : "0") : String(value);
      stmt.run(column, raw, now);
    }
  })();
  return getPlatformSettings();
}

/* ------------------------------ announcements --------------------------- */

export function listAnnouncements(
  opts: { includeUnpublished?: boolean; limit?: number } = {}
): Announcement[] {
  const rows = db()
    .prepare(
      `SELECT * FROM announcements
        ${opts.includeUnpublished ? "" : "WHERE published = 1"}
        ORDER BY pinned DESC, created_at DESC
        LIMIT ?`
    )
    .all(opts.limit ?? 50) as Record<string, unknown>[];
  return rows.map(mapAnnouncement);
}

export function createAnnouncement(input: {
  title: string;
  body: string;
  tag?: string;
  pinned?: boolean;
  published?: boolean;
}): Announcement {
  const now = new Date().toISOString();
  const id = newId("ann");
  db()
    .prepare(
      `INSERT INTO announcements (id, title, body, tag, pinned, published, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.title.trim(),
      input.body.trim(),
      input.tag ?? "update",
      input.pinned ? 1 : 0,
      input.published === false ? 0 : 1,
      now
    );
  return getAnnouncement(id)!;
}

export function getAnnouncement(id: string): Announcement | null {
  const row = db().prepare("SELECT * FROM announcements WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapAnnouncement(row) : null;
}

export function deleteAnnouncement(id: string): void {
  db().prepare("DELETE FROM announcements WHERE id = ?").run(id);
}

function mapAnnouncement(row: Record<string, unknown>): Announcement {
  return {
    id: String(row.id),
    title: String(row.title),
    body: String(row.body),
    tag: String(row.tag),
    pinned: Boolean(row.pinned),
    published: Boolean(row.published),
    createdAt: String(row.created_at),
  };
}

/** Broadcasts a notification to every active account (used by announcements). */
export function broadcast(input: {
  title: string;
  body?: string;
  kind?: "info" | "success" | "warning" | "error";
  href?: string | null;
  roles?: ("user" | "admin")[];
}): number {
  const users = db()
    .prepare(
      `SELECT id FROM users WHERE status = 'active'${
        input.roles && input.roles.length ? ` AND role IN (${input.roles.map(() => "?").join(",")})` : ""
      }`
    )
    .all(...(input.roles ?? [])) as { id: string }[];
  const now = new Date().toISOString();
  const stmt = db().prepare(
    `INSERT INTO notifications (id, user_id, title, body, kind, href, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  );
  db().transaction(() => {
    for (const user of users) {
      stmt.run(
        newId("ntf"),
        user.id,
        input.title,
        input.body ?? "",
        input.kind ?? "info",
        input.href ?? null,
        now
      );
    }
  })();
  return users.length;
}
