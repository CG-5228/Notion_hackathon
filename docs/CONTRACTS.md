# Shared contract sheet (Member 1)

Import rules for Members 2–5:
- Supabase client: `import { supabase } from "@/lib/supabase"` — never create another.
- Session: `import { useSession } from "@/lib/auth"` → `{ status, session, profile, refreshProfile, signOut }`. `status`: `loading | signed_out | unverified | needs_age | ready`. Never add another Auth provider.
- Types + mandatory copy: `import { BuddyMatchView, EventSummary, COPY, GROUP_SIZES } from "@/types"`.
- UI kit: `import { Button, ButtonLink, Card, Notice, Spinner } from "@/components"`. Use theme tokens (`bg-ink`, `bg-mint`, `bg-lilac`, `text-ink-muted`, `bg-warn-bg`…), not raw colors.
- Routes are owned by Member 1 (`src/app/routes.tsx`, `ROUTES` helper). Export your screens with the reserved names/props below; do not add routes.

## Reserved screen exports

| Owner | File | Export | Props | Route |
|---|---|---|---|---|
| M2 | `src/features/onboarding/index.tsx` | `OnboardingScreen` | – | `/onboarding` |
| M3 | `src/features/events/index.tsx` | `EventsFeed` | – | `/` (signed-in) |
| M3 | 〃 | `ActivityDetail` | `{ eventId }` | `/events/:id` |
| M3 | 〃 | `CreateActivity` | – | `/activities/new` |
| M4 | `src/features/matching/index.tsx` | `BuddyRequestPanel` | `{ eventId }` | `/find-buddy/:eventId` |
| M5 | `src/features/chat/index.tsx` | `BuddyChat` | `{ matchId }` | `/buddy/:matchId` |
| M5 | 〃 | `PlanView` | `{ matchId }` | `/plans/:matchId` |
| M5 | 〃 | `AttendanceCheckIn` | `{ matchId }` | `/meetups/:matchId/check-in` |

All routes except `/` and `/auth` are wrapped in `RequireStudent` (UX only — the server is the real gate).

## 0001 SQL you can depend on

```sql
public.is_verified_student(p_user uuid default auth.uid()) returns boolean  -- confirmed email + allowlisted domain still bound + verified + 18+ attested
public.assert_verified_student() returns uuid                                -- raises 42501 otherwise; returns auth.uid(). CALL FIRST in every member RPC
public.is_blocked_pair(p_a uuid, p_b uuid) returns boolean                   -- either direction; NOT client-callable, use inside SECURITY DEFINER
public.blocks(blocker_id uuid, blocked_id uuid, created_at)                  -- PK(blocker,blocked); clients may SELECT/DELETE own rows only. M5 block_user RPC inserts.
public.profiles(user_id, university_id, display_name, avatar_url, age_confirmed, student_verified, is_demo, …) -- owner-read only
public.profile_interests(user_id, interest_id, share_on_reveal)              -- owner CRUD; reveal only rows with share_on_reveal
public.interests(id, slug, label), public.universities(id, slug, name, is_demo)
```

Client RPCs (0001): `check_email_domain(p_email text) → {allowed, university_name, is_demo}` (anon), `get_my_profile()`, `update_my_profile(p_display_name, p_age_confirmed, p_avatar_url?)`.

## Template for every SECURITY DEFINER RPC (0002–0004)

```sql
create or replace function public.your_rpc(...) returns ... language plpgsql
security definer set search_path = '' as $$
declare v_uid uuid := public.assert_verified_student();
begin
  -- membership/permission checks, `for update` locks where racing, never return profiles.* before reveal
end $$;
revoke all on function public.your_rpc(...) from public, anon;
grant execute on function public.your_rpc(...) to authenticated;
```

## Agreed RPC signatures (owners implement; JSON field names camelCase to match `@/types`)

| RPC | Owner | Returns |
|---|---|---|
| `get_discoverable_events(p_filters jsonb)` | M3 | `EventSummary[]` |
| `rsvp_to_event(p_event_id uuid, p_going boolean)` | M3 | `{ goingCount }` |
| `request_buddy(p_event_id uuid, p_mode text, p_max_size int default null)` | M4 | `{ state: 'queued'\|'forming'\|'matched', matchId? }` |
| `cancel_buddy_request(p_event_id uuid, p_mode text)` | M4 | `void` |
| `get_my_match(p_match_id uuid)` | M4/M5 | `BuddyMatchView` (pseudonyms only until revealed) |
| `send_message(p_match_id uuid, p_body text)` | M5 | message row (pseudonym, body, createdAt) |
| `agree_to_go(p_match_id uuid, p_membership_version int)` | M5 | `BuddyMatchView` |
| `leave_match(p_match_id uuid)` | M4 | `void` |
| `get_revealed_profiles(p_match_id uuid)` | M5 | `RevealedProfile[]` (only after N/N) |
| `cancel_confirmed_plan(p_match_id uuid, p_reason text default null)` | M5 | `void` |
| `submit_meetup_outcome(p_match_id uuid, p_outcome text)` | M5 | `void` |
| `get_reliability_summary(p_target_pseudonym text, p_match_id uuid)` | M5 | `{ band, sampleCount }` |
| `block_user(p_target_pseudonym text, p_match_id uuid)` | M5 | `void` |
| `report_user(p_target_pseudonym text, p_match_id uuid, p_reason text)` / `report_event(p_event_id uuid, p_reason text)` | M5 / M3 | `void` |
