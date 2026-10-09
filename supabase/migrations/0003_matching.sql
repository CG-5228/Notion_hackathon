-- =====================================================================
-- 0003_matching.sql — Member 4 (1-on-1 + group buddy matching engine)
-- Depends on: 0001_foundation.sql (assert_verified_student, is_verified_student,
--             is_blocked_pair, blocks, profiles) and 0002_events.sql (events, event_rsvps).
-- Provides to 0004 (Member 5): buddy_matches, buddy_match_members, and the
-- private.matching_* transition helpers documented in src/features/matching/CONTRACTS.md.
--
-- Concurrency model
--   * Every write path for an event takes pg_advisory_xact_lock(event) first, so
--     pair pick-up, 3rd/4th/5th joiners and cancels for the same event are serialised.
--   * Match rows are additionally locked FOR UPDATE before membership changes, so
--     consent (0004 agree_to_go, which also locks the match row) never races joins.
--   * Partial unique indexes are the last line of defence:
--       one waiting request per (event,user)      -> no duplicate / cross-mode queueing
--       one active membership per (event,user)    -> no parallel placement in an event
--       one active slot per (match,user), unique pseudonym per match.
-- =====================================================================

create schema if not exists private;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.buddy_requests (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  mode        text not null check (mode in ('pair','group')),
  max_size    int  check (max_size is null or max_size between 3 and 5),
  status      text not null default 'waiting' check (status in ('waiting','assigned','cancelled')),
  match_id    uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check ((mode = 'pair' and max_size is null) or (mode = 'group' and max_size is not null))
);
-- One waiting request per user per event, across BOTH modes (prevents two tabs / mode hopping).
create unique index buddy_requests_one_waiting_uq on public.buddy_requests(event_id, user_id) where status = 'waiting';
create index buddy_requests_queue_idx on public.buddy_requests(event_id, mode, created_at) where status = 'waiting';

create table public.buddy_matches (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  mode                text not null check (mode in ('pair','group')),
  max_size            int  not null,
  status              text not null default 'forming'
                      check (status in ('forming','chatting','locked','revealed','closed')),
  membership_version  int  not null default 1 check (membership_version >= 1),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check ((mode = 'pair' and max_size = 2) or (mode = 'group' and max_size between 3 and 5))
);
create index buddy_matches_open_groups_idx on public.buddy_matches(event_id, max_size)
  where mode = 'group' and status in ('forming','chatting');

alter table public.buddy_requests
  add constraint buddy_requests_match_fk foreign key (match_id) references public.buddy_matches(id) on delete set null;

create table public.buddy_match_members (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.buddy_matches(id) on delete cascade,
  event_id    uuid not null references public.events(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  pseudonym   text not null check (length(pseudonym) between 3 and 40),
  joined_at   timestamptz not null default now(),
  left_at     timestamptz
);
create unique index buddy_members_active_slot_uq  on public.buddy_match_members(match_id, user_id) where left_at is null;
create unique index buddy_members_one_per_event_uq on public.buddy_match_members(event_id, user_id) where left_at is null;
create unique index buddy_members_pseudonym_uq     on public.buddy_match_members(match_id, pseudonym);
create index buddy_members_user_idx on public.buddy_match_members(user_id) where left_at is null;

-- ---------------------------------------------------------------------
-- RLS: clients may READ only their own rows; ALL writes go through RPCs.
-- buddy_match_members exposes only the caller's own row (needed by 0004
-- policies that check `user_id = auth.uid()`); co-member rows are never readable.
-- ---------------------------------------------------------------------
alter table public.buddy_requests      enable row level security;
alter table public.buddy_matches       enable row level security;
alter table public.buddy_match_members enable row level security;

revoke all on public.buddy_requests, public.buddy_matches, public.buddy_match_members from anon, authenticated;
grant select on public.buddy_requests, public.buddy_matches, public.buddy_match_members to authenticated;
grant all    on public.buddy_requests, public.buddy_matches, public.buddy_match_members to service_role;

create policy "own requests readable" on public.buddy_requests
  for select to authenticated using (user_id = auth.uid());

create policy "own membership row readable" on public.buddy_match_members
  for select to authenticated using (user_id = auth.uid());

