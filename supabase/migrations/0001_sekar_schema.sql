-- SEKAR — skema Supabase OPSIONAL (mode APP_DATA_MODE=supabase).
-- Belum diuji terhadap proyek Supabase nyata di repo ini; jalankan di proyek
-- uji terlebih dahulu. Tidak ada data audit riil; seed hanya data simulasi.
--
-- Prinsip keamanan:
--  * Peran & unit disimpan di public.user_access yang HANYA dapat diubah admin
--    (bukan dari user_metadata yang bisa diubah pengguna sendiri).
--  * Akun baru tidak memiliki baris user_access => tidak berwenang membaca apa pun.
--  * RLS aktif di SEMUA tabel, termasuk documents dan reference_materials.
--  * Bucket storage privat; dokumen DR hanya DR/admin; dokumen KPw sesuai unit.

begin;

-- ---------------------------------------------------------------------------
-- Tabel
-- ---------------------------------------------------------------------------
create table if not exists public.dataset_metadata (
  id smallint primary key default 1 check (id = 1),
  name text not null,
  version text not null,
  as_of date not null,
  all_data_is_synthetic boolean not null default true check (all_data_is_synthetic),
  note text
);

create table if not exists public.units (
  id text primary key,
  name text not null,
  korwil text,
  is_dummy boolean not null default true,
  constraint units_korwil_required check (id = 'dr' or korwil is not null)
);

create table if not exists public.user_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('dr', 'kpw', 'admin')),
  unit_id text not null references public.units (id),
  display_name text,
  created_at timestamptz not null default now(),
  constraint user_access_kpw_unit check (role <> 'kpw' or unit_id <> 'dr')
);

create table if not exists public.documents (
  id text primary key,
  scope text not null, -- 'shared' atau units.id
  title text not null,
  kind text not null,
  content_text text not null,
  storage_path text, -- path objek di bucket privat 'sekar-documents' (opsional)
  is_dummy boolean not null default true,
  constraint documents_scope_valid check (scope = 'shared' or scope is not null)
);

create table if not exists public.findings (
  id text primary key,
  unit_id text not null references public.units (id),
  year int not null,
  examiner text not null check (examiner in ('BPK', 'DAI', 'KAA')),
  area text not null,
  theme text not null,
  title text not null,
  summary text not null,
  recommendation text not null,
  status text not null check (status in ('selesai', 'dalam_proses', 'belum_ditindaklanjuti')),
  due_date date not null,
  completed_at date,
  pic text not null,
  is_repeat boolean not null default false,
  evidence_document_id text references public.documents (id),
  is_dummy boolean not null default true,
  constraint findings_completed_consistent check ((status = 'selesai') = (completed_at is not null))
);

create table if not exists public.audit_schedules (
  id text primary key,
  unit_id text not null references public.units (id),
  year int not null,
  examiner text not null check (examiner in ('BPK', 'DAI', 'KAA')),
  exam_type text not null,
  start_date date not null,
  end_date date not null,
  date_confirmed boolean not null default false,
  is_dummy boolean not null default true,
  constraint schedules_dates check (end_date >= start_date)
);

create table if not exists public.document_requests (
  id text primary key,
  schedule_id text not null references public.audit_schedules (id),
  unit_id text not null references public.units (id),
  category text not null,
  title text not null,
  dr_note text not null default '',
  requested_at date not null,
  due_date date not null,
  submitted_at date,
  status text not null check (status in ('lengkap', 'bertahap', 'dalam_proses', 'belum_dikirim')),
  document_id text references public.documents (id),
  is_dummy boolean not null default true,
  constraint requests_due_after_request check (due_date >= requested_at),
  constraint requests_submitted_after_request check (submitted_at is null or submitted_at >= requested_at),
  constraint requests_lengkap_needs_date check (status <> 'lengkap' or submitted_at is not null),
  constraint requests_belum_dikirim_no_date check (status <> 'belum_dikirim' or submitted_at is null)
);

-- "references" adalah kata kunci SQL, sehingga tabel diberi nama reference_materials.
create table if not exists public.reference_materials (
  id text primary key,
  scope text not null,
  area text not null,
  kind text not null check (kind in ('worksheet', 'ketentuan', 'tutorial')),
  title text not null,
  description text not null,
  document_id text not null references public.documents (id),
  is_dummy boolean not null default true
);

create table if not exists public.compliance_items (
  id text primary key,
  unit_id text not null references public.units (id),
  aspect text not null,
  pic text not null,
  due_date date not null,
  status text not null check (status in ('selesai', 'dalam_proses', 'belum_dimulai')),
  is_dummy boolean not null default true
);

