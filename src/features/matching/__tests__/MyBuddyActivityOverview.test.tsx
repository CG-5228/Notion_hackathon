import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BuddyActivity } from "../api";
import { MyBuddyActivityOverview } from "../components/MyBuddyActivityOverview";

const { getMyBuddyActivity, subscribeToMatch } = vi.hoisted(() => ({
  getMyBuddyActivity: vi.fn(),
  subscribeToMatch: vi.fn(() => vi.fn()),
}));

vi.mock("../api", () => ({
  matchingApi: { getMyBuddyActivity },
  subscribeToMatch,
}));

const activities: BuddyActivity[] = [
  {
    state: "waiting", eventId: "event-waiting", eventTitle: "Coffee after class", eventCategory: "coffee",
    startsAt: "2030-01-02T15:00:00Z", venuePublic: "Campus café", mode: "pair", matchId: null,
    memberCount: null, maxSize: 2, createdAt: "2030-01-01T10:00:00Z",
  },
  {
    state: "forming", eventId: "event-forming", eventTitle: "Sunday market", eventCategory: "culture",
    startsAt: "2030-01-03T10:00:00Z", venuePublic: "Market entrance", mode: "group", matchId: "match-forming",
    memberCount: 2, maxSize: 5, createdAt: "2030-01-01T11:00:00Z",
  },
  {
    state: "chat", eventId: "event-chat", eventTitle: "Study break", eventCategory: "study",
    startsAt: "2030-01-04T12:00:00Z", venuePublic: "Library lobby", mode: "pair", matchId: "match-chat",
    memberCount: 2, maxSize: 2, createdAt: "2030-01-01T12:00:00Z",
  },
  {
    state: "confirmed", eventId: "event-confirmed", eventTitle: "Gallery afternoon", eventCategory: "culture",
    startsAt: "2030-01-05T14:00:00Z", venuePublic: "Gallery front desk", mode: "group", matchId: "match-confirmed",
    memberCount: 3, maxSize: 5, createdAt: "2030-01-01T13:00:00Z",
  },
];

describe("MyBuddyActivityOverview", () => {
  beforeEach(() => {
    getMyBuddyActivity.mockReset();
    subscribeToMatch.mockClear();
  });

  it("shows truthful request, forming, chat, and confirmed states with the correct destinations", async () => {
    getMyBuddyActivity.mockResolvedValue(activities);
    render(<MemoryRouter><MyBuddyActivityOverview /></MemoryRouter>);

    expect(await screen.findByText("Coffee after class")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Waiting requests" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Groups forming" })).toHaveTextContent("2 here");
    expect(screen.getByRole("region", { name: "Active chats" })).toHaveTextContent("Names stay hidden until everyone agrees.");
    expect(screen.getByRole("region", { name: "Confirmed plans" })).toHaveTextContent("Everyone agreed to meet");

    expect(screen.getByRole("link", { name: "View request" })).toHaveAttribute("href", "/find-buddy/event-waiting");
    expect(screen.getByRole("link", { name: "Check group" })).toHaveAttribute("href", "/find-buddy/event-forming");
    expect(screen.getByRole("link", { name: "Open chat" })).toHaveAttribute("href", "/buddy/match-chat");
    expect(screen.getByRole("link", { name: "View plan" })).toHaveAttribute("href", "/plans/match-confirmed");
    expect(screen.queryByText(/ReservedSlot|Awaiting integration/i)).not.toBeInTheDocument();
  });

  it("shows an honest empty state when the caller has no matching activity", async () => {
    getMyBuddyActivity.mockResolvedValue([]);
    render(<MemoryRouter><MyBuddyActivityOverview /></MemoryRouter>);

    expect(await screen.findByText("Your buddy requests, chats, and confirmed plans will appear here.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open chat" })).not.toBeInTheDocument();
  });

  it("handles RPC failures and retries without displaying backend details", async () => {
    getMyBuddyActivity.mockRejectedValueOnce(new Error("private database detail"));
    getMyBuddyActivity.mockResolvedValueOnce(activities);
    render(<MemoryRouter><MyBuddyActivityOverview /></MemoryRouter>);

    expect(await screen.findByRole("alert")).toHaveTextContent("temporarily unavailable");
    expect(screen.queryByText("private database detail")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByText("Coffee after class")).toBeInTheDocument());
  });

  it("explains when the matching migration is missing", async () => {
    getMyBuddyActivity.mockRejectedValueOnce(Object.assign(
      new Error("Could not find function public.get_my_buddy_activity in the schema cache"),
      { code: "PGRST202" },
    ));
    render(<MemoryRouter><MyBuddyActivityOverview /></MemoryRouter>);

    expect(await screen.findByRole("alert")).toHaveTextContent("backend setup is incomplete");
    expect(screen.getByRole("alert")).toHaveTextContent("apply the latest database migrations");
  });
});
