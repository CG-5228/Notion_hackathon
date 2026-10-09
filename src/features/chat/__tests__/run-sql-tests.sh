#!/usr/bin/env bash
# Runs the auth shim + 0001..0004 + every SQL test suite on a throwaway local Postgres
# (needs initdb/pg_ctl/psql on PATH). Never touches the shared project. Run it on a checkout that
# includes 0002 and 0003 (main after the events and matching PRs), as 0004 depends on them.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
DATA="$(mktemp -d)"; PORT="${PGPORT_TEST:-55432}"
initdb -D "$DATA" -U postgres -A trust >/dev/null
pg_ctl -D "$DATA" -o "-p $PORT -k $DATA" -l "$DATA/log" start >/dev/null
trap 'pg_ctl -D "$DATA" stop -m fast >/dev/null; rm -rf "$DATA"' EXIT
P=(psql -h "$DATA" -p "$PORT" -U postgres -d postgres -q -v ON_ERROR_STOP=1)
"${P[@]}" -f "$ROOT/supabase/tests/m5_local_shim.sql"
for m in "$ROOT"/supabase/migrations/0*.sql; do "${P[@]}" -f "$m"; done
for t in "$ROOT"/supabase/tests/0*.test.sql; do "${P[@]}" -f "$t" 2>&1 | grep -i "tests passed"; done
