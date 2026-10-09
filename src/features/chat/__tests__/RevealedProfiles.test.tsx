import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RevealedProfile } from "@/types";
import { RevealedProfiles } from "../components/RevealedProfiles";

const longUnbrokenName = "Asterion".repeat(12);
const profiles: RevealedProfile[] = [
  {
    displayName: "Nia Calder",
    university: "Westmere Polytechnic",
    sharedInterests: ["bouldering", "indie games"],
  },
  {
    displayName: "Omar Vance",
    university: "Lantern Coast University",
    avatarUrl: "https://images.example.test/omar.png",
    sharedInterests: ["ceramics", "birding"],
  },
  {
    displayName: longUnbrokenName,
    university: "Northfen Institute for Civic Engineering",
    sharedInterests: ["urban gardens", "tabletop games"],
  },
];

describe("RevealedProfiles", () => {
  it("shows every buddy's full profile with an initial or supplied photo avatar", () => {
    const { container } = render(<RevealedProfiles profiles={profiles} />);
    const list = screen.getByRole("list", { name: "Revealed buddy profiles" });
    const cards = within(list).getAllByRole("listitem");

    expect(cards).toHaveLength(profiles.length);
    for (const profile of profiles) {
      expect(screen.getByText(profile.displayName, { exact: true })).toBeInTheDocument();
      expect(screen.getByText(profile.university, { exact: true })).toBeInTheDocument();
      expect(screen.getByText(`Into: ${profile.sharedInterests?.join(", ")}`, { exact: true })).toBeInTheDocument();
    }

    expect(within(cards[0]).getByText("N", { exact: true })).toHaveAttribute("aria-hidden", "true");
    const photo = cards[1].querySelector("img");
    expect(photo).toHaveAttribute("src", profiles[1].avatarUrl);
    expect(photo).toHaveAttribute("alt", "");
    expect(within(cards[2]).getByText(longUnbrokenName[0], { exact: true })).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("keeps the honest empty state when there are no other profiles", () => {
    render(<RevealedProfiles profiles={[]} />);

    expect(screen.getByText("No other members remain in this plan.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Revealed buddy profiles" })).not.toBeInTheDocument();
  });
});
