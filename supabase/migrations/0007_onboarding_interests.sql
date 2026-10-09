-- 0007_onboarding_interests.sql — atomic, caller-scoped interest replacement.
create or replace function public.set_my_interests(p_interests jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := public.assert_verified_student();
  v_entry jsonb;
  v_slug text;
  v_slugs text[] := array[]::text[];
begin
  -- Serialize replacements for one account before changing its rows.
  perform p.user_id from public.profiles as p where p.user_id = v_uid for update;
  if not found then
    raise exception 'Verified student profile required' using errcode = '42501';
  end if;

  if coalesce(pg_catalog.jsonb_typeof(p_interests), '') <> 'array' then
    raise exception 'Interests must be a JSON array' using errcode = '22023';
  end if;

  for v_entry in select value from pg_catalog.jsonb_array_elements(p_interests) as entries(value)
  loop
    if coalesce(pg_catalog.jsonb_typeof(v_entry), '') <> 'object'
       or coalesce(pg_catalog.jsonb_typeof(v_entry -> 'slug'), '') <> 'string'
       or coalesce(pg_catalog.jsonb_typeof(v_entry -> 'share_on_reveal'), '') <> 'boolean' then
      raise exception 'Each interest requires a slug and boolean share_on_reveal' using errcode = '22023';
    end if;

    v_slug := v_entry ->> 'slug';
    if v_slug = any(v_slugs) then
      raise exception 'Interest slugs must be unique' using errcode = '22023';
    end if;
    if not exists (select 1 from public.interests as i where i.slug = v_slug) then
      raise exception 'Unknown interest slug: %', v_slug using errcode = '22023';
    end if;
    v_slugs := pg_catalog.array_append(v_slugs, v_slug);
  end loop;

  delete from public.profile_interests as pi where pi.user_id = v_uid;

  insert into public.profile_interests (user_id, interest_id, share_on_reveal)
  select v_uid, i.id, (entry.value ->> 'share_on_reveal')::boolean
    from pg_catalog.jsonb_array_elements(p_interests) as entry(value)
    join public.interests as i on i.slug = entry.value ->> 'slug';
end;
$$;

revoke all on function public.set_my_interests(jsonb) from public, anon;
grant execute on function public.set_my_interests(jsonb) to authenticated;
