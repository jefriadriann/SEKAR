-- SEKAR v1.3: rincian asesmen aset per nomor aset + materi demo berkas statis.
-- Seluruh data tetap SIMULASI. RLS aktif untuk tabel baru.

begin;

-- Berkas demo statis (public/demo/...) dan jenis rinci materi.
alter table public.documents add column if not exists file_url text;
alter table public.reference_materials add column if not exists subkind text;

create table if not exists public.asset_items (
  id text primary key,
  reconciliation_id text not null references public.asset_reconciliations (id),
  unit_id text not null references public.units (id),
  asset_number text not null,
  asset_name text not null,
  category text not null,
  location text not null,
  acquisition_date date not null,
  acquisition_cost numeric not null check (acquisition_cost >= 0),
  useful_life int not null check (useful_life >= 0),
  aspect text not null check (aspect in ('umur_ekonomis', 'harga_perolehan', 'satuan_aset', 'keberadaan_fisik', 'kondisi_fisik', 'lokasi', 'klasifikasi', 'dokumen_kepemilikan', 'label')),
  recorded_value text not null,
  expected_value text not null,
  note text not null default '',
  action text not null check (action in ('split', 'penghapusan', 'penatausahaan', 'mutasi', 'reklasifikasi', 'koreksi_nilai', 'penyesuaian_umur', 'inventarisasi')),
  status text not null check (status in ('selesai', 'dalam_proses', 'belum_ditindaklanjuti')),
  is_dummy boolean not null default true
);

create index if not exists asset_items_unit_idx on public.asset_items (unit_id);
create index if not exists asset_items_rec_idx on public.asset_items (reconciliation_id);

alter table public.asset_items enable row level security;
revoke all on public.asset_items from anon;

create policy asset_items_select on public.asset_items for select to authenticated using (public.can_see_unit(unit_id));
create policy asset_items_admin_insert on public.asset_items for insert to authenticated with check (public.is_admin());
create policy asset_items_admin_update on public.asset_items for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy asset_items_admin_delete on public.asset_items for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.asset_items to authenticated;

commit;
