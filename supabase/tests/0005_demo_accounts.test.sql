-- Security tests for 0005. Apply migrations 0001-0005 first, then run in a transaction.
-- Example: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0005_demo_accounts.test.sql
begin;

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000001', 'seeded-' || gen_random_uuid() || '@mail.dcu.ie', now(), '{"fyb_demo":true}', '{}'),
  ('00000000-0000-4000-8000-000000000002', 'unconfirmed-' || gen_random_uuid() || '@mail.dcu.ie', null, '{}', '{"fyb_demo":true,"email_confirmed_at":"2026-01-01T00:00:00Z"}'),
  ('00000000-0000-4000-8000-000000000003', 'ordinary-' || gen_random_uuid() || '@mail.dcu.ie', now(), '{}', '{}'),
  ('00000000-0000-4000-8000-000000000004', 'seeded-domain-' || gen_random_uuid() || '@demo.findyourbuddy.test', now(), '{}', '{}');

do $$
declare
  v_seeded uuid := '00000000-0000-4000-8000-000000000001';
  v_unconfirmed uuid := '00000000-0000-4000-8000-000000000002';
  v_ordinary uuid := '00000000-0000-4000-8000-000000000003';
  v_demo_domain uuid := '00000000-0000-4000-8000-000000000004';
begin
  if not exists (
    select 1 from public.profiles
    where user_id = v_seeded and is_demo and student_verified and not age_confirmed
  ) then raise exception 'FAIL: app_metadata demo user was not seeded safely'; end if;
  if public.is_verified_student(v_seeded) then
    raise exception 'FAIL: demo account passed the 18+ gate before user attestation';
  end if;

  update auth.users
     set raw_user_meta_data = '{"fyb_demo":true,"email_confirmed_at":"2026-01-01T00:00:00Z"}'::jsonb
   where id = v_unconfirmed;
  if not exists (
    select 1 from public.profiles
    where user_id = v_unconfirmed and not is_demo and not student_verified and not age_confirmed
  ) or exists (select 1 from auth.users where id = v_unconfirmed and email_confirmed_at is not null) then
    raise exception 'FAIL: user_metadata marked demo or confirmed an email';
  end if;

  if not exists (
    select 1 from public.profiles
    where user_id = v_demo_domain and is_demo and student_verified and not age_confirmed
  ) then raise exception 'FAIL: demo university no longer marks seeded profiles'; end if;

  update public.profiles
     set display_name = 'Keep this name',
         avatar_url = 'https://example.test/avatar.png',
         age_confirmed = true,
         age_confirmed_at = now()
   where user_id = v_ordinary;

  update auth.users set raw_user_meta_data = '{"fyb_demo":true}'::jsonb where id = v_ordinary;
  if not exists (
    select 1 from public.profiles
    where user_id = v_ordinary and not is_demo and student_verified and age_confirmed
      and display_name = 'Keep this name' and avatar_url = 'https://example.test/avatar.png'
  ) then raise exception 'FAIL: user_metadata changed demo status or protected profile values'; end if;

  update auth.users set raw_app_meta_data = '{"fyb_demo":true}'::jsonb where id = v_ordinary;
  if not exists (select 1 from public.profiles where user_id = v_ordinary and is_demo) then
    raise exception 'FAIL: trusted app_metadata update did not mark profile demo';
  end if;

  update auth.users set raw_app_meta_data = '{"fyb_demo":"true"}'::jsonb where id = v_ordinary;
  if not exists (select 1 from public.profiles where user_id = v_ordinary and not is_demo) then
    raise exception 'FAIL: non-boolean app_metadata value marked profile demo';
  end if;

  if not public.is_verified_student(v_ordinary) then
    raise exception 'FAIL: ordinary confirmed allowlisted student should pass before revocation';
  end if;
  update public.university_domains set active = false where domain = 'mail.dcu.ie';
  if public.is_verified_student(v_ordinary) then
    raise exception 'FAIL: allowlist revocation did not remove student access';
  end if;
end $$;

select 'ALL 0005 DEMO ACCOUNT TESTS PASSED' as result;
rollback;
