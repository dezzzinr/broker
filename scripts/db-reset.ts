import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.QUANTIX_DB_PATH ?? path.join(process.cwd(), "data", "quantix.db");

for (const suffix of ["", "-wal", "-shm"]) {
  const file = `${DB_PATH}${suffix}`;
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    console.log("removed", file);
  }
}
console.log("Database cleared. It will be re-created and re-seeded on the next request.");
