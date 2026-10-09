import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COPY } from "@/types";
import type { ChatMatchView, ChatMessage } from "../types";

const api = vi.hoisted(() => ({
  getMatch: vi.fn(), getMessages: vi.fn(), subscribe: vi.fn(() => () => {}),
  sendMessage: vi.fn(), agreeToGo: vi.fn(), leaveMatch: vi.fn(), myReliability: vi.fn(),
}));
vi.mock("../api", () => ({ chatApi: api }));

import { BuddyChat } from "../components/BuddyChat";

function view(over: Partial<ChatMatchView> = {}): ChatMatchView {
  return {
    id: "m1", eventId: "e1", mode: "group", status: "chatting", memberCount: 3, maxSize: 5, membershipVersion: 4,
    myPseudonym: "Teal Otter", agreedCount: 2, chatEnabled: true, iAgreed: true, myCheckIn: null,
    event: { title: "Hack night", startsAt: null, venuePublic: "Library" },
    participants: [
      { pseudonym: "Teal Otter", agreed: true, reliabilityBand: "new", isMe: true },
      { pseudonym: "Amber Fox", agreed: true, reliabilityBand: "generally_reliable", isMe: false },
      { pseudonym: "Quiet Heron", agreed: false, reliabilityBand: "new", isMe: false },
    ],
    ...over,
  };
}
const msgs: ChatMessage[] = [
  { id: "1", kind: "user", pseudonym: "Amber Fox", isOwn: false, body: "&lt;img src=x onerror=alert(1)&gt;", createdAt: "2026-01-01" },
];
const ui = () => render(<MemoryRouter><BuddyChat matchId="m1" /></MemoryRouter>);

describe("BuddyChat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows pseudonyms, N-of-M consent and the group notice; no reveal before N/N", async () => {
    api.getMatch.mockResolvedValue(view());
    api.getMessages.mockResolvedValue(msgs);
    ui();
    expect(await screen.findByText("2 of 3 agreed")).toBeInTheDocument();
    expect(screen.getAllByText(COPY.groupNotice).length).toBeGreaterThan(0);
    expect(screen.queryByText("Your buddies")).not.toBeInTheDocument();
    // escaped payload is rendered as inert text, never as an element
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img[src='x']")).toBeNull();
    expect(screen.getAllByText("Report").length).toBe(2);
  });

  it("shows the pair warning in one-on-one chats", async () => {
    api.getMatch.mockResolvedValue(view({ mode: "pair", memberCount: 2, participants: view().participants.slice(0, 2) }));
    api.getMessages.mockResolvedValue([]);
    ui();
    expect(await screen.findByText(COPY.pairWarning)).toBeInTheDocument();
  });

  it("keeps chat closed for a forming group and never loads messages", async () => {
    api.getMatch.mockResolvedValue(view({ status: "forming", chatEnabled: false, memberCount: 2 }));
    ui();
    expect(await screen.findByText(/Chat opens when 3 people are here/)).toBeInTheDocument();
    expect(api.getMessages).not.toHaveBeenCalled();
  });

  it("shows an honest error instead of demo data when the server refuses", async () => {
    api.getMatch.mockRejectedValue({ code: "42501", message: "not a member" });
    ui();
    await waitFor(() => expect(screen.getByText(/Couldn't open this chat/)).toBeInTheDocument());
  });
});
