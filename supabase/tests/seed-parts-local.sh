#!/usr/bin/env bash
# Menguji supabase/seed-parts/*.sql pada PostgreSQL lokal (stub, BUKAN Supabase): setelah seed-minimal,
# seluruh bagian (dijalankan dua kali) menghasilkan isi yang sama persis dengan supabase/seed.sql.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || ls /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")}"
WORK="$(mktemp -d)"; RUNAS=()
if [ "$(id -u)" = "0" ]; then chown -R postgres "$WORK"; RUNAS=(runuser -u postgres --); fi
PORT="${PGPORT_TEST:-55436}"
cleanup() { "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
"${RUNAS[@]}" "$PGBIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=localhost" -l "$WORK/log" start >/dev/null
PSQL=("${RUNAS[@]}" "$PGBIN/psql" -h localhost -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -t -A)
"${RUNAS[@]}" "$PGBIN/createdb" -h localhost -p "$PORT" -U postgres parts
"${RUNAS[@]}" "$PGBIN/createdb" -h localhost -p "$PORT" -U postgres full
TABLES="dataset_metadata units documents findings audit_schedules document_requests reference_materials compliance_items asset_reconciliations asset_items"
digest() { for t in $TABLES; do "${PSQL[@]}" -d "$1" -c "select '$t', count(*), md5(coalesce(string_agg(x::text, '|' order by x::text), '')) from public.$t x"; done; }
for db in parts full; do
  "${PSQL[@]}" -d "$db" -f "$ROOT/supabase/tests/00_local_stub.sql" >/dev/null
  for m in 0001_sekar_schema 0002_asset_items_materials; do "${PSQL[@]}" -d "$db" -c "set client_min_messages=warning" -f "$ROOT/supabase/migrations/$m.sql" >/dev/null; done
done
"${PSQL[@]}" -d full -f "$ROOT/supabase/seed.sql" >/dev/null
"${PSQL[@]}" -d parts -f "$ROOT/supabase/seed-minimal.sql" >/dev/null
for run in 1 2; do for f in "$ROOT"/supabase/seed-parts/*.sql; do "${PSQL[@]}" -d parts -f "$f" >/dev/null; done; done
if [ "$(digest parts)" = "$(digest full)" ]; then
  echo "Uji seed bertahap lokal: lulus ($(ls "$ROOT"/supabase/seed-parts/*.sql | wc -l) bagian, isi identik dengan seed.sql)"
else
  diff <(digest parts) <(digest full); echo "GAGAL: isi seed bertahap berbeda"; exit 1
fi
