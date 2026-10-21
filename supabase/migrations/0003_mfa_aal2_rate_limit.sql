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
