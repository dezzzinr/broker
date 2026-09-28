import fs from "node:fs";
import path from "node:path";
import { db, DB_FILE } from "@/lib/server/db";

/**
 * Clears the platform database and re-seeds it on the next request.
 * SQLite: deletes the database files. Postgres: truncates every table.
 */
async function main() {
  const handle = db();

  if (handle.dialect === "postgres") {
    const tables = (
      (await handle
        .prepare(
          `SELECT tablename AS name FROM pg_tables
            WHERE schemaname = 'public' ORDER BY tablename`
        )
        .all()) as { name: string }[]
    ).map((t) => t.name);
    for (const t of tables) {
      await handle.prepare(`TRUNCATE TABLE "${t}" CASCADE`).run();
      console.log("truncated", t);
    }
  } else {
    const dbPath = process.env.QUANTIX_DB_PATH ?? path.join(process.cwd(), "data", "quantix.db");
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${dbPath}${suffix}`;
      if (fs.existsSync(file)) {
        fs.rmSync(file);
        console.log("removed", file);
      }
    }
  }

  console.log(`Database cleared (${DB_FILE}). It will be re-created and re-seeded on the next request.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
