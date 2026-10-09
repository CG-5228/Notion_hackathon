# Find Your Buddy — Master Agent Prompt + Five Parallel Member Prompts

This document is ready for **Lovable, Codex, Cursor, Claude Code, Replit Agent or another code-building agent**. It implements the updated [`README.md`](./README.md) brief: **student-email-only accounts; verified public events and student-created activities; AI icebreakers; private 1-on-1 or group (3–5) matching; anonymous chat; unanimous profile reveal; clear no-show notices; fair reliability history; and report/block features.**

## How the team uses this document

1. **Member 1** owns the shared repository, Supabase project and integration. Create **one app**, not five disconnected websites.
2. **Every member** copies **Section A (MASTER PROMPT)**, then appends **only their assigned Member section B–F**. Both sections belong in the *same request* to their coding agent.
3. Develop in dedicated Git branches. Agents edit **only their assigned feature directories/migrations**. Member 1 owns app routing, shared types and environment configuration.
4. Share RPC signatures/types immediately. Apply migrations **0001 → 0002 → 0003 → 0004**. Import feature components through the integration lead; do not let five agents overwrite the same files.
5. **All important claims must be true:** use real authenticated test accounts, real persisted messages and backend-enforced agreement; label synthetic activity and reliability data as **DEMO**.
6. If Lovable cannot safely run parallel feature branches, develop components in separate repos/PRs for one integration lead or use the **single-agent fallback** in Section H.

### Feature ownership

| Member | Focus | Owned files |
| --- | --- | --- |
| **1** | Auth, data foundation, routes, integration | `src/app/**`, `src/lib/**`, `src/types/**`, `src/components/**`, `supabase/migrations/0001_foundation.sql`, app config |
| **2** | Interests and AI icebreaker onboarding | `src/features/onboarding/**`, `supabase/functions/onboarding-ai/**` (optional) |
| **3** | Public/student events, RSVP totals | `src/features/events/**`, `supabase/migrations/0002_events.sql` |
| **4** | 1-on-1 and group matching (3–5) | `src/features/matching/**`, `supabase/migrations/0003_matching.sql` |
| **5** | Pair/group chat, consent, report/block, reliability | `src/features/chat/**`, `supabase/migrations/0004_chat_safety.sql` |

**Estimated hackathon timebox:** 195 minutes. Build the smallest genuinely working, secure workflow, then improve AI and presentation. Do not claim an unbuilt feature works.

---

# A. MASTER PROMPT — Every member copies this first

