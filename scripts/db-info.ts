import { db, DB_FILE } from "@/lib/server/db";

const tables = db()
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all() as { name: string }[];

console.log("database:", DB_FILE);
for (const t of tables) {
  const { c } = db().prepare(`SELECT COUNT(*) AS c FROM "${t.name}"`).get() as { c: number };
  console.log(`  ${t.name.padEnd(18)} ${String(c).padStart(6)} rows`);
}