create policy "members read their match" on public.buddy_matches
  for select to authenticated using (
    exists (select 1 from public.buddy_match_members m
            where m.match_id = buddy_matches.id and m.user_id = auth.uid() and m.left_at is null));

-- Realtime: members receive status/version changes on their own match row (RLS applies).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.buddy_matches;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Private helpers (schema "private" is not exposed through the Data API)
-- ---------------------------------------------------------------------
create or replace function private.matching_lock_event(p_event_id uuid)
returns void language sql volatile set search_path = '' as $$
  select pg_advisory_xact_lock(hashtextextended('buddy-event:' || p_event_id::text, 0));
$$;

-- Random, match-scoped pseudonym. Contains nothing derived from the user.
create or replace function private.matching_new_pseudonym(p_match_id uuid)
returns text language plpgsql volatile set search_path = '' as $$
declare
  adj text[] := array['Amber','Brisk','Calm','Cosy','Daring','Eager','Gentle','Jolly','Lucky','Mellow',
                      'Nimble','Plucky','Quiet','Rapid','Sunny','Swift','Tidy','Witty','Breezy','Kind'];
  noun text[] := array['Otter','Heron','Fox','Puffin','Badger','Hare','Robin','Seal','Wren','Lynx',
                       'Finch','Kestrel','Marten','Owl','Stoat','Swan','Lark','Deer','Newt','Pine'];
  v text; i int := 0;
begin
  loop
    v := adj[1 + floor(random()*array_length(adj,1))::int] || ' ' ||
         noun[1 + floor(random()*array_length(noun,1))::int] || ' ' ||
         lpad((floor(random()*100))::int::text, 2, '0');
    exit when not exists (select 1 from public.buddy_match_members where match_id = p_match_id and pseudonym = v);
    i := i + 1;
    if i > 50 then v := v || '-' || substr(md5(random()::text), 1, 4); exit; end if;
  end loop;
  return v;
end $$;

create or replace function private.matching_active_count(p_match_id uuid)
returns int language sql stable set search_path = '' as $$
  select count(*)::int from public.buddy_match_members where match_id = p_match_id and left_at is null;
$$;

-- Clears consent rows for a match if 0004's buddy_agreements exists (dynamic: 0004 runs later).
create or replace function private.matching_invalidate_agreements(p_match_id uuid)
returns void language plpgsql volatile set search_path = '' as $$
begin
  if to_regclass('public.buddy_agreements') is not null then
    execute 'delete from public.buddy_agreements where match_id = $1' using p_match_id;
  end if;
end $$;

-- Overridable hook for Member 5: coarse reliability band only. Default is neutral.
create or replace function private.matching_reliability_band(p_user uuid)
returns text language sql stable set search_path = '' as $$ select 'new'::text $$;

create or replace function private.matching_has_agreed(p_match_id uuid, p_user uuid, p_version int)
returns boolean language plpgsql stable set search_path = '' as $$
declare r boolean := false;
begin
  if to_regclass('public.buddy_agreements') is not null then
    execute 'select exists (select 1 from public.buddy_agreements where match_id=$1 and user_id=$2 and membership_version=$3)'
      into r using p_match_id, p_user, p_version;
  end if;
  return r;
end $$;

-- SINGLE source of truth for membership removal (leave, cancel, block separation).
-- Caller must already hold the event lock or be inside a transaction; this locks the match row.
-- Rules:
--   pre-reveal departure -> left_at set, ALL agreements deleted, membership_version + 1
--   pair                 -> closed; remaining member is released (left_at) and may search again,
--                           never silently re-paired
--   group, 0 left        -> closed
--   group, < 3 left      -> forming (chat disabled)
--   group, locked, >= 3  -> chatting (fresh unanimous consent required)
--   revealed             -> member simply leaves; pair closes
create or replace function private.matching_remove_member(p_match_id uuid, p_user uuid)
returns jsonb language plpgsql volatile set search_path = '' as $$
declare m public.buddy_matches; v_left int; v_count int;
begin
  select * into m from public.buddy_matches where id = p_match_id for update;
  if not found then raise exception 'Match not found' using errcode = 'P0002'; end if;

  update public.buddy_match_members set left_at = now()
   where match_id = p_match_id and user_id = p_user and left_at is null;
  get diagnostics v_left = row_count;
  if v_left = 0 then
    return jsonb_build_object('status', m.status, 'membershipVersion', m.membership_version, 'changed', false);
  end if;

  v_count := private.matching_active_count(p_match_id);

  if m.status in ('forming','chatting','locked') then
    perform private.matching_invalidate_agreements(p_match_id);
    m.membership_version := m.membership_version + 1;
  end if;

  if m.mode = 'pair' then
    m.status := 'closed';
  elsif v_count = 0 then
    m.status := 'closed';
  elsif m.status in ('forming','chatting','locked') then
    m.status := case when v_count < 3 then 'forming' else 'chatting' end;
  end if;

  if m.status = 'closed' then
    update public.buddy_match_members set left_at = now() where match_id = p_match_id and left_at is null;
  end if;

  update public.buddy_matches
     set status = m.status, membership_version = m.membership_version, updated_at = now()
   where id = p_match_id;

  return jsonb_build_object('status', m.status, 'membershipVersion', m.membership_version,
                            'memberCount', private.matching_active_count(p_match_id), 'changed', true);
