# Find Your Buddy

**Find your people through the things you already want to do.**

> **Don't want to go alone? Find your buddy.**

A **student-only**, activity-first social platform that helps verified university students find someone to accompany them to public events and everyday activities. Students can explore curated public events or create their own activities, express interest without exposing their identities, join **1-on-1 or 3–5-person group matching**, chat under pseudonyms, and reveal limited profiles **only after everybody in their match agrees to go**.

**Hackathon challenge:** Use AI and technology to improve student life.  
**Audience:** University students aged **18+**; initial pilot with selected Irish universities.  
**Format:** Functional web-app prototype; designed for a five-person team, Lovable or other coding agents, with a path to a longer-term startup.  
**Status:** Product specification—not a claim that every feature below has already been implemented.

---

## 1. The problem

Students often want to attend a hackathon, explore a new city, do their groceries, see a film, or go to a campus society event, but hesitate when they have nobody to go with. Approaching strangers can feel awkward, especially at a new university or in a new country. Existing social feeds often require public profiles and conversations without a shared plan.

The second problem is **uncertainty**: someone can agree to go but later cancel or fail to arrive. A student relying on a single buddy may end up going alone.

**Find Your Buddy removes friction without making false promises:** find companions around a specific activity, chat privately first, choose either a single buddy or a small group, and get honest information about attendance reliability and cancellation risk. The platform aims to reduce the social barrier to participation; it is **not treatment for social anxiety**, a dating product, or a guarantee that anyone will arrive or that a person/event is safe.

### One-sentence pitch

**Find Your Buddy connects verified students who want to do the same thing, through anonymous-first conversations and mutual consent, with a choice of 1-on-1 or more resilient 3–5-person groups.**

---

## 2. Key product principles

1. **Students only:** Access to social features requires a confirmed email at an **approved university-issued domain**. Personal email domains are rejected; account verification cannot be bypassed by manually editing a profile. Domain verification alone does not prove current enrolment, so the product must describe the assurance accurately.
2. **Activity first:** Students match for a named event, errand or activity, not through profile swiping.
3. **Anonymous first:** Show match-specific pseudonyms, never another member's real profile before the necessary consent.
4. **Choice of format:** **1-on-1** matching or **group matching (3–5 students)**, selected before entering the queue.
5. **Consent is mutual:** Both students in a pair, or **all currently locked-in members of a group**, must independently agree before any identities are revealed.
6. **No attendance promises:** Especially on **1-on-1**, visibly state that a buddy may cancel or not show up; a larger group reduces dependence on one person but is not guaranteed either.
7. **Trust without punishment by default:** Reliability is based on confirmed history, not arbitrary user ratings or one unverified accusation. Emergencies and advance cancellations require fair handling.
8. **Report and block:** Both controls are available from chats and activity contexts, even before real identities are revealed; moderation has controlled access to necessary account IDs.
9. **AI assists introductions:** AI generates optional, non-invasive questions based on a student's selected interests; AI never impersonates real members, invents attendance or makes safety judgments.

---

## 3. Who will use it?

| Student situation | Example | How Find Your Buddy helps |
| --- | --- | --- |
| New to university | “I want to attend the robotics society meetup.” | Find someone else who wants to arrive together. |
| International student | “I want to explore Dublin on Saturday.” | Find a companion without publicly posting personal information. |
| Everyday tasks | “Anyone grocery shopping near Omni tonight?” | Match based on the same errand, location and time. |
| Hackathons / events | “Anyone attending this build challenge?” | View anonymous interest counts and find a buddy or group. |
| Cinema / leisure | “Going to the cinema on Friday.” | Talk first and decide together. |
| Worried about no-shows | “I don't want my entire plan to depend on one stranger.” | Choose a 3–5-member group and see honest reliability context. |

This is **not a dating app**: no romantic filters, public attractiveness rankings, swipe-first matching or follower counts.

---

## 4. Full user experience

