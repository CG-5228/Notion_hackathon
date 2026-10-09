import type { Session } from "@supabase/supabase-js";
import { deriveStatus } from "./auth";
import type { MyProfile } from "@/types";

const s = {} as Session;
const p = (o: Partial<MyProfile>): MyProfile => ({ userId: "u", displayName: "A", avatarUrl: null, ageConfirmed: true,
  studentVerified: true, universityId: "x", universityName: "TCD", isDemo: false, ...o });

describe("deriveStatus", () => {
  it("gates on server-reported verification and age", () => {
    expect(deriveStatus(null, null, true)).toBe("loading");
    expect(deriveStatus(null, null, false)).toBe("signed_out");
    expect(deriveStatus(s, null, false)).toBe("unverified");
    expect(deriveStatus(s, p({ studentVerified: false }), false)).toBe("unverified");
    expect(deriveStatus(s, p({ ageConfirmed: false }), false)).toBe("needs_age");
    expect(deriveStatus(s, p({}), false)).toBe("ready");
  });
});
