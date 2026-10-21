-- Uji RLS lokal (dijalankan setelah migration + seed). Gagal => exception.
-- Setiap skenario memakai klaim JWT lengkap (sub + aal) seperti token Supabase Auth.
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
  ('sekar-documents', 'shared/MAT-REF-1-ws-pengendalian.txt'),
  ('sekar-documents', 'dr/rahasia.txt'),
  ('sekar-documents', 'kpw-01/DOC-0001.txt'),
  ('sekar-documents', 'kpw-02/DOC-0002.txt');

create or replace function pg_temp.expect(label text, got bigint, want bigint) returns void language plpgsql as $$
begin
  if got is distinct from want then raise exception 'GAGAL %: dapat %, harap %', label, got, want; end if;
  raise notice 'OK %: %', label, got;
end $$;
create or replace function pg_temp.expect_bool(label text, got boolean, want boolean) returns void language plpgsql as $$
begin
  if got is distinct from want then raise exception 'GAGAL %: dapat %, harap %', label, got, want; end if;
  raise notice 'OK %: %', label, got;
end $$;
-- Simulasikan token pengguna: sub + aal (aal1 = baru login password, aal2 = sudah MFA).
create or replace function pg_temp.as_user(uid text, aal text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, false);
  select set_config('request.jwt.claim.sub', '', false);
$$;

-- ===================================================================== KPw AAL1 (belum MFA)
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b', 'aal1');
select pg_temp.expect('kpw aal1 findings', (select count(*) from public.findings), 0);
select pg_temp.expect('kpw aal1 units', (select count(*) from public.units), 0);
select pg_temp.expect('kpw aal1 documents', (select count(*) from public.documents), 0);
select pg_temp.expect('kpw aal1 references', (select count(*) from public.reference_materials), 0);
select pg_temp.expect('kpw aal1 requests', (select count(*) from public.document_requests), 0);
select pg_temp.expect('kpw aal1 asset_items', (select count(*) from public.asset_items), 0);
select pg_temp.expect('kpw aal1 metadata', (select count(*) from public.dataset_metadata), 0);
select pg_temp.expect('kpw aal1 storage', (select count(*) from storage.objects), 0);
select pg_temp.expect('kpw aal1 baca user_access sendiri (untuk layar MFA)', (select count(*) from public.user_access), 1);
with u as (update public.findings set status = 'selesai' where unit_id = 'kpw-01' returning 1) select pg_temp.expect('kpw aal1 update unit sendiri', (select count(*) from u), 0);
-- Klaim aal yang dipalsukan tanpa sub/peran tetap tidak memberi akses: tanpa user_access = tanpa data.
select set_config('request.jwt.claims', '{"aal":"aal2","role":"authenticated"}', false);
select pg_temp.expect('aal2 tanpa sub findings', (select count(*) from public.findings), 0);

-- ===================================================================== KPw AAL2
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b', 'aal2');
select pg_temp.expect('kpw units', (select count(*) from public.units), 1);
select pg_temp.expect('kpw findings non-kpw-01', (select count(*) from public.findings where unit_id <> 'kpw-01'), 0);
select pg_temp.expect_bool('kpw findings sendiri > 0', (select count(*) from public.findings where unit_id = 'kpw-01') > 0, true);
select pg_temp.expect('kpw findings DR', (select count(*) from public.findings where unit_id = 'dr'), 0);
select pg_temp.expect('kpw compliance', (select count(*) from public.compliance_items), 0);
select pg_temp.expect('kpw documents scope asing', (select count(*) from public.documents where scope not in ('shared', 'kpw-01')), 0);
select pg_temp.expect('kpw references', (select count(*) from public.reference_materials), 57);
select pg_temp.expect('kpw asset_items unit lain', (select count(*) from public.asset_items where unit_id <> 'kpw-01'), 0);
select pg_temp.expect('kpw asset_items sendiri', (select count(*) from public.asset_items where unit_id = 'kpw-01'), 21);
select pg_temp.expect('kpw user_access', (select count(*) from public.user_access), 1);
select pg_temp.expect('kpw storage', (select count(*) from storage.objects), 2);
-- Manipulasi ID: membaca/mengubah/menghapus record unit lain lewat ID langsung.
select pg_temp.expect('kpw baca TMN unit lain by id', (select count(*) from public.findings where id = (select id from public.findings limit 0) or unit_id = 'kpw-02'), 0);
with u as (update public.findings set status = 'selesai' where unit_id = 'kpw-02' returning 1) select pg_temp.expect('kpw update unit lain', (select count(*) from u), 0);
with u as (update public.document_requests set status = 'lengkap' where unit_id = 'kpw-02' returning 1) select pg_temp.expect('kpw update permindok unit lain', (select count(*) from u), 0);
with u as (delete from public.findings where unit_id = 'kpw-01' returning 1) select pg_temp.expect('kpw hapus temuan sendiri', (select count(*) from u), 0);
with u as (update public.asset_items set status = 'selesai' returning 1) select pg_temp.expect('kpw ubah asset_items', (select count(*) from u), 0);
do $$ begin
  insert into public.findings (id, unit_id, year, examiner, area, theme, title, summary, recommendation, status, due_date, pic, is_repeat)
  values ('X-1', 'kpw-01', 2026, 'BPK', 'Aset', 't', 't', 's', 'r', 'dalam_proses', '2026-12-01', 'p', false);
  raise exception 'GAGAL: kpw dapat insert temuan';