```text
Sign up with approved university email + verify link + confirm 18+
                              |
                   Interests & AI icebreakers
                              |
              Explore public or student-created events
                    (anonymous RSVP counts only)
                              |
                        Find Your Buddy
                              |
                   Choose your matching mode
                      /                 \
          1-on-1 (2 people)       Group (3–5 people)
         prominent no-show        minimum 3 members
               notice             before group chat
                      \                 /
                Match-specific anonymous chat
                              |
                    Optional AI chat starters
                              |
            Independently choose Agree / Decline / Leave
                              |
        1-on-1: BOTH agree | Group: ALL locked members agree
                       /               \
                Not unanimous          Unanimous
                Profiles hidden       Limited profiles revealed
                              |
            Plan public meetup / check in / cancel if needed
                              |
         Post-event confirmation + fair reliability history
                 (report/block available throughout)
```

### 4.1 Student-only registration

- A student registers with their university-issued email, confirms the sign-up link or code, and completes **18+ self-attestation**.
- The backend checks the **confirmed address** against an **administrator-maintained exact domain allowlist** (including approved university subdomains/aliases, if configured). Do **not** treat every `.edu`, `.ac.uk` or `.ie` domain as automatically eligible.
- Personal email domains such as `gmail.com`, `outlook.com` and `yahoo.com` are ineligible. Non-allowlisted institutional domains receive a clear “University not yet supported” state.
- Profiles have a private display name, university, optional photo and selected interests. Email, phone, student ID and address are **never** revealed through matching.
- For hackathon testing, use explicitly seeded **DEMO** accounts if verification email delivery is unavailable. Isolate demo mode from public production and do not claim a seeded account is a genuinely verified student.

**Important limitation:** Owning an institutional inbox does not prove someone is currently enrolled. More rigorous enrolment verification would require a separately designed process.

### 4.2 Interest onboarding with AI icebreakers

- Let each student select interest chips such as **technology, gaming, films, music, food, sports, art, shopping, exploring, volunteering and study**.
- AI asks **3–5 short optional icebreaker questions** based on those selected interests: e.g., “You chose technology—would you rather build a project or attend a tech talk?”
- Students may **skip**, edit suggested interests, or mark interests **shareable with matches**. AI-derived assumptions are not treated as facts without confirmation.
- A **deterministic curated question fallback** must work if the model/API fails, is unavailable or is out of credits.
- Only expressly shared interests can appear in chat suggestions. AI never diagnoses anxiety or auto-sends a message.

### 4.3 Events and activity creation

**Curated public events**
- Added by an admin or through **authorised and attributable** event sources. Prioritise major, well-rated public events from reliable organisers where real ratings and review volume exist; show unrated events honestly rather than inventing scores.
- Store an organiser/source link, public venue, start time, review status, and optionally genuine post-event participant ratings with sample size.
- Display **“Curated listing”** or **“Source reviewed”**, not **“Guaranteed safe”**. High ratings are quality signals—not proof of personal safety.

**Student-created activities**
- Signed-in students can post a grocery trip, café visit, hackathon meetup, study plan, cinema outing, etc.
- Choose **campus-visible** or **invite-only** visibility; start time, public/general location, description and suggested group size.
- Use general public meeting points; avoid publishing home addresses or location trails. Student-created activities are not automatically platform-endorsed.
- Allow reports on inappropriate/unsafe event listings; restrict creation and moderation to suitable roles.

**Anonymous participation counts**
- Display **self-reported “I'm Going”** counts, e.g. `21 students going · 4 universities represented`.
- Never publish a participant directory, name, photo, email, user ID or raw per-person RSVP row through public queries.
- Suppress any small university-specific count (e.g. `<5`); if anonymity cannot be maintained, show only the total.
- RSVP is an **intention**, not proof of admission, a purchased ticket or confirmed physical attendance.

### 4.4 Choose matching mode

On each eligible activity, the main CTA is **Find Your Buddy**. A selector opens:

| Mode | Group size | What the student sees |
| --- | --- | --- |
| **One-on-One** | Exactly **2** | “Meet one buddy. **We cannot guarantee they will attend.** They may cancel or not show up. Agree only if you're comfortable; consider a group for additional flexibility.” |
| **Group** | **3–5** | “Meet a small group. A group can be less dependent on any one person, **but attendance is never guaranteed**.” Choose a maximum group size of 3, 4 or 5 (default 5). |