```text
You are a senior full-stack engineer collaborating with FOUR OTHER coding agents on ONE shared repository. Do not build a new unrelated app. Deliver your assigned component(s) and database migration(s), with clear integration exports and tests.

PROJECT: Find Your Buddy
TAGLINE: Don't want to go alone? Find your buddy.
CHALLENGE: Use AI and technology to improve student life.
AUDIENCE: Verified university students aged 18+ (age currently self-attested), starting with allowlisted Irish universities.

PRODUCT
Students can discover curated public events and create their own activities (hackathons, grocery shopping, coffee, cinema, society meetings). They see privacy-safe, self-reported RSVP counts across universities, never attendee names. Interest onboarding uses optional AI-generated icebreaker questions grounded in chosen hobbies.

A student chooses "Find Your Buddy" on an event, then SELECTS:
(A) One-on-One: match exactly TWO verified students for that same event. BEFORE confirming, display PROMINENT WARNING: "We cannot guarantee your buddy will attend. They may cancel or not show up. Consider group matching if you'd prefer not to depend on one person." This warning persists regardless of reliability score.
(B) Group: form a group of 3–5 verified students for that same event. Allow user to choose maximum group size 3, 4 or 5 (default 5). At least THREE members are required before chat activates. Display: "A group may reduce dependence on one person, but nobody's attendance is guaranteed."

Matching must be real, transactional, server-controlled and never invent users. Both modes provide realtime private chat under per-match PSEUDONYMS. Each participant can select "Agree to Go" independently. For a 1-on-1 match, BOTH must agree; for a group, ALL locked-in CURRENT members (3–5) must agree. NO real profile fields may be returned in ANY browser/network responses until unanimous consent is verified in the backend. Reveal ONLY consented display name, university and optional approved avatar/shared interests. Never disclose email, phone, student number, home address or precise location.

GROUP CONSENT MODEL
- Group status 'forming' while fewer than 3 active members; no chat until 3.
- Status 'chatting' at 3 members; admit additional members until selected maxSize unless membership has been locked.
- First "Agree to Go" freezes the current member list and uses its existing membershipVersion; do not bump the version merely for locking. Every current member must agree within that version. Bump membershipVersion whenever membership actually changes. The server reveals only at N/N agreement.
- If someone leaves/declines before reveal, invalidate ALL pending agreements, update membershipVersion, notify remaining members, re-form if group has <3, and require fresh unanimous consent. For a PAIR, close it and offer the remaining student the choice to search again; never silently pair them with someone new. Never reuse stale approvals.
- Prevent blocked users from sharing a new match/group; on an in-group block, terminate shared communication and remove/separate participants per a safe, documented rule. No person who blocked another should keep receiving that person's messages.

STUDENT ACCESS
- Require Supabase Auth email CONFIRMATION and an ADMIN-MAINTAINED EXACT UNIVERSITY DOMAIN ALLOWLIST. Reject personal emails such as gmail.com/outlook.com and unknown academic domains. Validate the confirmed account's address SERVER-SIDE; do not rely on client regex or a self-editable verified flag. Protect profile.student_verified and university binding from user updates.
- Authenticated school email establishes control of a university-domain account, not guaranteed current enrolment. Age 18+ is self-attestation, not documentary age verification. Label limitations honestly.
- If email testing is blocked, use explicitly provisioned isolated DEMO accounts, not a production auth bypass.

EVENTS
- Prioritise well-rated major public events from trustworthy organisers where authentic ratings and sufficient review volume exist. Public/curated events need a genuine organiser/source link, review status, and optional genuine participant ratings. Ratings are NOT proof that anyone or any event is safe. Never mark an event 'guaranteed safe'.
- Students can create campus-visible or invite-only activities; use public/general meeting points, not private home addresses.
- Event RSVP 'going' is self-reported intent only; show anonymous unique total and optionally universities represented, with privacy suppression for small groups (e.g. <5 per university). No attendee roster/raw RSVP enumeration.

RELIABILITY AND ATTENDANCE
- Distinguish a student's stated intention from real-world attendance. A plan enters tracking ONLY AFTER unanimous agreement.
- Provide cancellation controls; advance cancellations (>2 hours before scheduled meetup is suggested policy) are NEUTRAL, not no-shows. Late cancellations have a review/appeal route; emergencies must not be automatically penalised.
- Post-event each person may report "Attended", "Did not meet", or "Dispute / other". Require corroboration before confirmed attendance; a no-show affecting a score requires credible independent evidence or moderator review. NEVER penalise from a single unverified accusation, AI assumption, GPS inference or automatically from an RSVP withdrawal.
- Implement conservative optional score over RESOLVED, EVIDENCE-BACKED outcomes:
  score = round(100 * (confirmed_attended + 0.5 * upheld_late_cancel) / (confirmed_attended + upheld_late_cancel + confirmed_no_show))
  where upheld_late_cancel is REVIEWED and non-excused; excuse real emergencies; on-time cancellations and pending/disputed outcomes are excluded. Treat this as PROPOSED policy, not predicted likelihood or safety certification.
- Show exact numeric score ONLY after >=3 resolved qualifying outcomes; otherwise "New / Not enough verified history". Show sample count and an attendance-is-not-guaranteed disclaimer. In anonymous conversations prefer coarse bands: new / generally_reliable / mixed / repeated_verified_no_shows, to reduce re-identification. Do not display detailed report histories publicly.
- For a prototype lacking secure moderation, show neutral reliability for real users and use clearly marked DEMO resolved history for score demonstration. Do not pretend moderated outcomes exist.

SAFETY + REPORTING
- Report and Block must be available before and after reveal, from event/chat contexts; also provide reporting of events. The reporter may target a PSEUDONYM; backend securely resolves the internal account ID for restricted moderation without revealing identity to reporter.
- Block must reject future matches and sever existing communication as appropriate, including inside groups. Store reports privately and DO NOT auto-penalise attendance based solely on a report. Report submission is not the same as staffed realtime moderation.
- Recommend first meetings in public venues. No live location tracking, medical/therapy claims, dating positioning, invented attendees/ratings, or promises of attendance or physical safety.

TECH STACK (adapt only if existing repo differs)
React + TypeScript + Vite + Tailwind; Supabase Auth, Postgres/RLS, Supabase Realtime; secure Postgres RPCs for matching/consent/private read models; optional server-side AI integration, with static icebreaker fallback. Use accessible, mobile-first design: warm navy, mint, lilac and neutrals; no dating-app presentation.

SECURITY NON-NEGOTIABLES
- All table access controlled by tested row-level security; use explicit role grants, no broad SELECT on profiles, RSVPs, reports or meetup outcomes.
- SECURITY DEFINER RPCs must authenticate, check verified school account, membership/permissions, use safe search_path and locked transactions where necessary. Do not expose service-role or AI secrets to frontend.
- Realtime channels restricted to actual group members; users removed/blocked from a group must lose access to future messages.
- No identity sent to client before unanimous agreement, even if hidden in CSS. Escaped chat content; length limits, input validation and rate-limits where feasible.
- Reports/cancellations/score-changing decisions must be auditable. Distinguish demo from genuine production data.

SHARED OWNERSHIP — DO NOT VIOLATE
Member 1: src/app/**, src/lib/**, src/types/**, src/components/**, env and project config, migration 0001.
Member 2: src/features/onboarding/**, optional supabase/functions/onboarding-ai/**.
Member 3: src/features/events/**, migration 0002.
Member 4: src/features/matching/**, migration 0003.
Member 5: src/features/chat/**, migration 0004.
Do not independently edit another owner's files. Coordinate contract changes with Member 1 before implementing them. Create one shared backend, not one Supabase project per agent.

SHARED DATA TABLES (migration order matters)
0001: universities, profiles, interests, profile_interests, blocks and verified-student helper functions.
0002: events, event_rsvps, optional event_ratings, private discovery and safe aggregate count functions.
0003: buddy_requests, buddy_matches, buddy_match_members (memberships as ROWS), atomic pair/group formation, capacity, membershipVersion, excluded blocked participants.
0004: messages, buddy_agreements, reports, meetup_outcomes and optional reliability_adjustments; secure read/send/consent/reveal/cancellation/report/block/outcome methods. Reuse existing blocks table; do not recreate it.

SHARED TYPES (Member 1 defines; other agents consume)
type MatchMode = 'pair' | 'group';
type MatchStatus = 'forming' | 'chatting' | 'locked' | 'revealed' | 'closed';
type ReliabilityBand = 'new' | 'generally_reliable' | 'mixed' | 'repeated_verified_no_shows';
type EventSummary = {id:string; title:string; category:string; startsAt:string; venuePublic:string; kind:'curated_public'|'student_created'; goingCount:number; universitiesRepresented?:number; reviewStatus:'curated'|'pending'|'student_posted'};
type BuddyMatchView = {id:string; eventId:string; mode:MatchMode; status:MatchStatus; memberCount:number; maxSize:number; membershipVersion:number; myPseudonym:string; participants:Array<{pseudonym:string; agreed:boolean; reliabilityBand:ReliabilityBand}>; revealedProfiles?:Array<{displayName:string; university:string; avatarUrl?:string}>};
Never add real profile identifiers to pseudonymous participants in client-facing responses.

STABLE BACKEND CONTRACTS — agree exact SQL types/signatures with Member 1
get_discoverable_events(filters) -> safe event summaries, no attendee identities.
rsvp_to_event(event_id, going) -> caller-only RSVP update.
request_buddy(event_id, mode, max_size?) -> genuine queue/forming/match result.
cancel_buddy_request(event_id, mode) -> cancel own waiting request.
get_my_match(match_id) -> member-authorised pseudonym-only state until revealed.
send_message(match_id, body) -> member-only, only while permitted.
agree_to_go(match_id, membership_version) -> locked current membership + unanimous reveal.
leave_match(match_id) -> member exit; invalidate stale group agreements.
get_revealed_profiles(match_id) -> protected read after 2/2 or N/N unanimous consent.
cancel_confirmed_plan(match_id, reason?) -> notify affected confirmed group/pair.
submit_meetup_outcome(match_id, outcome) -> own post-event feedback; not automatic penalty.
get_reliability_summary(target_id, match_context) -> coarse status only for authorised match context; own account can view more detail.
block_user(target_id, match_context) / report_user(...) / report_event(...) -> protected actions.

ROUTES
/, /auth, /onboarding, /events/:id, /activities/new, /find-buddy/:eventId, /buddy/:matchId, /plans/:matchId, /meetups/:matchId/check-in, /my-activities.
Member 1 owns routing, other members export feature screens for composition.

BUILD ORDER
P0: university account verification + events + counts + selection pair/group + real matching + real pseudonymous chat + unanimous reveal + report/block + honest reliability empty-state/attendance flows.
P1: AI-generated icebreakers (unless easy to include during onboarding), chat suggestions, group improvements, rating/filter polish, secured moderation.
P2: sophisticated recommendations, calendar integrations, institutional partnerships.
DO NOT FAKE a completed feature. If no AI key, provide the deterministic icebreaker fallback and report the limitation.

FOR EVERY TASK:
1. Inspect repo and contracts; don't overwrite existing working code.
2. Implement actual UI + secure backend for OWNED area.
3. Add loading/empty/failure/permission states and tests.
4. Verify typecheck/build + relevant security tests when tooling available.
5. Report changed files, exports, SQL/RPC signatures, setup, tests actually run, and any blockers to Member 1.
```

