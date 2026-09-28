import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import type BetterSqlite3 from "better-sqlite3";
import { seedIfEmpty } from "./seed";

/**
 * Quantix persistence layer.
 *
 * Two interchangeable backends behind one async facade:
 *
 * - **SQLite** (default) — a single `better-sqlite3` file at `data/quantix.db`
 *   (`QUANTIX_DB_PATH` overrides). Perfect for local development and any host
 *   with a real filesystem.
 * - **Postgres** — used automatically when `POSTGRES_URL` (or `DATABASE_URL`)
 *   is set. This is what Vercel deployments must use: serverless functions
 *   each get a private, ephemeral filesystem, so a local SQLite file can never
 *   be shared between them (signups would vanish between requests).
 *
 * Call sites keep the familiar better-sqlite3 shape, now awaited:
 *
 * ```ts
 * const row = await db().prepare("SELECT * FROM users WHERE id = ?").get(id);
 * await db().prepare("UPDATE … SET … WHERE id = ?").run(value, id);
 * await transaction(async () => { … }); // one atomic unit of work
 * ```
 *
 * `?` placeholders are used everywhere and rewritten to `$1…$n` for Postgres.
 * Statements should stick to the shared SQL subset (the repos already do):
 * no `julianday`/`datetime`, use `LOWER(a) LIKE LOWER(?)` for searching, and
 * prefer `INSERT … ON CONFLICT … DO UPDATE` over `INSERT OR REPLACE`.
 */

/* ------------------------------- types -------------------------------- */

export type Row = Record<string, unknown>;

export interface RunResult {
  /** Rows inserted/updated/deleted (better-sqlite3 parity). */
  changes: number;
}

export interface Stmt {
  get<T = Row>(...args: unknown[]): Promise<T | undefined>;
  all<T = Row>(...args: unknown[]): Promise<T[]>;
  run(...args: unknown[]): Promise<RunResult>;
}

export interface Handle {
  readonly dialect: Dialect;
  prepare(sql: string): Stmt;
  /**
   * Cross-instance write lock to be called inside `transaction()` — a no-op
   * on SQLite (BEGIN IMMEDIATE already serialises writers) and a Postgres
   * advisory xact lock elsewhere. Used to serialise first-run seeding.
   */
  lock(name: string): Promise<void>;
}

export type Dialect = "sqlite" | "postgres";

/* ------------------------------ driver -------------------------------- */

interface Queryable {
  query<T = Row>(sql: string, args: unknown[]): Promise<T[]>;
  run(sql: string, args: unknown[]): Promise<number>;
  lock(name: string): Promise<void>;
}

interface Tx extends Queryable {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}

interface Driver {
  dialect: Dialect;
  query<T = Row>(sql: string, args: unknown[]): Promise<T[]>;
  run(sql: string, args: unknown[]): Promise<number>;
  exec(sql: string): Promise<void>;
  begin(): Promise<Tx>;
  describe(): string;
}

/** `?` → `$1…$n` for Postgres, skipping `?` inside single-quoted literals. */
function rebind(sql: string): string {
  let out = "";
  let n = 0;
  let inLiteral = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      // '' escapes a literal quote in SQL; stay inside the literal.
      if (inLiteral && sql[i + 1] === "'") {
        out += "''";
        i++;
        continue;
      }
      inLiteral = !inLiteral;
      out += ch;
    } else if (ch === "?" && !inLiteral) {
      out += `$${++n}`;
    } else {
      out += ch;
    }
  }
  return out;
}

/** Which backend serves this process — decided by env, stable before init. */
function activeDialect(): Dialect {
  return process.env.POSTGRES_URL ?? process.env.DATABASE_URL ? "postgres" : "sqlite";
}

/* --------------------------- sqlite driver ----------------------------- */

type SqliteStmtCache = Map<string, BetterSqlite3.Statement>;

function sqliteTx(conn: BetterSqlite3.Database): Tx {
  const cache: SqliteStmtCache = new Map();
  const prep = (sql: string) => {
    let stmt = cache.get(sql);
    if (!stmt) {
      stmt = conn.prepare(sql);
      cache.set(sql, stmt);
    }
    return stmt;
  };
  return {
    async query<T>(sql: string, args: unknown[]): Promise<T[]> {
      return prep(sql).all(...(args as never[])) as T[];
    },
    async run(sql: string, args: unknown[]): Promise<number> {
      return prep(sql).run(...(args as never[])).changes;
    },
    async lock() {
      /* BEGIN IMMEDIATE already holds the write lock. */
    },
    async commit() {
      conn.exec("COMMIT");
    },
    async rollback() {
      conn.exec("ROLLBACK");
    },
    release() {
      conn.close();
    },
  };
}