exception when insufficient_privilege then raise notice 'OK kpw insert temuan ditolak';
end $$;
-- update unit sendiri berhasil, completed_at terisi
with u as (update public.findings set status = 'selesai' where id = (select id from public.findings where unit_id = 'kpw-01' and status <> 'selesai' limit 1) returning completed_at)
select pg_temp.expect('kpw update unit sendiri + completed_at', (select count(*) from u where completed_at is not null), 1);
-- tidak bisa menaikkan peran atau mengganti unit sendiri
with u as (update public.user_access set role = 'admin' returning 1) select pg_temp.expect('kpw ubah peran sendiri', (select count(*) from u), 0);
with u as (update public.user_access set unit_id = 'kpw-02' returning 1) select pg_temp.expect('kpw ganti unit sendiri', (select count(*) from u), 0);
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
-- Rate limit: tabel tidak dapat diakses langsung; fungsi menolak setelah batas.
do $$ begin
  perform count(*) from public.rate_limits;
  raise exception 'GAGAL: rate_limits dapat dibaca langsung';
exception when insufficient_privilege then raise notice 'OK rate_limits tidak dapat diakses langsung';
end $$;
select pg_temp.expect_bool('rate limit #1', public.consume_rate_limit('uji', 2, 60), true);
select pg_temp.expect_bool('rate limit #2', public.consume_rate_limit('uji', 2, 60), true);
select pg_temp.expect_bool('rate limit #3 ditolak', public.consume_rate_limit('uji', 2, 60), false);
select pg_temp.expect_bool('rate limit bucket lain', public.consume_rate_limit('lain', 2, 60), true);

-- ===================================================================== Akun baru tanpa pemetaan (sudah MFA)
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e', 'aal2');
select pg_temp.expect('unmapped findings', (select count(*) from public.findings), 0);
select pg_temp.expect('unmapped documents', (select count(*) from public.documents), 0);
select pg_temp.expect('unmapped references', (select count(*) from public.reference_materials), 0);
select pg_temp.expect('unmapped asset_items', (select count(*) from public.asset_items), 0);
select pg_temp.expect('unmapped storage', (select count(*) from storage.objects), 0);

-- ===================================================================== Anon
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
do $$ begin
  perform count(*) from public.findings;
  raise exception 'GAGAL: anon dapat membaca findings';
exception when insufficient_privilege then raise notice 'OK anon ditolak';
end $$;
do $$ begin
  perform public.consume_rate_limit('uji', 2, 60);
  raise exception 'GAGAL: anon dapat memanggil consume_rate_limit';
exception when insufficient_privilege then raise notice 'OK anon tidak dapat memanggil fungsi rate limit';
end $$;

-- ===================================================================== DR
reset role;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d', 'aal1');
select pg_temp.expect('dr aal1 findings', (select count(*) from public.findings), 0);
select pg_temp.expect('dr aal1 compliance', (select count(*) from public.compliance_items), 0);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d', 'aal2');
select pg_temp.expect('dr findings', (select count(*) from public.findings), 1688);
select pg_temp.expect('dr findings unit dr', (select count(*) from public.findings where unit_id = 'dr'), 84);
select pg_temp.expect('dr compliance', (select count(*) from public.compliance_items), 32);
select pg_temp.expect('dr asset_items unit dr', (select count(*) from public.asset_items where unit_id = 'dr'), 90);
select pg_temp.expect('dr storage', (select count(*) from storage.objects), 4);
with u as (update public.units set name = 'x' returning 1) select pg_temp.expect('dr ubah units', (select count(*) from u), 0);
with u as (update public.user_access set role = 'admin' returning 1) select pg_temp.expect('dr naikkan peran', (select count(*) from u), 0);
-- membuka kembali mengosongkan completed_at
with u as (update public.findings set status = 'dalam_proses' where id = 'DR-TMN-001' returning completed_at)
select pg_temp.expect('dr reopen completed_at null', (select count(*) from u where completed_at is null), 1);
do $$ begin
  update public.document_requests set submitted_at = '2000-01-01' where id = 'PMD-001';
  raise exception 'GAGAL: tanggal penyampaian sebelum permintaan diterima';
exception when check_violation then raise notice 'OK submitted_at < requested_at ditolak';
end $$;

-- ===================================================================== Admin
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'aal1');
select pg_temp.expect('admin aal1 user_access (hanya baris sendiri)', (select count(*) from public.user_access), 1);
with u as (update public.units set name = name returning 1) select pg_temp.expect('admin aal1 ubah units', (select count(*) from u), 0);
do $$ begin
  insert into public.user_access values ('00000000-0000-0000-0000-00000000000e', 'kpw', 'kpw-01', 'x', now());
  raise exception 'GAGAL: admin aal1 dapat menambah pemetaan akses';
exception when insufficient_privilege then raise notice 'OK admin aal1 tambah user_access ditolak';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'aal2');
select pg_temp.expect('admin user_access', (select count(*) from public.user_access), 3);
with u as (update public.units set name = name returning 1) select pg_temp.expect('admin ubah units', (select count(*) from u), 47);
reset role;
\echo 'RLS lokal: semua pemeriksaan lulus'