---

# B. MEMBER 1 — Student Authentication, Shared Foundation & Integration

**Paste into Member 1's agent:** Section **A** + the block below.

```text
ROLE: MEMBER 1 — AUTH / FOUNDATION / INTEGRATION LEAD

You own the ONE runnable app skeleton, the validated student-only entry gate and the final integration. Other members implement feature modules; DO NOT rebuild their modules or conflict with their migrations.

OWNERSHIP
- src/app/**, src/lib/**, src/types/**, src/components/**, app/package/build config, .env.example, docs integration notes
- supabase/migrations/0001_foundation.sql
- integration/E2E tests and deployment setup

IMMEDIATE TASKS
1. Inspect repo and scaffold React/TypeScript/Vite/Tailwind only if required. Establish consistent app shell, navigation, protected routes and mobile-first styling. Configure paths: /, /auth, /onboarding, /events/:id, /activities/new, /find-buddy/:eventId, /buddy/:matchId, /plans/:matchId, /meetups/:matchId/check-in, /my-activities.
2. Configure ONE shared Supabase client at src/lib/supabase.ts with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Provide a clear .env.example; never expose service-role credentials. Add scripts to build/typecheck/test.
3. Author migration 0001:
   universities(id,name,approved_domains or related domain alias table); profiles(user_id auth FK, university_id, display_name, avatar_url optional, age_confirmed, student_verified, timestamps); interests/profile_interests including per-tag share opt-in; blocks(blocker_id,blocked_id,created_at) unique pair.
   Establish restrictive RLS and helper functions for authenticated verified/18+ allowlisted student checks, and blocked-pair checks.
4. Student registration MUST use confirmed account email at an ADMIN-APPROVED INSTITUTIONAL DOMAIN. Reject ordinary personal emails or unknown schools; do not use regex-only trust or treat .edu/.ie as automatically approved. Protect student_verified and university_id against self-editing. Email ownership validation occurs on server under auth confirmations. If verification cannot be delivered for demo, provision explicitly authorised DEMO users server-side, not a global bypass.
5. Do not expose private profile columns through SELECT to strangers. Member 5 implements guarded mutual reveal. Store user profile display name privately until that point.
6. Publish the shared TypeScript types from the MASTER PROMPT and a concise RPC JSON signature sheet to Members 2–5 before their coding starts. Export a stable session/auth hook; other members may not create their own Auth provider.
7. Reserve stub component entrypoints with agreed export names: OnboardingScreen, EventsFeed, ActivityDetail, CreateActivity, BuddyRequestPanel, BuddyChat, PlanView, AttendanceCheckIn. Do not fabricate implemented functionality inside placeholders.
8. Integrate in dependency order events → matching → chat → onboarding; apply 0001 → 0002 → 0003 → 0004. Coordinate SQL errors instead of silently rewriting teammates' migrations.
9. Test 2 separate authenticated browser sessions for pair mode and 3–5 for group. Include negative tests: non-school account access, identity before reveal, user C reading private chats, group consent reset after departure, blocked user re-match, no-show report not automatically changing reliability.
10. Deploy and validate the real live demonstration; share URL and known limitations honestly.

ACCEPTANCE
- Unapproved school or personal email cannot access member functionality even via direct RPC.
- Allowlisted address is confirmed; authenticated user cannot self-assign verified status/university.
- Profile/RSVP privacy is enforced server-side.
- Both pair and group modes call Member 4's REAL matching engine and Member 5's REAL chat/consent backend.
- A third account cannot access private memberships, outcomes or identities.
- Build and mobile app work. Document environment and migration commands.

OUTPUT: runnable integrated app, 0001 migration, shared contract sheet, integration tests and deployment status.
```

