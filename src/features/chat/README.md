# Member 5 — chat, consent, safety, attendance, reliability

Branch `member-5/chat-safety`, based on `member-1/foundation`. It replaces the earlier `feat/chat` branch, which didn't use the shared foundation: it had its own types, mock fallbacks and `.js` imports, and its SQL had security gaps.

## Screen exports (contract names)
`BuddyChat({matchId})` → `/buddy/:matchId` · `PlanView({matchId})` → `/plans/:matchId` · `AttendanceCheckIn({matchId})` → `/meetups/:matchId/check-in`
Also exported: `ConsentPanel`, `SafetyDialog`, `ReliabilityBadge`, `ReliabilityPanel`, `RevealedProfiles`, `chatApi`, `reliabilityScore`.
For M3: `chatApi.reportEvent(eventId, reason, details?)` provides the "Report event" action.

## RPCs in 0004 (all call `assert_verified_student()` first, `search_path = ''`, authenticated-only)
| RPC | Returns |
|---|---|
| `get_my_match(p_match_id)` | `ChatMatchView` = `BuddyMatchView` + `agreedCount, chatEnabled, iAgreed, myCheckIn, event{title,startsAt,venuePublic}`, `participants[].isMe` |
| `get_match_messages(p_match_id, p_limit=100)` | `[{id, kind:'user'\|'system', pseudonym, isOwn, body(escaped), createdAt}]` |
| `send_message(p_match_id, p_body)` | message; 1–1000 chars, 10 per 30 s per match |
| `agree_to_go(p_match_id, p_membership_version)` | `ChatMatchView`; stale version → SQLSTATE `40001` |
| `get_revealed_profiles(p_match_id)` | `RevealedProfile[]` (others only) after N/N; else `42501` |
| `cancel_confirmed_plan(p_match_id, p_reason=null)` | `{kind:'advance_cancel'\|'late_cancel', message}` |
| `submit_meetup_outcome(p_match_id, p_outcome)` | `{recorded, message}`; `attended\|did_not_meet\|dispute_other` |
| `get_reliability_summary(p_target_pseudonym, p_match_id)` | `{band, sampleCount}` only |
| `get_my_reliability()` | own `{band, sampleCount, score\|null, confirmedAttended, upheldLateCancel, confirmedNoShow, pendingReview}` |
| `block_user(p_target_pseudonym, p_match_id)` | `{blocked, youLeftMatch, matchStatus}` |
| `report_user(p_target_pseudonym, p_match_id, p_reason, p_details=null)` / `report_event(p_event_id, p_reason, p_details=null)` | `{received:true}` |
| `moderator_review_queue()`, `moderator_resolve_outcome(id, kind, resolution)`, `moderator_set_report_status(id, status)` | moderators table only |

## Needs agreement with other members
- **M4 (0003)**: 0004 expects `buddy_matches(id, event_id, mode, status, max_size, membership_version, updated_at)` and `buddy_match_members(match_id, user_id, pseudonym, joined_at, left_at)`.
  - `get_my_match` is defined in 0004, because agreement state lives there. M4 should not define it, or 0004's version replaces it.
  - `leave_match` should call `private.m5_remove_member(match, auth.uid(), notice)`. It resets agreements, bumps the version, re-forms groups under 3 and closes pairs.
  - `request_buddy` must not admit members while `status = 'locked'`, and must skip `public.is_blocked_pair`.
  - 0004 adds a trigger on `buddy_match_members` so new joins signal the chat in real time.
- **M3 (0002)**: expects `events(id, title, starts_at, venue_public)`. `report_event` lives in 0004 because `reports` is created there.
- **M1**: the contract lists `report_event` under M3, and `get_my_match` under M4/M5. Please update CONTRACTS.md if you agree with the changes above.

## Policy decisions (documented rules)
- **Block in a group**: the blocker leaves the group, everyone's agreements reset and the version is bumped. Blocked pairs are also hidden from each other's message history. **Block in a pair**: the chat closes.
- **Realtime**: clients subscribe to `match_activity` (match id + counter, RLS = active members), then re-read through the RPCs. Payloads never carry message bodies or user ids. Removed or blocked members fail RLS and stop getting signals.
- **Attendance check-in**:
  - Pair: attendance counts only when both say "attended".
  - Group: it counts when the person says "attended" and at least min(2, n−1) others do too.
  - A "did not meet" never turns into a confirmed no-show automatically. The other person goes to a pending review queue.
- **Cancellation**: more than 2 h before is neutral. Less than 2 h is a pending late cancel, which only counts once a moderator upholds it. Moderators can mark emergencies as excused.
- **Reliability score**: no number below 3 resolved outcomes. Other members only ever see a broad band. The demo examples are client-side only and labelled DEMO.

## Tests
- `npm test`: reliability formula and the 0/1/2 threshold, escaping and length limits, BuddyChat (pseudonyms, "2 of 3 agreed", pair/group copy, no reveal before N/N, XSS text stays inert, forming state, error state with no demo data).
- `bash src/features/chat/__tests__/run-sql-tests.sh`: runs 0001 + a local 0002/0003 stand-in + 0004 + `supabase/tests/0004_chat_safety.test.sql` on throwaway Postgres. Against Supabase, once 0002/0003 are in, run `psql "$DB_URL" -f supabase/tests/0004_chat_safety.test.sql`.

## Manual multi-browser check (after 0002–0004 are applied; demo accounts from INTEGRATION.md)
1. Two browsers (A, B) request a pair for the same event. In A's DevTools Network tab, confirm no response contains B's name or email.
2. A agrees: both see "1 of 2 agreed" and no names. B agrees: both see names and university only.
3. Three browsers form a group. Two agree, then C leaves: the count resets and the old version gets an error. A fourth person joins and everyone agrees again.
4. A blocks B in a group: A is taken out, and B's new messages never reach A. B and A are never matched again.
5. One person reports "did not meet": the other's reliability stays "New".
