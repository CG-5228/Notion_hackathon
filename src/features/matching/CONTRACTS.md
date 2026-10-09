# Matching (Member 4) — exported contracts

Migration: `supabase/migrations/0003_matching.sql` (after 0001 + 0002, before 0004).

## Tables (RLS on; clients can only SELECT their own rows, never write)
| Table | Notes |
|---|---|
| `buddy_requests(id, event_id, user_id, mode, max_size, status waiting/assigned/cancelled, match_id, created_at, updated_at)` | one `waiting` row per (event,user) across both modes |
| `buddy_matches(id, event_id, mode, max_size, status forming/chatting/locked/revealed/closed, membership_version, …)` | pair → `max_size=2`; group → 3..5. Readable only by active members. In `supabase_realtime`. |
| `buddy_match_members(id, match_id, event_id, user_id, pseudonym, joined_at, left_at)` | membership as ROWS. Active = `left_at is null`. One active slot per (match,user) and per (event,user). Caller can read only their own row. |

## Client RPCs (authenticated only; JSON camelCase)
| RPC | Returns |
|---|---|
| `request_buddy(p_event_id uuid, p_mode text, p_max_size int default null)` | `{ state: 'queued'\|'forming'\|'matched', matchId?, memberCount?, maxSize? }`. Requires verified student + RSVP `going`. Idempotent across tabs. |
| `cancel_buddy_request(p_event_id uuid, p_mode text)` | `void`. Cancels waiting request or leaves a still-forming group. Raises 22023 once a group chat is active (use `leave_match`). |
| `leave_match(p_match_id uuid)` | `{ status, membershipVersion, memberCount, changed }` |
| `get_my_match(p_match_id uuid)` | `BuddyMatchView` without `revealedProfiles` (use M5 `get_revealed_profiles`). Pseudonyms only. 42501 for non-members. |
| `get_my_buddy_status(p_event_id uuid)` | `{ state: 'none' }` \| `{ state:'queued', mode }` \| `{ state:'forming'\|'matched', mode, matchId, matchStatus, memberCount, maxSize }` |

## State machine
- pair: created directly as `chatting` with exactly 2 members.
- group: `forming` (<3) → `chatting` (≥3, joinable until `max_size`) → `locked` (first Agree) → `revealed` (M5, N/N).
- Joining a group bumps `membership_version`. Locking does **not**.
- A member leaving pre-reveal: all agreements deleted, version + 1; pair → `closed` (other member released, never auto re-paired); group <3 → `forming`, ≥3 → `chatting`; 0 → `closed`.
- Joiners need group `max_size <=` their own chosen cap, no block relation with any active member, status forming/chatting.

## Helpers for Member 5 (schema `private`, call from SECURITY DEFINER RPCs)
- `private.matching_lock_for_consent(match_id, user_id) returns int` — locks the match row, `chatting → locked` without bumping version, returns current version. Use at the start of `agree_to_go`.
- `private.matching_remove_member(match_id, user_id) returns jsonb` — the ONLY membership-removal transition (leave, decline, block).
- `private.matching_separate_blocked(blocker, blocked) returns int` — also fired automatically by an AFTER INSERT trigger on `public.blocks`. Rule: pair closes; in a group the **blocker** is moved out (a block can't be used to eject someone), consent resets.
- `private.matching_reliability_band(user_id) returns text` — stub returning `'new'`; M5 may `create or replace` it with the coarse band.

## Integration items (needs Member 5)
- 0004 currently re-defines `public.leave_match` with its own logic and response shape, which overrides 0003 (applied later). Contract sheet assigns `leave_match` to M4. Please delete it from 0004 (or make it `return private.matching_remove_member(...)`) so there is one transition. With 0004's version, the remaining pair member is not released and the event lock is not taken.

## UI
`BuddyRequestPanel({ eventId })` — mode cards with verbatim `COPY.pairWarning` / `COPY.groupNotice`, size 3/4/5 (default 5), risk acknowledgement before requesting, honest waiting / forming (n of max) states, cancel/leave, polling + realtime, navigates to `/buddy/:matchId` only for a pair of 2 or a group of ≥3.

## Tests
- `supabase/tests/0003_matching.test.sql` — scenarios 1–8 from the brief (rolls back).
- `supabase/tests/0003_matching.concurrency.sh` — 23 simultaneous users per mode, double requests per user: no cap breach, no double placement, pairs exactly 2.
- `src/features/matching/__tests__/BuddyRequestPanel.test.tsx` — 7 UI tests.