---

# C. MEMBER 2 — Interests and AI Icebreaker Onboarding

**Paste into Member 2's agent:** Section **A** + the block below.

```text
ROLE: MEMBER 2 — AI ICEBREAKERS AND INTEREST ONBOARDING

Your mission is to make it easier for students to get started without writing awkward bios. AI provides conversational icebreaker questions based on interests, not psychological diagnoses.

OWNERSHIP
- src/features/onboarding/** only
- optional supabase/functions/onboarding-ai/**, if configured by Member 1
- tests within owned folder
Do NOT change authentication, profile table definitions, root routing, matching logic or chat tables.

IMPLEMENT
1. Export OnboardingScreen({onComplete?}) and feature-local services/hooks using the shared verified student session.
2. Show interest chips: tech/hackathons, gaming, food, grocery shopping, movies, music, sports, coffee, art, exploring, studying, societies. Make choices optional, editable and keyboard accessible.
3. Ask 3–5 personalised, FRIENDLY questions. For example, technology -> "Are you more into building projects or attending tech talks?"; exploring -> "Would you prefer a city walk or a museum?". Let users skip each question or all questions.
4. If model access exists, call a SERVER-SIDE endpoint with selected/opted-in tags only. Request validated structured JSON: {questions:[{id,question,options?}],suggestedTags:[]}; impose max questions/length and content validation. No email/name, other members' data, sensitive psychological inference or mental health labels in prompts.
5. ALWAYS implement a complete deterministic fallback of curated questions when model access fails/timeouts/has no budget. Do not block onboarding behind AI success.
6. Persist chosen tags and user-confirmed answers with owner-only access. Never silently persist AI guesses. Provide controls for which interests can be SHARED as optional chat context; default to private when unsure.
7. Optional P1: export getIcebreakerSuggestions({eventTitle, mutuallyShareableTags}) that returns text suggestions only. NEVER auto-send a chat message.
8. Show a short privacy explanation and completion flow routing back to activity discovery.

TEST
- No AI key -> onboarding still completes; questions appear from fallback.
- Every question and all tags can be skipped/edited.
- Persisted tags belong to the signed-in account, not another user.
- Hidden interests are never served as match-visible data.
- Responsive on phones; no health or treatment claims.

OUTPUT: feature components, services, any secure AI endpoint, tests and exact exports to Member 1.
```

