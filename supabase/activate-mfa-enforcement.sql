-- DIHASILKAN OTOMATIS oleh scripts/generate-activation-sql.mjs — jangan diedit manual.
-- SEKAR — AKTIVASI ENFORCEMENT MFA untuk proyek Supabase UJI (SQL Editor, jalankan sekali; aman diulang).
-- 1) Penjaga: batal bila belum ada akun SEKAR dengan authenticator (TOTP) terverifikasi.
-- 2) Migration 0003 (RLS wajib aal2 + rate limit) dan 0004 (pengerasan default).
-- 3) Verifikasi di dalam subtransaksi yang selalu di-rollback → tabel LULUS/GAGAL.
-- Rollback: supabase/rollback/0004_*.down.sql lalu 0003_*.down.sql.

do $$ begin
  if not exists (
    select 1 from auth.mfa_factors f join public.user_access u on u.user_id = f.user_id
    where f.status::text = 'verified' and f.factor_type::text = 'totp'
  ) then
    raise exception 'DIBATALKAN: belum ada akun SEKAR dengan authenticator (TOTP) terverifikasi. Selesaikan pendaftaran MFA di website, lalu jalankan ulang. Tidak ada perubahan.';
  end if;
end $$;

-- ===== supabase/migrations/0003_mfa_aal2_rate_limit.sql =====
-- SEKAR v1.4: MFA wajib (AAL2) untuk seluruh data + rate limit endpoint sensitif.
--
-- Mengikuti panduan resmi Supabase "Enforce rules for MFA logins": policy
-- RESTRICTIVE yang menolak JWT dengan klaim aal selain 'aal2'. Policy
-- restrictive di-AND-kan dengan policy permissive yang sudah ada (peran/unit),
-- sehingga AAL2 TIDAK menggantikan otorisasi peran — keduanya wajib terpenuhi.
--
-- Pengecualian yang disengaja: pengguna AAL1 tetap boleh membaca baris
-- user_access MILIKNYA SENDIRI (tanpa data audit) agar aplikasi dapat
-- menampilkan pendaftaran/challenge MFA. Pendaftaran faktor sendiri ditangani
-- Supabase Auth API, bukan tabel aplikasi.
--
-- Rollback: lihat SECURITY.md bagian "Rollback" (drop policy *_require_aal2,
-- drop function consume_rate_limit, drop table rate_limits).

begin;

-- ---------------------------------------------------------------------------
-- Fungsi bantu: sesi saat ini sudah menyelesaikan MFA (aal2)?
-- ---------------------------------------------------------------------------
create or replace function public.is_aal2() returns boolean
language sql stable set search_path = public as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
$$;
revoke all on function public.is_aal2() from public, anon;
grant execute on function public.is_aal2() to authenticated;

-- ---------------------------------------------------------------------------
-- Policy RESTRICTIVE AAL2 untuk setiap tabel data (semua operasi).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'dataset_metadata', 'units', 'documents', 'findings', 'audit_schedules', 'document_requests',
    'reference_materials', 'compliance_items', 'asset_reconciliations', 'asset_items'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_require_aal2', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (public.is_aal2()) with check (public.is_aal2())',
      t || '_require_aal2', t);
  end loop;
end $$;

-- user_access: AAL1 hanya boleh membaca baris sendiri; semua penulisan wajib AAL2
-- (dan tetap hanya admin lewat policy yang sudah ada).
drop policy if exists user_access_require_aal2_select on public.user_access;
create policy user_access_require_aal2_select on public.user_access as restrictive for select to authenticated
  using (public.is_aal2() or user_id = auth.uid());
drop policy if exists user_access_require_aal2_insert on public.user_access;
create policy user_access_require_aal2_insert on public.user_access as restrictive for insert to authenticated
  with check (public.is_aal2());
drop policy if exists user_access_require_aal2_update on public.user_access;
create policy user_access_require_aal2_update on public.user_access as restrictive for update to authenticated
  using (public.is_aal2()) with check (public.is_aal2());
drop policy if exists user_access_require_aal2_delete on public.user_access;
create policy user_access_require_aal2_delete on public.user_access as restrictive for delete to authenticated
  using (public.is_aal2());

-- Storage: berkas dokumen juga wajib AAL2 (berlaku untuk signed URL yang dibuat dengan token pengguna).
drop policy if exists sekar_docs_require_aal2 on storage.objects;
create policy sekar_docs_require_aal2 on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'sekar-documents' or public.is_aal2())
  with check (bucket_id <> 'sekar-documents' or public.is_aal2());

