import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const migrations = [
  ["0001_foundation.sql", [
    "is_verified_student(uuid)", "is_blocked_pair(uuid,uuid)", "assert_verified_student()",
    "check_email_domain(text)", "get_my_profile()", "update_my_profile(text,boolean,text)",
  ]],
  ["0002_events.sql", [
    "get_discoverable_events(text,text,timestamptz,timestamptz,uuid,text)",
    "rsvp_to_event(uuid,boolean,text)", "create_activity(text,text,text,timestamptz,timestamptz,text,text)",
    "get_my_activities()", "rate_event(uuid,integer,text)", "review_event(uuid,text)",
  ]],
  ["0003_matching.sql", [
    "request_buddy(uuid,text,integer)", "cancel_buddy_request(uuid,text)",
    "leave_match(uuid)", "get_my_match(uuid)", "get_my_buddy_status(uuid)",
  ]],
  ["0004_chat_safety.sql", [
    "get_match_messages(uuid,integer)", "send_message(uuid,text)", "agree_to_go(uuid,integer)",
    "get_revealed_profiles(uuid)", "cancel_confirmed_plan(uuid,text)", "submit_meetup_outcome(uuid,text)",
    "get_reliability_summary(text,uuid)", "get_my_reliability()", "block_user(text,uuid)",
    "report_user(text,uuid,text,text)", "report_event(uuid,text,text)", "moderator_review_queue()",
    "moderator_resolve_outcome(uuid,text,text)", "moderator_set_report_status(uuid,text)",
  ]],
  ["0005_demo_accounts.sql", null],
  ["0006_my_buddy_activity.sql", ["get_my_buddy_activity()"]],
  ["0007_onboarding_interests.sql", ["set_my_interests(jsonb)"]],
];

const literal = (value) => `'${value.replaceAll("'", "''")}'`;
const array = (values) => `ARRAY[${values.map(literal).join(", ")}]::text[]`;

export function backendRepairSql() {
  const blocks = migrations.map(([file, functions]) => {
    const sql = readFileSync(resolve(root, "supabase/migrations", file), "utf8");
    if (functions === null) return `-- Idempotent demo-status function/trigger patch; no accounts are created.\n${sql}`;
    const tables = [...sql.matchAll(/create table (?:if not exists )?(public\.\w+)/gi)].map((m) => m[1]);
    const rpcs = functions.map((fn) => `public.${fn}`);
    const version = file.split("_")[0];
    return `DO $repair_${version}$
DECLARE
  existing_tables integer;
  existing_functions integer;
BEGIN
  SELECT count(*) INTO existing_tables FROM unnest(${array(tables)}) AS t(name)
    WHERE to_regclass(name) IS NOT NULL;
  SELECT count(*) INTO existing_functions FROM unnest(${array(rpcs)}) AS f(name)
    WHERE to_regprocedure(name) IS NOT NULL;
  IF existing_tables = 0 AND existing_functions = 0 THEN
    EXECUTE $migration_${version}$\n${sql}\n$migration_${version}$;
    RAISE NOTICE 'Installed ${file}';
  ELSIF existing_tables = ${tables.length} AND existing_functions = ${rpcs.length} THEN
    RAISE NOTICE '${file} is already installed; preserving existing data and functions';
  ELSE
    RAISE EXCEPTION '${file} is partially installed. No changes committed. Review the existing schema before applying this migration.';
  END IF;
END
$repair_${version}$;`;
  });

  return `-- Generated from supabase/migrations by npm run db:bundle.
-- Run as the database owner in the Supabase project used by the deployed app.
-- No test users, synthetic events, schema resets, or disabled security policies.
BEGIN;
SET LOCAL lock_timeout = '10s';
SELECT pg_advisory_xact_lock(hashtext('find-your-buddy-backend-repair'));
DO $prerequisites$
BEGIN
  IF to_regclass('auth.users') IS NULL OR to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'This repair requires the Supabase auth schema.';
  END IF;
END
$prerequisites$;

${blocks.join("\n\n")}

NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT 'Backend migrations are installed; API schema reload requested.' AS result;
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(process.argv[2] ?? ".hoplite/artifacts/backend-repair.sql");
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, backendRepairSql());
  console.log(`Backend repair SQL written to ${output}`);
}
