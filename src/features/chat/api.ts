import { supabase } from "@/lib/supabase";
import type { MeetupOutcome, ReliabilityBand, RevealedProfile } from "@/types";
import type { ChatMatchView, ChatMessage, MyReliability, ReportReason } from "./types";

/** Typed wrappers for 0004 RPCs. There is NO offline/mock fallback: if the backend is
 *  unavailable, callers show an error state instead of invented chats or people. */
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const chatApi = {
  getMatch: (matchId: string) => rpc<ChatMatchView>("get_my_match", { p_match_id: matchId }),
  getMessages: (matchId: string) => rpc<ChatMessage[]>("get_match_messages", { p_match_id: matchId, p_limit: 100 }),
  sendMessage: (matchId: string, body: string) => rpc<ChatMessage>("send_message", { p_match_id: matchId, p_body: body }),
  agreeToGo: (matchId: string, membershipVersion: number) =>
    rpc<ChatMatchView>("agree_to_go", { p_match_id: matchId, p_membership_version: membershipVersion }),
  /** Member 4's RPC — used for "Not for me / leave". */
  leaveMatch: (matchId: string) => rpc<void>("leave_match", { p_match_id: matchId }),
  getRevealedProfiles: (matchId: string) => rpc<RevealedProfile[]>("get_revealed_profiles", { p_match_id: matchId }),
  cancelPlan: (matchId: string, reason?: string) =>
    rpc<{ kind: "advance_cancel" | "late_cancel"; message: string }>("cancel_confirmed_plan", {
      p_match_id: matchId, p_reason: reason?.trim() || null,
    }),
  submitOutcome: (matchId: string, outcome: MeetupOutcome) =>
    rpc<{ recorded: MeetupOutcome; message: string }>("submit_meetup_outcome", { p_match_id: matchId, p_outcome: outcome }),
  reliabilitySummary: (pseudonym: string, matchId: string) =>
    rpc<{ band: ReliabilityBand; sampleCount: number }>("get_reliability_summary", {
      p_target_pseudonym: pseudonym, p_match_id: matchId,
    }),
  myReliability: () => rpc<MyReliability>("get_my_reliability"),
  blockUser: (pseudonym: string, matchId: string) =>
    rpc<{ blocked: true; youLeftMatch: boolean; matchStatus: string }>("block_user", {
      p_target_pseudonym: pseudonym, p_match_id: matchId,
    }),
  reportUser: (pseudonym: string, matchId: string, reason: ReportReason, details?: string) =>
    rpc<{ received: true }>("report_user", {
      p_target_pseudonym: pseudonym, p_match_id: matchId, p_reason: reason, p_details: details?.trim() || null,
    }),
  reportEvent: (eventId: string, reason: ReportReason | "misleading_event", details?: string) =>
    rpc<{ received: true }>("report_event", { p_event_id: eventId, p_reason: reason, p_details: details?.trim() || null }),

  /** Realtime: match_activity carries only (match_id, tick). RLS limits it to active members,
   *  so removed/blocked members stop receiving signals. On each signal, re-read via RPC. */
  subscribe(matchId: string, onSignal: () => void) {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_activity", filter: `match_id=eq.${matchId}` }, onSignal)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  },
};

export type ChatApi = typeof chatApi;
