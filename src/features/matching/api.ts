import { supabase } from "@/lib/supabase";
import type { BuddyMatchView, GroupMaxSize, MatchMode } from "@/types";

/** Result of request_buddy (0003). `queued` = honestly waiting, nobody found yet. */
export type BuddyRequestResult = {
  state: "queued" | "forming" | "matched";
  matchId?: string;
  memberCount?: number;
  maxSize?: number;
};

export type BuddyActivityState = "waiting" | "forming" | "chat" | "confirmed";

export type BuddyActivity = {
  state: BuddyActivityState;
  eventId: string;
  eventTitle: string;
  eventCategory: string;
  startsAt: string;
  venuePublic: string;
  mode: MatchMode;
  matchId: string | null;
  memberCount: number | null;
  maxSize: number;
  createdAt: string;
};

type BuddyActivityRow = {
  activity_state: BuddyActivityState;
  event_id: string;
  event_title: string;
  event_category: string;
  starts_at: string;
  venue_public: string;
  mode: MatchMode;
  match_id: string | null;
  member_count: number | null;
  max_size: number;
  created_at: string;
};

/** Caller's current buddy state for one event (get_my_buddy_status). */
export type BuddyStatus =
  | { state: "none" }
  | { state: "queued"; mode: MatchMode }
  | {
      state: "forming" | "matched";
      mode: MatchMode;
      matchId: string;
      matchStatus: BuddyMatchView["status"];
      memberCount: number;
      maxSize: number;
    };

/** Turns Postgres errors into short, honest messages for students. */
export function friendlyError(e: unknown): string {
  const err = e as { code?: string; message?: string } | null;
  const msg = err?.message ?? "Something went wrong.";
  if (err?.code === "42501" && /RSVP/i.test(msg)) return "Mark yourself as going to this event first.";
  if (err?.code === "42501") return "Only verified university students (18+) can use buddy matching.";
  if (err?.code === "P0002") return "This event could not be found.";
  return msg;
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const matchingApi = {
  requestBuddy: (eventId: string, mode: MatchMode, maxSize?: GroupMaxSize) =>
    call<BuddyRequestResult>("request_buddy", {
      p_event_id: eventId,
      p_mode: mode,
      p_max_size: mode === "group" ? (maxSize ?? 5) : null,
    }),
  cancelBuddyRequest: (eventId: string, mode: MatchMode) =>
    call<void>("cancel_buddy_request", { p_event_id: eventId, p_mode: mode }),
  leaveMatch: (matchId: string) => call<unknown>("leave_match", { p_match_id: matchId }),
  getMyMatch: (matchId: string) => call<BuddyMatchView>("get_my_match", { p_match_id: matchId }),
  getMyBuddyStatus: (eventId: string) => call<BuddyStatus>("get_my_buddy_status", { p_event_id: eventId }),
  getMyBuddyActivity: async (): Promise<BuddyActivity[]> => {
    const { data, error } = await supabase.rpc("get_my_buddy_activity");
    if (error) throw error;
    return ((data ?? []) as BuddyActivityRow[]).map((row) => ({
      state: row.activity_state,
      eventId: row.event_id,
      eventTitle: row.event_title,
      eventCategory: row.event_category,
      startsAt: row.starts_at,
      venuePublic: row.venue_public,
      mode: row.mode,
      matchId: row.match_id,
      memberCount: row.member_count,
      maxSize: row.max_size,
      createdAt: row.created_at,
    }));
  },
};

/** Subscribes to changes on the caller's own match row (RLS-filtered). Returns unsubscribe. */
export function subscribeToMatch(matchId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`buddy-match-${matchId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "buddy_matches", filter: `id=eq.${matchId}` }, onChange)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
