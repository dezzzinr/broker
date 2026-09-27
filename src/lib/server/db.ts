import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { seedIfEmpty } from "./seed";

/**
 * Quantix persistence layer.
 *
 * A single SQLite database (better-sqlite3) holds every platform entity:
 * accounts, sessions, wallets, deposit methods, fund requests with proof-of-
 * payment blobs, the ledger, activity logs and notifications.
 *
 * The connection is a module-level singleton so hot reloads in `next dev`
 * don't leak file handles. Set `QUANTIX_DB_PATH` to relocate the database.
 *
 * Hosts with a read-only filesystem (Vercel and other serverless platforms
 * only allow writes inside the temp directory) are handled by probing a list
 * of candidate locations and falling back to `os.tmpdir()`. Storage there is
 * ephemeral — the database is re-seeded on every cold start — which is fine
 * for demos but means such hosts must not be used as the production store.
 */

function candidatePaths(): string[] {
  const candidates = [
    process.env.QUANTIX_DB_PATH,
    path.join(process.cwd(), "data", "quantix.db"),
    path.join(os.tmpdir(), "quantix", "quantix.db"),
  ].filter((value): value is string => Boolean(value));
  // De-duplicate while preserving priority order.
  return [...new Set(candidates)];
}

declare global {
  var __quantixDb: Database.Database | undefined;
}

export const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'user'  CHECK (role IN ('user','admin')),
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  kyc_status     TEXT NOT NULL DEFAULT 'unverified'
                 CHECK (kyc_status IN ('unverified','pending','verified','rejected')),
  phone          TEXT NOT NULL DEFAULT '',
  country        TEXT NOT NULL DEFAULT '',
  avatar_hue     INTEGER NOT NULL DEFAULT 265,
  two_factor     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  last_login_at  TEXT,
  last_login_ip  TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip           TEXT NOT NULL DEFAULT '',
  user_agent   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS balances (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset      TEXT NOT NULL,
  amount     REAL NOT NULL DEFAULT 0,
  avg_cost   REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, asset)
);

CREATE TABLE IF NOT EXISTS deposit_methods (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  kind             TEXT NOT NULL DEFAULT 'bank',
  currency         TEXT NOT NULL DEFAULT 'USD',
  instructions     TEXT NOT NULL DEFAULT '',
  account_name     TEXT NOT NULL DEFAULT '',
  account_number   TEXT NOT NULL DEFAULT '',
  bank_name        TEXT NOT NULL DEFAULT '',
  reference_prefix TEXT NOT NULL DEFAULT '',
  min_amount       REAL NOT NULL DEFAULT 10,
  max_amount       REAL NOT NULL DEFAULT 100000,
  fee_percent      REAL NOT NULL DEFAULT 0,
  processing_time  TEXT NOT NULL DEFAULT 'Within 1 hour',
  enabled          INTEGER NOT NULL DEFAULT 1,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fund_requests (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('deposit','withdrawal')),
  method_id     TEXT REFERENCES deposit_methods(id) ON DELETE SET NULL,
  method_name   TEXT NOT NULL,
  asset         TEXT NOT NULL DEFAULT 'USD',
  amount        REAL NOT NULL,
  fee           REAL NOT NULL DEFAULT 0,
  credit        REAL NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','cancelled')),
  reference     TEXT NOT NULL DEFAULT '',
  payer_name    TEXT NOT NULL DEFAULT '',
  destination   TEXT NOT NULL DEFAULT '',
  note          TEXT NOT NULL DEFAULT '',
  proof_mime    TEXT,
  proof_name    TEXT,
  proof_size    INTEGER,
  proof         BLOB,
  submitted_at  TEXT NOT NULL,
  reviewed_at   TEXT,
  reviewed_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  review_note   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS transactions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  asset      TEXT NOT NULL,
  amount     REAL NOT NULL,
  price      REAL NOT NULL DEFAULT 0,
  fee        REAL NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'completed',
  note       TEXT NOT NULL DEFAULT '',
  ref_id     TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  category    TEXT NOT NULL,
  summary     TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  meta        TEXT NOT NULL DEFAULT '{}',
  severity    TEXT NOT NULL DEFAULT 'info',
  ip          TEXT NOT NULL DEFAULT '',
  user_agent  TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  kind       TEXT NOT NULL DEFAULT 'info',
  href       TEXT,
  read       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  tag        TEXT NOT NULL DEFAULT 'update',
  pinned     INTEGER NOT NULL DEFAULT 0,
  published  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id         TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  ip         TEXT NOT NULL DEFAULT '',
  success    INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry  ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_balances_user    ON balances(user_id);
CREATE INDEX IF NOT EXISTS idx_funds_user       ON fund_requests(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_funds_status     ON fund_requests(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_user          ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user    ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action  ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_notifications    ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts         ON login_attempts(identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_created    ON users(created_at DESC);
`;

function openAt(file: string): Database.Database {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const handle = new Database(file);
  handle.pragma("journal_mode = WAL");
  handle.pragma("foreign_keys = ON");
  handle.pragma("busy_timeout = 5000");
  // Executing the schema doubles as a write probe: on a read-only
  // filesystem (serverless hosts) this throws here instead of later,
  // mid-query, so we can fall back to a writable location.
  handle.exec(SCHEMA);
  return handle;
}

function open(): { handle: Database.Database; file: string } {
  const failures: string[] = [];
  for (const file of candidatePaths()) {
    try {
      return { handle: openAt(file), file };
    } catch (error) {
      failures.push(`  - ${file}: ${(error as Error).message}`);
    }
  }
  throw new Error(
    `Quantix could not open a writable SQLite database. Tried:\n${failures.join(
      "\n",
    )}\nSet QUANTIX_DB_PATH to a writable location for this host.`,
  );
}

let resolvedFile: string | undefined;

export function db(): Database.Database {
  if (!globalThis.__quantixDb) {
    const preferred = candidatePaths()[0];
    // Assign before seeding so the seeder resolves the same connection.
    const { handle, file } = open();
    resolvedFile = file;
    globalThis.__quantixDb = handle;
    if (file !== preferred) {
      console.warn(
        `[quantix:db] primary database location is not writable, using ${file} (ephemeral on serverless hosts).`,
      );
    }
    try {
      seedIfEmpty();
    } catch (error) {
      console.error("[quantix:db] seed failed", error);
    }
  }
  return globalThis.__quantixDb;
}

/** Absolute path of the database file currently in use. */
export function dbFile(): string {
  db();
  return resolvedFile as string;
}

/** Runs `fn` inside an immediate transaction (better-sqlite3 style). */
export function transaction<T>(fn: () => T): T {
  return db().transaction(fn)();
}