**Matching rules**
- Students must have confirmed eligible accounts, be 18+ by self-attestation, select the **same event** and choose the **same mode**. Prevent matching users who have blocked each other.
- **1-on-1:** Pair two eligible requests atomically. If nobody is available, show a genuine waiting state and cancellation control. If a member leaves before reveal, close the pair, invalidate their consent and offer the remaining student an explicit option to re-enter the waiting queue.
- **Group:** Form an activity-specific group. Once **at least 3** verified participants have joined, enable the group chat. It may grow up to its configured cap (3, 4 or 5), subject to compatibility and block constraints.
- **Membership lock:** The first **Agree to Go** locks the current membership/version and prevents new people joining the group while consent is being collected. Locking by itself does not increment the membership version; actual member changes do.
- **Group consent:** Every **currently locked-in** group member must agree before profiles are revealed. If someone declines or leaves **before reveal**, revoke previous pending agreements and reopen/re-form as appropriate. No member sees another's identity under the old partial consent state. If fewer than 3 members remain, return the group to a waiting/formation state (or close it).
- Group participants can leave or report problems; blocked pairs must not be put in the same group. If an existing participant blocks another, sever shared access/leave or close the affected group as needed. A group must never quietly continue exposing a blocker to someone they blocked.
- Each chat participant gets a **match-specific pseudonym**. A user can participate in more than one *different* event, but must not occupy duplicate active slots for the same event/mode.
- Do not invent other users or fabricate live matches to make the demo look successful.

### 4.5 Anonymous conversations and consent

- Conversations are limited to authenticated members of the specific match/group. Messages update in real time.
- Show only pseudonyms and explicitly shared interests before consent. Even network responses must omit real identity fields.
- Offer optional AI-based suggested icebreakers grounded in shared interests and the activity; never send automatically.
- Each member can independently select **Agree to Go**, **Not Now**, **Leave**, **Block** or **Report**.
- **Pair:** profile reveal requires agreement from **2/2** active participants.
- **Group:** reveal requires **N/N** agreement from all **3–5 locked-in active participants**. An agreement cannot be reused after membership changes.
- When unanimous, a privileged server function changes the match to `revealed`. Only members can access **limited** revealed fields: chosen display name, university and explicitly approved photo/interests. Never automatically expose email, phone, student number or address.
- Prior exposure cannot be undone by software; explain this before revealing. Blocking/reporting remain available afterward.

### 4.6 Reliability score and no-show handling

**Goal:** Help students make informed decisions about attendance risk **without claiming to predict attendance or punishing genuine emergencies**.

**What the UI shows**
- During a pseudonymous match, show a **coarse reliability label**, not identifying history: `New / Not enough history`, `Generally reliable`, `Mixed history`, or `Repeated verified no-shows`, plus an explanation that scores cannot guarantee attendance. Display an exact percentage only when enough valid history exists, with sample size, and only if it does not create an unreasonable re-identification risk.
- The 1-on-1 matching screen **always** displays the **“Attendance isn't guaranteed”** warning, including for someone with a high score.
- Students can see their own detailed outcomes and request corrections. Do not show a public leaderboard or allow unauthorised viewing of another person's complete attendance history.

**Lifecycle and fair evidence**
1. A plan only enters attendance tracking **after the required mutual agreements**. An RSVP or an anonymous chat alone does not affect reliability.
2. Before the activity, a participant can select **Can't Make It**. An **advance cancellation** (e.g. more than two hours before the planned meetup) is recorded as a courtesy action and is **not a no-show or an automatic score penalty**.
3. **Late cancellation** (e.g. within two hours) is tracked separately. Offer a reason and reasonable review/appeal path; do not automatically penalise emergencies.
4. After the activity, each participant can select **Attended**, **Did not meet**, or **Dispute / other**. Do not rely on GPS or hidden surveillance.
5. **Confirmed attendance** requires credible corroboration (for 1-on-1, both participants affirm meeting; for groups, an appropriately defined independent confirmation threshold). **Confirmed no-show** requires moderation/review or equivalent independently corroborated evidence. **A single unverified accusation never decreases a score.**
6. Unconfirmed, conflicting, cancelled or disputed cases remain **pending/neutral** until resolution; moderators can correct errors and notify affected members.

**Transparent scoring proposal (v1; configurable and not a safety rating):**

```
Only show a numerical reliability score after >= 3 resolved, evidence-backed meetup outcomes.
score = round(100 * (confirmed_attended + 0.5 * upheld_late_cancel)
                  / (confirmed_attended + upheld_late_cancel + confirmed_no_show))
```