---

# D. MEMBER 3 — Public Events, Student Activities, Ratings & RSVP

**Paste into Member 3's agent:** Section **A** + the block below.

```text
ROLE: MEMBER 3 — EVENT DISCOVERY + USER-CREATED ACTIVITIES

You own the context for every buddy match: a REAL activity with privacy-safe participation counts. Build an excellent activity browsing experience backed by database records rather than static fake cards.

OWNERSHIP
- src/features/events/**
- supabase/migrations/0002_events.sql
- tests/seed instructions for your own feature
Do NOT edit foundation/auth, buddy matching, chat schema, or app-wide router.

SCHEMA
- events(id,host_id nullable,title,description,category,starts_at,ends_at,venue_public,event_kind curated_public/student_created,visibility public/campus/invite_only,source_url nullable,review_status,created_at, optional secure invite hash);
- event_rsvps(id,event_id,user_id,status going/withdrawn,timestamps) unique(event_id,user_id);
- optional event_ratings(id,event_id,user_id,rating,comment,timestamp) unique(event_id,user_id), with rate eligibility checks if implemented.
- Confirmed verified-student access checks and safe event visibility policies. Student-created public activities require validated public venue and appropriate controls; curator/admin review is privileged.
- Secure get_discoverable_events(...) and rsvp_to_event(event_id,going) RPCs/read models. Count unique, explicit 'going' RSVPs; NEVER reveal a roster, raw event_rsvps member IDs or identifiable university micro-buckets. For university-specific counts use suppression threshold >=5 (or omit breakdown entirely).

UI
1. Export EventsFeed with search/date/category filters if time permits; clear 'Curated public', 'Student-created', 'Invite-only' labels and credible source links.
2. Export ActivityDetail with real event data, verified provenance, unique RSVP count, "I'm Going" toggle and large "Find Your Buddy" button that routes to Member 4's mode selector.
3. Export CreateActivity with title, date/time, description, category, campus-visible/invite-only choice and public/general location; robust validation and error states.
4. Optional MyActivities showing created activities and own RSVPs. No attendee directory under any circumstances.
5. Genuine ratings (count + average) only where actual rating records exist. Do not fabricate popularity, safety scores or reviewer quotes. Ratings do NOT establish real-world safety; display a clear note.
6. Event-level Report button / action stub must connect to Member 5's protected report_event operation after integration; make it visible even before matched profiles are revealed.

DEMO
Seed clearly labelled SYNTHETIC events: a hackathon, grocery trip near campus, and cinema evening. Do NOT prefill realistic-looking attendee counts unless these are explicitly marked demo values. Prefer test account real RSVP clicks to show count changes.

ACCEPTANCE
- Student A RSVP increments once; repeated click does not double count; withdrawal decrements.
- Students from multiple eligible universities contribute to anonymous count; cannot list identities via APIs.
- Unknown person cannot discover invite-only activities without access.
- Students cannot self-mark an event curated or spoof admin ratings.
- Event creation validates public venue, start/end order and authenticated student status.
- CTA leads to real pair/group selection (Member 4) rather than automatically assuming 1-on-1.

OUTPUT: feature UI/service, 0002 migration, safe aggregate queries, sample data and integration exports.
```

---

# E. MEMBER 4 — Atomic Pair Matching and Group Formation (3–5)

**Paste into Member 4's agent:** Section **A** + the block below.

