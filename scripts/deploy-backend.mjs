import { spawnSync } from "node:child_process";
import { backendRepairSql } from "./backend-repair.mjs";

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.DB_URL;
if (!databaseUrl) {
  console.error("Set SUPABASE_DB_URL securely for the intended Supabase database, or run npm run db:bundle and use the SQL Editor. Never use a VITE_ variable for database credentials.");
  process.exit(1);
}

const result = spawnSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "--dbname", databaseUrl], {
  input: backendRepairSql(),
  encoding: "utf8",
  stdio: ["pipe", "inherit", "inherit"],
});
if (result.error) {
  console.error("Could not run psql. Install the PostgreSQL client, or run npm run db:bundle and use the Supabase SQL Editor.");
}
process.exit(result.status ?? 1);
