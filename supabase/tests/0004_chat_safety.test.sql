-- Security / policy tests for 0004 (Member 5). Runs in a transaction and rolls back.
-- Against Supabase:  psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0004_chat_safety.test.sql
-- Locally:           bash src/features/chat/__tests__/run-sql-tests.sh
-- Fixtures write 0002/0003 columns directly as the owner (id, title, starts_at,
-- venue_public / id, event_id, mode, status, max_size, membership_version /
-- match_id, user_id, pseudonym, left_at).
\set ON_ERROR_STOP on
begin;

create function pg_temp.act(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.owner() returns void language plpgsql as $$
begin perform set_config('role', 'none', true); perform set_config('request.jwt.claim.sub', '', true); end $$;
-- expect an error code from a statement
create function pg_temp.expect(p_sql text, p_code text, p_label text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FAIL: % (no error)', p_label;
exception when others then
  if sqlstate <> p_code then raise exception 'FAIL: % (got % %)', p_label, sqlstate, sqlerrm; end if;
end $$;
grant execute on function pg_temp.expect(text, text, text) to authenticated;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'alice@tcd.ie', now()),
  ('00000000-0000-0000-0000-0000000000b2', 'bob@tcd.ie', now()),
  ('00000000-0000-0000-0000-0000000000c3', 'cara@tcd.ie', now()),
  ('00000000-0000-0000-0000-0000000000d4', 'dev@tcd.ie', now()),
  ('00000000-0000-0000-0000-0000000000e5', 'eve@tcd.ie', now());
update public.profiles set display_name = initcap(split_part(au.email, '@', 1)), age_confirmed = true
  from auth.users au where au.id = profiles.user_id;

insert into public.events (id, title, starts_at, venue_public) values
  ('10000000-0000-0000-0000-000000000001', 'Future gig', now() + interval '1 day', 'Main gate'),
  ('10000000-0000-0000-0000-000000000002', 'Past hackathon', now() - interval '1 hour', 'Library'),
  ('10000000-0000-0000-0000-000000000003', 'Soon coffee', now() + interval '1 hour', 'Cafe');

insert into public.buddy_matches (id, event_id, mode, status, max_size) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'pair',  'chatting', 2),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'group', 'chatting', 5),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'group', 'chatting', 5),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'pair',  'chatting', 2),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'pair',  'revealed', 2),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'pair',  'revealed', 2),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'pair',  'revealed', 2),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', 'pair',  'revealed', 2);

insert into public.buddy_match_members (match_id, user_id, pseudonym) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Teal Otter'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b2', 'Amber Fox'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'G2 One'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c3', 'G2 Two'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d4', 'G2 Three'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', 'G3 One'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b2', 'G3 Two'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c3', 'G3 Three'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000d4', 'G3 Four'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000c3', 'P4 One'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000d4', 'P4 Two'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a1', 'P5 One'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000b2', 'P5 Two'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000c3', 'P6 One'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000d4', 'P6 Two'),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000a1', 'P7 One'),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000b2', 'P7 Two'),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000a1', 'P8 One'),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000b2', 'P8 Two');
-- revealed fixtures need matching N/N agreements
insert into public.buddy_agreements (match_id, user_id, membership_version)
  select match_id, user_id, 1 from public.buddy_match_members
   where match_id in ('20000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000006',
                      '20000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000008');

-- ===== 1. Outsiders see nothing; no direct table access =====
select pg_temp.act('00000000-0000-0000-0000-0000000000c3');
do $$ begin
  perform pg_temp.expect($q$select public.get_my_match('20000000-0000-0000-0000-000000000001')$q$, '42501', 'outsider get_my_match');
  perform pg_temp.expect($q$select public.get_match_messages('20000000-0000-0000-0000-000000000001')$q$, '42501', 'outsider messages');
  perform pg_temp.expect($q$select public.send_message('20000000-0000-0000-0000-000000000001', 'hi')$q$, '42501', 'outsider send');
  perform pg_temp.expect($q$select public.get_revealed_profiles('20000000-0000-0000-0000-000000000001')$q$, '42501', 'outsider reveal');
  perform pg_temp.expect($q$select 1 from public.messages$q$, '42501', 'direct messages select');
  perform pg_temp.expect($q$insert into public.buddy_agreements values ('20000000-0000-0000-0000-000000000004', auth.uid(), 1, now())$q$, '42501', 'direct agreement insert');
  perform pg_temp.expect($q$insert into public.reports (reporter_id, target_user_id, reason) values (auth.uid(), auth.uid(), 'spam')$q$, '42501', 'direct report insert');
  perform pg_temp.expect($q$update public.meetup_outcomes set resolution = 'resolved'$q$, '42501', 'direct outcome update');
  perform pg_temp.expect($q$select 1 from public.reports$q$, '42501', 'direct reports select');
  perform pg_temp.expect($q$select public.moderator_review_queue()$q$, '42501', 'non-moderator queue');
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform public.send_message('20000000-0000-0000-0000-000000000001', '<b>hi</b> & "you"');
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000c3');
do $$ begin
  if exists (select 1 from public.match_activity where match_id = '20000000-0000-0000-0000-000000000001')
    then raise exception 'FAIL: outsider sees realtime signal'; end if;
