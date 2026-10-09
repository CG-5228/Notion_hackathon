-- LOCAL TEST ONLY — never apply to the shared Supabase project.
-- Lets 0004 be tested on plain Postgres before 0002 (Member 3) and 0003 (Member 4)
-- land. Part A emulates the Supabase auth bits; part B stubs the 0002/0003 columns
-- that 0004 depends on (see header of 0004_chat_safety.sql).
-- Usage:  psql -v part=A -f m5_local_shim.sql  (before 0001)
--         psql -v part=B -f m5_local_shim.sql  (after 0001, before 0004)
\if :{?part}
\else
  \set part A
\endif

select :'part' = 'A' as is_a \gset
\if :is_a
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
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated, service_role;
\else
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null, starts_at timestamptz not null, venue_public text not null
);
create table public.buddy_matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  mode text not null check (mode in ('pair','group')),
  status text not null default 'forming' check (status in ('forming','chatting','locked','revealed','closed')),
  max_size int not null default 2,
  membership_version int not null default 1,
  updated_at timestamptz not null default now()
);
create table public.buddy_match_members (
  match_id uuid not null references public.buddy_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  pseudonym text not null,
  joined_at timestamptz not null default clock_timestamp(),
  left_at timestamptz,
  primary key (match_id, user_id)
);
revoke all on public.events, public.buddy_matches, public.buddy_match_members from anon, authenticated;
\endif
