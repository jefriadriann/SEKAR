-- ROLLBACK migration 0003 (MFA aal2 + rate limit). Jalankan HANYA bila 0003
-- menyebabkan gangguan akses dan sudah disetujui. Setelah rollback, data dapat
-- dibaca pada sesi aal1 (tanpa MFA) — kembalikan 0003 secepatnya.
begin;
do $$
declare t text;
begin
  foreach t in array array[
    'dataset_metadata', 'units', 'documents', 'findings', 'audit_schedules', 'document_requests',
    'reference_materials', 'compliance_items', 'asset_reconciliations', 'asset_items'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_require_aal2', t);
  end loop;
end $$;
drop policy if exists user_access_require_aal2_select on public.user_access;
drop policy if exists user_access_require_aal2_insert on public.user_access;
drop policy if exists user_access_require_aal2_update on public.user_access;
drop policy if exists user_access_require_aal2_delete on public.user_access;
drop policy if exists sekar_docs_require_aal2 on storage.objects;
drop function if exists public.consume_rate_limit(text, int, int);
drop table if exists public.rate_limits;
drop function if exists public.is_aal2();
commit;
