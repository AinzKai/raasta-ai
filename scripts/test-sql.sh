#!/usr/bin/env bash
# Applies every migration to a scratch Postgres (with Supabase's roles/auth stubbed)
# and runs the RLS / governance security checks. Usage: PGURL=... scripts/test-sql.sh
# Requires a reachable Postgres superuser connection, e.g.:
#   PGURL="postgresql://postgres@localhost:5432" scripts/test-sql.sh
set -euo pipefail
: "${PGURL:?set PGURL to a superuser connection string without a database name}"
DB="raasta_sqltest_$$"
psql "$PGURL/postgres" -q -c "CREATE DATABASE $DB"
trap 'psql "$PGURL/postgres" -q -c "DROP DATABASE IF EXISTS $DB" >/dev/null' EXIT
run() { psql "$PGURL/$DB" -v ON_ERROR_STOP=1 -q "$@"; }
run -f "$(dirname "$0")/../supabase/tests/stub-supabase.sql"
for f in "$(dirname "$0")"/../supabase/migrations/*.sql; do run -f "$f"; done
run -f "$(dirname "$0")/../supabase/tests/security.sql" 2>&1 | grep -E "PASS|FAIL|ERROR" || true