```text
ROLE: MEMBER 4 — 1-ON-1 + GROUP BUDDY MATCHING ENGINE

Your mission is to build TWO genuinely functioning modes using the same student/event data: pair matching (2) and small-group matching (3–5). Matching must be transactional and cannot use fake users.

OWNERSHIP
- src/features/matching/**
- supabase/migrations/0003_matching.sql
- matching-only tests
Do NOT modify Member 1's auth, Member 3's events or Member 5's messaging/consent migration. Coordinate all contracts.

DATABASE MODEL
- buddy_requests(id,event_id,user_id,mode pair/group,max_size nullable, status waiting/assigned/cancelled,created_at,updated_at), with uniqueness preventing duplicate active request for the same event/mode and prevent parallel active placement in the same event.
- buddy_matches(id,event_id,mode pair/group,max_size,status forming/chatting/locked/revealed/closed,membership_version,created_at,updated_at).
- buddy_match_members(match_id,user_id,pseudonym,joined_at,left_at nullable) unique current slot + constraints. Membership rows support 2-person pairs and 3–5 groups; DO NOT hardcode only user_a/user_b columns.
- No direct unguarded SQL writes by clients to match member rows or match status. RLS and privileged RPCs must strictly check caller/membership.

SERVER METHODS
1. request_buddy(event_id,mode,max_size): authenticate and verify school account, age self-attested 18+, event eligibility + RSVP or explicit RSVP consent. Pair only with SAME EVENT/SAME MODE and no mutual block. Pair: find 1 eligible waiting user using row locks + unique constraints; otherwise create honest waiting request. Group: join compatible forming/chatting group for same event, if not locked/revealed, where size < group.max_size, user's selected cap is compatible and no existing member has a block relation; otherwise create forming group. DO NOT breach maxSize or create two active placements.
2. Advance group status from forming to chatting once >=3 ACTIVE members. Realtime notification/status polling allows existing waiting members to see legitimate activation. Do not enable chat with only 2 group members.
3. cancel_buddy_request(event_id,mode): cancel own unassigned request / forming-group participation as permitted; coordinate exit once chats are active through leave_match.
4. get_my_match(match_id): check active membership and expose ONLY pseudonyms, mode, group count/cap, membership version, consent/status fields and safe coarse reliability hints (from Member 5). NEVER SELECT real profiles into responses before approved reveal.
5. Publish helper for Member 5 to atomically LOCK MEMBERSHIP at first consent, invalidate agreements on member departure, and protect membershipVersion. Either define server transitions in Member 4's migration or coordinate exact interface with Member 5. Do NOT let two independent functions race on group membership and consent.

RACE CONDITIONS / SECURITY
- Use transaction-level locks, appropriate unique indexes, FOR UPDATE SKIP LOCKED/advisory lock as suitable; handle simultaneous pair matches and third/fourth/fifth joiners.
- Cannot match self, blocked pairs, unverified accounts, different activities, or incompatible mode.
- First Agree freezes group membership; attempt to join locked group creates/joins another forming group or waits. After departure, invalidate ALL pending consent from old version; group <3 returns to forming, otherwise chatting, unless closed.
- For an in-group block, ensure active chat separation/closure so no blocked pair remains in contact; coordinate block handling with Member 5.
- Generate distinct match-scoped random pseudonyms; no email, names, full user IDs or profile photos to other chat members.
- Prevent user A from enrolling twice through two tabs and group exceeding selected cap.

UI
- Export BuddyRequestPanel({eventId}) or agreed equivalent. FIRST render mode cards:
  * One-on-One (2): show bold warning "We cannot guarantee your buddy will attend. They may cancel or not show up. Consider Group matching if you'd prefer not to rely on one person."
  * Group (3–5): choose maximum group size 3,4,5 (default 5); explain group offers flexibility but guarantees nothing.
- Consent to risk copy is visible before request; don't bury it in a footer. Then show true WAITING/FORMING/CHATTING and member count states, cancel/leave functionality and errors.
- On active pair match (2) or group chat (>=3), route to /buddy/:matchId owned by Member 5. Waiting screen must not pretend there is a buddy when no one is online.

TESTS
1. A requests pair, waits. B requests pair for same activity -> exact 2-member match, each sees private pseudonyms.
2. A pair request NEVER joins a group and vice versa.
3. A and B request group -> forming/no chat. C joins -> group chat with 3; D/E may join until requested max. F must not join capped group.
4. Cap 3 group never exceeds 3; cap 5 never exceeds 5. Concurrent join tests pass.
5. Group can't accept new member after first Agree/lock.
6. Leaving before reveal resets old agreements; <3 returns to forming; no stale unanimous reveal.
7. Blocked users not paired or co-grouped. Cannot match self/different event/unverified student.
8. Nonmember can't read match/private member IDs; group routes don't leak identity.

OUTPUT: migration 0003, matching UI/services, transaction-safe backend RPCs, test results, and exact exported contracts for Member 1 and 5.
```

---

# F. MEMBER 5 — Realtime Chat, Mutual Reveal, Reliability, Report & Block

**Paste into Member 5's agent:** Section **A** + the block below.