- Exclude **on-time cancellations**, pending/disputed cases and excused emergencies from both numerator and denominator.
- `upheld_late_cancel` means a reviewed, non-excused late cancellation. `confirmed_no_show` means an evidence-backed, reviewed no-show. This formula is a **proposed product policy**, not a scientifically validated measure or probability of showing up.
- With less than three resolved outcomes, display `New / Not enough history`—**never a default 100%**. Even with enough history, show the observation count and a warning that the score cannot predict a particular meeting.
- Avoid rewarding users for pressuring others to confirm attendance, gaming check-ins, or retaliatory reports. Moderators can review appeals and suspicious patterns.

**Hackathon implementation:** Build the attendance outcome states, the conservative scoring function, and an honestly labelled demo history. If moderation cannot be implemented securely within the timebox, **do not auto-assign no-shows or show unverified punitive scores**; show `Not enough verified history` and demonstrate the proposed calculation with clearly labelled synthetic resolved data.

### 4.7 Report, block and safety

- **Report** on event cards/details, inside any chat, and after reveal. Choose a category (harassment, spam, threatening behaviour, suspicious event, attendance dispute, other), with optional details. A student may report someone by pseudonym; the backend stores the underlying account reference securely for moderators.
- **Block** from a 1-on-1 chat or group member menu; prevent new matching, hide further messages, and close/separate active shared conversations according to the block policy. Users must not need to know the other person's real identity to block them.
- Reports go to a **restricted moderation queue**; no automatic public accusations or penalties from one report. Do not imply real-time staff monitoring exists if it does not.
- Show plain-language public-meeting guidance, cancellation controls and a reminder not to share personal contact details early. In emergencies, direct users to local emergency services; the app is not an emergency response system.

---

## 5. MVP scope and priorities

**Deliver one honest end-to-end workflow before polishing peripheral pages.** Every core action must be backed by real state, not decorative buttons.

### P0 — Required for the hackathon demonstration

- [ ] Student-only signup using a **confirmed, allowlisted university email**; reject personal accounts. Isolated labelled demo-account path only when necessary for testing.
- [ ] Select interests and receive AI-generated or reliable fallback icebreaker questions.
- [ ] Browse seeded, clearly labelled public events and create student activities with appropriate visibility.
- [ ] **Anonymous self-reported attendance totals** with no user roster.
- [ ] **Find Your Buddy** selector for **1-on-1** or **Group (3–5)**; prominent 1-on-1 no-show disclaimer.
- [ ] Server-backed queue and atomic matching: 2 for a pair; group opens at 3 and caps at chosen maximum 3/4/5.
- [ ] Realtime **pseudonymous private chat** for both modes, shown in two or more genuine signed-in sessions.
- [ ] Secure unanimous agreement and **server-authorised** profile reveal: 2/2 or N/N in locked groups.
- [ ] **Report and block** actions and enforcement against rematching blocked accounts.
- [ ] Honest reliability **status** (`Not enough history` initially), plan cancellation / check-in path and validated calculation over verified demo history; no unverified automatic penalties.

### P1 — Implement only after P0 works

- [ ] Real secure moderation/review workflow for no-show disputes and appeal resolution.
- [ ] Optional AI chat starters, matching preferences and improved queue notifications.
- [ ] Cross-university breakdowns with privacy thresholds and public-event ratings from genuine users.
- [ ] Account activity history and reliability explanation UI; reminders of plans and cancellations.

### P2 — Longer-term product/startup roadmap

- [ ] University/organiser partnerships, permitted event ingestion and organiser moderation tools.
- [ ] Independent attendance confirmation or privacy-preserving optional check-in design with abuse resistance.
- [ ] Scalable integrity/moderation, reliability policy audits and GDPR processes.
- [ ] Inclusive, accessible/multilingual onboarding; calendar sync and reminders.
- [ ] Better small-group formation and interest/availability-aware recommendations.
- [ ] School-specific rollouts, retention research and paid organiser features if validated.

**Out of scope now:** Dating, random stranger video calls, exact live location tracking, payments, unmoderated private-home meetings, fabricated user activity, medical claims, automatic penalties from a single report, and safety guarantees.

---

## 6. UX / screen map