create table if not exists public.asset_reconciliations (
  id text primary key,
  unit_id text not null references public.units (id),
  year int not null,
  total_items int not null check (total_items >= 0),
  reconciled_items int not null check (reconciled_items >= 0),
  discrepancy_items int not null check (discrepancy_items >= 0),
  note text not null default '',
  is_dummy boolean not null default true,
  constraint assets_total check (total_items = reconciled_items + discrepancy_items)
);

create index if not exists findings_unit_idx on public.findings (unit_id);
create index if not exists requests_unit_idx on public.document_requests (unit_id);
create index if not exists schedules_unit_idx on public.audit_schedules (unit_id);
create index if not exists assets_unit_idx on public.asset_reconciliations (unit_id);
create index if not exists compliance_unit_idx on public.compliance_items (unit_id);
create index if not exists documents_scope_idx on public.documents (scope);

-- ---------------------------------------------------------------------------
-- Fungsi bantu (SECURITY DEFINER agar tidak rekursif terhadap RLS user_access)
-- ---------------------------------------------------------------------------
create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.user_access where user_id = auth.uid()
$$;

create or replace function public.app_unit() returns text
language sql stable security definer set search_path = public as $$
  select unit_id from public.user_access where user_id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'admin', false)
$$;

create or replace function public.is_dr_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('dr', 'admin'), false)
$$;

