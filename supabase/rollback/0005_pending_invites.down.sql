-- ROLLBACK 0005 (undangan). Pemetaan user_access yang sudah terbentuk TIDAK dihapus.
begin;
drop trigger if exists sekar_apply_pending_invite on auth.users;
drop function if exists public.apply_pending_invite();
drop table if exists public.pending_invites;
drop function if exists public.can_manage_invite(text);
commit;
