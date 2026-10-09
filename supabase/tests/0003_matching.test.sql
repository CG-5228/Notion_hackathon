-- Security + behaviour tests for 0003_matching.sql.
-- Run after 0001 + 0002 (+ optionally 0004); fixtures use the real 0002 events schema:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0003_matching.test.sql
-- Runs in one transaction and rolls back. Any failed assertion raises.
begin;

-- ---------- fixtures (as migration owner) ----------
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@demo.findyourbuddy.test', now()),
  ('00000000-0000-0000-0000-0000000000b1', 'b@demo.findyourbuddy.test', now()),
  ('00000000-0000-0000-0000-0000000000c1', 'c@demo.findyourbuddy.test', now()),
  ('00000000-0000-0000-0000-0000000000d1', 'd@demo.findyourbuddy.test', now()),
  ('00000000-0000-0000-0000-0000000000e1', 'e@demo.findyourbuddy.test', now()),
  ('00000000-0000-0000-0000-0000000000f1', 'f@demo.findyourbuddy.test', now()),
  ('00000000-0000-0000-0000-0000000000a2', 'g@demo.findyourbuddy.test', now()),
  ('00000000-0000-0000-0000-0000000000a3', 'h@demo.findyourbuddy.test', now()),
  ('00000000-0000-0000-0000-0000000000a4', 'unconfirmed@demo.findyourbuddy.test', null);
update public.profiles set age_confirmed = true, display_name = 'Real Name ' || left(user_id::text, 4);

create temp table t_ids(k text primary key, id uuid) on commit drop;
grant all on t_ids to authenticated;
insert into t_ids values ('A','00000000-0000-0000-0000-0000000000a1'),('B','00000000-0000-0000-0000-0000000000b1'),
  ('C','00000000-0000-0000-0000-0000000000c1'),('D','00000000-0000-0000-0000-0000000000d1'),
  ('E','00000000-0000-0000-0000-0000000000e1'),('F','00000000-0000-0000-0000-0000000000f1'),
  ('G','00000000-0000-0000-0000-0000000000a2'),('H','00000000-0000-0000-0000-0000000000a3'),
  ('U','00000000-0000-0000-0000-0000000000a4'),
  ('EV1','10000000-0000-0000-0000-000000000001'),('EV2','10000000-0000-0000-0000-000000000002'),
  ('EV3','10000000-0000-0000-0000-000000000003'),('EV4','10000000-0000-0000-0000-000000000004');

insert into public.events (id, title, category, starts_at, venue_public, event_kind, visibility)
  select id, 'Test event ' || k, 'coffee', now() + interval '1 day', 'Campus café entrance', 'student_created', 'public'
  from t_ids where k like 'EV%';
insert into public.event_rsvps (event_id, user_id, status)
  select e.id, u.id, 'going' from t_ids e cross join t_ids u where e.k like 'EV%' and u.k not like 'EV%';

