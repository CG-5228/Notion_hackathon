// Local types for the events feature. EventSummary is the shared contract (Member 1, "@/types").
import type { EventSummary } from "@/types";

export type { EventSummary };
export type Visibility = "public" | "campus" | "invite_only";

export const CATEGORIES = [
  "hackathon", "groceries", "cinema", "coffee", "society", "sport", "study", "culture", "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

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
