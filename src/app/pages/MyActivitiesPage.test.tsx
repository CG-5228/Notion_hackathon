import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { MyActivitiesPage } from "./MyActivitiesPage";

vi.mock("@/features/events", () => ({
  MyActivities: () => <section aria-label="Saved activities">Your saved activities</section>,
}));

vi.mock("@/features/matching", () => ({
  MyBuddyActivityOverview: () => <section aria-label="Your matches and plans">Matching overview</section>,
}));

describe("MyActivitiesPage", () => {
  it("keeps the polished plans header alongside the events activities list", () => {
    render(<MemoryRouter><MyActivitiesPage /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "My plans", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Something to look forward to")).toBeInTheDocument();
    expect(screen.getByText("Your next good thing, all in one place.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New activity" })).toHaveAttribute("href", "/activities/new");
    expect(screen.getByRole("region", { name: "Saved activities" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your matches and plans" })).toBeInTheDocument();
    expect(screen.queryByText(/awaiting integration/i)).not.toBeInTheDocument();
  });
});
