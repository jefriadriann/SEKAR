#!/usr/bin/env bash
# Menguji scripts/supabase-seed.mjs pada PostgreSQL lokal sementara (BUKAN Supabase):
# kondisi awal = migration 0001 + 0002 tanpa seed (seperti proyek uji saat ini).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || ls /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")}"
WORK="$(mktemp -d)"; RUNAS=()
if [ "$(id -u)" = "0" ]; then chown -R postgres "$WORK"; RUNAS=(runuser -u postgres --); fi
PORT="${PGPORT_TEST:-55433}"
cleanup() { "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
"${RUNAS[@]}" "$PGBIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=localhost" -l "$WORK/log" start >/dev/null
PSQL=("${RUNAS[@]}" "$PGBIN/psql" -h localhost -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t -A)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_local_stub.sql" >/dev/null
for m in 0001_sekar_schema 0002_asset_items_materials; do "${PSQL[@]}" -c "set client_min_messages=warning" -f "$ROOT/supabase/migrations/$m.sql" >/dev/null; done

# Lokal memakai auth "trust", jadi URL tanpa password.
export SUPABASE_DB_URL="postgresql://postgres@localhost:$PORT/postgres" SEKAR_SEED_ALLOW_LOCAL=1
SEED=(node "$ROOT/scripts/supabase-seed.mjs")
ok() { echo "OK $*"; }
must() { local label="$1"; shift; if "$@"; then ok "$label"; else echo "GAGAL: $label"; exit 1; fi; }
count() { "${PSQL[@]}" -c "select count(*) from public.$1"; }

echo "== 1. Target salah ditolak"
SEKAR_SEED_ALLOW_LOCAL=0 "${SEED[@]}" --check >/dev/null 2>&1 && { echo "GAGAL: host lokal tanpa izin diterima"; exit 1; } || ok "host lokal tanpa izin uji ditolak"
must "ref proyek tidak cocok → dibatalkan sebelum koneksi" bash -c 'SUPABASE_DB_URL="postgresql://postgres.bbbbbbbbbbbbbbbbbbbb:x@aws-0-xx.pooler.supabase.com:5432/postgres" SUPABASE_PROJECT_REF=aaaaaaaaaaaaaaaaaaaa node "$0" --check 2>&1 | grep -q "proyek lain"' "$ROOT/scripts/supabase-seed.mjs"
must "ref proyek kosong ditolak" bash -c 'SUPABASE_DB_URL="postgresql://postgres:x@db.aaaaaaaaaaaaaaaaaaaa.supabase.co:5432/postgres" SUPABASE_PROJECT_REF= node "$0" --check 2>&1 | grep -q "SUPABASE_PROJECT_REF wajib"' "$ROOT/scripts/supabase-seed.mjs"
PW="RAHASIA-$((40 + 2))-JANGAN-TAMPIL"
OUT=$(SUPABASE_DB_URL="postgresql://postgres:${PW}@localhost:1/postgres" "${SEED[@]}" --check 2>&1 || true)
must "error koneksi dilaporkan" bash -c 'grep -q "Query gagal" <<<"$0"' "$OUT"
must "password tidak tercetak pada error koneksi" bash -c '! grep -q "$1" <<<"$0"' "$OUT" "$PW"

echo "== 2. Data lama dipertahankan (on conflict do nothing)"
"${PSQL[@]}" -c "insert into public.units (id, name, korwil, is_dummy) values ('kpw-01', 'NAMA-LAMA', 'Sumatera', true)"

echo "== 3. Seed gagal di tengah → seluruh transaksi dibatalkan"
"${PSQL[@]}" -c "alter table public.asset_items add constraint uji_gagal check (id <> 'ASI-00500')"
"${SEED[@]}" --apply >/dev/null 2>&1 && { echo "GAGAL: seed seharusnya gagal"; exit 1; } || true
must "rollback penuh: findings=0, asset_items=0, units hanya baris lama" test "$(count findings)$(count asset_items)$(count units)" = "001"
"${PSQL[@]}" -c "alter table public.asset_items drop constraint uji_gagal"

echo "== 4. Seed utuh + verifikasi"
"${SEED[@]}" --check
"${SEED[@]}" --apply
must "baris lama tidak ditimpa" test "$("${PSQL[@]}" -c "select name from public.units where id = 'kpw-01'")" = "NAMA-LAMA"

echo "== 5. Jalankan ulang = tanpa perubahan"
must "jalankan ulang tidak menulis apa pun" bash -c 'node "$0" --apply | grep -q "Tidak ada yang perlu ditulis"' "$ROOT/scripts/supabase-seed.mjs"
must "jumlah findings tetap 1688" test "$(count findings)" = "1688"

echo "== 6. Database tanpa 0002 ditolak"
"${PSQL[@]}" -c "create database tanpa0002" >/dev/null
must "database tanpa migration ditolak" bash -c 'SUPABASE_DB_URL="postgresql://postgres:x@localhost:$1/tanpa0002" node "$0" --check 2>&1 | grep -q "0001 belum ada"' "$ROOT/scripts/supabase-seed.mjs" "$PORT"
echo "Uji script seed lokal: lulus"
