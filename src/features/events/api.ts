// All event data flows through secure RPCs in 0002_events.sql. No direct table reads.
import { supabase } from "@/lib/supabase"; // shared client owned by Member 1
import type { EventDetail, EventFilters, MyActivity } from "./types";
import type { ActivityInput } from "./validation";

type Row = {
  id: string; title: string; description: string; category: string; starts_at: string;
  ends_at: string | null; venue_public: string; kind: EventDetail["kind"];
  visibility: EventDetail["visibility"]; source_url: string | null;
  review_status: EventDetail["reviewStatus"]; is_demo: boolean; is_host: boolean;
  going_count: number; universities_represented: number | null; i_am_going: boolean;
  rating_count: number; rating_avg: number | null;
};

const toDetail = (r: Row): EventDetail => ({
  id: r.id, title: r.title, description: r.description, category: r.category,
  startsAt: r.starts_at, endsAt: r.ends_at, venuePublic: r.venue_public, kind: r.kind,
  visibility: r.visibility, sourceUrl: r.source_url, reviewStatus: r.review_status,
  isDemo: r.is_demo, isHost: r.is_host, goingCount: r.going_count,
  universitiesRepresented: r.universities_represented ?? undefined,
  iAmGoing: r.i_am_going, ratingCount: r.rating_count,
  ratingAvg: r.rating_avg === null ? null : Number(r.rating_avg),
});

/** Date-only filters follow the student's local calendar, including the final day. */
function filterDate(value: string, endOfDay = false): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Choose a valid filter date.");
  return date.toISOString();
}

export async function listEvents(f: EventFilters = {}): Promise<EventDetail[]> {
  const { data, error } = await supabase.rpc("get_discoverable_events", {
    p_search: f.search?.trim() || null,
    p_category: f.category || null,
    ...(f.from ? { p_from: filterDate(f.from) } : {}),
    p_to: f.to ? filterDate(f.to, true) : null,
  });
  if (error) throw error;
  return (data as Row[]).map(toDetail);
}

export async function getEvent(id: string, invite?: string | null): Promise<EventDetail | null> {
  const { data, error } = await supabase.rpc("get_discoverable_events", {
    p_event_id: id, p_invite: invite ?? null,
  });
  if (error) throw error;
  const rows = data as Row[];
  return rows.length ? toDetail(rows[0]) : null;
}

export async function setGoing(id: string, going: boolean, invite?: string | null): Promise<number> {
  const { data, error } = await supabase.rpc("rsvp_to_event", {
    p_event_id: id, p_going: going, p_invite: invite ?? null,
  });
  if (error) throw error;
  return data as number;
}

export async function createActivity(a: ActivityInput) {
  const { data, error } = await supabase.rpc("create_activity", {
    p_title: a.title, p_description: a.description, p_category: a.category,
    p_starts_at: new Date(a.startsAt).toISOString(),
    p_ends_at: a.endsAt ? new Date(a.endsAt).toISOString() : null,
    p_venue_public: a.venuePublic, p_visibility: a.visibility,
  });
  if (error) throw error;
  const row = (data as { id: string; invite_hash: string | null }[])[0];
  return { id: row.id, inviteHash: row.invite_hash };
}

type MyRow = {
  id: string; title: string; starts_at: string; venue_public: string; visibility: MyActivity["visibility"];
  relation: MyActivity["relation"]; invite_hash: string | null; going_count: number;
};

export async function listMyActivities(): Promise<MyActivity[]> {
  const { data, error } = await supabase.rpc("get_my_activities");
  if (error) throw error;
  return (data as MyRow[]).map((r) => ({
    id: r.id, title: r.title, startsAt: r.starts_at, venuePublic: r.venue_public,
    visibility: r.visibility, relation: r.relation, inviteHash: r.invite_hash, goingCount: r.going_count,
  }));
}

export async function rateEvent(id: string, rating: number, comment?: string) {
  const { error } = await supabase.rpc("rate_event", { p_event_id: id, p_rating: rating, p_comment: comment ?? null });
  if (error) throw error;
}

/** Integration stub: wired to Member 5's protected report_event RPC (0004). */
export async function reportEvent(id: string, reason: string) {
  const { error } = await supabase.rpc("report_event", { p_event_id: id, p_reason: reason });
  if (error) throw error;
}
