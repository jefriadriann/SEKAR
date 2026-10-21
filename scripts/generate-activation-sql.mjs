#!/usr/bin/env node
// Membuat supabase/activate-mfa-enforcement.sql untuk SQL Editor Supabase:
//   penjaga (wajib sudah ada akun dengan TOTP terverifikasi) → 0003 → 0004 → 0005 → sinkron korwil
//   → verifikasi (rollback).
// Sumber tunggal: file migration & supabase/tests/remote-verify.sql (jangan edit hasilnya manual).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8").trim();
const { regions } = JSON.parse(readFileSync(join(root, "data/base/kpw-regions.json"), "utf8"));
const quote = (v) => `'${String(v).replace(/'/g, "''")}'`;
const korwilValues = regions.map((r) => `  (${quote(r.unit_id)}, ${quote(r.korwil)})`).join(",\n");
const sql = `-- DIHASILKAN OTOMATIS oleh scripts/generate-activation-sql.mjs — jangan diedit manual.
-- SEKAR — AKTIVASI ENFORCEMENT MFA untuk proyek Supabase UJI (SQL Editor, jalankan sekali; aman diulang).
-- 1) Penjaga: batal bila belum ada akun SEKAR dengan authenticator (TOTP) terverifikasi.
-- 2) Migration 0003 (RLS wajib aal2 + rate limit), 0004 (pengerasan default), 0005 (undangan pengguna).
-- 3) Sinkronisasi nama korwil unit yang SUDAH ADA (Sumatera, Jawa, Balinusra, Kalimantan, Sulampua);
--    tidak menambah/menghapus baris dan tidak menyentuh data audit.
-- 4) Verifikasi di dalam subtransaksi yang selalu di-rollback → tabel LULUS/GAGAL.
-- Rollback: supabase/rollback/0005_*.down.sql → 0004_*.down.sql → 0003_*.down.sql.

do $$ begin
  if not exists (
    select 1 from auth.mfa_factors f join public.user_access u on u.user_id = f.user_id
    where f.status::text = 'verified' and f.factor_type::text = 'totp'
  ) then
    raise exception 'DIBATALKAN: belum ada akun SEKAR dengan authenticator (TOTP) terverifikasi. Selesaikan pendaftaran MFA di website, lalu jalankan ulang. Tidak ada perubahan.';
  end if;
end $$;

-- ===== supabase/migrations/0003_mfa_aal2_rate_limit.sql =====
${read("supabase/migrations/0003_mfa_aal2_rate_limit.sql")}

-- ===== supabase/migrations/0004_harden_defaults.sql =====
${read("supabase/migrations/0004_harden_defaults.sql")}

-- ===== supabase/migrations/0005_pending_invites.sql =====
${read("supabase/migrations/0005_pending_invites.sql")}

-- ===== sinkronisasi korwil (data/base/kpw-regions.json) =====
update public.units u set korwil = v.korwil
from (values
${korwilValues}
) as v(id, korwil)
where u.id = v.id and u.korwil is distinct from v.korwil;

-- ===== supabase/tests/remote-verify.sql =====
${read("supabase/tests/remote-verify.sql")}
`;
writeFileSync(join(root, "supabase/activate-mfa-enforcement.sql"), sql);
console.log(`supabase/activate-mfa-enforcement.sql ditulis (${sql.length.toLocaleString()} karakter).`);