end $$;

-- Helper for Member 5's agree_to_go: lock membership at first consent WITHOUT bumping version.
-- Returns the current version; raises if caller is not an active member or match not consentable.
create or replace function private.matching_lock_for_consent(p_match_id uuid, p_user uuid)
returns int language plpgsql volatile set search_path = '' as $$
declare m public.buddy_matches;
begin
  select * into m from public.buddy_matches where id = p_match_id for update;
  if not found then raise exception 'Match not found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.buddy_match_members where match_id = p_match_id and user_id = p_user and left_at is null) then
    raise exception 'Not a member of this match' using errcode = '42501';
  end if;
  if m.status = 'chatting' then
    update public.buddy_matches set status = 'locked', updated_at = now() where id = p_match_id;
  elsif m.status <> 'locked' then
    raise exception 'Match is not open for agreement (status %)', m.status using errcode = '22023';
  end if;
  return m.membership_version;
end $$;

-- Block separation: any active, shared match between the two users is severed.
-- Rule: pair -> closed. group -> the BLOCKER is moved out (so a block cannot be used to
-- eject someone else), consent resets per matching_remove_member. Either way the two
-- parties no longer share a chat.
create or replace function private.matching_separate_blocked(p_blocker uuid, p_blocked uuid)
returns int language plpgsql volatile set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in
    select a.match_id from public.buddy_match_members a
    join public.buddy_match_members b on b.match_id = a.match_id and b.user_id = p_blocked and b.left_at is null
    join public.buddy_matches mt on mt.id = a.match_id and mt.status <> 'closed'
    where a.user_id = p_blocker and a.left_at is null
  loop
    perform private.matching_remove_member(r.match_id, p_blocker);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function private.matching_on_block()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.matching_separate_blocked(new.blocker_id, new.blocked_id);
  return new;
end $$;
-- Additive trigger on 0001's blocks table: severs shared chats however the block was created.
create trigger blocks_separate_matches after insert on public.blocks
  for each row execute function private.matching_on_block();

revoke all on all functions in schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Client RPCs
-- ---------------------------------------------------------------------