async function createSqliteDriver(resolvePath: () => string): Promise<Driver> {
  const { default: Database } = await import("better-sqlite3");
  const DB_PATH = resolvePath();
  const open = () => {
    const conn = new Database(DB_PATH);
    conn.pragma("journal_mode = WAL");
    conn.pragma("foreign_keys = ON");
    conn.pragma("busy_timeout = 5000");
    return conn;
  };
  const singleton = open();
  const cache: SqliteStmtCache = new Map();
  const prep = (sql: string) => {
    let stmt = cache.get(sql);
    if (!stmt) {
      stmt = singleton.prepare(sql);
      cache.set(sql, stmt);
    }
    return stmt;
  };
  return {
    dialect: "sqlite",
    async query<T>(sql: string, args: unknown[]): Promise<T[]> {
      return prep(sql).all(...(args as never[])) as T[];
    },
    async run(sql: string, args: unknown[]): Promise<number> {
      return prep(sql).run(...(args as never[])).changes;
    },
    async exec(sql: string): Promise<void> {
      singleton.exec(sql);
    },
    async begin(): Promise<Tx> {
      const conn = open();
      conn.exec("BEGIN IMMEDIATE");
      return sqliteTx(conn);
    },
    describe() {
      return DB_PATH;
    },
  };
}

/**
 * Where the SQLite file lives. `QUANTIX_DB_PATH` always wins; otherwise try
 * `data/quantix.db` and fall back to the OS temp directory when the working
 * directory is read-only (bare serverless without a Postgres URL — demo only).
 */
function resolveSqlitePath(): string {
  const explicit = process.env.QUANTIX_DB_PATH;
  if (explicit) return explicit;

  const local = path.join(process.cwd(), "data", "quantix.db");
  try {
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.accessSync(path.dirname(local), fs.constants.W_OK);
    return local;
  } catch {
    const fallback = path.join(os.tmpdir(), "quantix.db");
    console.warn(
      `[quantix:db] cannot write to "${path.dirname(local)}" (read-only serverless fs?); ` +
        `falling back to EPHEMERAL "${fallback}". Set POSTGRES_URL (Vercel Postgres/Neon) ` +
        `for shared persistent storage.`,
    );
    return fallback;
  }
}

/* --------------------------- postgres driver --------------------------- */

async function createPostgresDriver(connectionString: string): Promise<Driver> {
  const { Pool, types } = await import("pg");
  // COUNT(*) & friends come back as int8 strings — expose plain numbers so
  // the `as { c: number }` casts at call sites keep working.
  types.setTypeParser(20, (v: string) => Number(v));

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  const make = (q: { query: (sql: string, args?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }> }): Queryable => ({
    async query<T>(sql: string, args: unknown[]): Promise<T[]> {
      const res = await q.query(rebind(sql), args);
      return res.rows as T[];
    },
    async run(sql: string, args: unknown[]): Promise<number> {
      const res = await q.query(rebind(sql), args);
      return res.rowCount ?? 0;
    },
    async lock(name: string): Promise<void> {
      await q.query("SELECT pg_advisory_xact_lock($1)", [hashName(name)]);
    },
  });

  return {
    dialect: "postgres",
    query: (sql, args) => make(pool).query(sql, args),
    run: (sql, args) => make(pool).run(sql, args),
    async exec(sql: string): Promise<void> {
      await pool.query(sql);
    },
    async begin(): Promise<Tx> {
      const client = await pool.connect();
      await client.query("BEGIN");
      const base = make(client);
      return {
        ...base,
        async commit() {
          await client.query("COMMIT");
        },
        async rollback() {
          await client.query("ROLLBACK");
        },
        release() {
          client.release();
        },
      };
    },
    describe() {
      try {
        const u = new URL(connectionString);
        return `postgres://${u.hostname}${u.pathname}`;
      } catch {
        return "postgres://(unparseable url)";
      }
    },
  };
}

function hashName(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Signed 32-bit so it fits a Postgres bigint advisory lock.
  return h | 0;
}

/* ------------------------------- schema -------------------------------- */

/**
 * Shared-subset DDL. The only dialect difference is the proof-of-payment
 * column: BLOB locally, BYTEA on Postgres. `DOUBLE PRECISION` maps to
 * SQLite's 8-byte REAL and Postgres' 8-byte float alike.
 */
