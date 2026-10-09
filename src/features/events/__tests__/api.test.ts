import { beforeEach, describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }));
import { createActivity, listEvents, listMyActivities, reportEvent, setGoing } from "../api";
beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: [], error: null }); });
describe("event API date filters", () => {
  it("includes the selected final day's evening in the local calendar", async () => {
    await listEvents({ from: "2026-10-20", to: "2026-10-20" });
    const args = rpc.mock.calls[0]?.[1];
    expect(args.p_from).toBe(new Date(2026, 9, 20, 0, 0, 0, 0).toISOString());
    expect(args.p_to).toBe(new Date(2026, 9, 20, 23, 59, 59, 999).toISOString());
    expect(new Date(args.p_to).getTime()).toBeGreaterThan(new Date(2026, 9, 20, 19).getTime());
  });
  it("preserves an explicit timestamp", async () => {
    await listEvents({ to: "2026-10-20T16:00:00Z" });
    expect(rpc).toHaveBeenCalledWith("get_discoverable_events", expect.objectContaining({ p_to: "2026-10-20T16:00:00.000Z" }));
  });
  it("rejects invalid dates without making a request", async () => {
    await expect(listEvents({ to: "not-a-date" })).rejects.toThrow("Choose a valid filter date.");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("leaves unspecified dates to the server defaults", async () => {
    await listEvents();
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_from");
    expect(rpc.mock.calls[0]?.[1].p_to).toBeNull();
  });
  it("keeps the RSVP count contract and optional invite argument", async () => {
    rpc.mockResolvedValue({ data: 3, error: null });
    expect(await setGoing("event-id", true, "invite-token")).toBe(3);
    expect(rpc).toHaveBeenCalledWith("rsvp_to_event", { p_event_id: "event-id", p_going: true, p_invite: "invite-token" });
  });
});

describe("event backend contracts", () => {
  it("sends a valid report category and preserves the student's explanation", async () => {
    rpc.mockResolvedValue({ data: { received: true }, error: null });
    await reportEvent("event-id", "  Venue is a private residence  ");
    expect(rpc).toHaveBeenCalledWith("report_event", {
      p_event_id: "event-id", p_reason: "other", p_details: "Venue is a private residence",
    });
  });

  it("does not swallow a failed report", async () => {
    const error = { code: "42501", message: "Verified student account required" };
    rpc.mockResolvedValue({ data: null, error });
    await expect(reportEvent("event-id", "Unsafe venue")).rejects.toBe(error);
  });

  it("uses the real activity creation signature and preserves the private invite link", async () => {
    rpc.mockResolvedValue({ data: [{ id: "new-activity", invite_hash: "private-invite" }], error: null });
    await expect(createActivity({
      title: "Campus coffee", description: "Meet at the café", category: "coffee",
      startsAt: "2099-10-20T12:00:00Z", endsAt: "", venuePublic: "Library café", visibility: "invite_only",
    })).resolves.toEqual({ id: "new-activity", inviteHash: "private-invite" });
    expect(rpc).toHaveBeenCalledWith("create_activity", {
      p_title: "Campus coffee", p_description: "Meet at the café", p_category: "coffee",
      p_starts_at: "2099-10-20T12:00:00.000Z", p_ends_at: null,
      p_venue_public: "Library café", p_visibility: "invite_only",
    });
  });

  it("loads only the current student's activity RPC without a user ID argument", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(listMyActivities()).resolves.toEqual([]);
    expect(rpc).toHaveBeenCalledWith("get_my_activities");
  });
});
