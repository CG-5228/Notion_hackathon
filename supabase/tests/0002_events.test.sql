-- Behaviour + security tests for 0002_events.sql. Run after 0001 (+ 0003 optional):
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0002_events.test.sql
-- Runs in one transaction and rolls back. Any failed assertion raises.
begin;

-- Fixtures (as migration owner, like Supabase Auth would)
insert into auth.users (id, email, email_confirmed_at) values
  (md5('alice')::uuid, 'alice@tcd.ie', now()),
  (md5('bob')::uuid, 'bob@ucdconnect.ie', now());
update public.profiles set age_confirmed = true, display_name = 'Real Name ' || left(user_id::text, 4);

insert into public.events (id, title, category, starts_at, venue_public, event_kind, visibility, source_url, review_status)
values (md5('curated')::uuid, 'Curated gig', 'culture', now() + interval '3 days',
        'City hall steps', 'curated_public', 'public', 'https://example.org/gig', 'curated');

create temp table t_ids(k text primary key, id uuid, hash text) on commit drop;
grant all on t_ids to authenticated;

-- ---------- 1. anon cannot discover anything ----------
set local role anon;
do $$ begin
  begin perform * from public.get_discoverable_events(); raise exception 'FAIL: anon could call get_discoverable_events';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ---------- 2. alice (TCD) creates a campus activity and an invite-only one ----------
set local role authenticated;
select set_config('request.jwt.claim.sub', md5('alice')::uuid::text, true);
select set_config('request.jwt.claims', json_build_object('sub', md5('alice')::uuid, 'role', 'authenticated')::text, true);

do $$
declare r record;
begin
  select * into r from public.create_activity('Coffee before lectures', 'Quick one', 'coffee',
    now() + interval '1 day', now() + interval '1 day 1 hour', 'Library café entrance', 'campus');
  insert into t_ids values ('CAMPUS', r.id, r.invite_hash);
  if r.invite_hash is not null then raise exception 'FAIL: campus activity got an invite hash'; end if;

  select * into r from public.create_activity('Secret board games', '', 'other',
    now() + interval '2 days', null, 'Student centre, big table', 'invite_only');
  insert into t_ids values ('INVITE', r.id, r.invite_hash);
  if r.invite_hash is null or length(r.invite_hash) < 32 then raise exception 'FAIL: invite-only activity has no usable hash'; end if;

  -- server-side validation
  begin perform public.create_activity('Flat party', '', 'other', now() + interval '1 day', null, 'My place, apartment 4', 'campus');
        raise exception 'FAIL: private address accepted';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin perform public.create_activity('Yesterday', '', 'other', now() - interval '1 day', null, 'Library', 'campus');
        raise exception 'FAIL: past start accepted';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin perform public.create_activity('Nope', '', 'other', now() + interval '1 day', null, 'Library', 'public');
        raise exception 'FAIL: students may not create public events';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;

  -- feed: curated + own activities (the host sees their own invite-only one; nobody else does)
  if (select count(*) from public.get_discoverable_events() e where e.id = md5('curated')::uuid) <> 1
    then raise exception 'FAIL: curated event missing from feed'; end if;
  if (select count(*) from public.get_discoverable_events() e where e.id = (select id from t_ids where k = 'CAMPUS')) <> 1
    then raise exception 'FAIL: own campus activity missing from feed'; end if;
  if (select count(*) from public.get_discoverable_events() e where e.id = (select id from t_ids where k = 'INVITE')) <> 1
    then raise exception 'FAIL: host cannot see own invite-only activity'; end if;
  if (select kind from public.get_discoverable_events() e where e.id = (select id from t_ids where k = 'CAMPUS')) <> 'student_created'
    then raise exception 'FAIL: student activity not marked student_created'; end if;

  -- RSVP is idempotent and aggregate-only
  if public.rsvp_to_event(md5('curated')::uuid, true) <> 1 then raise exception 'FAIL: first rsvp count'; end if;
  if public.rsvp_to_event(md5('curated')::uuid, true) <> 1 then raise exception 'FAIL: double rsvp counted twice'; end if;
  if public.rsvp_to_event(md5('curated')::uuid, false) <> 0 then raise exception 'FAIL: withdraw did not reduce count'; end if;
  perform public.rsvp_to_event(md5('curated')::uuid, true);
  if (select universities_represented from public.get_discoverable_events() e where e.id = md5('curated')::uuid) is not null
    then raise exception 'FAIL: universities_represented exposed below 5 going'; end if;

  -- no direct table access
  begin perform 1 from public.event_rsvps; raise exception 'FAIL: event_rsvps readable';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.events; raise exception 'FAIL: events readable';
  exception when insufficient_privilege then null; end;

  -- my activities: hosting rows carry the invite hash, going rows do not
  if (select count(*) from public.get_my_activities() a where a.relation = 'hosting') <> 2
    then raise exception 'FAIL: hosting rows'; end if;
  if (select invite_hash from public.get_my_activities() a where a.id = (select id from t_ids where k = 'INVITE')) is null
    then raise exception 'FAIL: host cannot see own invite hash'; end if;
  if (select count(*) from public.get_my_activities() a where a.relation = 'going' and a.id = md5('curated')::uuid) <> 1
    then raise exception 'FAIL: going row missing'; end if;
end $$;

-- ---------- 3. bob (UCD) sees neither alice's campus activity nor the invite-only one without the hash ----------
select set_config('request.jwt.claim.sub', md5('bob')::uuid::text, true);
select set_config('request.jwt.claims', json_build_object('sub', md5('bob')::uuid, 'role', 'authenticated')::text, true);

do $$
declare v_inv uuid := (select id from t_ids where k = 'INVITE'); v_hash text := (select hash from t_ids where k = 'INVITE');
begin
  if (select count(*) from public.get_discoverable_events() e where e.id = (select id from t_ids where k = 'CAMPUS')) <> 0
    then raise exception 'FAIL: other campus activity visible'; end if;
  if (select count(*) from public.get_discoverable_events() e where e.id = v_inv) <> 0
    then raise exception 'FAIL: invite-only activity leaked into another student''s feed'; end if;
  if (select count(*) from public.get_discoverable_events(p_event_id => v_inv)) <> 0
    then raise exception 'FAIL: invite-only readable without hash'; end if;
  if (select count(*) from public.get_discoverable_events(p_event_id => v_inv, p_invite => 'wrong')) <> 0
    then raise exception 'FAIL: invite-only readable with wrong hash'; end if;
  if (select count(*) from public.get_discoverable_events(p_event_id => v_inv, p_invite => v_hash)) <> 1
    then raise exception 'FAIL: invite link does not open the activity'; end if;
  begin perform public.rsvp_to_event(v_inv, true); raise exception 'FAIL: rsvp without invite allowed';
  exception when no_data_found then null; end;
  if public.rsvp_to_event(v_inv, true, v_hash) <> 1 then raise exception 'FAIL: rsvp with invite'; end if;
  if (select invite_hash from public.get_my_activities() a where a.id = v_inv) is not null
    then raise exception 'FAIL: guest can see the invite hash'; end if;
  if public.rsvp_to_event(md5('curated')::uuid, true) <> 2 then raise exception 'FAIL: count across users'; end if;
  -- ratings only after the event starts
  begin perform public.rate_event(md5('curated')::uuid, 5); raise exception 'FAIL: rated before event started';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  -- curator-only review
  begin perform public.review_event(md5('curated')::uuid, 'rejected'); raise exception 'FAIL: non-curator reviewed';
  exception when insufficient_privilege then null; end;
end $$;

select 'ALL 0002 EVENTS TESTS PASSED' as result;
rollback;