-- ---------------------------------------------------------------------------
-- Rate limit per pengguna (fixed window) yang bekerja di serverless:
-- status disimpan di Postgres, bukan memori proses.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  hits int not null,
  primary key (user_id, bucket)
);
alter table public.rate_limits enable row level security;
-- Tanpa policy dan tanpa grant: hanya dapat diakses lewat fungsi di bawah.
revoke all on public.rate_limits from public, anon, authenticated;

create or replace function public.consume_rate_limit(p_bucket text, p_max int, p_window_seconds int) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  used int;
begin
  if uid is null then return false; end if;
  if p_bucket !~ '^[a-z_]{1,32}$' or p_max not between 1 and 1000 or p_window_seconds not between 1 and 3600 then
    raise exception 'Parameter rate limit tidak valid';
  end if;
  insert into public.rate_limits as r (user_id, bucket, window_start, hits)
  values (uid, p_bucket, clock_timestamp(), 1)
  on conflict (user_id, bucket) do update set
    hits = case when r.window_start < clock_timestamp() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < clock_timestamp() - make_interval(secs => p_window_seconds) then clock_timestamp() else r.window_start end
  returning hits into used;
  return used <= p_max;
end $$;
revoke all on function public.consume_rate_limit(text, int, int) from public, anon;
grant execute on function public.consume_rate_limit(text, int, int) to authenticated;

commit;

-- ===== supabase/migrations/0004_harden_defaults.sql =====
-- SEKAR v1.5: pengerasan default database (tidak mengubah data maupun hak pengguna yang sah).
--  * search_path tetap untuk fungsi trigger (lint Supabase "function_search_path_mutable").
--  * Objek BARU di schema public tidak otomatis dapat diakses anon (Supabase memberi grant
--    default ke anon untuk objek baru; RLS tetap berlaku, tetapi deny-by-default lebih aman).
--  * Fungsi trigger tidak dapat dipanggil langsung oleh public/anon.
-- Rollback: supabase/rollback/0004_harden_defaults.down.sql
begin;

alter function public.findings_sync_completed() set search_path = public;
alter function public.guard_followup_columns() set search_path = public;
revoke execute on function public.findings_sync_completed(), public.guard_followup_columns() from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

commit;

-- ===== supabase/tests/remote-verify.sql =====
-- SEKAR — VERIFIKASI keamanan di Supabase sungguhan (SQL Editor). AMAN: seluruh uji berjalan
-- di dalam subtransaksi yang SELALU di-rollback; tidak ada data yang berubah. Hasil: tabel LULUS/GAGAL.
-- Menyimulasikan token pengguna (sub + aal) seperti PostgREST, lalu menguji RLS + MFA (aal2).
-- Akun uji: baris user_access DR di bawah. Skenario KPw disimulasikan dengan mengubah sementara
-- peran akun itu menjadi KPw unit kpw-01 (ikut di-rollback).
create or replace function pg_temp.sekar_verify(dr_user uuid)
returns table (no int, uji text, harapan text, aktual text, hasil text)
language plpgsql as $$
declare
  t text[] := '{}'; e text[] := '{}'; a text[] := '{}';
  n_all int; n_units int; n_comp int; n_k1 int;
  procedure_dummy int; -- penampung hasil UPDATE ... RETURNING
