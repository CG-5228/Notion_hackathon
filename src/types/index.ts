/**
 * SHARED CONTRACT TYPES — owned by Member 1.
 * Members 2–5 import from "@/types". Propose changes to Member 1 before editing.
 * Pseudonymous participant shapes must NEVER carry real profile identifiers.
 */
export type MatchMode = "pair" | "group";
export type MatchStatus = "forming" | "chatting" | "locked" | "revealed" | "closed";
export type ReliabilityBand = "new" | "generally_reliable" | "mixed" | "repeated_verified_no_shows";
export type EventKind = "curated_public" | "student_created";
export type ReviewStatus = "curated" | "pending" | "student_posted";
export type GroupMaxSize = 3 | 4 | 5;
export type MeetupOutcome = "attended" | "did_not_meet" | "dispute_other";

export type EventSummary = {
  id: string;
  title: string;
  category: string;
  startsAt: string;
  venuePublic: string;
  kind: EventKind;
  goingCount: number;
  universitiesRepresented?: number;
  reviewStatus: ReviewStatus;
};

export type PseudonymousParticipant = {
  pseudonym: string;
  agreed: boolean;
  reliabilityBand: ReliabilityBand;
};

export type RevealedProfile = {
  displayName: string;
  university: string;
  avatarUrl?: string;
  sharedInterests?: string[];
};

export type BuddyMatchView = {
  id: string;
  eventId: string;
  mode: MatchMode;
  status: MatchStatus;
  memberCount: number;
  maxSize: number;
  membershipVersion: number;
  myPseudonym: string;
  participants: PseudonymousParticipant[];
  /** Present ONLY when status === 'revealed' (server-verified unanimous consent). */
  revealedProfiles?: RevealedProfile[];
};

/** Caller's OWN profile, returned by rpc('get_my_profile'). Never returned for other users. */
export type MyProfile = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  ageConfirmed: boolean;
  studentVerified: boolean;
  universityId: string | null;
  universityName: string | null;
  isDemo: boolean;
};

export type DomainCheck = { allowed: boolean; universityName: string | null; isDemo: boolean };

/** Product copy that MUST appear verbatim (see master prompt). */
export const COPY = {
  pairWarning:
    "We cannot guarantee your buddy will attend. They may cancel or not show up. Consider group matching if you'd prefer not to depend on one person.",
  groupNotice: "A group may reduce dependence on one person, but nobody's attendance is guaranteed.",
  reliabilityEmpty: "New / Not enough verified history",
  attendanceDisclaimer: "Attendance is never guaranteed. Scores reflect past verified outcomes only.",
  verificationLimit:
    "A confirmed university email shows you control a university account — not guaranteed current enrolment. Age 18+ is self-declared.",
  safetyTip: "Meet for the first time in a busy public place. Ratings are not proof that anyone or any event is safe.",
} as const;

export const GROUP_MIN_TO_CHAT = 3;
export const GROUP_SIZES: readonly GroupMaxSize[] = [3, 4, 5];
export const DEFAULT_GROUP_SIZE: GroupMaxSize = 5;
