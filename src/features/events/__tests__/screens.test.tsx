import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import type { EventDetail } from "../types";

const api = vi.hoisted(() => ({
  listEvents: vi.fn(),
  getEvent: vi.fn(),
  setGoing: vi.fn(),
  createActivity: vi.fn(),
  listMyActivities: vi.fn(),
  reportEvent: vi.fn(),
  rateEvent: vi.fn(),
}));
vi.mock("../api", () => api);
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import { ActivityDetail } from "../ActivityDetail";
import { CreateActivity } from "../CreateActivity";
import { EventsFeed } from "../EventsFeed";

const event: EventDetail = {
  id: "ev1", title: "Cinema evening", category: "cinema", startsAt: "2026-10-20T19:00:00Z", venuePublic: "City-centre cinema lobby",
  kind: "curated_public", goingCount: 2, reviewStatus: "curated", description: "", endsAt: null, visibility: "public",
  sourceUrl: "https://example.org", isDemo: false, isHost: false, iAmGoing: false, ratingCount: 0, ratingAvg: null,
};

function at(path: string, ui: JSX.Element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path.split("?")[0]} element={ui} />
        <Route path="/events/:id" element={<p>EVENT PAGE</p>} />
        <Route path="/find-buddy/:id" element={<p>FIND BUDDY</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("EventsFeed", () => {
  it("lists events with anonymous going counts and links to the event page", async () => {
    api.listEvents.mockResolvedValue([event]);
    at("/", <EventsFeed />);
    expect(await screen.findByText("Cinema evening")).toBeInTheDocument();
    expect(screen.getByText(/2 students said they're going/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cinema evening"));
    expect(await screen.findByText("EVENT PAGE")).toBeInTheDocument();
  });
});

describe("ActivityDetail", () => {
  it("passes the invite hash from the URL, toggles RSVP and routes to the buddy selector", async () => {
    api.getEvent.mockResolvedValue(event);
    api.setGoing.mockResolvedValue(3);
    at("/events/ev1?invite=abc", <ActivityDetail eventId="ev1" />);
    expect(await screen.findByText("Cinema evening")).toBeInTheDocument();
    expect(api.getEvent).toHaveBeenCalledWith("ev1", "abc");
    fireEvent.click(screen.getByRole("button", { name: "I'm going" }));
    await waitFor(() => expect(api.setGoing).toHaveBeenCalledWith("ev1", true, "abc"));
    expect(await screen.findByText(/3 students said they're going/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Find your buddy/ }));
    expect(await screen.findByText("FIND BUDDY")).toBeInTheDocument();
  });
});

describe("CreateActivity", () => {
  it("validates on the client before calling the server", async () => {
    at("/activities/new", <CreateActivity />);
    fireEvent.click(screen.getByRole("button", { name: "Create activity" }));
    expect(await screen.findByText("Title must be 3–120 characters.")).toBeInTheDocument();
    expect(api.createActivity).not.toHaveBeenCalled();
  });
});