```text
ROLE: MEMBER 5 — ANONYMOUS CHAT, CONSENT, SAFETY, ATTENDANCE AND RELIABILITY

Your mission is to create the trustworthy social interaction: pair and group private chat, unanimity-based reveal, visible report/block tools, cancellation/check-in, and an honest fair reliability status.

OWNERSHIP
- src/features/chat/**
- supabase/migrations/0004_chat_safety.sql
- own feature tests
Do NOT recreate matching tables, university auth or event tables; use migrations 0001–0003 and coordinate with Member 4's membership-lock interface.

DATABASE
- messages(id,match_id,sender_id,body,created_at), participant-only access/read/insert with limits and escaped HTML.
- buddy_agreements(match_id,user_id,membership_version,agreed_at), unique (match_id,user_id,membership_version); approvals can't be reused after group membership changes.
- reports(id,reporter_id,target_user_id nullable,event_id nullable,match_id nullable,reason,details,created_at,status), report access restricted to submitter and authorised moderators; user can report by match pseudonym, backend resolves target account securely.
- meetup_outcomes(id,match_id,user_id,kind attended/did_not_meet/dispute/late_cancel/advance_cancel,submitted_at,resolution pending/resolved/disputed/excused,reviewed_at nullable), with audit trail and duplicate protection. Optional reliability_adjustments if implementing moderator decisions.
- Reuse blocks from 0001. Never give client write access to reliability-confirmed fields or outcome resolution statuses.

REALTIME CHAT
1. Export BuddyChat({matchId}) supporting pairs (2) and groups (3–5). Show the event title, pseudonyms, current group size, status, input composer, sent messages, realtime subscriptions, send failure/loading states, and accessible message controls.
2. Only enable chat when pair has both members or group has >=3 active members. RLS restricts reads/inserts to active members; removed/blocked members cannot receive future messages.
3. Interest-based AI icebreaker suggestions are OPTIONAL and use only explicitly shared interests; never send on behalf of a member. Provide hardcoded useful suggestions if no model.
4. Provide Report/Block actions at all times for pseudonymous members and after profile reveal. Map pseudonym to underlying identity SERVER-SIDE. Show report success honestly; don't imply staff are monitoring live.

CONSENT + REVEAL
5. Export consent controls showing independent "Agree to Go" for each member, decline/leave and clear state (e.g. "2 of 3 agreed").
6. agree_to_go(match_id,membership_version) authenticates active member; under server transaction lock freezes the existing membershipVersion on first agreement (do not bump version on locking alone), records this specific member's consent, and reveals only when ALL N CURRENT locked members agree (2/2 for pair; 3/3, 4/4 or 5/5 for groups). If version changed, return retry/refresh; never use stale agreements.
7. get_revealed_profiles(match_id) only returns approved display name, university, opted-in avatar/interests to MATCH MEMBERS after server validates status revealed AND all current memberships consented to the same membershipVersion. Deny outsiders and any unapproved pre-reveal request. Do NOT rely on hiding already-sent private fields.
8. If member leaves or declines before reveal: call Member 4's transition for membership removal/status; invalidate all prior consents for groups and re-form if needed. Blocking closes or separates the affected chat so blocked parties no longer communicate. Remember that identities already seen after reveal cannot be erased from memory.

RELIABILITY / ATTENDANCE
9. Show visible "Attendance is not guaranteed" in pair PlanView and reliability UI—even if someone has a high score. Group notice also avoids guarantees. Expose coarse reliability band in anonymous chat; don't show complete attendance history before reveal.
10. Add ConfirmedPlanView and AttendanceCheckIn screen, with a "Can't Make It" cancellation action and reason optional. Record advance cancellation (>2 hours beforehand) neutrally. Late cancellation is pending review, not an automatic penalty. Do not count RSVP-only events or chats without full agreement.
11. After event, members can independently submit Attended / Did not meet / Dispute. Verification: 1-on-1 requires corroboration by BOTH for attended; groups need a defined independent corroboration policy (e.g. at least two independent member confirmations for a specific attendee, adjusted for small groups). Conflicts remain pending/disputed. A no-show only becomes score-affecting with defensible review or independent evidence, not because one party complained.
12. Implement a reliability summariser over approved resolved outcomes ONLY:
    score = round(100*(confirmed_attended + 0.5*upheld_late_cancel)/(confirmed_attended + upheld_late_cancel + confirmed_no_show))
    Only display a numeric percentage when denominator >=3. Exclude advance cancels, pending disputes and excused emergencies. Provide a sample size and explanatory copy. The score is not a probability, not a personal safety rating and not a guaranteed attendance forecast.
13. For real users without verified history, return band NEW with "Not enough verified history" rather than fabricated 100%. If secure moderator review can't be built now, do NOT create automatic confirmed_no_show values; use labelled DEMO resolved examples for explaining scoring and implement report queue for future review.
14. Moderators must have restricted access to reports/outcomes, ability to review appeals if implemented, and audit records. Ordinary students cannot self-set resolution to "confirmed no-show" or manipulate attendance score with API calls.

SECURITY / ACCEPTANCE TESTS
- Pair: A agrees, B hasn't -> profile requests denied and nothing identifying in network; B agrees -> both see only permitted identity fields, unrelated C sees nothing.
- Group: A/B agree, C does not -> nobody sees real profiles; C agrees -> N/N reveals. Group change invalidates old consent; old version can't trigger reveal.
- A nonmember cannot select group messages; a blocked member cannot keep talking via stale realtime subscription.
- Chat output escaped; message lengths bounded; repeated agree requests idempotent and concurrent requests atomic.
- Block prevents fresh matches; report-by-pseudonym targets correct user with reporter receiving no real identity.
- One user reporting a no-show does NOT immediately penalise the other; advance cancellation stays neutral; 0/1/2 resolved outcomes show NO percentage; disputed/excused cases excluded.
- Pair and group UI both clearly explain no guarantees and public-meeting guidance.

OUTPUT: 0004 schema/RPCs + RLS, realtime pair/group chat components, PlanView/AttendanceCheckIn, report/block functions, conservative reliability calculator and manual multi-browser test instructions. Share exact exports and API shapes with Member 1.
```

