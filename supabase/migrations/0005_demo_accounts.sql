-- Trust demo status only from service-managed app_metadata or the demo university.
create or replace function private.sync_profile_from_auth()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uni uuid := private.university_for_email(new.email);
  v_demo boolean :=
    coalesce((new.raw_app_meta_data -> 'fyb_demo') = 'true'::jsonb, false)
    or coalesce((select u.is_demo from public.universities as u where u.id = v_uni), false);
  v_ok boolean := new.email_confirmed_at is not null and v_uni is not null;
begin
  insert into public.profiles (user_id, university_id, student_verified, verified_at, is_demo)
  values (new.id, case when v_ok then v_uni end, v_ok, case when v_ok then now() end, v_demo)
  on conflict (user_id) do update
    set university_id    = excluded.university_id,
        student_verified = excluded.student_verified,
        verified_at      = case when excluded.student_verified
                                then coalesce(public.profiles.verified_at, now()) end,
        is_demo          = excluded.is_demo,
        updated_at       = now();
  return new;
end $$;

revoke all on function private.sync_profile_from_auth() from public, anon, authenticated;

drop trigger if exists fyb_after_write_auth_user on auth.users;
create trigger fyb_after_write_auth_user
  after insert or update of email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data on auth.users
  for each row execute function private.sync_profile_from_auth();
