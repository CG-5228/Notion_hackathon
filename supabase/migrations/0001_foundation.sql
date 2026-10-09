-- =====================================================================
-- 0001_foundation.sql — Member 1 (Auth / Foundation)
-- universities, university_domains, profiles, interests, profile_interests,
-- blocks, verified-student + blocked-pair helpers.
-- Later migrations (0002–0004) depend on: public.is_verified_student(uuid),
-- public.is_blocked_pair(uuid, uuid), public.blocks.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Universities + EXACT domain allowlist (admin-maintained; no wildcards)
-- ---------------------------------------------------------------------
create table public.universities (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  country     text not null default 'IE',
  is_demo     boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.university_domains (
  domain         text primary key check (domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
  university_id  uuid not null references public.universities(id) on delete cascade,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Profiles: PRIVATE. Only the owner can read their row; nobody else.
-- Mutual reveal (Member 5) goes through a SECURITY DEFINER RPC.
-- ---------------------------------------------------------------------
create table public.profiles (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  university_id     uuid references public.universities(id),
  display_name      text check (display_name is null or char_length(btrim(display_name)) between 2 and 40),
  avatar_url        text check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 500)),
  age_confirmed     boolean not null default false,
  age_confirmed_at  timestamptz,
  student_verified  boolean not null default false,
  verified_at       timestamptz,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index profiles_university_idx on public.profiles(university_id);

-- ---------------------------------------------------------------------
-- Interests
-- ---------------------------------------------------------------------
create table public.interests (
  id     uuid primary key default gen_random_uuid(),
  slug   text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  label  text not null check (char_length(label) between 2 and 40)
);

create table public.profile_interests (
  user_id          uuid not null references public.profiles(user_id) on delete cascade,
  interest_id      uuid not null references public.interests(id) on delete cascade,
  share_on_reveal  boolean not null default false,
  created_at       timestamptz not null default now(),
  primary key (user_id, interest_id)
);

-- ---------------------------------------------------------------------
-- Blocks (reused by 0003/0004 — do not recreate)
-- ---------------------------------------------------------------------
create table public.blocks (
  blocker_id  uuid not null references auth.users(id) on delete cascade,
  blocked_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks(blocked_id);

-- =====================================================================
-- Internal helpers (schema "private" is not exposed through the API)
-- =====================================================================
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.email_domain(p_email text)
returns text language sql immutable set search_path = '' as $$
  select nullif(lower(split_part(btrim(p_email), '@', 2)), '')::text
  where p_email like '%_@_%' and p_email not like '%@%@%';
$$;

-- Returns the allowlisted active university for an email, or null.
create or replace function private.university_for_email(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id
  from public.university_domains d
  join public.universities u on u.id = d.university_id
  where d.domain = private.email_domain(p_email) and d.active and u.active
  limit 1;
$$;

-- =====================================================================
-- Auth hooks: reject non-allowlisted signups; verify ONLY after email confirmation
-- =====================================================================
create or replace function private.on_auth_user_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.university_for_email(new.email) is null then
    raise exception 'Only confirmed email addresses at approved university domains can register.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function private.sync_profile_from_auth()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uni uuid := private.university_for_email(new.email);
  v_demo boolean := coalesce((select is_demo from public.universities where id = v_uni), false);
  v_ok boolean := new.email_confirmed_at is not null and v_uni is not null;
begin
  insert into public.profiles (user_id, university_id, student_verified, verified_at, is_demo)
  values (new.id, case when v_ok then v_uni end, v_ok, case when v_ok then now() end, v_demo)
  on conflict (user_id) do update
    set university_id    = excluded.university_id,
        student_verified = excluded.student_verified,
        verified_at      = case when excluded.student_verified
                                then coalesce(public.profiles.verified_at, now()) end,
        is_demo          = excluded.is_demo,
        updated_at       = now();
  return new;
end $$;

create trigger fyb_before_insert_auth_user
  before insert on auth.users
  for each row execute function private.on_auth_user_before_insert();

create trigger fyb_after_write_auth_user
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function private.sync_profile_from_auth();

-- Guard: authenticated users can never change verification / university / demo flags.
create or replace function private.protect_profile_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.student_verified is distinct from old.student_verified
       or new.university_id is distinct from old.university_id
       or new.verified_at   is distinct from old.verified_at
       or new.is_demo       is distinct from old.is_demo
       or new.user_id       is distinct from old.user_id then
      raise exception 'Protected profile fields cannot be self-edited' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger fyb_protect_profile
  before update on public.profiles
  for each row execute function private.protect_profile_columns();

-- =====================================================================
-- PUBLIC HELPERS (used by every later migration)
-- =====================================================================

-- True only if: signed in, auth email confirmed, email domain STILL allowlisted
-- and bound to the same university, profile verified, 18+ self-attested.
create or replace function public.is_verified_student(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users au on au.id = p.user_id
    where p.user_id = p_user
      and p_user is not null
      and p.student_verified
      and p.age_confirmed
      and au.email_confirmed_at is not null
      and p.university_id = private.university_for_email(au.email)
  );
$$;

-- True if either user has blocked the other.
create or replace function public.is_blocked_pair(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

-- Raises unless caller is a verified student. Call first in every member RPC.
create or replace function public.assert_verified_student()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if not public.is_verified_student(v) then
    raise exception 'Verified student account required' using errcode = '42501';
  end if;
  return v;
end $$;

-- Pre-signup UX check. Reveals only whether a domain is allowlisted + university name.
create or replace function public.check_email_domain(p_email text)
returns table (allowed boolean, university_name text, is_demo boolean)
language sql stable security definer set search_path = '' as $$
  select u.id is not null, u.name, coalesce(u.is_demo, false)
  from (select private.university_for_email(left(p_email, 320)) as uid) x
  left join public.universities u on u.id = x.uid;
$$;

-- Caller's own profile only.
create or replace function public.get_my_profile()
returns table (user_id uuid, display_name text, avatar_url text, age_confirmed boolean,
               student_verified boolean, university_id uuid, university_name text, is_demo boolean)
language sql stable security definer set search_path = '' as $$
  select p.user_id, p.display_name, p.avatar_url, p.age_confirmed,
         (p.student_verified and au.email_confirmed_at is not null
           and p.university_id = private.university_for_email(au.email)),
         p.university_id, u.name, p.is_demo
  from public.profiles p
  join auth.users au on au.id = p.user_id
  left join public.universities u on u.id = p.university_id
  where p.user_id = auth.uid();
$$;

-- Only editable fields: display name, avatar, 18+ self-attestation.
create or replace function public.update_my_profile(p_display_name text, p_age_confirmed boolean, p_avatar_url text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where user_id = v and student_verified) then
    raise exception 'Verified student account required' using errcode = '42501';
  end if;
  if p_age_confirmed is not true then
    raise exception 'You must confirm you are 18 or older' using errcode = '22023';
  end if;
  update public.profiles
     set display_name = btrim(p_display_name),
         avatar_url = p_avatar_url,
         age_confirmed = true,
         age_confirmed_at = coalesce(age_confirmed_at, now())
   where user_id = v;
end $$;

-- =====================================================================
-- GRANTS + RLS (deny by default)
-- =====================================================================
alter table public.universities       enable row level security;
alter table public.university_domains enable row level security;
alter table public.profiles           enable row level security;
alter table public.interests          enable row level security;
alter table public.profile_interests  enable row level security;
alter table public.blocks             enable row level security;

revoke all on public.universities, public.university_domains, public.profiles,
              public.interests, public.profile_interests, public.blocks
  from anon, authenticated;

-- universities: names are public information
grant select (id, slug, name, country, is_demo) on public.universities to anon, authenticated;
create policy universities_read on public.universities for select to anon, authenticated using (active);

-- university_domains: NO client access (use check_email_domain)

-- profiles: owner read only; writes only through update_my_profile
grant select on public.profiles to authenticated;
create policy profiles_owner_read on public.profiles for select to authenticated
  using (user_id = auth.uid());

-- interests: catalogue for verified students
grant select on public.interests to authenticated;
create policy interests_read on public.interests for select to authenticated
  using (public.is_verified_student());

-- profile_interests: owner-only CRUD, verified students only
grant select, insert, update, delete on public.profile_interests to authenticated;
create policy pi_owner_select on public.profile_interests for select to authenticated
  using (user_id = auth.uid());
create policy pi_owner_insert on public.profile_interests for insert to authenticated
  with check (user_id = auth.uid() and public.is_verified_student());
create policy pi_owner_update on public.profile_interests for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_verified_student());
create policy pi_owner_delete on public.profile_interests for delete to authenticated
  using (user_id = auth.uid());

-- blocks: caller sees/creates/removes only blocks THEY made. Never sees who blocked them.
-- (Member 5's block_user(target_id, match_context) RPC resolves pseudonyms server-side.)
grant select, delete on public.blocks to authenticated;
create policy blocks_owner_select on public.blocks for select to authenticated
  using (blocker_id = auth.uid());
create policy blocks_owner_delete on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- Function privileges
revoke all on function public.is_verified_student(uuid), public.is_blocked_pair(uuid, uuid),
  public.assert_verified_student(), public.check_email_domain(text), public.get_my_profile(),
  public.update_my_profile(text, boolean, text) from public;
grant execute on function public.check_email_domain(text) to anon, authenticated;
grant execute on function public.get_my_profile(), public.update_my_profile(text, boolean, text),
  public.is_verified_student(uuid), public.assert_verified_student() to authenticated;
-- is_blocked_pair is for other SECURITY DEFINER functions only (would leak block status)
revoke execute on function public.is_blocked_pair(uuid, uuid) from anon, authenticated;

-- =====================================================================
-- SEED: allowlist. ADMIN MUST VERIFY each student domain before launch.
-- =====================================================================
with u as (
  insert into public.universities (slug, name) values
    ('tcd', 'Trinity College Dublin'),
    ('ucd', 'University College Dublin'),
    ('dcu', 'Dublin City University'),
    ('ucc', 'University College Cork'),
    ('universityofgalway', 'University of Galway'),
    ('ul', 'University of Limerick'),
    ('mu', 'Maynooth University'),
    ('tudublin', 'TU Dublin')
  returning id, slug
)
insert into public.university_domains (domain, university_id)
select d.domain, u.id from u join (values
  ('tcd', 'tcd.ie'),
  ('ucd', 'ucdconnect.ie'),
  ('dcu', 'mail.dcu.ie'),
  ('ucc', 'umail.ucc.ie'),
  ('universityofgalway', 'universityofgalway.ie'),
  ('ul', 'studentmail.ul.ie'),
  ('mu', 'mumail.ie'),
  ('tudublin', 'mytudublin.ie')
) as d(slug, domain) on d.slug = u.slug;

-- DEMO university: clearly labelled; only an admin can create confirmed demo users
-- (Dashboard -> Auth -> Add user -> "Auto confirm"). Disable before production:
--   update public.university_domains set active = false where domain = 'demo.findyourbuddy.test';
with d as (
  insert into public.universities (slug, name, is_demo) values ('demo', 'Demo University (not real)', true)
  returning id
)
insert into public.university_domains (domain, university_id) select 'demo.findyourbuddy.test', id from d;

insert into public.interests (slug, label) values
  ('hackathons','Hackathons'), ('coffee','Coffee'), ('cinema','Cinema'), ('live-music','Live music'),
  ('gaming','Gaming'), ('hiking','Hiking'), ('running','Running'), ('football','Football'),
  ('board-games','Board games'), ('cooking','Cooking'), ('photography','Photography'),
  ('reading','Reading'), ('theatre','Theatre'), ('societies','Societies'), ('grocery-runs','Grocery runs');
