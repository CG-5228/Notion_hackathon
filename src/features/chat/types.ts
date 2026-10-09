import type { BuddyMatchView, MeetupOutcome, ReliabilityBand } from "@/types";

/** get_my_match / agree_to_go response: the shared BuddyMatchView plus chat-only fields.
 *  Still pseudonym-only; `revealedProfiles` is present only after server-verified N/N consent. */
export type ChatParticipant = BuddyMatchView["participants"][number] & { isMe: boolean };

export type ChatMatchView = Omit<BuddyMatchView, "participants"> & {
  agreedCount: number;
  chatEnabled: boolean;
  iAgreed: boolean;
  myCheckIn: MeetupOutcome | null;
  event: { title: string | null; startsAt: string | null; venuePublic: string | null };
  participants: ChatParticipant[];
};

export type ChatMessage = {
  id: string;
  kind: "user" | "system";
  pseudonym: string | null;
  isOwn: boolean;
  /** HTML-escaped by the server; decode with decodeEntities() and render as text only. */
  body: string;
  createdAt: string;
};

export type ReliabilityCounts = {
  confirmedAttended: number;
  upheldLateCancel: number;
  confirmedNoShow: number;
};

export type MyReliability = ReliabilityCounts & {
  band: ReliabilityBand;
  sampleCount: number;
  score: number | null;
  pendingReview: number;
};

export type ReportReason =
  | "harassment" | "inappropriate_content" | "impersonation" | "safety_concern" | "spam" | "other";

export const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate_content", label: "Inappropriate messages" },
  { value: "impersonation", label: "Pretending to be someone else" },
  { value: "safety_concern", label: "I feel unsafe" },
  { value: "spam", label: "Spam or scam" },
  { value: "other", label: "Something else" },
];
