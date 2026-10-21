-- ROLLBACK 0004 (mengembalikan default privileges; search_path tetap tidak berbahaya untuk dibiarkan).
begin;
grant execute on function public.findings_sync_completed(), public.guard_followup_columns() to public;
alter default privileges in schema public grant all on tables to anon;
alter default privileges in schema public grant all on sequences to anon;
alter default privileges in schema public grant execute on functions to public;
commit;
