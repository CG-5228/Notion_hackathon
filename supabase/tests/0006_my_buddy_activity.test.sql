-- Security and read-model tests for get_my_buddy_activity().
-- Run after 0001..0006 with the local auth shim; every fixture rolls back.
begin;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-4000-8000-000000000001', 'a@demo.findyourbuddy.test', now()),
  ('00000000-0000-4000-8000-000000000002', 'b@demo.findyourbuddy.test', now());
update public.profiles
   set age_confirmed = true,
       display_name = case when user_id = '00000000-0000-4000-8000-000000000001'
                           then 'Private Member A' else 'Private Member B' end;

insert into public.events (id, title, category, starts_at, venue_public, event_kind, visibility) values
  ('00000000-0000-4000-8000-000000000101', 'A-only waiting event', 'coffee', now() + interval '1 day', 'Campus café', 'student_created', 'public'),
  ('00000000-0000-4000-8000-000000000102', 'B-only waiting event', 'study', now() + interval '2 days', 'Library lobby', 'student_created', 'public'),
  ('00000000-0000-4000-8000-000000000103', 'A-only forming event', 'culture', now() + interval '3 days', 'Market entrance', 'student_created', 'public'),
  ('00000000-0000-4000-8000-000000000104', 'Shared active chat event', 'sport', now() + interval '4 days', 'Sports hall desk', 'student_created', 'public'),
  ('00000000-0000-4000-8000-000000000105', 'Shared locked chat event', 'cinema', now() + interval '5 days', 'Cinema ticket desk', 'student_created', 'public'),
  ('00000000-0000-4000-8000-000000000106', 'Shared confirmed event', 'culture', now() + interval '6 days', 'Gallery front desk', 'student_created', 'public'),
  ('00000000-0000-4000-8000-000000000107', 'Closed event must be hidden', 'coffee', now() + interval '7 days', 'Café entrance', 'student_created', 'public'),
  ('00000000-0000-4000-8000-000000000108', 'Left event must be hidden', 'study', now() + interval '8 days', 'Study room desk', 'student_created', 'public');

insert into public.buddy_requests (id, event_id, user_id, mode, max_size, status) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'pair', null, 'waiting'),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000002', 'pair', null, 'waiting'),
  -- A stale duplicate queue row must not compete with an active match on the same event.
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', 'pair', null, 'waiting');

insert into public.buddy_matches (id, event_id, mode, max_size, status) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000103', 'group', 5, 'forming'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000104', 'pair', 2, 'chatting'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000105', 'group', 3, 'locked'),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000106', 'pair', 2, 'revealed'),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000107', 'pair', 2, 'closed'),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000108', 'pair', 2, 'chatting');

insert into public.buddy_match_members (match_id, event_id, user_id, pseudonym, left_at) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'Aqua Finch', null),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', 'Blue Otter', null),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000002', 'Green Fox', null),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001', 'Amber Finch', null),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000002', 'Violet Fox', null),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000001', 'Silver Finch', null),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000002', 'Copper Fox', null),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000001', 'Bronze Finch', null),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000001', 'Ivory Finch', now());

insert into public.buddy_agreements (match_id, user_id, membership_version) values
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000001', 1),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000002', 1);

create or replace function pg_temp.as_user(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end $$;
grant execute on all functions in schema pg_temp to authenticated;

set local role authenticated;

do $$
declare
  v_total integer;
  v_waiting integer;
  v_forming integer;
  v_chat integer;
  v_confirmed integer;
  v_duplicates integer;
  v_payload text;
begin
  perform pg_temp.as_user('00000000-0000-4000-8000-000000000001');
  select count(*),
         count(*) filter (where activity_state = 'waiting'),
         count(*) filter (where activity_state = 'forming'),
         count(*) filter (where activity_state = 'chat'),
         count(*) filter (where activity_state = 'confirmed'),
         count(*) - count(distinct event_id),
         string_agg(event_title || ' ' || venue_public, '|')
    into v_total, v_waiting, v_forming, v_chat, v_confirmed, v_duplicates, v_payload
    from public.get_my_buddy_activity();

  assert v_total = 5, 'caller should get only five non-duplicate active records: ' || coalesce(v_payload, 'null');
  assert v_waiting = 1 and v_forming = 1 and v_chat = 2 and v_confirmed = 1,
    'request/match states were not mapped correctly';
  assert v_duplicates = 0, 'same-event waiting row duplicated an active match';
  assert v_payload like '%A-only waiting event%' and v_payload like '%A-only forming event%'
     and v_payload like '%Shared confirmed event%', 'safe summaries are missing';
  assert v_payload not like '%B-only waiting event%' and v_payload not like '%Closed event%'
     and v_payload not like '%Left event%', 'another account, closed match, or left membership leaked';
  assert v_payload not like '%Private Member A%' and v_payload not like '%Private Member B%'
     and v_payload not like '%Green Fox%'
     and v_payload not like '%a@demo.findyourbuddy.test%'
     and v_payload not like '%b@demo.findyourbuddy.test%',
    'member identity leaked in the overview';
end $$;

do $$
declare
  v_total integer;
  v_a_only integer;
  v_waiting integer;
begin
  perform pg_temp.as_user('00000000-0000-4000-8000-000000000002');
  select count(*),
         count(*) filter (where event_title in ('A-only waiting event', 'A-only forming event')),
         count(*) filter (where activity_state = 'waiting')
    into v_total, v_a_only, v_waiting
    from public.get_my_buddy_activity();
  assert v_total = 4, 'member B should see only their request and shared active matches';
  assert v_a_only = 0 and v_waiting = 1, 'member A-only requests or forming groups leaked to member B';
end $$;

do $$
declare
  v_denied boolean := false;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform 1 from public.get_my_buddy_activity();
  exception when insufficient_privilege then
    v_denied := true;
  end;
  assert v_denied, 'unauthenticated caller was not rejected';
end $$;

reset role;
set local role anon;
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform 1 from public.get_my_buddy_activity();
  exception when insufficient_privilege then
    v_denied := true;
  end;
  assert v_denied, 'anon could call the private overview RPC';
end $$;
reset role;

update public.profiles set age_confirmed = false
 where user_id = (select id from auth.users where email = 'a@demo.findyourbuddy.test');
select set_config('request.jwt.claim.sub',
  (select id::text from auth.users where email = 'a@demo.findyourbuddy.test'), true);
set local role authenticated;
do $$
declare v_denied boolean := false;
begin
  begin
    perform 1 from public.get_my_buddy_activity();
  exception when insufficient_privilege then
    v_denied := true;
  end;
  assert v_denied, 'ineligible student could still read their saved matching activity';
end $$;
reset role;

do $$ begin raise notice 'ALL 0006 MY BUDDY ACTIVITY TESTS PASSED'; end $$;
rollback;
