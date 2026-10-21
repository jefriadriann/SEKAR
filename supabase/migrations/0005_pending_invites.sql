-- SEKAR v1.6: undangan pengguna dengan peran & unit yang DITETAPKAN ADMIN/DR (bukan dipilih pengguna).
--
-- Alur: admin/DR mencatat undangan (email + peran + unit) di aplikasi → mengirim "Invite user"
-- dari Supabase Dashboard → saat akun dibuat Supabase Auth, trigger memetakan public.user_access
-- dari undangan yang cocok (email sama, belum dipakai, belum kedaluwarsa). Pengguna membuat kata
-- sandi sendiri dan wajib MFA sebelum data terbuka (0003).
--
-- Batasan: DR hanya boleh mengundang peran KPw; admin semua peran. Pemetaan hanya untuk akun
-- yang diundang (invited_at) atau emailnya terkonfirmasi (email_confirmed_at), bukan pendaftaran
-- publik yang belum terverifikasi. Supabase Auth mengisi invited_at lewat UPDATE setelah baris
-- auth.users dibuat (internal/api/invite.go → mail.go sendInvite), sehingga trigger juga berjalan
-- pada UPDATE kolom tersebut.
-- Rollback: supabase/rollback/0005_pending_invites.down.sql
begin;

create table if not exists public.pending_invites (
  email text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role text not null check (role in ('dr', 'kpw', 'admin')),
  unit_id text not null references public.units (id),
  display_name text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  claimed_at timestamptz,
  constraint pending_invites_unit_role check ((role = 'kpw') = (unit_id <> 'dr'))
);

alter table public.pending_invites enable row level security;
revoke all on public.pending_invites from public, anon;
grant select, insert, update, delete on public.pending_invites to authenticated;

-- Siapa boleh mengelola undangan: admin (semua), DR (hanya undangan KPw).
create or replace function public.can_manage_invite(target_role text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.is_admin() or (public.app_role() = 'dr' and target_role = 'kpw'), false)
$$;
revoke all on function public.can_manage_invite(text) from public, anon;
grant execute on function public.can_manage_invite(text) to authenticated;

drop policy if exists invites_select on public.pending_invites;
create policy invites_select on public.pending_invites for select to authenticated using (public.can_manage_invite(role));
drop policy if exists invites_insert on public.pending_invites;
create policy invites_insert on public.pending_invites for insert to authenticated
  with check (public.can_manage_invite(role) and claimed_at is null);
drop policy if exists invites_update on public.pending_invites;
create policy invites_update on public.pending_invites for update to authenticated
  using (public.can_manage_invite(role) and claimed_at is null) with check (public.can_manage_invite(role) and claimed_at is null);
drop policy if exists invites_delete on public.pending_invites;
create policy invites_delete on public.pending_invites for delete to authenticated using (public.can_manage_invite(role));
drop policy if exists pending_invites_require_aal2 on public.pending_invites;
create policy pending_invites_require_aal2 on public.pending_invites as restrictive for all to authenticated
  using (public.is_aal2()) with check (public.is_aal2());

-- Trigger: akun baru dari undangan → pemetaan peran/unit.
create or replace function public.apply_pending_invite() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv public.pending_invites; mapped int;
begin
  if new.email is null or (new.invited_at is null and new.email_confirmed_at is null) then
    return new;
  end if;
  if exists (select 1 from public.user_access where user_id = new.id) then
    return new;
  end if;
  select * into inv from public.pending_invites
   where email = lower(new.email) and claimed_at is null and expires_at > now()
   for update;
  if found then
    insert into public.user_access (user_id, role, unit_id, display_name)
    values (new.id, inv.role, inv.unit_id, inv.display_name)
    on conflict (user_id) do nothing;
    get diagnostics mapped = row_count;
    if mapped > 0 then
      update public.pending_invites set claimed_at = now() where email = inv.email;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.apply_pending_invite() from public, anon, authenticated;

drop trigger if exists sekar_apply_pending_invite on auth.users;
create trigger sekar_apply_pending_invite after insert or update of invited_at, email_confirmed_at on auth.users
for each row execute function public.apply_pending_invite();

commit;
