# Events feature (Member 3)

Event discovery, student-created activities, privacy-safe RSVP counts, and ratings.

## Files
- `supabase/migrations/0002_events.sql`: tables, RLS (no direct client table access), secure RPCs
- `supabase/tests/0002_events.test.sql`: rolls back; prints `ALL 0002 EVENTS TESTS PASSED` (visibility, invite links, idempotent RSVP, no table access)
- `src/features/events/*`: `EventsFeed`, `ActivityDetail`, `CreateActivity`, `MyActivities`, API, validation
- `seed/demo_events.sql`: three clearly labelled SYNTHETIC events with no prefilled RSVPs

## Dependencies on 0001 (Member 1)
- `public.profiles(user_id, university_id)`, `public.universities(id)`
- `public.is_verified_student(p_user uuid) returns boolean`. If the name differs, edit only `fyb_is_verified` in 0002.
- `@/lib/supabase` exporting `supabase`; `EventSummary` from `@/types`; UI kit from `@/components`

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
The screens follow `docs/CONTRACTS.md` and route themselves by default, so `src/app/routes.tsx` just renders
`<EventsFeed />`, `<ActivityDetail eventId={id} />` (reads `?invite=` itself), `<CreateActivity />` and `<MyActivities />`.
The callbacks below are optional overrides:
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
6. "Find your buddy" goes to `/find-buddy/:eventId` (no default to 1-on-1). On this branch, that destination is still Member 4's placeholder; the real pair/group selector must be integrated before live acceptance.

Run the tests with `npx vitest run src/features/events`. Apply `supabase/migrations/0002_events.sql` after 0001; Member 4's 0003 depends on `events(id)` and `event_rsvps(event_id, user_id, status)` from this file.


## Integration contract handoff — Member 1 coordination required
The reserved screen exports match the foundation router. However, the RPC table in
`docs/CONTRACTS.md` describes a proposed `p_filters jsonb` argument and a `{ goingCount }`
RSVP response. The implemented migration and working callers instead use:

- `get_discoverable_events(p_search text default null, p_category text default null,
  p_from timestamptz default now(), p_to timestamptz default null,
  p_event_id uuid default null, p_invite text default null)` → snake_case rows.
- `rsvp_to_event(p_event_id uuid, p_going boolean, p_invite text default null)` → integer count.
- Prefer importing `listEvents`, `getEvent`, and `setGoing` from this feature's `api.ts`;
  the adapter returns camelCase `EventDetail` objects and a numeric RSVP count.

Member 1 should reconcile their contract sheet to these signatures before merging.
No shared contract file, router, matching code, or chat code is changed here; no ambiguous
RPC overloads are introduced. Member 4's SQL may use the existing event/RSVP tables
internally under its own protected operations; it must not expose RSVP identities.
`universitiesRepresented` is only a count of distinct universities, not named university
buckets, and is omitted below five total going RSVPs.

## Shared deployment setup
Use the team's **existing shared project**, not a separate database per member.
In Vercel, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the relevant
Preview and Production environments, then redeploy. Use only the public key in `VITE_`
variables. Both live deployments showed “Backend not configured” during this audit.
Signed-out home shows the shared welcome page; the events feed is intentionally available
only once `useSession().status` is `ready` (confirmed eligible school email and age attestation).

On a fresh demo database, as the migration owner, apply in order:
```sh
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0001_foundation.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0002_events.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f src/features/events/seed/demo_events.sql
```
Do not rerun applied migrations blindly; use the team's migration tracking.
The seed is demonstration-only, labels every event SYNTHETIC/DEMO, and creates zero RSVPs.
Use confirmed test accounts on approved student domains; do not bypass the university gate.
The SQL test creates TCD/UCD fixtures and assumes their domains remain in the foundation allowlist.

```sh
bunx vitest run src/features/events
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0002_events.test.sql
```
The database script runs in a transaction and rolls back; use a test database because
its fixture profile update touches existing rows within that transaction.

## Audit verification and blockers
- 21 event unit/screen tests pass: local inclusive date boundaries, validation, feed navigation,
  invite propagation, RSVP/withdrawal, inaccessible events, real/absent ratings, report success,
  duplicate-send protection, missing operation and retryable failure.
- Ratings are displayed only from supplied records, with an explicit safety limitation.
- Missing `report_event` (PGRST202/42883) is distinguished from a failed submission;
  all failed reports retain their reason for retry and never claim success.
- Database acceptance tests have **not** been run against the shared hosted database.
- Live student sign-in, creation, RSVP read-back, cross-university privacy and invite denial
  remain unverified until Vercel's shared configuration and migrations are available.
- Real pair/group selection requires Member 4 integration; real event reporting requires
  Member 5's protected `report_event(p_event_id,p_reason)` and migration integration.
- After integration, repeat with two eligible student sessions: create, RSVP twice, withdraw,
  verify counts through the feed, test valid/invalid invites, select pair/group, and submit a report.

Part 3's UI/service submission is implemented; full live acceptance remains blocked by
shared deployment setup and Members 4/5 integration. No fake offline cards or users are used.
