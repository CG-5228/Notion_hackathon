import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc },
}));

import { saveMyInterests } from "../store";

const interests = [
  { tag: "coffee" as const, shareable: true },
  { tag: "cinema" as const, shareable: false },
];

beforeEach(() => {
  mocks.getUser.mockReset().mockResolvedValue({ data: { user: { id: "alice" } }, error: null });
  mocks.rpc.mockReset().mockResolvedValue({ data: null, error: null });
});

describe("saveMyInterests", () => {
  it("sends only the current user's interest payload to the replacement RPC", async () => {
    await saveMyInterests("alice", interests);

    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("set_my_interests", {
      p_interests: [
        { slug: "coffee", share_on_reveal: true },
        { slug: "cinema", share_on_reveal: false },
      ],
    });
  });

  it("propagates RPC errors", async () => {
    const error = new Error("replacement failed");
    mocks.rpc.mockResolvedValueOnce({ data: null, error });

    await expect(saveMyInterests("alice", interests)).rejects.toBe(error);
  });

  it("rejects a caller identity that differs from the authenticated user", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "bob" } }, error: null });

    await expect(saveMyInterests("alice", interests)).rejects.toThrow(/signed-in account changed/i);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
