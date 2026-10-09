-- Caller-scoped atomic interest replacement tests; run after migrations 0001–0007.
begin;

insert into auth.users (id, email, email_confirmed_at) values
  (md5('interests-alice')::uuid, 'alice@tcd.ie', now()),
  (md5('interests-bob')::uuid, 'bob@ucdconnect.ie', now()),
  (md5('interests-unverified')::uuid, 'unverified@tcd.ie', null);

create function pg_temp.as_user(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end $$;
grant execute on all functions in schema pg_temp to authenticated;

set local role authenticated;

do $$
declare
  v_alice uuid := md5('interests-alice')::uuid;
  v_bob uuid := md5('interests-bob')::uuid;
begin
  perform pg_temp.as_user(v_alice);
  perform public.update_my_profile('Alice', true, null);
  perform public.set_my_interests('[{"slug":"coffee","share_on_reveal":true},{"slug":"cinema","share_on_reveal":false}]'::jsonb);

  perform pg_temp.as_user(v_bob);
  perform public.update_my_profile('Bob', true, null);
  perform public.set_my_interests('[{"slug":"gaming","share_on_reveal":true}]'::jsonb);

  perform pg_temp.as_user(v_alice);
  perform public.set_my_interests('[{"slug":"hiking","share_on_reveal":false}]'::jsonb);
  if (select count(*) from public.profile_interests pi join public.interests i on i.id = pi.interest_id
      where pi.user_id = v_alice and i.slug = 'coffee') <> 0
     or (select count(*) from public.profile_interests pi join public.interests i on i.id = pi.interest_id
         where pi.user_id = v_alice) <> 1 then
    raise exception 'FAIL: replacement did not remove the old interest set';
  end if;

  begin
    perform public.set_my_interests('[{"slug":"not-seeded","share_on_reveal":true}]'::jsonb);
    raise exception 'FAIL: unknown interest slug accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.set_my_interests('[{"slug":"hiking","share_on_reveal":"yes"}]'::jsonb);
    raise exception 'FAIL: non-boolean share_on_reveal accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.set_my_interests('[{"slug":"hiking","share_on_reveal":true},{"slug":"hiking","share_on_reveal":false}]'::jsonb);
    raise exception 'FAIL: duplicate interest slug accepted';
  exception when sqlstate '22023' then null;
  end;
  if (select count(*) from public.profile_interests pi join public.interests i on i.id = pi.interest_id
      where pi.user_id = v_alice and i.slug = 'hiking' and not pi.share_on_reveal) <> 1
     or (select count(*) from public.profile_interests pi where pi.user_id = v_alice) <> 1 then
    raise exception 'FAIL: invalid replacement changed the saved interest set';
  end if;

  perform public.set_my_interests('[]'::jsonb);
  if exists (select 1 from public.profile_interests where user_id = v_alice) then
    raise exception 'FAIL: empty replacement did not clear interests';
  end if;

  perform pg_temp.as_user(v_bob);
  if (select count(*) from public.profile_interests pi join public.interests i on i.id = pi.interest_id
      where pi.user_id = v_bob and i.slug = 'gaming' and pi.share_on_reveal) <> 1
     or (select count(*) from public.profile_interests pi where pi.user_id = v_bob) <> 1 then
    raise exception 'FAIL: Alice replacement or clear modified Bob interests';
  end if;

  perform pg_temp.as_user(md5('interests-unverified')::uuid);
  begin
    perform public.set_my_interests('[{"slug":"coffee","share_on_reveal":true}]'::jsonb);
    raise exception 'FAIL: unverified user saved interests';
  exception when sqlstate '42501' then null;
  end;
  if exists (select 1 from public.profile_interests where user_id = auth.uid()) then
    raise exception 'FAIL: unverified user has saved interests';
  end if;
end $$;

reset role;
set local role anon;
do $$ begin
  begin
    perform public.set_my_interests('[]'::jsonb);
    raise exception 'FAIL: anon executed set_my_interests';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select '0006 onboarding interests tests passed' as result;
