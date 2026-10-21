-- STUB LOKAL untuk menguji migration di PostgreSQL biasa (BUKAN Supabase).
-- Meniru minimal: role anon/authenticated, auth.users, auth.uid(), storage.buckets/objects.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create schema if not exists storage;
create table if not exists auth.users (id uuid primary key, email text);
-- Kolom Supabase Auth yang dipakai trigger undangan (0005).
alter table auth.users add column if not exists invited_at timestamptz, add column if not exists email_confirmed_at timestamptz;
-- Seperti Supabase: klaim JWT dibaca dari request.jwt.claims (JSON); auth.uid() = klaim sub.
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
create table if not exists storage.buckets (id text primary key, name text, public boolean);
create table if not exists storage.objects (id bigserial primary key, bucket_id text, name text);
alter table storage.objects enable row level security;
grant usage on schema public, auth, storage to anon, authenticated;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
grant select on storage.objects to authenticated;
-- Seperti Supabase: objek baru di schema public otomatis diberi hak ke anon & authenticated.
-- (Migration harus mencabut/menyetel ulang hak ini sendiri — diuji di 02_rls_check.sql.)
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
-- Minimal seperti Supabase Auth: faktor MFA pengguna.
create table if not exists auth.mfa_factors (id uuid primary key, user_id uuid not null, factor_type text not null, status text not null);