| Screen | Purpose | Essential interaction |
| --- | --- | --- |
| `/` | Friendly landing and activity discovery | Explore, sign in |
| `/auth` | University email registration and verification | Only approved, confirmed academic emails |
| `/onboarding` | Interest selection + AI icebreakers | Skip, save, shareable interests |
| `/events/:id` | Event details, provenance, anonymous count | I'm Going, Find Your Buddy |
| `/activities/new` | Create a student activity | Visibility and public venue selection |
| `/find-buddy/:eventId` | **Choose 1-on-1 or group (3–5)** | Risk copy, size selector, request/cancel |
| `/buddy/:matchId` | Anonymous pair/group chat | Agree, report/block, reliability label |
| `/plans/:matchId` | Mutually revealed plan | Limited profiles, meeting info, cancel |
| `/meetups/:matchId/check-in` | Post-event attendance response | Attended / did not meet / dispute |
| `/my-activities` | Own RSVPs, plans and history | Manage own actions |

**Style:** Welcoming, calm, approachable, mobile-first. Navy text, soft lilac and mint accents, neutral backgrounds, high-contrast controls, accessible input states. Avoid dating-app tropes, scary “safety scores,” or medical framing. Never use the word **verified safe** for a person/event.

---

## 7. Technical architecture

| Layer | Recommended choice | Purpose |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | Reusable modules and fast iteration |
| Styling | Tailwind + accessible components | Mobile-first UX |
| Hosting | Lovable / Vercel | Rapid previews and deployment |
| Identity | Supabase Auth | Confirmed university-email registration |
| Database | Supabase Postgres + RLS | Events, group membership, chat and outcomes |
| Live updates | Supabase Realtime | Chat and group/waiting changes |
| Trust-sensitive actions | `SECURITY DEFINER` RPCs with explicit checks | Matching, consent, reveals, scoring reads |
| AI (optional enhancement) | Server-side LLM endpoint | Icebreakers and optional prompts |
| Tests | Vitest, SQL policy checks, multi-browser E2E | Prove identity protections and matching |

**No service-role/API secrets in browser code.** RLS applies to tables, including realtime publications. Any `SECURITY DEFINER` function must authenticate the caller, validate authorisation, use a safe `search_path`, and restrict execute privileges. UI hiding alone does **not** protect identities.

### Suggested repository

```text
find-your-buddy/
├── README.md
├── prompt.md
├── .env.example
├── src/
│   ├── app/                   # Member 1: shell, routes, integration
│   ├── components/            # Member 1: shared UI
│   ├── lib/                   # Member 1: Supabase + contracts
│   ├── types/                 # Member 1: shared TypeScript models
│   └── features/
│       ├── onboarding/        # Member 2: interests and AI
│       ├── events/            # Member 3: activities and attendance counts
│       ├── matching/          # Member 4: queues and pair/group formation
│       └── chat/              # Member 5: messaging, consent, safety, reliability
├── supabase/
│   ├── migrations/
│   │   ├── 0001_foundation.sql    # Member 1
│   │   ├── 0002_events.sql        # Member 3
│   │   ├── 0003_matching.sql      # Member 4
│   │   └── 0004_chat_safety.sql   # Member 5
│   └── functions/
│       └── onboarding-ai/         # Member 2, if configured
└── tests/
```

### Shared data model (proposed, refine before coding)

