-- Uji rollback berurutan terbalik (0005 → 0004 → 0003): setelah down-migration, policy aal2
-- hilang (perilaku sebelum 0003), lalu 0003–0005 diterapkan ulang dan penegakan kembali. Dijalankan terakhir.
\set ON_ERROR_STOP on
\i supabase/rollback/0005_pending_invites.down.sql
\i supabase/rollback/0004_harden_defaults.down.sql
\i supabase/rollback/0003_mfa_aal2_rate_limit.down.sql
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000b', 'aal', 'aal1')::text, false);
do $$ begin
  if (select count(*) from public.findings) = 0 then raise exception 'GAGAL rollback: aal1 masih ditolak'; end if;
  raise notice 'OK rollback 0003 menghapus penegakan aal2';
end $$;
reset role;
\i supabase/migrations/0003_mfa_aal2_rate_limit.sql
\i supabase/migrations/0004_harden_defaults.sql
\i supabase/migrations/0005_pending_invites.sql
set role authenticated;
do $$ begin
  if (select count(*) from public.findings) <> 0 then raise exception 'GAGAL re-apply: aal1 masih dapat membaca'; end if;
  raise notice 'OK 0003–0005 diterapkan ulang (idempoten), aal1 kembali ditolak';
end $$;
reset role;
\echo 'Rollback & re-apply 0003–0005: lulus'