-- request_buddy(event, mode, max_size) -> { state: 'queued'|'forming'|'matched', matchId?, memberCount?, maxSize? }
create or replace function public.request_buddy(p_event_id uuid, p_mode text, p_max_size int default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := public.assert_verified_student();
  v_cap int; v_match uuid; v_other record; v_existing record; v_count int; v_status text;
begin
  if p_mode not in ('pair','group') then raise exception 'Invalid mode' using errcode = '22023'; end if;
  if p_mode = 'group' then
    v_cap := coalesce(p_max_size, 5);
    if v_cap not between 3 and 5 then raise exception 'Group size must be 3, 4 or 5' using errcode = '22023'; end if;
  else
    v_cap := null;
  end if;

  if not exists (select 1 from public.events where id = p_event_id) then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  -- Eligibility: caller must have RSVP'd "going" (self-reported intent) via rsvp_to_event (0002).
  if not exists (select 1 from public.event_rsvps where event_id = p_event_id and user_id = v_uid and status = 'going') then
    raise exception 'RSVP "going" to this event before finding a buddy' using errcode = '42501';
  end if;

  perform private.matching_lock_event(p_event_id);

  -- Already placed in an active match for this event? Return it (idempotent across tabs).
  select m.id, m.mode, m.status into v_existing
    from public.buddy_match_members mm join public.buddy_matches m on m.id = mm.match_id
   where mm.event_id = p_event_id and mm.user_id = v_uid and mm.left_at is null;
  if found then
    if v_existing.mode <> p_mode then
      raise exception 'You are already in a % match for this event', v_existing.mode using errcode = '23505';
    end if;
    return jsonb_build_object('state', case when v_existing.status = 'forming' then 'forming' else 'matched' end,
                              'matchId', v_existing.id);
  end if;

  -- Already waiting?
  select * into v_existing from public.buddy_requests where event_id = p_event_id and user_id = v_uid and status = 'waiting';
  if found then
    if v_existing.mode <> p_mode then
      raise exception 'Cancel your % request before switching mode', v_existing.mode using errcode = '23505';
    end if;
    return jsonb_build_object('state', 'queued');
  end if;

  if p_mode = 'pair' then
    select r.id, r.user_id into v_other
      from public.buddy_requests r
     where r.event_id = p_event_id and r.mode = 'pair' and r.status = 'waiting'
       and r.user_id <> v_uid
       and not public.is_blocked_pair(v_uid, r.user_id)
       and public.is_verified_student(r.user_id)
     order by r.created_at
     limit 1
     for update skip locked;

    if not found then
      insert into public.buddy_requests(event_id, user_id, mode) values (p_event_id, v_uid, 'pair');
      return jsonb_build_object('state', 'queued');
    end if;

    insert into public.buddy_matches(event_id, mode, max_size, status) values (p_event_id, 'pair', 2, 'chatting')
      returning id into v_match;
    insert into public.buddy_match_members(match_id, event_id, user_id, pseudonym)
      values (v_match, p_event_id, v_other.user_id, private.matching_new_pseudonym(v_match));
    insert into public.buddy_match_members(match_id, event_id, user_id, pseudonym)
      values (v_match, p_event_id, v_uid, private.matching_new_pseudonym(v_match));
    update public.buddy_requests set status = 'assigned', match_id = v_match, updated_at = now() where id = v_other.id;
    insert into public.buddy_requests(event_id, user_id, mode, status, match_id) values (p_event_id, v_uid, 'pair', 'assigned', v_match);
    return jsonb_build_object('state', 'matched', 'matchId', v_match, 'memberCount', 2, 'maxSize', 2);
  end if;

  -- GROUP: join the fullest compatible open group (cap <= my cap, not locked, room left, no block relation).
  select m.id into v_match
    from public.buddy_matches m
   where m.event_id = p_event_id and m.mode = 'group' and m.status in ('forming','chatting')
     and m.max_size <= v_cap
     and private.matching_active_count(m.id) < m.max_size
     and not exists (select 1 from public.buddy_match_members mm
                      where mm.match_id = m.id and mm.left_at is null
                        and (public.is_blocked_pair(v_uid, mm.user_id) or not public.is_verified_student(mm.user_id)))
   order by private.matching_active_count(m.id) desc, m.created_at
   limit 1
   for update;

  if v_match is null then
    insert into public.buddy_matches(event_id, mode, max_size, status) values (p_event_id, 'group', v_cap, 'forming')
      returning id into v_match;
  else
    update public.buddy_matches set membership_version = membership_version + 1, updated_at = now() where id = v_match;
  end if;

  insert into public.buddy_match_members(match_id, event_id, user_id, pseudonym)
    values (v_match, p_event_id, v_uid, private.matching_new_pseudonym(v_match));
  insert into public.buddy_requests(event_id, user_id, mode, max_size, status, match_id)
    values (p_event_id, v_uid, 'group', v_cap, 'assigned', v_match);

  v_count := private.matching_active_count(v_match);
  update public.buddy_matches
     set status = case when v_count >= 3 then 'chatting' else 'forming' end, updated_at = now()
   where id = v_match
   returning status into v_status;

  return jsonb_build_object('state', case when v_status = 'chatting' then 'matched' else 'forming' end,
                            'matchId', v_match, 'memberCount', v_count,
                            'maxSize', (select max_size from public.buddy_matches where id = v_match));
end $$;

-- cancel_buddy_request(event, mode): cancel own waiting request, or leave a still-FORMING group.
-- Once a chat is active, use leave_match.
create or replace function public.cancel_buddy_request(p_event_id uuid, p_mode text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_match uuid; v_status text;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  perform private.matching_lock_event(p_event_id);

  update public.buddy_requests set status = 'cancelled', updated_at = now()
   where event_id = p_event_id and user_id = v_uid and mode = p_mode and status = 'waiting';

  if p_mode = 'group' then
    select m.id, m.status into v_match, v_status
      from public.buddy_match_members mm join public.buddy_matches m on m.id = mm.match_id
     where mm.event_id = p_event_id and mm.user_id = v_uid and mm.left_at is null and m.mode = 'group';
    if v_match is not null then
      if v_status <> 'forming' then
        raise exception 'Your group chat is active — use leave_match instead' using errcode = '22023';
      end if;
      perform private.matching_remove_member(v_match, v_uid);
    end if;
  end if;
end $$;

-- leave_match(match): member exit; resets consent and status via matching_remove_member.
create or replace function public.leave_match(p_match_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_event uuid;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select event_id into v_event from public.buddy_match_members
   where match_id = p_match_id and user_id = v_uid and left_at is null;
  if v_event is null then raise exception 'Not a member of this match' using errcode = '42501'; end if;
  perform private.matching_lock_event(v_event);
  return private.matching_remove_member(p_match_id, v_uid);
end $$;

-- get_my_match(match) -> BuddyMatchView (camelCase). Pseudonyms ONLY; never reads profiles.
create or replace function public.get_my_match(p_match_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); m public.buddy_matches; v_me text;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select pseudonym into v_me from public.buddy_match_members
   where match_id = p_match_id and user_id = v_uid and left_at is null;
  if v_me is null then raise exception 'Not a member of this match' using errcode = '42501'; end if;
  select * into m from public.buddy_matches where id = p_match_id;

  return jsonb_build_object(
    'id', m.id, 'eventId', m.event_id, 'mode', m.mode, 'status', m.status,
    'memberCount', private.matching_active_count(m.id), 'maxSize', m.max_size,
    'membershipVersion', m.membership_version, 'myPseudonym', v_me,
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
               'pseudonym', mm.pseudonym,
               'agreed', private.matching_has_agreed(m.id, mm.user_id, m.membership_version),
               'reliabilityBand', private.matching_reliability_band(mm.user_id))
             order by mm.joined_at)
        from public.buddy_match_members mm where mm.match_id = m.id and mm.left_at is null), '[]'::jsonb));