end $$;

-- ===== 2. Pair chat: escaped, pseudonymous, bounded, rate limited =====
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
do $$ declare v jsonb; begin
  v := public.get_match_messages('20000000-0000-0000-0000-000000000001');
  if v->0->>'body' <> '&lt;b&gt;hi&lt;/b&gt; &amp; &quot;you&quot;' then raise exception 'FAIL: not escaped: %', v->0->>'body'; end if;
  if v->0->>'pseudonym' <> 'Teal Otter' or (v->0->>'isOwn')::boolean then raise exception 'FAIL: pseudonym/isOwn'; end if;
  if v::text like '%00000000-0000-0000-0000-0000000000a1%' or v::text ilike '%alice%' then raise exception 'FAIL: identity leaked in messages'; end if;
  if not exists (select 1 from public.match_activity where match_id = '20000000-0000-0000-0000-000000000001')
    then raise exception 'FAIL: member cannot see realtime signal'; end if;
  perform pg_temp.expect(format('select public.send_message(%L, %L)', '20000000-0000-0000-0000-000000000001', repeat('x', 1001)), '22023', 'length bound');
  for i in 1..10 loop perform public.send_message('20000000-0000-0000-0000-000000000001', 'm' || i); end loop;
  perform pg_temp.expect($q$select public.send_message('20000000-0000-0000-0000-000000000001', 'flood')$q$, '54000', 'rate limit');
end $$;

-- ===== 3. Pair consent: A agrees, B not -> nothing revealed; then B -> reveal =====
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
do $$ declare v jsonb; begin
  v := public.agree_to_go('20000000-0000-0000-0000-000000000001', 1);
  if v->>'status' <> 'locked' or (v->>'membershipVersion')::int <> 1 then raise exception 'FAIL: lock bumped version or wrong status %', v; end if;
  v := public.agree_to_go('20000000-0000-0000-0000-000000000001', 1);  -- idempotent
  if (v->>'agreedCount')::int <> 1 then raise exception 'FAIL: repeat agree counted twice'; end if;
  if v ? 'revealedProfiles' or v::text ilike '%bob%' or v::text ilike '%tcd%' then raise exception 'FAIL: identity before unanimous consent'; end if;
  perform pg_temp.expect($q$select public.get_revealed_profiles('20000000-0000-0000-0000-000000000001')$q$, '42501', 'reveal at 1/2');
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
do $$ declare v jsonb; begin
  perform pg_temp.expect($q$select public.agree_to_go('20000000-0000-0000-0000-000000000001', 2)$q$, '40001', 'wrong version');
  v := public.agree_to_go('20000000-0000-0000-0000-000000000001', 1);
  if v->>'status' <> 'revealed' then raise exception 'FAIL: 2/2 did not reveal'; end if;
  if v->'revealedProfiles'->0->>'displayName' <> 'Alice' then raise exception 'FAIL: reveal content %', v->'revealedProfiles'; end if;
  if v::text ilike '%@tcd.ie%' or v::text like '%0000000000a1%' then raise exception 'FAIL: email/id in reveal'; end if;
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000c3');
do $$ begin
  perform pg_temp.expect($q$select public.get_revealed_profiles('20000000-0000-0000-0000-000000000001')$q$, '42501', 'outsider after reveal');
end $$;

-- ===== 4. Group: membership change invalidates old consent =====
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select public.agree_to_go('20000000-0000-0000-0000-000000000002', 1);
select pg_temp.owner();
select private.m5_remove_member('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d4', 'left');
do $$ begin
  if (select membership_version from public.buddy_matches where id = '20000000-0000-0000-0000-000000000002') <> 2
    then raise exception 'FAIL: version not bumped on leave'; end if;
  if (select status from public.buddy_matches where id = '20000000-0000-0000-0000-000000000002') <> 'forming'
    then raise exception 'FAIL: group of 2 not back to forming'; end if;
  if exists (select 1 from public.buddy_agreements where match_id = '20000000-0000-0000-0000-000000000002')
    then raise exception 'FAIL: stale agreements kept'; end if;