| Table | Core fields / invariant |
| --- | --- |
| `universities` | `id`, `name`, admin-approved institutional `email_domain` / allowed aliases |
| `profiles` | `user_id` Auth FK, `university_id`, `display_name`, `avatar_url?`, `age_confirmed`, `student_verified`; identifying columns private |
| `interests`, `profile_interests` | Tags, ownership, per-interest opt-in sharing |
| `blocks` | `blocker_id`, `blocked_id`, unique pair, timestamps; secure checks |
| `events` | `id`, title, category, start/end, public venue, kind, visibility, source, host, review status |
| `event_rsvps` | unique event/user; going/withdrawn; **no roster access** |
| `event_ratings` (optional) | Authentic feedback only, unique eligible rater/event; no fabricated reviews |
| `buddy_requests` | `id`, event/user, `mode: pair\|group`, `requested_max_size` (3/4/5 for group), status, created_at; duplicate active requests blocked |
| `buddy_matches` | `id`, event, `mode`, `max_size`, `status: forming\|chatting\|locked\|revealed\|closed`, `membership_version`, timestamps |
| `buddy_match_members` | unique match/user; `pseudonym`, `joined_at`, `left_at?`; **2 for pair, 3–5 for active group chat** |
| `messages` | message ID, match ID, sender ID, content, timestamp; member-only read/insert |
| `buddy_agreements` | unique match/member/**membership_version**, `agreed_at`; must reset with group-membership changes |
| `reports` | reporter account, securely resolved target account or event, context, reason, timestamp, moderator-only investigation access |
| `meetup_outcomes` | match/member, timestamp, attendance feedback, supporting acknowledgements, status `pending\|resolved\|disputed\|excused`, reviewer reference |
| `reliability_adjustments` (optional) | audited moderator resolution/appeal records; no client-self-assigned penalties |

**Important:** Model **memberships as rows**, not only `user_a_id` and `user_b_id`, so both 1-on-1 and 3–5-person groups follow the same permission model. Each match is for exactly **one event**.

### Shared read models

```ts
type MatchMode = 'pair' | 'group';
type MatchStatus = 'forming' | 'chatting' | 'locked' | 'revealed' | 'closed';
type ReliabilityBand = 'new' | 'generally_reliable' | 'mixed' | 'repeated_verified_no_shows';

type EventSummary = {
  id: string;
  title: string;
  category: string;
  startsAt: string;
  venuePublic: string;
  kind: 'curated_public' | 'student_created';
  goingCount: number;
  universitiesRepresented?: number;
  reviewStatus: 'curated' | 'pending' | 'student_posted';
};

type BuddyMatchView = {
  id: string;
  eventId: string;
  mode: MatchMode;
  status: MatchStatus;
  memberCount: number;
  maxSize: number;
  membershipVersion: number;
  myPseudonym: string;
  participants: Array<{
    pseudonym: string;
    agreed: boolean;
    reliabilityBand: ReliabilityBand;
    // No real identity data before unanimous server-confirmed reveal.
  }>;
  revealedProfiles?: Array<{
    displayName: string;
    university: string;
    avatarUrl?: string;
  }>;
};
```

### Stable backend operation contracts

- `get_discoverable_events(filters)` → eligible event cards + anonymous aggregate counts.
- `rsvp_to_event(event_id, going)` → authenticated unique RSVP action.
- `request_buddy(event_id, mode, max_size?)` → waiting, pair, forming group, or active group; **atomic**.
- `cancel_buddy_request(event_id, mode)` → cancel own waiting request.
- `get_my_match(match_id)` → authorised pseudonyms, mode/count and coarse reliability statuses; no real identities before reveal.
- `send_message(match_id, body)` → active member-only message insertion.
- `agree_to_go(match_id, membership_version)` → per-member consent; lock on first agreement; unanimous reveal only for current version.
- `leave_match(match_id)` → member exit; invalidate outstanding group consent and apply formation rules.
- `get_revealed_profiles(match_id)` → authorised read only after unanimous valid consent.
- `cancel_confirmed_plan(match_id, reason?)` → explicit cancellation and notice to group/pair.
- `submit_meetup_outcome(match_id, outcome)` → own post-event response; no immediate unverified penalties.
- `get_reliability_summary(target_id, match_context)` → **coarse** allowed label; private self-summary via separate endpoint.
- `block_user(target_id, match_context)` / `report_user(...)` / `report_event(...)` → protected, auditable actions.

**Contracts must be finalised by Member 1 before parallel builds.** Never expose full `profiles` or `event_rsvps` SELECT permissions to unrelated users. Avoid client-driven match transitions.

---

## 8. Privacy, security and safeguards

- **Student-email restriction:** Confirmed email + server-side allowlist + school verification flag set only by trusted processes; do not rely on `.edu` regex or browser controls.
- **Realistic assurance:** Email domain alone cannot guarantee current enrolment or age; show 18+ self-attestation honestly.
- **Pseudonymity:** Both chat members and group members remain unidentified until unanimous consent. No identity leaks in API payloads, realtime messages, error text or analytics events.
- **Group privacy:** Require all **current members** to agree, bind consent to membership version, and re-consent on changes. Non-members cannot subscribe to chat or see member names.
- **Attendance-count privacy:** RSVP is a count, not a directory. Suppress narrow breakdowns; prevent participant enumeration.
- **Reporting/blocking:** Available before/after reveal; underlying target account IDs are resolved server-side for moderation, not exposed to peers. Block enforcement applies to waiting pools and active groups.
- **Reliability fairness:** No auto-penalty from one report; neutral early cancellations, appeals/review of late cancellations and emergencies, minimum sample size for numeric scores, explicit uncertainty and non-guarantee warnings.
- **First meetings:** Recommend public, staffed venues. No automatic contact-info sharing, GPS tracking or private-address publication.
- **Moderation honesty:** Report submission must work; do not imply live human moderation unless a real review process exists.
- **LLM controls:** Curated fallback, schema validation, rate limits, server-side secret management, no mental-health inference.
- **GDPR readiness:** Define privacy notice, retention/deletion, access controls and data subject workflows before public release. A hackathon prototype is not production certification.

---

## 9. Five-member hackathon execution

All members paste the shared **master prompt** plus their role prompt from [`PROMPT.md`](./PROMPT.md). Build one product in **one repository**, on separate branches, sharing one Supabase backend.

| Member | Owns | Deliverable |
| --- | --- | --- |
| **1 — Foundation & Integration** | `src/app/**`, `src/lib/**`, `src/types/**`, `0001_foundation.sql` | Email verification, private profiles, shared interfaces, integration & deploy |
| **2 — AI Onboarding** | `src/features/onboarding/**`, optional AI server function | Interests, optional AI icebreakers with deterministic fallback |
| **3 — Events & Attendance** | `src/features/events/**`, `0002_events.sql` | Public/private activities, authentic counts, validated event creation |
| **4 — Pair + Group Matching** | `src/features/matching/**`, `0003_matching.sql` | Atomic queue, 1-on-1 and group 3–5, group membership/versioning |
| **5 — Chat, Reveal & Trust** | `src/features/chat/**`, `0004_chat_safety.sql` | Realtime group/pair chat, unanimous reveal, report/block, reliability/outcomes |

**Dependencies:** Member 1 sets up auth/shared types first. Member 3 supplies events. Member 4 consumes events and foundation block rules. Member 5 consumes the shared `buddy_matches`/`buddy_match_members` model. Apply migrations **0001 → 0002 → 0003 → 0004**.

**Parallel development:** Use `feat/onboarding`, `feat/events`, `feat/matching`, and `feat/chat`. Agents must not independently rewrite root routing, shared auth, or other members' schema; use PRs and report API contracts to Member 1.

### Suggested 195-minute timebox

| Window | Main objective |
| --- | --- |
| 0–20 min | Scaffold, agree on shared tables/operations and demo accounts |
| 20–90 min | Parallel feature work: event creation, pair/group queues, onboarding, chat |
| 90–140 min | Integrate auth, group/pair permissions, realtime chat, consent and report/block |
| 140–170 min | Verify attendance/cancellation flow; attach AI prompts and reliability presentation |
| 170–195 min | Security regression checks, deploy, rehearse multi-browser demo |

**Cut scope honestly if needed:** Verified student access, real pair/group matching and private consent-based reveal are more important than polished analytics. If reliability review cannot be built safely, show neutral “Insufficient verified history” plus an explicitly simulated score example rather than penalising someone from unverified feedback.

---

## 10. Demo script (90–120 seconds)

Use **2 authentic separate sessions for a pair**, plus **3 or more separate authenticated test accounts** for a group (seeded and labelled demo if needed).

1. **Problem (0–15s):** “I want to go to a hackathon, but don't know anyone attending. And if I rely on one person, they might cancel.”
2. **Discovery (15–30s):** Browse a sample event and show only aggregate student attendance, never names.
3. **Mode selection (30–40s):** Choose **1-on-1**; show the visible no-show disclaimer. Switch to **group of 3–5** to explain the alternative.
4. **Matching (40–60s):** Three signed-in demo students select the same event and group mode. Chat opens only at three; all display distinct pseudonyms.
5. **Chat + consent (60–90s):** Exchange a real message. One or two students agree; **identities remain hidden**. The third agrees; limited profiles become visible to the group.
6. **Trust (90–105s):** Show the report/block controls and a **New / Not enough verified history** reliability label. Explain that advance cancellations are not treated as no-shows.
7. **Close (105–120s):** “Students can find company for real plans, chat without social pressure, and decide together—with no pretend attendance guarantees.”

For a faster fallback, demonstrate the fully tested pair flow in two windows and show group formation/reliability in a second short scene. **Do not fake the group match if the group backend is unfinished.**

---

## 11. Acceptance criteria

### Registration and privacy

- [ ] Gmail/outlook/personal emails are rejected by the backend; only confirmed institutional emails in the maintained allowlist can enter matching.
- [ ] Students from two configured universities can sign in; confirmation is verified server-side.
- [ ] Non-members cannot enumerate event RSVPs, profiles, chat messages, reports or private check-in outcomes.
- [ ] Age **18+** is self-attested; no false claim of documentary verification.

### Matching and profile reveal

- [ ] Pair request from A waits; B requests same event/mode → exactly one pair match.
- [ ] Group requests from A and B stay in `forming`; C joins → legitimate group chat at **3**; more than maximum (3/4/5) are never admitted.
- [ ] A pair does not accidentally match a group user; users from different events never match; blocked users never share a pair/group.
- [ ] **Pair 1/2:** no real profile in network data; **pair 2/2:** limited profiles visible only to members.
- [ ] **Group 2/3:** no real profiles; **group 3/3:** limited reveal; a membership change invalidates old consent and requires everyone in new group to agree.
- [ ] A third unrelated student cannot read chat or revealed profiles.
- [ ] Pseudonyms are match-specific and the UI never treats a waiting account as a real matched buddy.

### Reliability and safety

- [ ] One-on-one disclaimer is displayed before confirming request; group text still disclaims guarantees.
- [ ] New students do not start with a fabricated 100% reliability score.
- [ ] Advance cancellation does not decrease score; one unverified no-show report does not decrease score.
- [ ] Score remains unavailable when fewer than 3 resolved outcomes exist; the sample size/policy is clearly explained when available.
- [ ] Pending/disputed/emergency cases are neutral until reviewed/resolved.
- [ ] Report/block accessible before profile reveal and afterward; block prevents future matches and terminates inappropriate shared communication.
- [ ] Reporting a pseudonym resolves to the correct internal user for moderators without exposing identity to the reporter.
- [ ] Two-browser realtime messaging works; malicious markup isn't executed; unauthorised reads are denied.

---

## 12. Development and setup

> Replace placeholders with your team's actual repository, Supabase project and test commands during implementation.

**Prerequisites:** Node.js 20+, npm, one configured Supabase project. AI credentials are optional if using curated fallback questions.

```bash
npm install
cp .env.example .env.local
npm run dev
```

```dotenv
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

Deploy server-side functions with secrets managed on the host. The browser publishable key is usable only when authorization/RLS is correct. Migration setup order is **0001, 0002, 0003, 0004**. Populate a **maintained institutional email allowlist**; don't hardcode a few domains without a review process or silently whitelist arbitrary domains.

**Testing:** Use two browser sessions plus three for the group demo. Seed fictional events and resolved reliability examples marked **SYNTHETIC / DEMO**, not genuine user ratings or attendance. Never invent passing tests.

---

## 13. Product success measures and validation

- % of eligible students successfully verified and onboarded.
- % of event viewers who request a buddy.
- Time to real pair match / to reaching three group participants.
- % of matches reaching **unanimous** agreement.
- Opt-in post-event confirmation rate, advance-cancellation rate and **moderator-confirmed** no-show rate.
- Report/block frequency, dispute resolution time, repeat usage and drop-off.
- Small student interviews: “Have you skipped an activity because you had nobody to go with?” and “Would you prefer a pair or a 3–5-person group?”

A match or agreement is **not** proof people attended; success metrics must distinguish plans from confirmed real-world participation.

---

## 14. Project pitch

> “University life is full of things students want to do—but sometimes nobody to go with. **Find Your Buddy** turns an activity into a comfortable introduction. Choose a 1-on-1 buddy or a small group of 3–5, start with anonymous conversation and optional AI icebreakers, and only reveal profiles when everyone agrees. We also make attendance uncertainty honest through clear warnings, cancellation controls and fairly verified reliability history. **Plans first. People second. Consent always.**”

The entire app addresses **one real friction in student life: turning the intention to join an activity into a real, consent-based plan with other students.**

---

## 15. Project status

**Specification / hackathon prototype.** Update this section when implementation is complete: deployed URL, repository, screenshots, contributors, tested features and known limitations. Do not suggest that the app guarantees safety, attendance or medical outcomes.

See [`PROMPT.md`](./PROMPT.md) for the **master prompt and five role-specific copy/paste agent prompts**.
