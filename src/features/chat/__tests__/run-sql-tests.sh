#!/usr/bin/env bash
# Runs 0001 + local 0002/0003 shim + 0004 + the 0004 security tests on a throwaway
# local Postgres (needs initdb/pg_ctl/psql on PATH). Never touches the shared project.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
DATA="$(mktemp -d)"; PORT="${PGPORT_TEST:-55432}"
initdb -D "$DATA" -U postgres -A trust >/dev/null
pg_ctl -D "$DATA" -o "-p $PORT -k $DATA" -l "$DATA/log" start >/dev/null
trap 'pg_ctl -D "$DATA" stop -m fast >/dev/null; rm -rf "$DATA"' EXIT
P=(psql -h "$DATA" -p "$PORT" -U postgres -d postgres -q -v ON_ERROR_STOP=1)
"${P[@]}" -v part=A -f "$ROOT/supabase/tests/m5_local_shim.sql"
"${P[@]}" -f "$ROOT/supabase/migrations/0001_foundation.sql"
"${P[@]}" -v part=B -f "$ROOT/supabase/tests/m5_local_shim.sql"
"${P[@]}" -f "$ROOT/supabase/migrations/0004_chat_safety.sql"
"${P[@]}" -f "$ROOT/supabase/tests/0001_foundation.test.sql"
"${P[@]}" -f "$ROOT/supabase/tests/0004_chat_safety.test.sql"
