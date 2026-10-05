#!/usr/bin/env bash
# Menguji migration + seed + RLS pada PostgreSQL lokal sementara (bukan Supabase).
# Pemakaian: bash supabase/tests/run-local.sh   (butuh initdb/pg_ctl PostgreSQL 15+)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || ls /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")}"
WORK="$(mktemp -d)"
RUNAS=()
if [ "$(id -u)" = "0" ]; then chown -R postgres "$WORK"; RUNAS=(runuser -u postgres --); fi
PORT="${PGPORT_TEST:-55432}"
cleanup() { "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
"${RUNAS[@]}" "$PGBIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" start >/dev/null
PSQL=("${RUNAS[@]}" "$PGBIN/psql" -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t -A)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_local_stub.sql"
"${PSQL[@]}" -c "set client_min_messages=warning" -f "$ROOT/supabase/migrations/0001_sekar_schema.sql"
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/02_rls_check.sql" 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
