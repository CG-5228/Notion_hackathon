import { describe, expect, it } from "vitest";
import { reliabilityScore } from "../reliability";

const c = (a: number, l: number, n: number) => ({ confirmedAttended: a, upheldLateCancel: l, confirmedNoShow: n });

describe("reliabilityScore", () => {
  it("shows no number for 0, 1 or 2 resolved outcomes", () => {
    for (const counts of [c(0, 0, 0), c(1, 0, 0), c(1, 0, 1), c(2, 0, 0)]) {
      expect(reliabilityScore(counts)).toMatchObject({ score: null, band: "new" });
    }
  });
  it("applies the proposed formula from 3 outcomes", () => {
    expect(reliabilityScore(c(3, 0, 0))).toEqual({ score: 100, sample: 3, band: "generally_reliable" });
    expect(reliabilityScore(c(2, 1, 0)).score).toBe(83);
    expect(reliabilityScore(c(2, 0, 2))).toMatchObject({ score: 50, band: "repeated_verified_no_shows" });
    expect(reliabilityScore(c(2, 0, 1))).toMatchObject({ score: 67, band: "mixed" });
  });
});