end $$;

-- get_my_buddy_status(event) -> what the caller currently has for this event (for the panel / polling).
create or replace function public.get_my_buddy_status(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); r record;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select m.id, m.mode, m.status, m.max_size into r
    from public.buddy_match_members mm join public.buddy_matches m on m.id = mm.match_id
   where mm.event_id = p_event_id and mm.user_id = v_uid and mm.left_at is null;
  if found then
    return jsonb_build_object('state', case when r.status = 'forming' then 'forming' else 'matched' end,
      'mode', r.mode, 'matchId', r.id, 'matchStatus', r.status,
      'memberCount', private.matching_active_count(r.id), 'maxSize', r.max_size);
  end if;
  select mode into r from public.buddy_requests where event_id = p_event_id and user_id = v_uid and status = 'waiting';
  if found then return jsonb_build_object('state', 'queued', 'mode', r.mode); end if;
  return jsonb_build_object('state', 'none');
end $$;

revoke all on function public.request_buddy(uuid, text, int)    from public, anon;
revoke all on function public.cancel_buddy_request(uuid, text)  from public, anon;
revoke all on function public.leave_match(uuid)                 from public, anon;
revoke all on function public.get_my_match(uuid)                from public, anon;
revoke all on function public.get_my_buddy_status(uuid)         from public, anon;
grant execute on function public.request_buddy(uuid, text, int)   to authenticated;
grant execute on function public.cancel_buddy_request(uuid, text) to authenticated;
grant execute on function public.leave_match(uuid)                to authenticated;
grant execute on function public.get_my_match(uuid)               to authenticated;
grant execute on function public.get_my_buddy_status(uuid)        to authenticated;