create or replace function pg_temp.as_user(k text) returns void language plpgsql as $$
declare v uuid := (select id from t_ids where t_ids.k = as_user.k);
begin
  perform set_config('request.jwt.claim.sub', v::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
end $$;
create or replace function pg_temp.ev(k text) returns uuid language sql as $$ select id from t_ids where t_ids.k = ev.k $$;
grant execute on all functions in schema pg_temp to authenticated;

set local role authenticated;

-- ---------- 1. pair: A waits, B arrives -> exactly 2 members, private pseudonyms ----------
do $$ declare r jsonb; v jsonb; m uuid;
begin
  perform pg_temp.as_user('A');
  r := public.request_buddy(pg_temp.ev('EV1'), 'pair');
  assert r->>'state' = 'queued', 'A should wait honestly: ' || r::text;
  assert (public.get_my_buddy_status(pg_temp.ev('EV1'))->>'state') = 'queued';
  -- second tab: idempotent, no duplicate request
  r := public.request_buddy(pg_temp.ev('EV1'), 'pair');
  assert r->>'state' = 'queued';
  perform pg_temp.as_user('B');
  r := public.request_buddy(pg_temp.ev('EV1'), 'pair');
  assert r->>'state' = 'matched', 'B should match A: ' || r::text;
  m := (r->>'matchId')::uuid;
  v := public.get_my_match(m);
  assert (v->>'memberCount')::int = 2 and (v->>'maxSize')::int = 2 and v->>'status' = 'chatting';
  assert jsonb_array_length(v->'participants') = 2;
  assert v::text not like '%Real Name%' and v::text not like '%demo.findyourbuddy%'
     and v::text not like '%00000000-0000-0000-0000-0000000000a1%', 'view leaks identity: ' || v::text;
  perform pg_temp.as_user('A');
  assert (public.get_my_buddy_status(pg_temp.ev('EV1'))->>'matchId')::uuid = m, 'A sees legitimate activation';
  assert (public.get_my_match(m)->>'myPseudonym') <> (v->>'myPseudonym'), 'distinct pseudonyms';
  raise notice 'PASS 1 pair match';
end $$;

-- ---------- 8. nonmember cannot read match or member ids ----------
do $$ declare m uuid; ok boolean := false; n int;
begin
  perform pg_temp.as_user('A');
  m := (public.get_my_buddy_status(pg_temp.ev('EV1'))->>'matchId')::uuid;
  perform pg_temp.as_user('C');
  begin perform public.get_my_match(m); exception when insufficient_privilege then ok := true; end;
  assert ok, 'nonmember read get_my_match';
  select count(*) into n from public.buddy_matches where id = m;          assert n = 0, 'nonmember sees match row';
  select count(*) into n from public.buddy_match_members where match_id = m; assert n = 0, 'nonmember sees members';
  perform pg_temp.as_user('A');
  select count(*) into n from public.buddy_match_members where match_id = m; assert n = 1, 'member sees only own row';
  ok := false;
  begin insert into public.buddy_match_members(match_id,event_id,user_id,pseudonym) values (m, pg_temp.ev('EV1'), auth.uid(), 'Hacker');
  exception when insufficient_privilege then ok := true; end;
  assert ok, 'direct member insert must be denied';
  ok := false;
  begin update public.buddy_matches set status = 'revealed' where id = m; exception when insufficient_privilege then ok := true; end;
  assert ok, 'direct status update must be denied';
  raise notice 'PASS 8 nonmember isolation + no direct writes';
end $$;

-- ---------- 2. pair never joins group and vice versa; no cross-mode double placement ----------
do $$ declare r jsonb; ok boolean := false;
begin
  perform pg_temp.as_user('C'); r := public.request_buddy(pg_temp.ev('EV2'), 'group', 5);
  assert r->>'state' = 'forming';
  perform pg_temp.as_user('D'); r := public.request_buddy(pg_temp.ev('EV2'), 'pair');
  assert r->>'state' = 'queued', 'pair request must not join group';
  perform pg_temp.as_user('C');
  begin perform public.request_buddy(pg_temp.ev('EV2'), 'pair'); exception when unique_violation then ok := true; end;
  assert ok, 'C already in a group for EV2 cannot also pair';
  perform pg_temp.as_user('D'); perform public.cancel_buddy_request(pg_temp.ev('EV2'), 'pair');
  perform pg_temp.as_user('C'); perform public.cancel_buddy_request(pg_temp.ev('EV2'), 'group');
  assert (public.get_my_buddy_status(pg_temp.ev('EV2'))->>'state') = 'none';
  raise notice 'PASS 2 mode separation + cancel';
end $$;

-- ---------- 3/4/5. group A,B forming; C -> chatting; D,E up to cap; F excluded; lock blocks joiners ----------
do $$ declare r jsonb; m uuid; v jsonb;
begin
  perform pg_temp.as_user('A'); r := public.request_buddy(pg_temp.ev('EV3'), 'group', 5); m := (r->>'matchId')::uuid;
  perform pg_temp.as_user('B'); r := public.request_buddy(pg_temp.ev('EV3'), 'group', 5);
  assert (r->>'matchId')::uuid = m and r->>'state' = 'forming', 'two members => still forming, no chat';
  perform pg_temp.as_user('C'); r := public.request_buddy(pg_temp.ev('EV3'), 'group', 5);
  assert r->>'state' = 'matched' and (r->>'memberCount')::int = 3, 'third member activates chat';
  perform pg_temp.as_user('D'); r := public.request_buddy(pg_temp.ev('EV3'), 'group', 5); assert (r->>'matchId')::uuid = m;
  perform pg_temp.as_user('E'); r := public.request_buddy(pg_temp.ev('EV3'), 'group', 5); assert (r->>'memberCount')::int = 5;
  perform pg_temp.as_user('F'); r := public.request_buddy(pg_temp.ev('EV3'), 'group', 5);
  assert (r->>'matchId')::uuid <> m and r->>'state' = 'forming', 'F must not join a full group';
  perform pg_temp.as_user('A'); v := public.get_my_match(m);
  assert (v->>'memberCount')::int = 5 and jsonb_array_length(v->'participants') = 5;
  raise notice 'PASS 3 group 2->forming, 3->chatting, cap 5 respected';
end $$;

do $$ declare r jsonb; m uuid;
begin
  -- cap 3 group never exceeds 3; a cap-3 user never joins a cap-5 group
  perform pg_temp.as_user('A'); r := public.request_buddy(pg_temp.ev('EV4'), 'group', 3); m := (r->>'matchId')::uuid;
  perform pg_temp.as_user('B'); perform public.request_buddy(pg_temp.ev('EV4'), 'group', 3);
  perform pg_temp.as_user('C'); r := public.request_buddy(pg_temp.ev('EV4'), 'group', 3); assert r->>'state' = 'matched';
  perform pg_temp.as_user('D'); r := public.request_buddy(pg_temp.ev('EV4'), 'group', 5);
  assert (r->>'matchId')::uuid <> m, 'cap 3 group exceeded';
  perform pg_temp.as_user('E'); r := public.request_buddy(pg_temp.ev('EV4'), 'group', 3);
  assert (r->>'matchId')::uuid <> m, 'cap 3 group exceeded';
  raise notice 'PASS 4 cap 3 respected';
end $$;

-- lock: first agreement freezes membership (no version bump); joiners go elsewhere
do $$ declare m uuid; v1 int; v2 int; r jsonb;
begin
  perform pg_temp.as_user('A'); m := (public.get_my_buddy_status(pg_temp.ev('EV4'))->>'matchId')::uuid;
  v1 := (public.get_my_match(m)->>'membershipVersion')::int;
  reset role;
  v2 := private.matching_lock_for_consent(m, '00000000-0000-0000-0000-0000000000a1');
  assert v1 = v2, 'locking must not bump version';
  assert (select status from public.buddy_matches where id = m) = 'locked';
  set local role authenticated;
  -- E's cap-3 group gets B? no: make room by having a new user try to join; locked group must be skipped
  perform pg_temp.as_user('G'); r := public.request_buddy(pg_temp.ev('EV4'), 'group', 5);
  assert (r->>'matchId')::uuid <> m, 'joined a locked group';
  raise notice 'PASS 5 lock freezes membership';
end $$;

-- ---------- 6. leaving resets agreements, <3 returns to forming, version bumps ----------
do $$ declare m uuid; v1 int; r jsonb; v jsonb;
begin
  perform pg_temp.as_user('A'); m := (public.get_my_buddy_status(pg_temp.ev('EV4'))->>'matchId')::uuid;
  v1 := (public.get_my_match(m)->>'membershipVersion')::int;
  perform pg_temp.as_user('C'); r := public.leave_match(m);
  assert r->>'status' = 'forming', 'group of 2 must return to forming: ' || r::text;
  assert (r->>'membershipVersion')::int = v1 + 1, 'version must bump on departure';
  perform pg_temp.as_user('A'); v := public.get_my_match(m);
  assert (v->>'memberCount')::int = 2 and v->>'status' = 'forming';
  -- pair leave closes the pair and releases the remaining member (never silently re-paired)
  m := (public.get_my_buddy_status(pg_temp.ev('EV1'))->>'matchId')::uuid;
  perform pg_temp.as_user('B'); r := public.leave_match(m);
  assert r->>'status' = 'closed';
  perform pg_temp.as_user('A');
  assert (public.get_my_buddy_status(pg_temp.ev('EV1'))->>'state') = 'none', 'A free to search again, not auto-paired';
  raise notice 'PASS 6 departure resets consent/status';
end $$;

-- ---------- 7. blocked users never paired/grouped; self/unverified/different-event rejected ----------
reset role;
insert into public.blocks values ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2', now());
set local role authenticated;
do $$ declare r jsonb; ok boolean := false;
begin
  perform pg_temp.as_user('A'); r := public.request_buddy(pg_temp.ev('EV1'), 'pair'); assert r->>'state' = 'queued';
  perform pg_temp.as_user('G'); r := public.request_buddy(pg_temp.ev('EV1'), 'pair');
  assert r->>'state' = 'queued', 'blocked pair matched!';
  perform pg_temp.as_user('H'); r := public.request_buddy(pg_temp.ev('EV2'), 'pair');
  assert r->>'state' = 'queued', 'different event must not match';
  perform pg_temp.as_user('U');
  begin perform public.request_buddy(pg_temp.ev('EV1'), 'pair'); exception when insufficient_privilege then ok := true; end;
  assert ok, 'unverified student must be rejected';
  -- self: A's own waiting request is never picked for A (A re-request is idempotent queued)
  perform pg_temp.as_user('A'); assert (public.request_buddy(pg_temp.ev('EV1'), 'pair')->>'state') = 'queued';
  raise notice 'PASS 7 block/self/event/unverified';
end $$;

-- in-group block severs the shared chat (blocker moved out)
do $$ declare m uuid; n int;
begin
  perform pg_temp.as_user('B'); m := (public.get_my_buddy_status(pg_temp.ev('EV3'))->>'matchId')::uuid;
  reset role;
  insert into public.blocks values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c1', now());
  select count(*) into n from public.buddy_match_members a join public.buddy_match_members b using (match_id)
   where a.user_id = '00000000-0000-0000-0000-0000000000b1' and b.user_id = '00000000-0000-0000-0000-0000000000c1'
     and a.left_at is null and b.left_at is null;
  assert n = 0, 'blocked pair still share a group';
  assert (select membership_version from public.buddy_matches where id = m) > 1;
  set local role authenticated;
  raise notice 'PASS 7b in-group block separation';
end $$;

-- anon has no access
reset role;
set local role anon;
do $$ declare ok boolean := false;
begin
  begin perform public.request_buddy(gen_random_uuid(), 'pair'); exception when insufficient_privilege then ok := true; end;
  assert ok, 'anon could call request_buddy';
end $$;
reset role;

do $$ begin raise notice 'ALL 0003 MATCHING TESTS PASSED'; end $$;
rollback;
