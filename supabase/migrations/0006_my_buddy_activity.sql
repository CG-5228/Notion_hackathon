-- A caller-scoped overview for waiting requests and their active matches.
-- Event identity and venue are public-safe summary fields; member identities are never returned.
create or replace function public.get_my_buddy_activity()
returns table (
  activity_state text,
  event_id uuid,
  event_title text,
  event_category text,
  starts_at timestamptz,
  venue_public text,
  mode text,
  match_id uuid,
  member_count integer,
  max_size integer,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_verified_student();
begin
  return query
  with active_matches as (
    select m.id, m.event_id, m.mode, m.status, m.max_size, m.created_at
      from public.buddy_matches m
     where m.status in ('forming', 'chatting', 'locked', 'revealed')
       and exists (
         select 1
           from public.buddy_match_members mm
          where mm.match_id = m.id
            and mm.user_id = v_uid
            and mm.left_at is null
       )
  )
  select result.activity_state, result.event_id, result.event_title, result.event_category,
         result.starts_at, result.venue_public, result.mode, result.match_id,
         result.member_count, result.max_size, result.created_at
    from (
      select 'waiting'::text as activity_state, e.id as event_id, e.title as event_title,
             e.category as event_category, e.starts_at, e.venue_public, r.mode,
             null::uuid as match_id, null::integer as member_count,
             case when r.mode = 'pair' then 2 else r.max_size end::integer as max_size,
             r.created_at
        from public.buddy_requests r
        join public.events e on e.id = r.event_id
       where r.user_id = v_uid
         and r.status = 'waiting'
         and not exists (select 1 from active_matches am where am.event_id = r.event_id)

      union all

      select case when am.status = 'forming' then 'forming'
                  when am.status = 'revealed' then 'confirmed'
                  else 'chat' end::text as activity_state,
             e.id as event_id, e.title as event_title, e.category as event_category,
             e.starts_at, e.venue_public, am.mode, am.id as match_id,
             (select count(*)::integer
                from public.buddy_match_members members
               where members.match_id = am.id and members.left_at is null) as member_count,
             am.max_size, am.created_at
        from active_matches am
        join public.events e on e.id = am.event_id
    ) result
   order by result.starts_at, result.created_at, result.event_id;
end;
$$;

revoke all on function public.get_my_buddy_activity() from public, anon;
grant execute on function public.get_my_buddy_activity() to authenticated;
