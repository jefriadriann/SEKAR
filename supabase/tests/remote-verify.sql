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
