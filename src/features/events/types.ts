// Local types for the events feature. EventSummary mirrors the shared contract
// (Member 1 owns src/types); swap to that import once it lands.
export type EventKind = "curated_public" | "student_created";
export type Visibility = "public" | "campus" | "invite_only";
export type ReviewStatus = "curated" | "pending" | "student_posted";

export const CATEGORIES = [
  "hackathon", "groceries", "cinema", "coffee", "society", "sport", "study", "culture", "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

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

export type EventDetail = EventSummary & {
  description: string;
  endsAt: string | null;
  visibility: Visibility;
  sourceUrl: string | null;
  isDemo: boolean;
  isHost: boolean;
  iAmGoing: boolean;
  ratingCount: number;
  ratingAvg: number | null;
};

export type EventFilters = {
  search?: string;
  category?: Category | "";
  from?: string;
  to?: string;
};

export type MyActivity = {
  id: string;
  title: string;
  startsAt: string;
  venuePublic: string;
  visibility: Visibility;
  relation: "hosting" | "going";
  inviteHash: string | null;
  goingCount: number;
};
