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