end $$;
insert into public.buddy_match_members (match_id, user_id, pseudonym)
  values ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e5', 'G2 Four');
update public.buddy_matches set status = 'chatting' where id = '20000000-0000-0000-0000-000000000002';  -- Member 4 transition
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform pg_temp.expect($q$select public.agree_to_go('20000000-0000-0000-0000-000000000002', 1)$q$, '40001', 'stale group version');
  perform public.agree_to_go('20000000-0000-0000-0000-000000000002', 2);
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000c3');
do $$ declare v jsonb; begin
  v := public.agree_to_go('20000000-0000-0000-0000-000000000002', 2);
  if v->>'status' = 'revealed' or v ? 'revealedProfiles' then raise exception 'FAIL: revealed at 2/3'; end if;
  perform pg_temp.expect($q$select public.get_revealed_profiles('20000000-0000-0000-0000-000000000002')$q$, '42501', 'group 2/3 reveal');
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
do $$ declare v jsonb; begin
  v := public.agree_to_go('20000000-0000-0000-0000-000000000002', 2);
  if v->>'status' <> 'revealed' or jsonb_array_length(v->'revealedProfiles') <> 2 then raise exception 'FAIL: 3/3 reveal %', v; end if;
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000d4');
do $$ begin
  perform pg_temp.expect($q$select public.get_revealed_profiles('20000000-0000-0000-0000-000000000002')$q$, '42501', 'removed member reveal');
end $$;

-- ===== 5. Block inside a group and a pair =====
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
select public.send_message('20000000-0000-0000-0000-000000000003', 'hello group');
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
do $$ declare v jsonb; begin
  v := public.block_user('G3 Two', '20000000-0000-0000-0000-000000000003');
  if not (v->>'youLeftMatch')::boolean then raise exception 'FAIL: blocker not separated'; end if;
  perform pg_temp.expect($q$select public.get_match_messages('20000000-0000-0000-0000-000000000003')$q$, '42501', 'blocker still reads group');
  if exists (select 1 from public.match_activity where match_id = '20000000-0000-0000-0000-000000000003')
    then raise exception 'FAIL: blocker still receives realtime'; end if;
end $$;
select pg_temp.owner();
do $$ begin
  if not public.is_blocked_pair('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2')
    then raise exception 'FAIL: block not stored (future matching uses is_blocked_pair)'; end if;
  if (select membership_version from public.buddy_matches where id = '20000000-0000-0000-0000-000000000003') <> 2
    then raise exception 'FAIL: group block did not bump version'; end if;
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000c3');
do $$ begin
  perform public.block_user('P4 Two', '20000000-0000-0000-0000-000000000004');
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000d4');
do $$ begin
  perform pg_temp.expect($q$select public.send_message('20000000-0000-0000-0000-000000000004', 'still there?')$q$, '55000', 'blocked pair can still talk');
end $$;

-- ===== 6. Report by pseudonym resolves server-side, reporter learns nothing =====
select pg_temp.act('00000000-0000-0000-0000-0000000000c3');
do $$ declare v jsonb; begin
  v := public.report_user('P4 Two', '20000000-0000-0000-0000-000000000004', 'harassment', 'rude');
  if v::text <> '{"received": true}' then raise exception 'FAIL: report response leaks %', v; end if;
end $$;
select pg_temp.owner();
do $$ begin
  if (select target_user_id from public.reports where target_pseudonym = 'P4 Two') <> '00000000-0000-0000-0000-0000000000d4'
    then raise exception 'FAIL: report target not resolved'; end if;
end $$;