begin
  if not exists (select 1 from public.user_access where user_id = dr_user) then
    raise exception 'Akun uji % tidak ada di public.user_access', dr_user;
  end if;
  -- Nilai acuan dihitung sebagai pemilik database (tanpa RLS).
  select count(*) into n_all from public.findings;
  select count(*) into n_units from public.units;
  select count(*) into n_comp from public.compliance_items;
  select count(*) into n_k1 from public.findings where unit_id = 'kpw-01';

  begin
    -- ---------------------------------------------------------- DR, belum MFA (aal1)
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', dr_user, 'role', 'authenticated', 'aal', 'aal1')::text, true);
    t := t || text 'DR tanpa MFA (aal1): temuan terbaca'; e := e || text '0'; a := a || (select count(*) from public.findings)::text;
    t := t || text 'DR tanpa MFA: kepatuhan terbaca'; e := e || text '0'; a := a || (select count(*) from public.compliance_items)::text;
    t := t || text 'DR tanpa MFA: baris user_access sendiri (agar layar MFA bisa tampil)'; e := e || text '1'; a := a || (select count(*) from public.user_access)::text;
    -- ---------------------------------------------------------- DR, sudah MFA (aal2)
    perform set_config('request.jwt.claims', json_build_object('sub', dr_user, 'role', 'authenticated', 'aal', 'aal2')::text, true);
    t := t || text 'DR dengan MFA: seluruh temuan terbaca'; e := e || n_all::text; a := a || (select count(*) from public.findings)::text;
    t := t || text 'DR dengan MFA: seluruh unit terbaca'; e := e || n_units::text; a := a || (select count(*) from public.units)::text;
    t := t || text 'DR dengan MFA: kepatuhan DR terbaca'; e := e || n_comp::text; a := a || (select count(*) from public.compliance_items)::text;
    with u as (update public.user_access set role = 'admin' where user_id = dr_user returning 1)
      select count(*) into procedure_dummy from u;
    t := t || text 'DR menaikkan peran sendiri menjadi admin'; e := e || text '0'; a := a || procedure_dummy::text;
    -- ---------------------------------------------------------- simulasi KPw kpw-01
    reset role;
    update public.user_access set role = 'kpw', unit_id = 'kpw-01' where user_id = dr_user;
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', dr_user, 'role', 'authenticated', 'aal', 'aal2')::text, true);
    t := t || text 'KPw dengan MFA: temuan unit sendiri'; e := e || n_k1::text; a := a || (select count(*) from public.findings where unit_id = 'kpw-01')::text;
    t := t || text 'KPw: temuan unit lain (kpw-02 / DR)'; e := e || text '0'; a := a || (select count(*) from public.findings where unit_id <> 'kpw-01')::text;
    t := t || text 'KPw: kepatuhan DR'; e := e || text '0'; a := a || (select count(*) from public.compliance_items)::text;
    t := t || text 'KPw: dokumen di luar shared/kpw-01'; e := e || text '0'; a := a || (select count(*) from public.documents where scope not in ('shared', 'kpw-01'))::text;
    t := t || text 'KPw: rekonsiliasi & asesmen aset unit lain'; e := e || text '0';
      a := a || ((select count(*) from public.asset_reconciliations where unit_id <> 'kpw-01') + (select count(*) from public.asset_items where unit_id <> 'kpw-01'))::text;
    with u as (update public.findings set status = 'selesai' where unit_id = 'kpw-02' returning 1) select count(*) into procedure_dummy from u;
    t := t || text 'KPw: ubah temuan kpw-02 lewat ID/filter'; e := e || text '0'; a := a || procedure_dummy::text;
    with u as (update public.user_access set role = 'dr', unit_id = 'dr' where user_id = dr_user returning 1) select count(*) into procedure_dummy from u;
    t := t || text 'KPw: ganti peran/unit sendiri'; e := e || text '0'; a := a || procedure_dummy::text;
    perform set_config('request.jwt.claims', json_build_object('sub', dr_user, 'role', 'authenticated', 'aal', 'aal1')::text, true);
    t := t || text 'KPw tanpa MFA (aal1): temuan terbaca'; e := e || text '0'; a := a || (select count(*) from public.findings)::text;
    perform set_config('request.jwt.claims', json_build_object('aal', 'aal2', 'role', 'authenticated')::text, true);
    t := t || text 'Token aal2 tanpa akun (sub kosong): temuan terbaca'; e := e || text '0'; a := a || (select count(*) from public.findings)::text;
    reset role;
    raise exception 'SEKAR_VERIFY_ROLLBACK';
  exception when raise_exception then
    if sqlerrm <> 'SEKAR_VERIFY_ROLLBACK' then raise; end if;
  end;

  -- ---------------------------------------------------------- konfigurasi (dibaca sebagai pemilik)
  t := t || text 'Peran akun uji tetap DR setelah uji (rollback)'; e := e || text 'dr'; a := a || (select role from public.user_access where user_id = dr_user);
  t := t || text 'Anon: hak baca tabel temuan'; e := e || text 'false'; a := a || has_table_privilege('anon', 'public.findings', 'select')::text;
  t := t || text 'Anon: eksekusi fungsi rate limit'; e := e || text 'false';
    a := a || case when to_regprocedure('public.consume_rate_limit(text,integer,integer)') is null then 'tidak ada'
                   else has_function_privilege('anon', 'public.consume_rate_limit(text,integer,integer)', 'execute')::text end;
  t := t || text 'Policy RESTRICTIVE aal2 terpasang'; e := e || text '15'; a := a || (select count(*) from pg_policies where policyname like '%require_aal2%' and permissive = 'RESTRICTIVE')::text;
  t := t || text 'RLS aktif di semua tabel public'; e := e || text '0';
    a := a || (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity)::text;
  t := t || text 'Akun terpetakan dengan TOTP terverifikasi'; e := e || text 'ya';
    a := a || case when exists (select 1 from auth.mfa_factors f join public.user_access u on u.user_id = f.user_id where f.status::text = 'verified' and f.factor_type::text = 'totp') then 'ya' else 'tidak' end;

  return query select i, t[i], e[i], a[i], case when e[i] = a[i] then 'LULUS' else 'GAGAL' end from generate_subscripts(t, 1) as i;
end $$;

select * from pg_temp.sekar_verify('3f2875c6-6485-4324-a6b9-483b6f1ec591') order by no;