---

# G. Integration and acceptance checklist (send to the group)

### Before coding in parallel

- [ ] One repository and one Supabase project established by Member 1.
- [ ] Member 1 shares validated exact institutional domain policy, confirmation setup and two to five eligible demo accounts.
- [ ] Shared TypeScript `MatchMode`, `MatchStatus`, `BuddyMatchView` and group membership-version semantics agreed.
- [ ] All five agents receive **MASTER PROMPT + THEIR MEMBER PROMPT**.
- [ ] Branches assigned: `feat/onboarding`, `feat/events`, `feat/matching`, `feat/chat`; Member 1 coordinates `integrate`/`main`.
- [ ] Migrations assigned only to owners: 0001, 0002, 0003, 0004.

### After merging

- [ ] Verify personal/unknown domains rejected; approved student email confirmation enforced server-side.
- [ ] Verify real events, safe aggregate counts and student-created activities work.
- [ ] Pair mode: A waits, B requests, real match; warning visible; pseudonymous messages move between two actual sessions.
- [ ] Group mode: A+B wait (no chat), C joins (chat opens), up to max size; test an additional nonmember cannot join.
- [ ] Group unanimous reveal: 2/3 agreement **still anonymous**, 3/3 reveals to current members only.
- [ ] Group leaves or blocks: no stale consents or bypass through cached API/realtime data.
- [ ] Block and report are usable before reveal; blocked users can't rematch.
- [ ] Users can cancel and submit post-event attendance feedback; 1 report doesn't alter score; new users show `Not enough history`.
- [ ] AI onboarding works or the static fallback allows completion.
- [ ] Login/logout, RLS denial tests, XSS protections, mobile layout, deployment and real demo rehearsed.
- [ ] Demo seeds, attendee counts and reliability examples clearly labelled synthetic if fictional.

### Feature handoff template

```text
Member: [1-5]
Branch / PR: [url]
Owned files changed: [paths]
UI exports and props: [exact signatures]
RPCs/tables/migrations: [exact SQL signatures]
Secrets/environment setup: [names only; NO key values]
Tests actually run + results: [commands/results]
Known limitations/blockers: [list]
Needed changes from integration lead: [exact requests]
```

---

# H. Single-Agent Fallback — when parallel coding is not practical

Paste **MASTER PROMPT (A)** plus:

```text
Implement one coherent Find Your Buddy app end-to-end, not separate demonstrations. Prioritise these milestones in exact order:
(1) Supabase confirmed, allowlisted university-email auth + private profiles;
(2) student events + honest RSVP counts;
(3) choose 1-on-1 (2) or group (3–5) with prominent attendance no-guarantee warning;
(4) real atomic pair/group creation and chat membership;
(5) private realtime pseudonymous chat and server-enforced unanimity for profile reveal (2/2 or N/N);
(6) report/block both before and after reveal;
(7) explicit cancellation/attendance tracking and conservative reliability state with no unverified penalties;
(8) interest onboarding with optional AI icebreakers and deterministic fallback.
Use at least two isolated authenticated test sessions for a pair and three for a group. Make demo data visibly synthetic, never leak real identities through APIs before consent, do not invent passing tests or users, and provide working deployment/setup notes. Cut polish if needed to keep the core flow functional.
```

**Hackathon demonstration to prioritise:** Three real signed-in demo students join the same activity, form a **group**, exchange messages as pseudonyms, agree one at a time (**2/3 is still anonymous**), then unanimously agree (**3/3 reveals limited profiles**). Show the alternative **1-on-1** mode and its clear no-show disclaimer, plus report/block and the fair **"Not enough verified history"** reliability state.
