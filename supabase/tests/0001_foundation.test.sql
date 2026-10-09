-- Security tests for 0001. Run against a Supabase DB (local `supabase db reset` then
-- `psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0001_foundation.test.sql`).
-- Runs in a transaction and rolls back. Any failed assertion raises.
begin;

-- Fixtures (inserted as the migration owner, like Supabase Auth would)
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@tcd.ie', now()),
  ('00000000-0000-0000-0000-00000000000b', 'bob@ucdconnect.ie', now()),
  ('00000000-0000-0000-0000-00000000000c', 'carol@tcd.ie', null);          -- unconfirmed

do $$ begin
  -- 1. personal + unknown academic domains are rejected at signup
  begin insert into auth.users (id, email) values (gen_random_uuid(), 'eve@gmail.com');
        raise exception 'FAIL: gmail signup allowed'; exception when sqlstate 'P0001' then null; end;
  begin insert into auth.users (id, email) values (gen_random_uuid(), 'eve@randomuni.ie');
        raise exception 'FAIL: unknown .ie signup allowed'; exception when sqlstate 'P0001' then null; end;
  begin insert into auth.users (id, email) values (gen_random_uuid(), 'eve@evil.tcd.ie');
        raise exception 'FAIL: subdomain treated as allowlisted'; exception when sqlstate 'P0001' then null; end;

  -- 2. verification only after confirmation
  if not (select student_verified from public.profiles where user_id = '00000000-0000-0000-0000-00000000000a')
    then raise exception 'FAIL: confirmed alice not verified'; end if;
  if (select student_verified from public.profiles where user_id = '00000000-0000-0000-0000-00000000000c')
    then raise exception 'FAIL: unconfirmed carol verified'; end if;
end $$;

-- Act as alice
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$ begin
  -- 3. not usable until 18+ attested
  if public.is_verified_student() then raise exception 'FAIL: verified before age attestation'; end if;
  perform public.update_my_profile('Alice', true, null);
  if not public.is_verified_student() then raise exception 'FAIL: alice should be verified'; end if;

  -- 4. cannot self-edit protected fields
  begin update public.profiles set student_verified = false, university_id = null where user_id = auth.uid();
        raise exception 'FAIL: protected field edit allowed';
  exception when insufficient_privilege then null; end;

  -- 5. cannot read other profiles
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: can see other profiles'; end if;

  -- 6. cannot read domain allowlist table
  begin perform 1 from public.university_domains; raise exception 'FAIL: domains readable';
  exception when insufficient_privilege then null; end;

  -- 7. cannot call is_blocked_pair directly
  begin perform public.is_blocked_pair(gen_random_uuid(), gen_random_uuid()); raise exception 'FAIL: is_blocked_pair callable';
  exception when insufficient_privilege then null; end;

  -- 8. cannot insert blocks directly (Member 5 RPC only) and cannot see blocks against self
  begin insert into public.blocks values (auth.uid(), '00000000-0000-0000-0000-00000000000b', now());
        raise exception 'FAIL: direct block insert allowed';
  exception when insufficient_privilege then null; end;
end $$;

-- Unconfirmed carol cannot pass the gate even with attestation attempt
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
do $$ begin
  begin perform public.update_my_profile('Carol', true, null); raise exception 'FAIL: unconfirmed user updated profile';
  exception when insufficient_privilege then null; end;
  begin perform public.assert_verified_student(); raise exception 'FAIL: unconfirmed passed gate';
  exception when insufficient_privilege then null; end;
end $$;

-- Anonymous: domain check only
set local role anon;
do $$ begin
  if not (select allowed from public.check_email_domain('x@tcd.ie')) then raise exception 'FAIL: tcd not allowed'; end if;
  if (select allowed from public.check_email_domain('x@gmail.com')) then raise exception 'FAIL: gmail allowed'; end if;
  begin perform 1 from public.profiles; raise exception 'FAIL: anon reads profiles';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select 'ALL 0001 SECURITY TESTS PASSED' as result;
rollback;
