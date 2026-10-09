// =============================================================================
// Shared & Chat Feature Types
// =============================================================================

export type MatchMode = 'pair' | 'group';
export type MatchStatus = 'forming' | 'chatting' | 'locked' | 'revealed' | 'closed';
export type ReliabilityBand = 'new' | 'generally_reliable' | 'mixed' | 'repeated_verified_no_shows';

export type EventSummary = {
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

export type BuddyMatchParticipant = {
  pseudonym: string;
  agreed: boolean;
  reliabilityBand: ReliabilityBand;
};

export type RevealedProfile = {
  pseudonym?: string;
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
  participants: Array<BuddyMatchParticipant>;
  revealedProfiles?: Array<RevealedProfile>;
  eventSummary?: EventSummary;
};

export type ChatMessage = {
  id: string;
  matchId: string;
  senderPseudonym: string;
  isOwn: boolean;
  body: string;
  createdAt: string;
};

export type ReliabilitySummary = {
  band: ReliabilityBand;
  score: number | null; // null if sample_size < 3
  sampleSize: number;
  confirmedAttended?: number;
  upheldLateCancel?: number;
  confirmedNoShow?: number;
  label: string;
  disclaimer: string;
};

export type ReportReason =
  | 'harassment'
  | 'inappropriate_content'
  | 'impersonation'
  | 'safety_concern'
  | 'no_show_suspicion'
  | 'spam'
  | 'other';

export type MeetupOutcomeKind =
  | 'attended'
  | 'did_not_meet'
  | 'dispute'
  | 'late_cancel'
  | 'advance_cancel';

export type MeetupOutcomeResolution =
  | 'pending'
  | 'resolved'
  | 'disputed'
  | 'excused';

export interface ConsentResult {
  success: boolean;
  matchId: string;
  status: MatchStatus;
  agreedCount: number;
  totalMembers: number;
  isRevealed: boolean;
  membershipVersion: number;
  error?: string;
  message?: string;
}
