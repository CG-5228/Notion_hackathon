-- LOCAL TEST ONLY — never apply to the shared Supabase project.
-- Emulates the Supabase auth bits so 0001 -> 0004 and their test suites run on plain Postgres.
-- Usage:  psql -f m5_local_shim.sql  (before 0001), then the real migrations in order.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
grant usage on schema auth, public to anon, authenticated, service_role;
create table if not exists auth.users (
  id uuid primary key, email text, email_confirmed_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table auth.users
  add column if not exists raw_app_meta_data jsonb default '{}'::jsonb,
  add column if not exists raw_user_meta_data jsonb default '{}'::jsonb;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated, service_role;
create extension if not exists pgcrypto;
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then create publication supabase_realtime; end if;
end $$;
