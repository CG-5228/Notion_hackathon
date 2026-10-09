// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { backendRepairSql } from "./backend-repair.mjs";

describe("backend recovery bundle", () => {
  it("includes every repository migration without local test or demo fixtures", () => {
    const sql = backendRepairSql();
    for (const file of readdirSync("supabase/migrations").filter((file) => file.endsWith(".sql"))) {
      expect(sql).toContain(readFileSync(`supabase/migrations/${file}`, "utf8"));
    }
    expect(sql).not.toMatch(/insert into auth\.users/i);
    expect(sql).not.toContain("LOCAL TEST ONLY");
  });

  it("runs atomically, refuses partial installations and refreshes the API schema", () => {
    const sql = backendRepairSql();
    expect(sql).toContain("BEGIN;");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("partially installed. No changes committed.");
    expect(sql).toContain("NOTIFY pgrst, 'reload schema';\nCOMMIT;");
  });

  it("refuses deployment without a securely configured database connection", () => {
    const env = { ...process.env };
    delete env.SUPABASE_DB_URL;
    delete env.DATABASE_URL;
    delete env.DB_URL;
    const result = spawnSync(process.execPath, ["scripts/deploy-backend.mjs"], { env, encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Set SUPABASE_DB_URL securely");
  });
});
