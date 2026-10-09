import { describe, expect, it } from "vitest";
import { validateActivity, type ActivityInput } from "../validation";

const now = new Date("2026-10-10T12:00:00Z");
const ok: ActivityInput = {
  title: "Coffee before lectures", description: "", category: "coffee",
  startsAt: "2026-10-12T09:00", endsAt: "2026-10-12T10:00",
  venuePublic: "Library café entrance", visibility: "campus",
};

describe("validateActivity", () => {
  it("accepts a valid activity", () => expect(validateActivity(ok, now)).toEqual({}));
  it("rejects past start", () => expect(validateActivity({ ...ok, startsAt: "2026-10-01T09:00" }, now).startsAt).toBeTruthy());
  it("rejects end before start", () => expect(validateActivity({ ...ok, endsAt: "2026-10-12T08:00" }, now).endsAt).toBeTruthy());
  it("rejects private address hints", () => {
    expect(validateActivity({ ...ok, venuePublic: "My place, apartment 4" }, now).venuePublic).toBeTruthy();
    expect(validateActivity({ ...ok, venuePublic: "D02 X285" }, now).venuePublic).toBeTruthy();
  });
  it("rejects short title", () => expect(validateActivity({ ...ok, title: "hi" }, now).title).toBeTruthy());
});
