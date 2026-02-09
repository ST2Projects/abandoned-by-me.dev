import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_URL || "./data/app.db";

// Ensure directory exists
try {
  mkdirSync(dirname(dbPath), { recursive: true });
} catch {}

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

console.log("Running migrations...");
try {
  migrate(db, { migrationsFolder: join(__dirname, "../../../drizzle") });
  console.log("Migrations completed successfully");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  sqlite.close();
}
