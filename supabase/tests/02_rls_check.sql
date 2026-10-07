-- Uji RLS lokal (dijalankan setelah migration + seed). Gagal => exception.
\set ON_ERROR_STOP on
insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', 'admin@contoh.test'),
  ('00000000-0000-0000-0000-00000000000d', 'dr@contoh.test'),
  ('00000000-0000-0000-0000-00000000000b', 'kpw@contoh.test'),
  ('00000000-0000-0000-0000-00000000000e', 'baru@contoh.test')
on conflict do nothing;
insert into public.user_access (user_id, role, unit_id, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'admin', 'dr', 'Admin Uji'),
  ('00000000-0000-0000-0000-00000000000d', 'dr', 'dr', 'DR Uji'),
  ('00000000-0000-0000-0000-00000000000b', 'kpw', 'kpw-01', 'KPw Uji')
on conflict do nothing;
insert into storage.objects (bucket_id, name) values
  ('sekar-documents', 'shared/REFDOC-1-worksheet.txt'),
  ('sekar-documents', 'dr/rahasia.txt'),
  ('sekar-documents', 'kpw-01/DOC-0001.txt'),
  ('sekar-documents', 'kpw-02/DOC-0002.txt');

create or replace function pg_temp.expect(label text, got bigint, want bigint) returns void language plpgsql as $$
begin
  if got is distinct from want then raise exception 'GAGAL %: dapat %, harap %', label, got, want; end if;
  raise notice 'OK %: %', label, got;
end $$;

-- KPw
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select pg_temp.expect('kpw units', (select count(*) from public.units), 1);
select pg_temp.expect('kpw findings non-kpw-01', (select count(*) from public.findings where unit_id <> 'kpw-01'), 0);
select pg_temp.expect('kpw findings DR', (select count(*) from public.findings where unit_id = 'dr'), 0);
select pg_temp.expect('kpw compliance', (select count(*) from public.compliance_items), 0);
select pg_temp.expect('kpw documents scope asing', (select count(*) from public.documents where scope not in ('shared', 'kpw-01')), 0);
select pg_temp.expect('kpw references', (select count(*) from public.reference_materials), 32);
select pg_temp.expect('kpw user_access', (select count(*) from public.user_access), 1);
select pg_temp.expect('kpw storage', (select count(*) from storage.objects), 2);
-- update unit lain tidak berpengaruh
with u as (update public.findings set status = 'selesai' where unit_id = 'kpw-02' returning 1) select pg_temp.expect('kpw update unit lain', (select count(*) from u), 0);
-- update unit sendiri berhasil, completed_at terisi
with u as (update public.findings set status = 'selesai' where id = (select id from public.findings where unit_id = 'kpw-01' and status <> 'selesai' limit 1) returning completed_at)
select pg_temp.expect('kpw update unit sendiri + completed_at', (select count(*) from u where completed_at is not null), 1);
-- tidak bisa menaikkan peran sendiri
with u as (update public.user_access set role = 'admin' returning 1) select pg_temp.expect('kpw ubah peran sendiri', (select count(*) from u), 0);
do $$ begin
  insert into public.user_access values ('00000000-0000-0000-0000-00000000000e', 'admin', 'dr', 'x', now());
  raise exception 'GAGAL: kpw dapat insert user_access';
exception when insufficient_privilege then raise notice 'OK kpw insert user_access ditolak';
end $$;
do $$ begin
  update public.findings set title = 'ubah' where unit_id = 'kpw-01';
  raise exception 'GAGAL: kpw dapat ubah judul temuan';
exception when raise_exception then
  if sqlerrm like 'GAGAL%' then raise; end if;
  raise notice 'OK kpw ubah kolom non-tindak-lanjut ditolak';
end $$;

-- Akun baru tanpa pemetaan
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
select pg_temp.expect('unmapped findings', (select count(*) from public.findings), 0);
select pg_temp.expect('unmapped documents', (select count(*) from public.documents), 0);
select pg_temp.expect('unmapped references', (select count(*) from public.reference_materials), 0);
select pg_temp.expect('unmapped storage', (select count(*) from storage.objects), 0);

-- Anon
reset role;
set role anon;
do $$ begin
  perform count(*) from public.findings;
  raise exception 'GAGAL: anon dapat membaca findings';
exception when insufficient_privilege then raise notice 'OK anon ditolak';
end $$;

-- DR
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
select pg_temp.expect('dr findings', (select count(*) from public.findings), 659);
select pg_temp.expect('dr findings unit dr', (select count(*) from public.findings where unit_id = 'dr'), 24);
select pg_temp.expect('dr compliance', (select count(*) from public.compliance_items), 24);
select pg_temp.expect('dr storage', (select count(*) from storage.objects), 4);
with u as (update public.units set name = 'x' returning 1) select pg_temp.expect('dr ubah units', (select count(*) from u), 0);
-- membuka kembali mengosongkan completed_at
with u as (update public.findings set status = 'dalam_proses' where id = 'DR-TMN-001' returning completed_at)
select pg_temp.expect('dr reopen completed_at null', (select count(*) from u where completed_at is null), 1);
do $$ begin
  update public.document_requests set submitted_at = '2000-01-01' where id = 'PMD-001';
  raise exception 'GAGAL: tanggal penyampaian sebelum permintaan diterima';
exception when check_violation then raise notice 'OK submitted_at < requested_at ditolak';
end $$;

-- Admin
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select pg_temp.expect('admin user_access', (select count(*) from public.user_access), 3);
with u as (update public.units set name = name returning 1) select pg_temp.expect('admin ubah units', (select count(*) from u), 47);
reset role;
\echo 'RLS lokal: semua pemeriksaan lulus'