-- Boleh melihat data unit tertentu: DR/admin semua unit; KPw hanya unit sendiri (bukan DR).
create or replace function public.can_see_unit(target text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.app_role() in ('dr', 'admin') then true
    when public.app_role() = 'kpw' then target = public.app_unit() and target <> 'dr'
    else false
  end
$$;

-- Boleh melihat dokumen dengan scope tertentu.
create or replace function public.can_see_scope(target text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.app_role() is null then false
    when target = 'shared' then true
    else public.can_see_unit(target)
  end
$$;

revoke all on function public.app_role(), public.app_unit(), public.is_admin(), public.is_dr_or_admin(),
  public.can_see_unit(text), public.can_see_scope(text) from public, anon;
grant execute on function public.app_role(), public.app_unit(), public.is_admin(), public.is_dr_or_admin(),
  public.can_see_unit(text), public.can_see_scope(text) to authenticated;

-- completed_at mengikuti status (selesai mengisi, membuka kembali mengosongkan).
create or replace function public.findings_sync_completed() returns trigger
language plpgsql as $$
begin
  if new.status = 'selesai' and new.completed_at is null then
    new.completed_at := current_date;
  elsif new.status <> 'selesai' then
    new.completed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists findings_sync_completed on public.findings;
create trigger findings_sync_completed before insert or update on public.findings
for each row execute function public.findings_sync_completed();

-- Pengguna non-admin hanya boleh mengubah kolom tindak lanjut, bukan identitas/unit record.
create or replace function public.guard_followup_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if tg_table_name = 'findings' then
    if (new.id, new.unit_id, new.year, new.examiner, new.area, new.theme, new.title, new.summary, new.recommendation, new.due_date, new.pic, new.evidence_document_id)
       is distinct from
       (old.id, old.unit_id, old.year, old.examiner, old.area, old.theme, old.title, old.summary, old.recommendation, old.due_date, old.pic, old.evidence_document_id) then
      raise exception 'Hanya status tindak lanjut yang boleh diubah';
    end if;
  elsif tg_table_name = 'document_requests' then
    if (new.id, new.unit_id, new.schedule_id, new.category, new.title, new.requested_at, new.due_date, new.document_id)
       is distinct from
       (old.id, old.unit_id, old.schedule_id, old.category, old.title, old.requested_at, old.due_date, old.document_id) then
      raise exception 'Hanya status, tanggal penyampaian dan catatan yang boleh diubah';
    end if;
    -- KPw tidak boleh mengubah catatan DR.
    if public.app_role() = 'kpw' and new.dr_note is distinct from old.dr_note then
      raise exception 'Catatan DR hanya dapat diubah oleh DR/admin';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists findings_guard on public.findings;
create trigger findings_guard before update on public.findings
for each row execute function public.guard_followup_columns();
drop trigger if exists requests_guard on public.document_requests;
create trigger requests_guard before update on public.document_requests
for each row execute function public.guard_followup_columns();

-- ---------------------------------------------------------------------------
-- Row Level Security — setiap tabel, setiap operasi
-- ---------------------------------------------------------------------------
alter table public.dataset_metadata enable row level security;
alter table public.units enable row level security;
alter table public.user_access enable row level security;
alter table public.documents enable row level security;
alter table public.findings enable row level security;
alter table public.audit_schedules enable row level security;
alter table public.document_requests enable row level security;
alter table public.reference_materials enable row level security;
alter table public.compliance_items enable row level security;
alter table public.asset_reconciliations enable row level security;

-- Anon tidak memperoleh hak apa pun.
revoke all on all tables in schema public from anon;

-- dataset_metadata
create policy metadata_select on public.dataset_metadata for select to authenticated using (public.app_role() is not null);
create policy metadata_admin_write on public.dataset_metadata for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- user_access: pengguna hanya membaca barisnya sendiri; hanya admin yang mengelola.
create policy access_select_self on public.user_access for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy access_admin_insert on public.user_access for insert to authenticated with check (public.is_admin());
create policy access_admin_update on public.user_access for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy access_admin_delete on public.user_access for delete to authenticated using (public.is_admin());

-- units
create policy units_select on public.units for select to authenticated using (public.can_see_unit(id));
create policy units_admin_insert on public.units for insert to authenticated with check (public.is_admin());
create policy units_admin_update on public.units for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy units_admin_delete on public.units for delete to authenticated using (public.is_admin());

-- documents
create policy documents_select on public.documents for select to authenticated using (public.can_see_scope(scope));
create policy documents_admin_insert on public.documents for insert to authenticated with check (public.is_admin());
create policy documents_admin_update on public.documents for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy documents_admin_delete on public.documents for delete to authenticated using (public.is_admin());

-- reference_materials
create policy references_select on public.reference_materials for select to authenticated using (public.can_see_scope(scope));
create policy references_admin_insert on public.reference_materials for insert to authenticated with check (public.is_admin());
create policy references_admin_update on public.reference_materials for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy references_admin_delete on public.reference_materials for delete to authenticated using (public.is_admin());

-- findings: baca sesuai unit; update status oleh admin/DR (semua) atau KPw (unit sendiri).
create policy findings_select on public.findings for select to authenticated using (public.can_see_unit(unit_id));
create policy findings_update on public.findings for update to authenticated
  using (public.can_see_unit(unit_id)) with check (public.can_see_unit(unit_id));
create policy findings_admin_insert on public.findings for insert to authenticated with check (public.is_admin());
create policy findings_admin_delete on public.findings for delete to authenticated using (public.is_admin());

-- audit_schedules
create policy schedules_select on public.audit_schedules for select to authenticated using (public.can_see_unit(unit_id));
create policy schedules_write_insert on public.audit_schedules for insert to authenticated with check (public.is_dr_or_admin());
create policy schedules_write_update on public.audit_schedules for update to authenticated using (public.is_dr_or_admin()) with check (public.is_dr_or_admin());
create policy schedules_admin_delete on public.audit_schedules for delete to authenticated using (public.is_admin());

-- document_requests
create policy requests_select on public.document_requests for select to authenticated using (public.can_see_unit(unit_id));
create policy requests_update on public.document_requests for update to authenticated
  using (public.can_see_unit(unit_id)) with check (public.can_see_unit(unit_id));
create policy requests_insert on public.document_requests for insert to authenticated with check (public.is_dr_or_admin());
create policy requests_admin_delete on public.document_requests for delete to authenticated using (public.is_admin());

-- compliance_items: khusus DR/admin.
create policy compliance_select on public.compliance_items for select to authenticated using (public.is_dr_or_admin());
create policy compliance_update on public.compliance_items for update to authenticated using (public.is_dr_or_admin()) with check (public.is_dr_or_admin());
create policy compliance_admin_insert on public.compliance_items for insert to authenticated with check (public.is_admin());
create policy compliance_admin_delete on public.compliance_items for delete to authenticated using (public.is_admin());

-- asset_reconciliations
create policy assets_select on public.asset_reconciliations for select to authenticated using (public.can_see_unit(unit_id));
create policy assets_admin_insert on public.asset_reconciliations for insert to authenticated with check (public.is_admin());
create policy assets_admin_update on public.asset_reconciliations for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy assets_admin_delete on public.asset_reconciliations for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: bucket privat. Path objek: <scope>/<document_id>.<ext>
--   shared/...  -> semua pengguna yang dipetakan
--   dr/...      -> DR/admin saja
--   kpw-01/...  -> DR/admin + KPw unit tersebut
-- Signed URL dibuat oleh route /api/documents/[id]/signed-url memakai token pengguna,
-- sehingga policy di bawah tetap berlaku.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('sekar-documents', 'sekar-documents', false)
on conflict (id) do update set public = false;

create policy sekar_docs_read on storage.objects for select to authenticated
  using (bucket_id = 'sekar-documents' and public.can_see_scope(split_part(name, '/', 1)));
create policy sekar_docs_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'sekar-documents' and public.is_admin());
create policy sekar_docs_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'sekar-documents' and public.is_admin()) with check (bucket_id = 'sekar-documents' and public.is_admin());
create policy sekar_docs_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'sekar-documents' and public.is_admin());

commit;
