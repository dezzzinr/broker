import "server-only";
import fs from "node:fs";
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
 */

const DB_PATH =
  process.env.QUANTIX_DB_PATH ?? path.join(process.cwd(), "data", "quantix.db");

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

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  return db;
}

export function db(): Database.Database {
  if (!globalThis.__quantixDb) {
    // Assign before seeding so the seeder resolves the same connection.
    globalThis.__quantixDb = open();
    try {
      seedIfEmpty();
    } catch (error) {
      console.error("[quantix:db] seed failed", error);
    }
  }
  return globalThis.__quantixDb;
}

export const DB_FILE = DB_PATH;

/** Runs `fn` inside an immediate transaction (better-sqlite3 style). */
export function transaction<T>(fn: () => T): T {
  return db().transaction(fn)();
}
