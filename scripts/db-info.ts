import { db, DB_FILE } from "@/lib/server/db";

async function main() {
  const handle = db();
  const tables =
    handle.dialect === "postgres"
      ? (
          (await handle
            .prepare(
              `SELECT tablename AS name FROM pg_tables
                WHERE schemaname = 'public' ORDER BY tablename`
            )
            .all()) as { name: string }[]
        ).map((t) => t.name)
      : (
          (await handle
            .prepare(
              "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            )
            .all()) as { name: string }[]
        ).map((t) => t.name);

  console.log("database:", DB_FILE);
  for (const t of tables) {
    const { c } = (await handle.prepare(`SELECT COUNT(*) AS c FROM "${t}"`).get()) as { c: number };
    console.log(`  ${t.padEnd(18)} ${String(c).padStart(6)} rows`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
