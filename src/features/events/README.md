# Events feature (Member 3)

Event discovery, student-created activities, privacy-safe RSVP counts, and ratings.

## Files
- `supabase/migrations/0002_events.sql`: tables, RLS (no direct client table access), secure RPCs
- `src/features/events/*`: `EventsFeed`, `ActivityDetail`, `CreateActivity`, `MyActivities`, API, validation
- `seed/demo_events.sql`: three clearly labelled SYNTHETIC events with no prefilled RSVPs

## Dependencies on 0001 (Member 1)
- `public.profiles(id, university_id)`, `public.universities(id)`
- `public.is_verified_student(uid uuid) returns boolean`. If the name differs, edit only `fyb_is_verified` in 0002.
- `@/lib/supabase` exporting `supabase`

## RPCs
| RPC | Purpose |
|---|---|
| `get_discoverable_events(p_search, p_category, p_from, p_to, p_event_id, p_invite)` | Safe summaries plus aggregate `going_count`. `universities_represented` is null below 5 going. Never returns attendee IDs. |
| `rsvp_to_event(p_event_id, p_going, p_invite)` | Upserts the caller's own RSVP and returns the new unique count. |
| `create_activity(...)` | Student-created only (campus or invite-only); validates venue, time order and verified status. |
| `get_my_activities()` | The caller's hosted activities and RSVPs; invite hash is returned to the host only. |
| `rate_event(...)` | Only for callers who RSVP'd going, after the event has started. |
| `review_event(...)` | Curators only (`event_curators` table, admin-maintained). |
| `report_event(p_event_id, p_reason)` | **Owned by Member 5 (0004)**. The UI shows a fallback message until it exists. |

## Router wiring (Member 1)
```tsx
<EventsFeed onOpenEvent={(id) => nav(`/events/${id}`)} onCreateActivity={() => nav("/activities/new")} />
<ActivityDetail eventId={id} inviteHash={search.invite} onFindBuddy={(id) => nav(`/find-buddy/${id}`)} />
<CreateActivity onCreated={(id, hash) => nav(`/events/${id}${hash ? `?invite=${hash}` : ""}`)} />
<MyActivities onOpenEvent={(id) => nav(`/events/${id}`)} />
```

## Acceptance checks
1. RSVP twice and the count goes up once. Withdraw and it goes down (`unique(event_id,user_id)` plus upsert).
2. The `anon` and `authenticated` roles have no table grants, so attendee lists cannot be read through the API.
3. Invite-only events are excluded from the feed and need the matching `p_invite` hash, or the caller must be the host or already RSVP'd.
4. `create_activity` always writes `event_kind='student_created'`. Only curators can set `curated` through `review_event`.
5. Venue, start/end order and verified status are checked on the server.
6. "Find Your Buddy" calls `onFindBuddy`, which leads to Member 4's pair/group selector (no default to 1-on-1).

Run the tests with `bunx vitest run src/features/events`.
