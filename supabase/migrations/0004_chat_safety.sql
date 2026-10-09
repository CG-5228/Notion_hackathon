-- =====================================================================
-- 0004_chat_safety.sql — Member 5
-- Pseudonymous chat, unanimous consent + reveal, report/block,
-- cancellation, post-meetup check-in and conservative reliability.
--
-- Depends on:
--   0001: public.assert_verified_student(), public.blocks, public.profiles,
--         public.universities, public.interests, public.profile_interests
--   0002: public.events(id, title, starts_at, venue_public)
--   0003: public.buddy_matches(id, event_id, mode, status, max_size,
--                               membership_version, updated_at)
--         public.buddy_match_members(match_id, user_id, pseudonym,
--                                    joined_at, left_at)  -- left_at null = active
-- Coordinate with Member 4 if 0003 column names differ.
--
-- Design rules
--  * Clients get NO direct table access to anything in this file. All reads
--    and writes go through SECURITY DEFINER RPCs that start with
--    public.assert_verified_student().
--  * Realtime: clients subscribe to public.match_activity (match_id + tick
--    only, RLS = active members). Payloads never carry message bodies or
--    user ids; the client re-reads through get_match_messages/get_my_match.
--    A removed or blocked member fails RLS and stops receiving events.
--  * No real profile field leaves the database before N/N consent on the
--    CURRENT membership_version (private.m5_reveal_ok).
--  * Outcome resolution is server/moderator controlled. A no-show or an
--    upheld late cancellation is NEVER created automatically.
-- =====================================================================

create schema if not exists private;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.buddy_matches(id) on delete cascade,
  sender_id   uuid references auth.users(id) on delete set null,
  kind        text not null default 'user' check (kind in ('user', 'system')),
  body        text not null check (char_length(body) between 1 and 4000),  -- escaped form of <= 1000 chars
  created_at  timestamptz not null default now(),
  check (kind = 'system' or sender_id is not null)
);
create index messages_match_created_idx on public.messages(match_id, created_at);
create index messages_sender_recent_idx on public.messages(sender_id, created_at);

create table public.buddy_agreements (
  match_id            uuid not null references public.buddy_matches(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  membership_version  integer not null,
  agreed_at           timestamptz not null default now(),
  unique (match_id, user_id, membership_version)
);

create table public.reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid not null references auth.users(id) on delete cascade,
  target_user_id    uuid references auth.users(id) on delete set null,
  target_pseudonym  text,
  event_id          uuid references public.events(id) on delete set null,
  match_id          uuid references public.buddy_matches(id) on delete set null,
  reason            text not null check (reason in
                      ('harassment','inappropriate_content','impersonation','safety_concern',
                       'spam','misleading_event','other')),
  details           text check (details is null or char_length(details) <= 1000),
  status            text not null default 'pending' check (status in ('pending','under_review','actioned','dismissed')),
  created_at        timestamptz not null default now(),
  reviewed_by       uuid references auth.users(id),
  reviewed_at       timestamptz,
  check (target_user_id is not null or event_id is not null)
);
create index reports_status_idx on public.reports(status, created_at);
create index reports_reporter_idx on public.reports(reporter_id, created_at);

-- What each member SAID after the meetup (raw statements, never shown to others).
create table public.meetup_checkins (
  match_id      uuid not null references public.buddy_matches(id) on delete cascade,
  reporter_id   uuid not null references auth.users(id) on delete cascade,
  outcome       text not null check (outcome in ('attended','did_not_meet','dispute_other')),
  submitted_at  timestamptz not null default now(),
  primary key (match_id, reporter_id)
);

-- Derived per-person outcome (user_id = the person the outcome is ABOUT).
-- Written only by server functions / moderators. Score reads ONLY resolved rows.
create table public.meetup_outcomes (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references public.buddy_matches(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('attended','did_not_meet','dispute','late_cancel','advance_cancel')),
  resolution    text not null default 'pending' check (resolution in ('pending','resolved','disputed','excused')),
  details       text check (details is null or char_length(details) <= 300),
  is_demo       boolean not null default false,
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid references auth.users(id),
  unique (match_id, user_id)
);
create index meetup_outcomes_user_idx on public.meetup_outcomes(user_id);

