import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

beforeEach(() => vi.resetAllMocks());

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
  it("withdraws an RSVP and updates the count", async () => {
    api.getEvent.mockResolvedValue({ ...event, iAmGoing: true });
    api.setGoing.mockResolvedValue(1);
    at("/events/ev1", <ActivityDetail eventId="ev1" />);
    fireEvent.click(await screen.findByRole("button", { name: "✓ I'm going" }));
    expect(await screen.findByText(/1 student said they're going/)).toBeInTheDocument();
    expect(api.setGoing).toHaveBeenCalledWith("ev1", false, null);
  });

  it("does not fabricate absent ratings and displays a safety note", async () => {
    api.getEvent.mockResolvedValue(event);
    at("/events/ev1", <ActivityDetail eventId="ev1" />);
    await screen.findByText("Cinema evening");
    expect(screen.queryByText(/^Rated /)).not.toBeInTheDocument();
    expect(screen.getByText("Participant ratings do not establish real-world safety.")).toBeInTheDocument();
  });

  it("shows ratings only from supplied records", async () => {
    api.getEvent.mockResolvedValue({ ...event, ratingCount: 2, ratingAvg: 4.5 });
    at("/events/ev1", <ActivityDetail eventId="ev1" />);
    expect(await screen.findByText("Rated 4.5/5 from 2 participant ratings.")).toBeInTheDocument();
  });

  it("does not reveal an inaccessible event", async () => {
    api.getEvent.mockResolvedValue(null);
    at("/events/ev1", <ActivityDetail eventId="ev1" />);
    expect(await screen.findByText("This activity isn't available to you.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Find your buddy/ })).not.toBeInTheDocument();
  });

  async function openReport() {
    api.getEvent.mockResolvedValue(event);
    at("/events/ev1", <ActivityDetail eventId="ev1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Report this event" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Report reason" }), { target: { value: "Venue is a private residence" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send report" })); });
  }

  it("reports success only after confirmation and prevents duplicate submission", async () => {
    let complete: (() => void) | undefined;
    api.reportEvent.mockImplementation(() => new Promise<void>((resolve) => { complete = resolve; }));
    await openReport();
    expect(screen.getByRole("button", { name: "Sending report…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Sending report…" }));
    expect(api.reportEvent).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Report submitted privately/)).not.toBeInTheDocument();
    await act(async () => { complete?.(); });
    expect(await screen.findByText(/Report submitted privately/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Report reason" })).not.toBeInTheDocument();
  });

  it.each(["PGRST202", "42883"])("identifies missing report operation (%s)", async (code) => {
    api.reportEvent.mockRejectedValue({ code });
    await openReport();
    expect(await screen.findByText("Reporting is not connected yet. Your report has not been sent.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Report reason" })).toHaveValue("Venue is a private residence");
  });

  it("keeps failed report text for retry without claiming reporting is disconnected", async () => {
    api.reportEvent.mockRejectedValueOnce({ code: "42501" }).mockResolvedValueOnce(undefined);
    await openReport();
    expect(await screen.findByText(/Your report could not be sent/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Report reason" })).toHaveValue("Venue is a private residence");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send report" })); });
    expect(await screen.findByText(/Report submitted privately/)).toBeInTheDocument();
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