function schemaSql(dialect: Dialect): string {
  const BLOB = dialect === "postgres" ? "BYTEA" : "BLOB";
  return `
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
  amount     DOUBLE PRECISION NOT NULL DEFAULT 0,
  avg_cost   DOUBLE PRECISION NOT NULL DEFAULT 0,
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
  min_amount       DOUBLE PRECISION NOT NULL DEFAULT 10,
  max_amount       DOUBLE PRECISION NOT NULL DEFAULT 100000,
  fee_percent      DOUBLE PRECISION NOT NULL DEFAULT 0,
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
  amount        DOUBLE PRECISION NOT NULL,
  fee           DOUBLE PRECISION NOT NULL DEFAULT 0,
  credit        DOUBLE PRECISION NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','cancelled')),
  reference     TEXT NOT NULL DEFAULT '',
  payer_name    TEXT NOT NULL DEFAULT '',
  destination   TEXT NOT NULL DEFAULT '',
  note          TEXT NOT NULL DEFAULT '',
  proof_mime    TEXT,
  proof_name    TEXT,
  proof_size    INTEGER,
  proof         ${BLOB},
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
  amount     DOUBLE PRECISION NOT NULL,
  price      DOUBLE PRECISION NOT NULL DEFAULT 0,
  fee        DOUBLE PRECISION NOT NULL DEFAULT 0,
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
}

/* ---------------------------- init / facade ---------------------------- */

let driver: Driver | null = null;
let init: Promise<void> | null = null;
let seeding: Promise<void> | null = null;

/** Marks the async context of the seeder so its own queries never await it. */
const seedScope = new AsyncLocalStorage<true>();

function ensureReady(): Promise<void> {
  if (!init) {
    init = (async () => {
      const pgUrl = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
      driver = pgUrl
        ? await createPostgresDriver(pgUrl)
        : await createSqliteDriver(resolveSqlitePath);
      await driver.exec(schemaSql(driver.dialect));
    })();
  }
  return init;
}

/**
 * First-run seed, memoised so concurrent cold starts share one run while the
 * seeder's own queries (which re-enter through `transaction`) proceed without
 * waiting on themselves. Inside, `seedIfEmpty` takes a `quantix:seed` lock —
 * a Postgres advisory xact lock, BEGIN IMMEDIATE on SQLite — so parallel
 * instances can't double-seed.
 */
function seedOnce(): Promise<void> {
  if (seedScope.getStore()) return Promise.resolve(); // inside the seeder itself
  seeding ??= seedScope.run(true, async () => {
    try {
      await seedIfEmpty();
    } catch (error) {
      console.error("[quantix:db] seed failed", error);
    }
  });
  return seeding;
}

function handle(q: Queryable): Handle {
  return {
    dialect: activeDialect(),
    prepare(sql: string): Stmt {
      return {
        async get<T = Row>(...args: unknown[]): Promise<T | undefined> {
          await ensureReady();
          const rows = await q.query<T>(sql, args);
          return rows[0];
        },
        async all<T = Row>(...args: unknown[]): Promise<T[]> {
          await ensureReady();
          return q.query<T>(sql, args);
        },
        async run(...args: unknown[]): Promise<RunResult> {
          await ensureReady();
          return { changes: await q.run(sql, args) };
        },
      };
    },
    lock(name: string) {
      return q.lock(name);
    },
  };
}

const txStorage = new AsyncLocalStorage<Queryable>();

/**
 * The database handle for the current async context: a transaction-bound
 * connection inside `transaction()`, the shared pool otherwise.
 */
export function db(): Handle {
  const tx = txStorage.getStore();
  return handle(
    tx ?? {
      async query<T>(sql: string, args: unknown[]): Promise<T[]> {
        await ensureReady();
        await seedOnce();
        return driver!.query<T>(sql, args);
      },
      async run(sql: string, args: unknown[]): Promise<number> {
        await ensureReady();
        await seedOnce();
        return driver!.run(sql, args);
      },
      async lock(name: string): Promise<void> {
        await ensureReady();
        if (!txStorage.getStore()) {
          throw new Error("[quantix:db] lock() must run inside transaction()");
        }
        await txStorage.getStore()!.lock(name);
      },
    },
  );
}

/**
 * Runs `fn` atomically on a dedicated connection (BEGIN IMMEDIATE on SQLite,
 * BEGIN on Postgres). Nested calls join the outer transaction.
 */
export async function transaction<T>(fn: () => T | Promise<T>): Promise<T> {
  if (txStorage.getStore()) return fn();
  await ensureReady();
  await seedOnce();
  const tx = await driver!.begin();
  try {
    const result = await txStorage.run(tx, () => fn());
    await tx.commit();
    return result;
  } catch (error) {
    try {
      await tx.rollback();
    } catch {
      /* connection already broken */
    }
    throw error;
  } finally {
    tx.release();
  }
}

/** Human-readable location of the active store (for logs and scripts). */
export function dbDescribe(): string {
  return driver ? `${driver.dialect} @ ${driver.describe()}` : "uninitialised";
}

export const DB_FILE = process.env.POSTGRES_URL ?? process.env.DATABASE_URL
  ? `postgres @ ${(() => {
      try {
        const u = new URL(process.env.POSTGRES_URL ?? process.env.DATABASE_URL!);
        return u.hostname + u.pathname;
      } catch {
        return "(url)";
      }
    })()}`
  : process.env.QUANTIX_DB_PATH ?? path.join(process.cwd(), "data", "quantix.db");
