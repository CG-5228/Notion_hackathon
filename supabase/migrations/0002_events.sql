-- 0002_events.sql — Member 3: events, RSVPs, ratings, safe discovery.
-- Depends on 0001 (Member 1): public.profiles(user_id uuid = auth.users.id, university_id uuid),
-- public.universities(id), and public.is_verified_student(p_user uuid) returns boolean.
-- If 0001 changes names, adapt ONLY the helper shim below (fyb_is_verified).

-- ---------------------------------------------------------------- helpers
create or replace function public.fyb_is_verified(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select uid is not null and coalesce(public.is_verified_student(uid), false);
$$;
revoke all on function public.fyb_is_verified(uuid) from public, anon;
grant execute on function public.fyb_is_verified(uuid) to authenticated;

-- Curators: privileged, admin-maintained only (no user grants).
create table if not exists public.event_curators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.event_curators enable row level security;
revoke all on public.event_curators from anon, authenticated;

create or replace function public.fyb_is_curator(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.event_curators where user_id = uid);
$$;
revoke all on function public.fyb_is_curator(uuid) from public, anon;

-- ---------------------------------------------------------------- tables
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references auth.users(id) on delete set null,
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null check (category in
    ('hackathon','groceries','cinema','coffee','society','sport','study','culture','other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue_public text not null check (char_length(venue_public) between 3 and 200),
  event_kind text not null check (event_kind in ('curated_public','student_created')),
  visibility text not null check (visibility in ('public','campus','invite_only')),
  campus_university_id uuid references public.universities(id),
  source_url text check (source_url is null or source_url ~* '^https://'),
  review_status text not null default 'student_posted'
    check (review_status in ('curated','pending','student_posted','rejected')),
  invite_hash text unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (event_kind <> 'curated_public' or source_url is not null)
);
create index if not exists events_starts_at_idx on public.events (starts_at);

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('going','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.event_ratings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ---------------------------------------------------------------- RLS
-- No direct table access for clients: all reads/writes go through RPCs below.
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.event_ratings enable row level security;
revoke all on public.events, public.event_rsvps, public.event_ratings from anon, authenticated;

-- Visibility rule shared by every read RPC.
create or replace function public.fyb_can_see_event(e public.events, uid uuid, p_invite text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.fyb_is_verified(uid) and e.review_status <> 'rejected' and (
       e.host_id = uid
    or public.fyb_is_curator(uid)
    or (e.visibility = 'public' and e.review_status in ('curated','student_posted'))
    or (e.visibility = 'campus' and e.campus_university_id =
          (select university_id from public.profiles where user_id = uid))
    or (e.visibility = 'invite_only' and p_invite is not null and e.invite_hash = p_invite)
  );
$$;
revoke all on function public.fyb_can_see_event(public.events, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- read model
-- Aggregate only. universities_represented is suppressed (null) unless going_count >= 5.
create or replace function public.get_discoverable_events(
  p_search text default null,
  p_category text default null,
  p_from timestamptz default now() - interval '6 hours',
  p_to timestamptz default null,
  p_event_id uuid default null,
  p_invite text default null
) returns table (
  id uuid, title text, description text, category text, starts_at timestamptz,
  ends_at timestamptz, venue_public text, kind text, visibility text, source_url text,
  review_status text, is_demo boolean, is_host boolean, going_count int,
  universities_represented int, i_am_going boolean, rating_count int, rating_avg numeric
) language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if not public.fyb_is_verified(uid) then
    raise exception 'verified student account required' using errcode = '42501';
  end if;
  return query
  select e.id, e.title, e.description, e.category, e.starts_at, e.ends_at, e.venue_public,
         e.event_kind, e.visibility, e.source_url,
         case when e.review_status = 'rejected' then 'pending' else e.review_status end,
         e.is_demo, e.host_id = uid,
         coalesce(g.cnt, 0)::int,
         case when coalesce(g.cnt,0) >= 5 then g.unis::int else null end,
         exists (select 1 from event_rsvps r where r.event_id = e.id and r.user_id = uid and r.status = 'going'),
         coalesce(rt.cnt, 0)::int,
         rt.avg_rating
  from events e
  left join lateral (
    select count(distinct r.user_id) cnt, count(distinct p.university_id) unis
    from event_rsvps r left join profiles p on p.user_id = r.user_id
    where r.event_id = e.id and r.status = 'going'
  ) g on true
  left join lateral (
    select count(*) cnt, round(avg(rating)::numeric, 1) avg_rating
    from event_ratings x where x.event_id = e.id
  ) rt on true
  where public.fyb_can_see_event(e, uid, p_invite)
    and (p_event_id is null or e.id = p_event_id)
    -- invite-only events never appear in the feed unless hosted by caller
    and (p_event_id is not null or e.visibility <> 'invite_only' or e.host_id = uid)
    and (p_event_id is not null or e.starts_at >= p_from)
    and (p_to is null or e.starts_at <= p_to)
    and (p_category is null or e.category = p_category)
    and (p_search is null or e.title ilike '%' || p_search || '%' or e.venue_public ilike '%' || p_search || '%')
  order by e.starts_at
  limit 200;
end; $$;
revoke all on function public.get_discoverable_events(text,text,timestamptz,timestamptz,uuid,text) from public, anon;
grant execute on function public.get_discoverable_events(text,text,timestamptz,timestamptz,uuid,text) to authenticated;

-- ---------------------------------------------------------------- RSVP
create or replace function public.rsvp_to_event(p_event_id uuid, p_going boolean, p_invite text default null)
returns int language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); e events; n int;
begin
  if not public.fyb_is_verified(uid) then
    raise exception 'verified student account required' using errcode = '42501';
  end if;
  select * into e from events where id = p_event_id;
  if not found or not public.fyb_can_see_event(e, uid, p_invite)
     or (e.visibility = 'invite_only' and e.host_id is distinct from uid
         and not exists (select 1 from event_rsvps where event_id = e.id and user_id = uid)
         and (p_invite is null or e.invite_hash <> p_invite)) then
    raise exception 'event not found' using errcode = 'P0002';
  end if;
  insert into event_rsvps (event_id, user_id, status)
  values (p_event_id, uid, case when p_going then 'going' else 'withdrawn' end)
  on conflict (event_id, user_id)
  do update set status = excluded.status, updated_at = now();
  select count(distinct user_id) into n from event_rsvps where event_id = p_event_id and status = 'going';
  return n;
end; $$;
revoke all on function public.rsvp_to_event(uuid, boolean, text) from public, anon;
grant execute on function public.rsvp_to_event(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------- create activity
-- Students can only create student_created events; never curated.
create or replace function public.create_activity(
  p_title text, p_description text, p_category text, p_starts_at timestamptz,
  p_ends_at timestamptz, p_venue_public text, p_visibility text
) returns table (id uuid, invite_hash text)
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_hash text; v_id uuid; v_uni uuid;
begin
  if not public.fyb_is_verified(uid) then
    raise exception 'verified student account required' using errcode = '42501';
  end if;
  if p_visibility not in ('campus','invite_only') then
    raise exception 'visibility must be campus or invite_only';
  end if;
  if p_starts_at < now() then raise exception 'start time must be in the future'; end if;
  if p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'end time must be after start time';
  end if;
  if char_length(trim(coalesce(p_venue_public,''))) < 3
     or p_venue_public ~* '(apartment|apt\.?|flat\s*\d|house\s*no|my (place|house|room)|eircode|\m[A-Z]\d{2}\s?[A-Z0-9]{4}\M)' then
    raise exception 'use a public or general meeting point, not a private address';
  end if;
  select university_id into v_uni from profiles where profiles.user_id = uid;
  if p_visibility = 'invite_only' then
    v_hash := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  end if;
  insert into events (host_id, title, description, category, starts_at, ends_at, venue_public,
                      event_kind, visibility, campus_university_id, review_status, invite_hash)
  values (uid, trim(p_title), coalesce(trim(p_description),''), p_category, p_starts_at, p_ends_at,
          trim(p_venue_public), 'student_created', p_visibility, v_uni, 'student_posted', v_hash)
  returning events.id into v_id;
  return query select v_id, v_hash;
end; $$;
revoke all on function public.create_activity(text,text,text,timestamptz,timestamptz,text,text) from public, anon;
grant execute on function public.create_activity(text,text,text,timestamptz,timestamptz,text,text) to authenticated;

-- ---------------------------------------------------------------- my activities
create or replace function public.get_my_activities()
returns table (id uuid, title text, starts_at timestamptz, venue_public text, visibility text,
               relation text, invite_hash text, going_count int)
language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.starts_at, e.venue_public, e.visibility,
         case when e.host_id = auth.uid() then 'hosting' else 'going' end,
         case when e.host_id = auth.uid() then e.invite_hash else null end,
         (select count(distinct user_id)::int from event_rsvps r where r.event_id = e.id and r.status = 'going')
  from events e
  where public.fyb_is_verified(auth.uid())
    and (e.host_id = auth.uid()
      or exists (select 1 from event_rsvps r where r.event_id = e.id and r.user_id = auth.uid() and r.status = 'going'))
  order by e.starts_at;
$$;
revoke all on function public.get_my_activities() from public, anon;
grant execute on function public.get_my_activities() to authenticated;

-- ---------------------------------------------------------------- ratings
-- Eligible only if caller RSVP'd going and the event has started.
create or replace function public.rate_event(p_event_id uuid, p_rating int, p_comment text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if not public.fyb_is_verified(uid) then raise exception 'verified student account required' using errcode='42501'; end if;
  if not exists (select 1 from events e join event_rsvps r on r.event_id = e.id
                 where e.id = p_event_id and r.user_id = uid and r.status = 'going' and e.starts_at < now()) then
    raise exception 'only students who said they were going can rate after the event starts';
  end if;
  insert into event_ratings (event_id, user_id, rating, comment)
  values (p_event_id, uid, p_rating, nullif(trim(p_comment),''))
  on conflict (event_id, user_id) do update set rating = excluded.rating, comment = excluded.comment;
end; $$;
revoke all on function public.rate_event(uuid,int,text) from public, anon;
grant execute on function public.rate_event(uuid,int,text) to authenticated;

-- ---------------------------------------------------------------- curator review (privileged)
create or replace function public.review_event(p_event_id uuid, p_status text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.fyb_is_curator(auth.uid()) then raise exception 'curators only' using errcode='42501'; end if;
  if p_status not in ('curated','pending','student_posted','rejected') then raise exception 'bad status'; end if;
  update events set review_status = p_status where id = p_event_id;
end; $$;
revoke all on function public.review_event(uuid,text) from public, anon;
grant execute on function public.review_event(uuid,text) to authenticated;
