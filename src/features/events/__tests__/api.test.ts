import { beforeEach, describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }));
import { listEvents, setGoing } from "../api";
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