create table public.outcome_audit (
  id              bigint generated always as identity primary key,
  outcome_id      uuid not null,
  match_id        uuid not null,
  user_id         uuid not null,
  actor_id        uuid,
  action          text not null,
  old_kind        text,
  new_kind        text,
  old_resolution  text,
  new_resolution  text,
  created_at      timestamptz not null default now()
);

-- Admin-maintained (dashboard / service role only).
create table public.moderators (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Realtime signal table: match_id + counter only.
create table public.match_activity (
  match_id    uuid primary key references public.buddy_matches(id) on delete cascade,
  tick        bigint not null default 0,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Grants + RLS (explicit; nothing broad)
-- ---------------------------------------------------------------------
revoke all on public.messages, public.buddy_agreements, public.reports, public.meetup_checkins,
              public.meetup_outcomes, public.outcome_audit, public.moderators, public.match_activity
  from anon, authenticated;
grant all on public.messages, public.buddy_agreements, public.reports, public.meetup_checkins,
             public.meetup_outcomes, public.outcome_audit, public.moderators, public.match_activity
  to service_role;
grant select on public.match_activity to authenticated;

alter table public.messages         enable row level security;
alter table public.buddy_agreements enable row level security;
alter table public.reports          enable row level security;
alter table public.meetup_checkins  enable row level security;
alter table public.meetup_outcomes  enable row level security;
alter table public.outcome_audit    enable row level security;
alter table public.moderators       enable row level security;
alter table public.match_activity   enable row level security;

-- ---------------------------------------------------------------------
-- Private helpers (schema "private" is not exposed via the API)
-- ---------------------------------------------------------------------
create or replace function private.m5_is_active_member(p_match uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.buddy_match_members m
                 where m.match_id = p_match and m.user_id = p_user and m.left_at is null);
$$;

-- RLS helper must be callable by the invoker; it only answers for auth.uid().
create or replace function public.is_my_active_match(p_match uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.m5_is_active_member(p_match, auth.uid());
$$;
revoke all on function public.is_my_active_match(uuid) from public, anon;
grant execute on function public.is_my_active_match(uuid) to authenticated;

create policy match_activity_member_read on public.match_activity for select to authenticated
  using (public.is_my_active_match(match_id));

create or replace function private.m5_touch(p_match uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.match_activity (match_id, tick) values (p_match, 1)
  on conflict (match_id) do update set tick = public.match_activity.tick + 1, updated_at = now();
$$;

create or replace function private.m5_system_message(p_match uuid, p_body text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.messages (match_id, sender_id, kind, body) values (p_match, null, 'system', p_body);
  perform private.m5_touch(p_match);
end $$;

create or replace function private.m5_escape(p text)
returns text language sql immutable set search_path = '' as $$
  select replace(replace(replace(replace(replace(p, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

create or replace function private.is_moderator(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.moderators where user_id = p_user);
$$;

create or replace function private.m5_active_count(p_match uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.buddy_match_members where match_id = p_match and left_at is null;
$$;

-- True only when every CURRENT active member agreed on the CURRENT version.
create or replace function private.m5_reveal_ok(p_match uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_status text; v_version int; v_active int; v_agreed int;
begin
  select status, membership_version into v_status, v_version
    from public.buddy_matches where id = p_match;
  if v_status is distinct from 'revealed' then return false; end if;
  v_active := private.m5_active_count(p_match);
  -- after reveal a member may cancel; reveal stands for the remaining agreed members
  if v_active < 1 then return false; end if;
  select count(*) into v_agreed
    from public.buddy_match_members m
    join public.buddy_agreements a on a.match_id = m.match_id and a.user_id = m.user_id
                                   and a.membership_version = v_version
   where m.match_id = p_match and m.left_at is null;
  return v_agreed = v_active;
end $$;

-- Reliability over RESOLVED, evidence-backed outcomes only.
create or replace function private.m5_reliability(p_user uuid,
  out attended int, out late_cancel int, out no_show int, out sample int, out score int, out band text)
language plpgsql stable security definer set search_path = '' as $$
begin
  select count(*) filter (where kind = 'attended'),
         count(*) filter (where kind = 'late_cancel'),
         count(*) filter (where kind = 'did_not_meet')
    into attended, late_cancel, no_show
    from public.meetup_outcomes
   where user_id = p_user and resolution = 'resolved';
  sample := attended + late_cancel + no_show;
  if sample < 3 then
    score := null; band := 'new';
  else
    score := round(100.0 * (attended + 0.5 * late_cancel) / sample);
    band := case when score >= 80 then 'generally_reliable'
                 when no_show >= 2 then 'repeated_verified_no_shows'
                 else 'mixed' end;
  end if;
end $$;

-- Membership removal before/after reveal. Member 4's leave_match should call
-- this (or apply identical rules) so consent invalidation stays in one place.
create or replace function private.m5_remove_member(p_match uuid, p_user uuid, p_notice text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_mode text; v_status text; v_remaining int;
begin
  select mode, status into v_mode, v_status from public.buddy_matches where id = p_match for update;
  if v_status is null then raise exception 'match not found' using errcode = 'P0002'; end if;

  update public.buddy_match_members set left_at = now()
   where match_id = p_match and user_id = p_user and left_at is null;
  if not found then return v_status; end if;

  v_remaining := private.m5_active_count(p_match);

  if v_status in ('forming', 'chatting', 'locked') then
    -- membership actually changed: invalidate every pending agreement + bump version
    delete from public.buddy_agreements where match_id = p_match;
    update public.buddy_matches set membership_version = membership_version + 1 where id = p_match;
    if v_mode = 'pair' then
      v_status := 'closed';
    elsif v_remaining < 3 then
      v_status := 'forming';
    else
      v_status := 'chatting';  -- unlocked; everyone must agree again
    end if;
  else
    -- after reveal: plan continues for the rest unless too few remain
    if v_mode = 'pair' or v_remaining < 2 then v_status := 'closed'; end if;
  end if;

  update public.buddy_matches set status = v_status, updated_at = now() where id = p_match;
  if p_notice is not null then perform private.m5_system_message(p_match, p_notice); end if;
  perform private.m5_touch(p_match);
  return v_status;
end $$;

-- Re-derive per-person outcomes from check-ins. Never touches moderator-reviewed
-- rows and never produces a resolved no-show.
--   Pair : attended resolves only when BOTH said "attended".
--   Group: X attended resolves when X said attended AND at least
--          min(2, active-1) other members said attended.
--   Any did_not_meet / dispute statement leaves conflicting people pending/disputed
--   for moderator review.
create or replace function private.m5_recompute_outcomes(p_match uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_mode text; v_n int; v_need int; r record; v_others_att int; v_negative int;
begin
  select mode into v_mode from public.buddy_matches where id = p_match;
  v_n := private.m5_active_count(p_match);
  v_need := case when v_mode = 'pair' then 1 else least(2, greatest(v_n - 1, 1)) end;
  select count(*) into v_negative from public.meetup_checkins
   where match_id = p_match and outcome in ('did_not_meet', 'dispute_other');

  for r in select m.user_id, c.outcome
             from public.buddy_match_members m
             left join public.meetup_checkins c on c.match_id = m.match_id and c.reporter_id = m.user_id
            where m.match_id = p_match and m.left_at is null loop
    if exists (select 1 from public.meetup_outcomes o
                where o.match_id = p_match and o.user_id = r.user_id
                  and (o.reviewed_at is not null or o.kind in ('late_cancel', 'advance_cancel'))) then
      continue;
    end if;
    select count(*) into v_others_att from public.meetup_checkins
     where match_id = p_match and reporter_id <> r.user_id and outcome = 'attended';

    if r.outcome = 'attended' and v_others_att >= v_need and (v_mode = 'group' or v_negative = 0) then
      insert into public.meetup_outcomes (match_id, user_id, kind, resolution)
      values (p_match, r.user_id, 'attended', 'resolved')
      on conflict (match_id, user_id) do update set kind = 'attended', resolution = 'resolved', submitted_at = now();
    elsif r.outcome = 'attended' and v_negative > 0 then
      insert into public.meetup_outcomes (match_id, user_id, kind, resolution)
      values (p_match, r.user_id, 'dispute', 'disputed')
      on conflict (match_id, user_id) do update set kind = 'dispute', resolution = 'disputed', submitted_at = now();
    elsif r.outcome is null and v_negative > 0 and v_others_att = 0 then
      -- someone says they did not meet; the silent member is only QUEUED for review
      insert into public.meetup_outcomes (match_id, user_id, kind, resolution)
      values (p_match, r.user_id, 'did_not_meet', 'pending')
      on conflict (match_id, user_id) do update set kind = 'did_not_meet', resolution = 'pending', submitted_at = now();
    elsif r.outcome in ('did_not_meet', 'dispute_other') then
      insert into public.meetup_outcomes (match_id, user_id, kind, resolution)
      values (p_match, r.user_id, 'dispute', 'disputed')
      on conflict (match_id, user_id) do update set kind = 'dispute', resolution = 'disputed', submitted_at = now();
    end if;
  end loop;
end $$;

-- Pseudonym-only match view (+ revealed profiles only after N/N).
create or replace function private.m5_match_view(p_match uuid, p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb; m record; v_active int; v_agreed int; v_reveal boolean;
begin
  select bm.id, bm.event_id, bm.mode, bm.status, bm.max_size, bm.membership_version,
         e.title, e.starts_at, e.venue_public
    into m
    from public.buddy_matches bm left join public.events e on e.id = bm.event_id
   where bm.id = p_match;
  v_active := private.m5_active_count(p_match);
  select count(*) into v_agreed
    from public.buddy_match_members mm
    join public.buddy_agreements a on a.match_id = mm.match_id and a.user_id = mm.user_id
                                   and a.membership_version = m.membership_version
   where mm.match_id = p_match and mm.left_at is null;
  v_reveal := private.m5_reveal_ok(p_match);

  v := jsonb_build_object(
    'id', m.id, 'eventId', m.event_id, 'mode', m.mode, 'status', m.status,
    'memberCount', v_active, 'maxSize', m.max_size, 'membershipVersion', m.membership_version,
    'agreedCount', v_agreed,
    'chatEnabled', m.status in ('chatting', 'locked', 'revealed')
                   and ((m.mode = 'pair' and v_active = 2) or (m.mode = 'group' and v_active >= 3)
                        or m.status = 'revealed'),
    'myPseudonym', (select pseudonym from public.buddy_match_members
                     where match_id = p_match and user_id = p_uid and left_at is null),
    'iAgreed', exists (select 1 from public.buddy_agreements
                        where match_id = p_match and user_id = p_uid and membership_version = m.membership_version),
    'myCheckIn', (select outcome from public.meetup_checkins where match_id = p_match and reporter_id = p_uid),
    'event', jsonb_build_object('title', m.title, 'startsAt', m.starts_at, 'venuePublic', m.venue_public),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
               'pseudonym', mm.pseudonym,
               'isMe', mm.user_id = p_uid,
               'agreed', exists (select 1 from public.buddy_agreements a
                                  where a.match_id = p_match and a.user_id = mm.user_id
                                    and a.membership_version = m.membership_version),
               'reliabilityBand', (private.m5_reliability(mm.user_id)).band)
             order by mm.joined_at)
        from public.buddy_match_members mm
       where mm.match_id = p_match and mm.left_at is null), '[]'::jsonb));

  if v_reveal then
    v := v || jsonb_build_object('revealedProfiles', private.m5_revealed_profiles(p_match, p_uid));
  end if;
  return v;
end $$;

create or replace function private.m5_revealed_profiles(p_match uuid, p_uid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'displayName', p.display_name,
           'university', u.name,
           'avatarUrl', p.avatar_url,
           'sharedInterests', coalesce((
              select jsonb_agg(i.label order by i.label)
                from public.profile_interests pi join public.interests i on i.id = pi.interest_id
               where pi.user_id = p.user_id and pi.share_on_reveal), '[]'::jsonb))
         order by mm.joined_at), '[]'::jsonb)
    from public.buddy_match_members mm
    join public.profiles p on p.user_id = mm.user_id
    left join public.universities u on u.id = p.university_id
   where mm.match_id = p_match and mm.left_at is null and mm.user_id <> p_uid;
$$;

-- Outcome audit trail
create or replace function private.m5_audit_outcome()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.outcome_audit (outcome_id, match_id, user_id, actor_id, action,
                                    old_kind, new_kind, old_resolution, new_resolution)
  values (new.id, new.match_id, new.user_id, auth.uid(), lower(tg_op),
          case when tg_op = 'UPDATE' then old.kind end, new.kind,
          case when tg_op = 'UPDATE' then old.resolution end, new.resolution);
  return new;
end $$;
create trigger meetup_outcomes_audit after insert or update on public.meetup_outcomes
  for each row execute function private.m5_audit_outcome();

-- New members joining (Member 4's request_buddy) also signal the chat.
create or replace function private.m5_member_touch()
returns trigger language plpgsql security definer set search_path = '' as $$
begin perform private.m5_touch(new.match_id); return new; end $$;
create trigger buddy_match_members_touch after insert or update on public.buddy_match_members
  for each row execute function private.m5_member_touch();

-- Realtime publication (Supabase creates it; guarded for plain Postgres)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.match_activity;
  end if;
end $$;

-- =====================================================================
-- Client RPCs
-- =====================================================================

-- get_my_match: defined here (not 0003) because agreement state lives in 0004.
create or replace function public.get_my_match(p_match_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student();
begin
  if not private.m5_is_active_member(p_match_id, v_uid) then
    raise exception 'not a member of this match' using errcode = '42501';
  end if;
  return private.m5_match_view(p_match_id, v_uid);
end $$;

create or replace function public.get_match_messages(p_match_id uuid, p_limit int default 100)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student();
begin
  if not private.m5_is_active_member(p_match_id, v_uid) then
    raise exception 'not a member of this match' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(x.j order by x.created_at)
      from (select msg.created_at, jsonb_build_object(
                     'id', msg.id, 'kind', msg.kind,
                     'pseudonym', mm.pseudonym,
                     'isOwn', msg.sender_id = v_uid,
                     'body', msg.body, 'createdAt', msg.created_at) j
              from public.messages msg
              left join public.buddy_match_members mm on mm.match_id = msg.match_id and mm.user_id = msg.sender_id
             where msg.match_id = p_match_id
               and (msg.sender_id is null or not exists (
                     select 1 from public.blocks b
                      where (b.blocker_id = v_uid and b.blocked_id = msg.sender_id)
                         or (b.blocker_id = msg.sender_id and b.blocked_id = v_uid)))
             order by msg.created_at desc
             limit least(greatest(p_limit, 1), 200)) x), '[]'::jsonb);
end $$;

create or replace function public.send_message(p_match_id uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student(); v_view jsonb; v_body text; v_id uuid; v_at timestamptz;
begin
  if not private.m5_is_active_member(p_match_id, v_uid) then
    raise exception 'not a member of this match' using errcode = '42501';
  end if;
  v_view := private.m5_match_view(p_match_id, v_uid);
  if not (v_view->>'chatEnabled')::boolean then
    raise exception 'chat is not open for this match' using errcode = '55000';
  end if;
  v_body := btrim(regexp_replace(coalesce(p_body, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g'));
  if char_length(v_body) < 1 or char_length(v_body) > 1000 then
    raise exception 'message must be 1-1000 characters' using errcode = '22023';
  end if;
  if (select count(*) from public.messages
       where sender_id = v_uid and match_id = p_match_id
         and created_at > now() - interval '30 seconds') >= 10 then
    raise exception 'slow down — too many messages' using errcode = '54000';
  end if;
  insert into public.messages (match_id, sender_id, kind, body)
  values (p_match_id, v_uid, 'user', private.m5_escape(v_body))
  returning id, created_at into v_id, v_at;
  perform private.m5_touch(p_match_id);
  return jsonb_build_object('id', v_id, 'kind', 'user', 'pseudonym', v_view->>'myPseudonym',
                            'isOwn', true, 'body', private.m5_escape(v_body), 'createdAt', v_at);
end $$;

create or replace function public.agree_to_go(p_match_id uuid, p_membership_version int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student(); m record; v_active int; v_agreed int; v_pseudo text;
begin
  select id, mode, status, membership_version into m
    from public.buddy_matches where id = p_match_id for update;
  if m.id is null or not private.m5_is_active_member(p_match_id, v_uid) then
    raise exception 'not a member of this match' using errcode = '42501';
  end if;
  if m.status = 'revealed' then return private.m5_match_view(p_match_id, v_uid); end if;
  if m.status not in ('chatting', 'locked') then
    raise exception 'agreement is not open for this match' using errcode = '55000';
  end if;
  if m.membership_version <> p_membership_version then
    raise exception 'stale_membership_version' using errcode = '40001',
      hint = 'Membership changed. Refresh and review the current members before agreeing.';
  end if;
  v_active := private.m5_active_count(p_match_id);
  if (m.mode = 'pair' and v_active <> 2) or (m.mode = 'group' and v_active < 3) then
    raise exception 'not enough members to agree yet' using errcode = '55000';
  end if;

  if m.status = 'chatting' then  -- first agreement freezes membership; version unchanged
    update public.buddy_matches set status = 'locked', updated_at = now() where id = p_match_id;
  end if;

  insert into public.buddy_agreements (match_id, user_id, membership_version)
  values (p_match_id, v_uid, m.membership_version)
  on conflict do nothing;

  if found then
    select pseudonym into v_pseudo from public.buddy_match_members
     where match_id = p_match_id and user_id = v_uid and left_at is null;
    perform private.m5_system_message(p_match_id, v_pseudo || ' agreed to go.');
  end if;

  select count(*) into v_agreed
    from public.buddy_match_members mm
    join public.buddy_agreements a on a.match_id = mm.match_id and a.user_id = mm.user_id
                                   and a.membership_version = m.membership_version
   where mm.match_id = p_match_id and mm.left_at is null;

  if v_agreed = v_active then
    update public.buddy_matches set status = 'revealed', updated_at = now() where id = p_match_id;
    perform private.m5_system_message(p_match_id,
      'Everyone agreed. Names are now visible to this group. Attendance is still not guaranteed — meet somewhere public.');
  end if;
  perform private.m5_touch(p_match_id);
  return private.m5_match_view(p_match_id, v_uid);
end $$;

create or replace function public.get_revealed_profiles(p_match_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student();
begin
  if not private.m5_is_active_member(p_match_id, v_uid) or not private.m5_reveal_ok(p_match_id) then
    raise exception 'profiles stay hidden until everyone agrees' using errcode = '42501';
  end if;
  return private.m5_revealed_profiles(p_match_id, v_uid);
end $$;

create or replace function public.cancel_confirmed_plan(p_match_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student(); v_status text; v_start timestamptz; v_kind text; v_pseudo text;
begin
  select bm.status, e.starts_at into v_status, v_start
    from public.buddy_matches bm left join public.events e on e.id = bm.event_id
   where bm.id = p_match_id for update of bm;
  if not private.m5_is_active_member(p_match_id, v_uid) then
    raise exception 'not a member of this match' using errcode = '42501';
  end if;
  if v_status <> 'revealed' then
    raise exception 'only confirmed plans can be cancelled here; use leave instead' using errcode = '55000';
  end if;
  if v_start is not null and now() >= v_start then
    raise exception 'the meetup has started; use the check-in screen' using errcode = '55000';
  end if;
  if p_reason is not null and char_length(p_reason) > 300 then
    raise exception 'reason too long' using errcode = '22023';
  end if;

  v_kind := case when v_start is null or v_start - now() > interval '2 hours' then 'advance_cancel' else 'late_cancel' end;
  insert into public.meetup_outcomes (match_id, user_id, kind, resolution, details)
  values (p_match_id, v_uid, v_kind,
          case when v_kind = 'advance_cancel' then 'resolved' else 'pending' end,  -- late = review queue, not a penalty
          nullif(btrim(p_reason), ''))
  on conflict (match_id, user_id) do nothing;

  select pseudonym into v_pseudo from public.buddy_match_members
   where match_id = p_match_id and user_id = v_uid and left_at is null;
  perform private.m5_remove_member(p_match_id, v_uid, v_pseudo || ' can''t make it any more.');
  return jsonb_build_object('kind', v_kind,
    'message', case when v_kind = 'advance_cancel'
      then 'Cancelled with advance notice. This does not affect your reliability.'
      else 'Late cancellation noted for review. It is not an automatic penalty, and emergencies are excused.' end);
end $$;

create or replace function public.submit_meetup_outcome(p_match_id uuid, p_outcome text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student(); v_status text; v_start timestamptz;
begin
  if p_outcome not in ('attended', 'did_not_meet', 'dispute_other') then
    raise exception 'invalid outcome' using errcode = '22023';
  end if;
  select bm.status, e.starts_at into v_status, v_start
    from public.buddy_matches bm left join public.events e on e.id = bm.event_id
   where bm.id = p_match_id for update of bm;
  if not private.m5_is_active_member(p_match_id, v_uid) then
    raise exception 'not a member of this match' using errcode = '42501';
  end if;
  if v_status <> 'revealed' then  -- only unanimous plans are tracked
    raise exception 'only confirmed plans have check-ins' using errcode = '55000';
  end if;
  if v_start is not null and now() < v_start then
    raise exception 'check-in opens when the meetup starts' using errcode = '55000';
  end if;
  insert into public.meetup_checkins (match_id, reporter_id, outcome) values (p_match_id, v_uid, p_outcome)
  on conflict (match_id, reporter_id) do update set outcome = excluded.outcome, submitted_at = now();
  perform private.m5_recompute_outcomes(p_match_id);
  return jsonb_build_object('recorded', p_outcome,
    'message', 'Thanks. Nothing affects anyone''s reliability without corroboration or review.');
end $$;

create or replace function public.get_reliability_summary(p_target_pseudonym text, p_match_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student(); v_target uuid; r record;
begin
  if not private.m5_is_active_member(p_match_id, v_uid) then
    raise exception 'not a member of this match' using errcode = '42501';
  end if;
  select user_id into v_target from public.buddy_match_members
   where match_id = p_match_id and pseudonym = p_target_pseudonym and left_at is null;
  if v_target is null then raise exception 'unknown member' using errcode = 'P0002'; end if;
  r := private.m5_reliability(v_target);
  return jsonb_build_object('band', r.band, 'sampleCount', r.sample);  -- coarse only
end $$;

create or replace function public.get_my_reliability()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student(); r record;
begin
  r := private.m5_reliability(v_uid);
  return jsonb_build_object('band', r.band, 'sampleCount', r.sample, 'score', r.score,
    'confirmedAttended', r.attended, 'upheldLateCancel', r.late_cancel, 'confirmedNoShow', r.no_show,
    'pendingReview', (select count(*) from public.meetup_outcomes
                       where user_id = v_uid and resolution in ('pending', 'disputed')
                         and kind in ('did_not_meet', 'late_cancel', 'dispute')));
end $$;

-- Block rule: pair -> chat closed. Group -> the BLOCKER is removed (consents reset,
-- version bumped), so neither side receives the other's messages; blocked pairs
-- are also filtered from history and excluded from future matching (0003 uses
-- public.is_blocked_pair).
create or replace function public.block_user(p_target_pseudonym text, p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student(); v_target uuid; v_mode text; v_status text;
begin
  if not private.m5_is_active_member(p_match_id, v_uid) then
    raise exception 'not a member of this match' using errcode = '42501';
  end if;
  select user_id into v_target from public.buddy_match_members
   where match_id = p_match_id and pseudonym = p_target_pseudonym;
  if v_target is null or v_target = v_uid then raise exception 'unknown member' using errcode = 'P0002'; end if;

  insert into public.blocks (blocker_id, blocked_id) values (v_uid, v_target) on conflict do nothing;

  select mode into v_mode from public.buddy_matches where id = p_match_id;
  if v_mode = 'pair' then
    update public.buddy_matches set status = 'closed', updated_at = now() where id = p_match_id;
    perform private.m5_system_message(p_match_id, 'This chat has been closed.');
    v_status := 'closed';
  else
    v_status := private.m5_remove_member(p_match_id, v_uid,
      'A member left the group. Earlier agreements were reset — everyone needs to agree again.');
  end if;
  return jsonb_build_object('blocked', true, 'youLeftMatch', true, 'matchStatus', v_status);
end $$;

create or replace function public.report_user(p_target_pseudonym text, p_match_id uuid, p_reason text, p_details text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student(); v_target uuid;
begin
  if not exists (select 1 from public.buddy_match_members where match_id = p_match_id and user_id = v_uid) then
    raise exception 'not a member of this match' using errcode = '42501';
  end if;
  select user_id into v_target from public.buddy_match_members
   where match_id = p_match_id and pseudonym = p_target_pseudonym;
  if v_target is null or v_target = v_uid then raise exception 'unknown member' using errcode = 'P0002'; end if;
  if (select count(*) from public.reports where reporter_id = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'report limit reached for today' using errcode = '54000';
  end if;
  insert into public.reports (reporter_id, target_user_id, target_pseudonym, match_id, reason, details)
  values (v_uid, v_target, p_target_pseudonym, p_match_id, p_reason, nullif(btrim(p_details), ''));
  return jsonb_build_object('received', true);  -- never echoes the resolved identity
end $$;

-- Lives here (not 0002) because public.reports is created in 0004.
create or replace function public.report_event(p_event_id uuid, p_reason text, p_details text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student();
begin
  if not exists (select 1 from public.events where id = p_event_id) then
    raise exception 'unknown event' using errcode = 'P0002';
  end if;
  if (select count(*) from public.reports where reporter_id = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'report limit reached for today' using errcode = '54000';
  end if;
  insert into public.reports (reporter_id, event_id, reason, details)
  values (v_uid, p_event_id, p_reason, nullif(btrim(p_details), ''));
  return jsonb_build_object('received', true);
end $$;

-- ---------------------------------------------------------------------
-- Moderator RPCs (restricted to public.moderators; audited by trigger)
-- ---------------------------------------------------------------------
create or replace function public.moderator_review_queue()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student();
begin
  if not private.is_moderator(v_uid) then raise exception 'moderators only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'outcomes', coalesce((select jsonb_agg(to_jsonb(o) order by o.submitted_at) from public.meetup_outcomes o
                           where o.resolution in ('pending', 'disputed')), '[]'::jsonb),
    'reports',  coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.reports r
                           where r.status in ('pending', 'under_review')), '[]'::jsonb));
end $$;

create or replace function public.moderator_resolve_outcome(p_outcome_id uuid, p_kind text, p_resolution text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student();
begin
  if not private.is_moderator(v_uid) then raise exception 'moderators only' using errcode = '42501'; end if;
  if p_kind not in ('attended', 'did_not_meet', 'dispute', 'late_cancel', 'advance_cancel')
     or p_resolution not in ('resolved', 'excused', 'disputed', 'pending') then
    raise exception 'invalid resolution' using errcode = '22023';
  end if;
  update public.meetup_outcomes
     set kind = p_kind, resolution = p_resolution, reviewed_at = now(), reviewed_by = v_uid
   where id = p_outcome_id and user_id <> v_uid;
  if not found then raise exception 'outcome not found' using errcode = 'P0002'; end if;
end $$;

create or replace function public.moderator_set_report_status(p_report_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student();
begin
  if not private.is_moderator(v_uid) then raise exception 'moderators only' using errcode = '42501'; end if;
  if p_status not in ('under_review', 'actioned', 'dismissed') then raise exception 'invalid status' using errcode = '22023'; end if;
  update public.reports set status = p_status, reviewed_by = v_uid, reviewed_at = now() where id = p_report_id;
end $$;

-- ---------------------------------------------------------------------
-- Execute grants: authenticated only
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'public.get_my_match(uuid)', 'public.get_match_messages(uuid, int)', 'public.send_message(uuid, text)',
    'public.agree_to_go(uuid, int)', 'public.get_revealed_profiles(uuid)',
    'public.cancel_confirmed_plan(uuid, text)', 'public.submit_meetup_outcome(uuid, text)',
    'public.get_reliability_summary(text, uuid)', 'public.get_my_reliability()',
    'public.block_user(text, uuid)', 'public.report_user(text, uuid, text, text)',
    'public.report_event(uuid, text, text)', 'public.moderator_review_queue()',
    'public.moderator_resolve_outcome(uuid, text, text)', 'public.moderator_set_report_status(uuid, text)']
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

revoke all on all functions in schema private from public, anon, authenticated;
