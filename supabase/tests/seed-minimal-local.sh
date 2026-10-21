#!/usr/bin/env bash
# Menguji supabase/seed-minimal.sql pada PostgreSQL lokal (stub auth/storage, BUKAN Supabase):
# idempoten, FK valid, isolasi antarunit lewat RLS 0001, dan kompatibel dengan seed lengkap.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || ls /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")}"
WORK="$(mktemp -d)"; RUNAS=()
if [ "$(id -u)" = "0" ]; then chown -R postgres "$WORK"; RUNAS=(runuser -u postgres --); fi
PORT="${PGPORT_TEST:-55434}"
cleanup() { "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
"${RUNAS[@]}" "$PGBIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=localhost" -l "$WORK/log" start >/dev/null
PSQL=("${RUNAS[@]}" "$PGBIN/psql" -h localhost -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t -A)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_local_stub.sql" >/dev/null
for m in 0001_sekar_schema 0002_asset_items_materials; do "${PSQL[@]}" -c "set client_min_messages=warning" -f "$ROOT/supabase/migrations/$m.sql" >/dev/null; done
must() { local label="$1" got="$2" want="$3"; if [ "$got" = "$want" ]; then echo "OK $label: $got"; else echo "GAGAL $label: dapat '$got', harap '$want'"; exit 1; fi; }
total() { "${PSQL[@]}" -c "select (select count(*) from units)||'/'||(select count(*) from documents)||'/'||(select count(*) from findings)||'/'||(select count(*) from audit_schedules)||'/'||(select count(*) from document_requests)||'/'||(select count(*) from reference_materials)||'/'||(select count(*) from compliance_items)||'/'||(select count(*) from asset_reconciliations)||'/'||(select count(*) from asset_items)||'/'||(select count(*) from dataset_metadata)"; }

echo "== Seed minimal: jalan pertama"
"${PSQL[@]}" -f "$ROOT/supabase/seed-minimal.sql"
FIRST=$(total)
echo "== Jalan kedua (harus idempoten)"
"${PSQL[@]}" -f "$ROOT/supabase/seed-minimal.sql" >/dev/null
must "jumlah tetap sama (units/docs/findings/jadwal/permindok/materi/kepatuhan/rekon/asesmen/metadata)" "$(total)" "$FIRST"

echo "== Isolasi antarunit (RLS 0001, sebelum 0003)"
"${PSQL[@]}" -c "insert into auth.users values ('00000000-0000-0000-0000-0000000000a1','kpw1@contoh.test'),('00000000-0000-0000-0000-0000000000a2','kpw2@contoh.test'),('00000000-0000-0000-0000-0000000000d1','dr@contoh.test');
insert into public.user_access (user_id, role, unit_id) values ('00000000-0000-0000-0000-0000000000a1','kpw','kpw-01'),('00000000-0000-0000-0000-0000000000a2','kpw','kpw-02'),('00000000-0000-0000-0000-0000000000d1','dr','dr');" >/dev/null
as() { "${PSQL[@]}" -c "set role authenticated; select set_config('request.jwt.claims', json_build_object('sub','$1','aal','aal2')::text, false) is not null; $2" | tail -1; }
K1=00000000-0000-0000-0000-0000000000a1; K2=00000000-0000-0000-0000-0000000000a2; DR=00000000-0000-0000-0000-0000000000d1
must "KPw-01 hanya melihat unit sendiri" "$(as $K1 "select string_agg(distinct unit_id, ',') from findings")" "kpw-01"
must "KPw-01 melihat 0 temuan KPw-02/DR" "$(as $K1 "select count(*) from findings where unit_id <> 'kpw-01'")" "0"
must "KPw-02 hanya melihat unit sendiri" "$(as $K2 "select string_agg(distinct unit_id, ',') from findings")" "kpw-02"
must "KPw-01 dokumen: hanya shared + kpw-01" "$(as $K1 "select string_agg(distinct scope, ',' order by scope) from documents")" "kpw-01,shared"
must "KPw-01 kepatuhan DR" "$(as $K1 "select count(*) from compliance_items")" "0"
must "KPw-01 ubah temuan KPw-02" "$(as $K1 "with u as (update findings set status='selesai' where unit_id='kpw-02' returning 1) select count(*) from u")" "0"
must "DR melihat 3 unit" "$(as $DR "select count(distinct unit_id) from findings")" "3"

echo "== Seed lengkap sesudahnya (kompatibilitas)"
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql" >/dev/null
must "jumlah setelah seed lengkap" "$(total)" "47/1173/1688/248/954/57/32/188/1260/1"
echo "Uji seed minimal lokal: lulus"
