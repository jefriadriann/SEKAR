#!/usr/bin/env bash
# Menguji supabase/activate-mfa-enforcement.sql & remote-verify.sql pada PostgreSQL lokal (stub, BUKAN Supabase),
# dengan kondisi seperti proyek uji: 0001 + 0002 + seed-minimal + satu akun DR terpetakan.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || ls /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")}"
WORK="$(mktemp -d)"; RUNAS=()
if [ "$(id -u)" = "0" ]; then chown -R postgres "$WORK"; RUNAS=(runuser -u postgres --); fi
PORT="${PGPORT_TEST:-55435}"
cleanup() { "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
"${RUNAS[@]}" "$PGBIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=localhost" -l "$WORK/log" start >/dev/null
PSQL=("${RUNAS[@]}" "$PGBIN/psql" -h localhost -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t -A)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_local_stub.sql" >/dev/null
for m in 0001_sekar_schema 0002_asset_items_materials; do "${PSQL[@]}" -c "set client_min_messages=warning" -f "$ROOT/supabase/migrations/$m.sql" >/dev/null; done
"${PSQL[@]}" -f "$ROOT/supabase/seed-minimal.sql" >/dev/null
"${PSQL[@]}" -c "update public.units set korwil = 'Jawa' where id = 'kpw-02'" >/dev/null  # meniru proyek uji (seed-minimal lama)
DR=3f2875c6-6485-4324-a6b9-483b6f1ec591
"${PSQL[@]}" -c "insert into auth.users values ('$DR','dr-uji@contoh.test'); insert into public.user_access (user_id, role, unit_id, display_name) values ('$DR','dr','dr','Akun Uji');" >/dev/null
must() { if eval "$2"; then echo "OK $1"; else echo "GAGAL: $1"; exit 1; fi; }
set +e

echo "== 1. Sebelum MFA terdaftar: aktivasi dibatalkan, tidak ada perubahan"
OUT=$("${PSQL[@]}" -f "$ROOT/supabase/activate-mfa-enforcement.sql" 2>&1 || true)
must "penjaga membatalkan aktivasi" 'grep -q "DIBATALKAN" <<<"$OUT"'
must "0003 belum diterapkan" '[ "$("${PSQL[@]}" -c "select to_regclass('"'"'public.rate_limits'"'"') is null")" = "t" ]'

echo "== 2. Baseline sebelum enforcement (verifikasi saja): aal1 masih dapat membaca"
BASE=$("${PSQL[@]}" -c "set client_min_messages=warning" -f "$ROOT/supabase/tests/remote-verify.sql" 2>&1); echo "$BASE" | head -5
must "baseline menunjukkan celah aal1 (GAGAL pada uji DR tanpa MFA)" 'grep -q "DR tanpa MFA (aal1): temuan terbaca|0|12|GAGAL" <<<"$BASE"'

echo "== 3. Setelah TOTP terverifikasi: aktivasi + verifikasi"
"${PSQL[@]}" -c "insert into auth.mfa_factors values (gen_random_uuid(), '$DR', 'totp', 'verified')" >/dev/null
RES=$("${PSQL[@]}" -c "set client_min_messages=warning" -f "$ROOT/supabase/activate-mfa-enforcement.sql" 2>&1)
echo "$RES" | grep -E "^[0-9]+\|"
must "semua uji LULUS" '! grep -q "|GAGAL$" <<<"$RES" && [ "$(grep -c "|LULUS$" <<<"$RES")" = "28" ]'
must "korwil kpw-02 disinkronkan ke Sumatera" '[ "$("${PSQL[@]}" -c "select korwil from units where id='"'"'kpw-02'"'"'")" = "Sumatera" ]'
must "uji undangan tidak meninggalkan baris (rollback)" '[ "$("${PSQL[@]}" -c "select count(*) from pending_invites")" = "0" ]'
must "tidak ada data berubah (peran DR & status temuan kpw-02 utuh)" '[ "$("${PSQL[@]}" -c "select (select role from user_access where user_id='"'"'$DR'"'"')||(select count(*) from findings where unit_id='"'"'kpw-02'"'"' and status='"'"'selesai'"'"')")" = "dr1" ]'

echo "== 4. Dijalankan ulang (idempoten)"
RES2=$("${PSQL[@]}" -c "set client_min_messages=warning" -f "$ROOT/supabase/activate-mfa-enforcement.sql" 2>&1)
must "jalan kedua tetap 28 LULUS" '[ "$(grep -c "|LULUS$" <<<"$RES2")" = "28" ]'
echo "Uji aktivasi lokal: lulus"