-- ===== 7. One "did not meet" never penalises; corroborated attendance resolves =====
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select public.submit_meetup_outcome('20000000-0000-0000-0000-000000000005', 'did_not_meet');
select pg_temp.act('00000000-0000-0000-0000-0000000000c3');
select public.submit_meetup_outcome('20000000-0000-0000-0000-000000000006', 'attended');
select pg_temp.act('00000000-0000-0000-0000-0000000000d4');
select public.submit_meetup_outcome('20000000-0000-0000-0000-000000000006', 'attended');
select pg_temp.owner();
do $$ begin
  if exists (select 1 from public.meetup_outcomes where kind = 'did_not_meet' and resolution = 'resolved')
    then raise exception 'FAIL: automatic confirmed no-show'; end if;
  if (select resolution from public.meetup_outcomes
       where match_id = '20000000-0000-0000-0000-000000000005' and user_id = '00000000-0000-0000-0000-0000000000b2') <> 'pending'
    then raise exception 'FAIL: accused member should be pending review'; end if;
  if (select count(*) from public.meetup_outcomes
       where match_id = '20000000-0000-0000-0000-000000000006' and kind = 'attended' and resolution = 'resolved') <> 2
    then raise exception 'FAIL: corroborated pair attendance not resolved'; end if;
  if (private.m5_reliability('00000000-0000-0000-0000-0000000000b2')).sample <> 0
    then raise exception 'FAIL: unreviewed report affected score'; end if;
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform pg_temp.expect($q$select public.submit_meetup_outcome('20000000-0000-0000-0000-000000000007', 'attended')$q$, '55000', 'check-in before start');
end $$;

-- ===== 8. Cancellations: advance neutral, late pending =====
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
do $$ declare v jsonb; begin
  v := public.cancel_confirmed_plan('20000000-0000-0000-0000-000000000007', 'exam moved');
  if v->>'kind' <> 'advance_cancel' then raise exception 'FAIL: advance cancel kind'; end if;
  v := public.cancel_confirmed_plan('20000000-0000-0000-0000-000000000008', null);
  if v->>'kind' <> 'late_cancel' then raise exception 'FAIL: late cancel kind'; end if;
end $$;
select pg_temp.owner();
do $$ declare r record; begin
  if (select resolution from public.meetup_outcomes where match_id = '20000000-0000-0000-0000-000000000008') <> 'pending'
    then raise exception 'FAIL: late cancel auto-upheld'; end if;
  if (select status from public.buddy_matches where id = '20000000-0000-0000-0000-000000000007') <> 'closed'
    then raise exception 'FAIL: cancelled pair not closed'; end if;
  r := private.m5_reliability('00000000-0000-0000-0000-0000000000a1');
  if r.sample <> 0 then raise exception 'FAIL: cancellations counted in score (sample %)', r.sample; end if;
end $$;

-- ===== 9. Score threshold: 0/1/2 -> no number; 3 -> number; excused excluded =====
insert into public.buddy_matches (id, event_id, mode, status) select ('30000000-0000-0000-0000-00000000000' || g)::uuid,
  '10000000-0000-0000-0000-000000000002', 'pair', 'closed' from generate_series(1, 4) g;
insert into public.meetup_outcomes (match_id, user_id, kind, resolution, is_demo) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e5', 'attended', 'resolved', true),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e5', 'attended', 'resolved', true),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000e5', 'late_cancel', 'excused', true);
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
do $$ declare v jsonb; begin
  v := public.get_my_reliability();
  if v->>'band' <> 'new' or v->'score' <> 'null'::jsonb or (v->>'sampleCount')::int <> 2 then raise exception 'FAIL: 2 outcomes showed score %', v; end if;
end $$;
select pg_temp.owner();
insert into public.meetup_outcomes (match_id, user_id, kind, resolution, is_demo) values
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000e5', 'late_cancel', 'resolved', true);
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
do $$ declare v jsonb; begin
  v := public.get_my_reliability();
  if (v->>'score')::int <> 83 or v->>'band' <> 'generally_reliable' then raise exception 'FAIL: score formula %', v; end if;
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000c3');
do $$ declare v jsonb; begin
  v := public.get_reliability_summary('G2 Four', '20000000-0000-0000-0000-000000000002');
  if v - 'band' - 'sampleCount' <> '{}'::jsonb then raise exception 'FAIL: summary leaks detail %', v; end if;
end $$;

-- ===== 10. Moderator review is restricted and audited =====
select pg_temp.owner();
insert into public.moderators (user_id) values ('00000000-0000-0000-0000-0000000000c3');
select pg_temp.act('00000000-0000-0000-0000-0000000000c3');
do $$ declare v_id uuid; begin
  select (o->>'id')::uuid into v_id
    from jsonb_array_elements(public.moderator_review_queue()->'outcomes') o
   where o->>'kind' = 'did_not_meet' limit 1;
  perform public.moderator_resolve_outcome(v_id, 'did_not_meet', 'resolved');
end $$;
select pg_temp.owner();
do $$ begin
  if not exists (select 1 from public.outcome_audit where actor_id = '00000000-0000-0000-0000-0000000000c3' and new_resolution = 'resolved')
    then raise exception 'FAIL: moderator action not audited'; end if;
end $$;

select 'ALL 0004 SECURITY TESTS PASSED' as result;
rollback;
