import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { COPY } from "@/types";

const api = vi.hoisted(() => ({
  requestBuddy: vi.fn(),
  cancelBuddyRequest: vi.fn(),
  leaveMatch: vi.fn(),
  getMyMatch: vi.fn(),
  getMyBuddyStatus: vi.fn(),
}));
vi.mock("../api", async (orig) => ({
  ...(await orig<typeof import("../api")>()),
  matchingApi: api,
  subscribeToMatch: () => () => {},
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import { BuddyRequestPanel } from "../components/BuddyRequestPanel";

function renderPanel() {
  return render(
    <MemoryRouter initialEntries={["/find-buddy/ev1"]}>
      <Routes>
        <Route path="/find-buddy/:id" element={<BuddyRequestPanel eventId="ev1" />} />
        <Route path="/buddy/:matchId" element={<p>CHAT SCREEN</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("BuddyRequestPanel", () => {
  it("shows both mode cards with the mandatory warning copy before any request", async () => {
    api.getMyBuddyStatus.mockResolvedValue({ state: "none" });
    renderPanel();
    expect(await screen.findByText("One-on-One")).toBeInTheDocument();
    expect(screen.getByText("Group")).toBeInTheDocument();
    expect(screen.getByText(COPY.pairWarning)).toBeInTheDocument();
    expect(screen.getAllByText(COPY.groupNotice).length).toBeGreaterThan(0);
    expect(api.requestBuddy).not.toHaveBeenCalled();
  });

  it("requires acknowledging the risk before requesting, and sends the chosen group cap", async () => {
    api.getMyBuddyStatus.mockResolvedValue({ state: "none" });
    api.requestBuddy.mockResolvedValue({ state: "forming", matchId: "m1" });
    renderPanel();
    fireEvent.click(await screen.findByRole("radio", { name: /Group/ }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    const go = screen.getByRole("button", { name: /Find a group \(max 3\)/ });
    expect(go).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(go);
    await waitFor(() => expect(api.requestBuddy).toHaveBeenCalledWith("ev1", "group", 3));
  });

  it("defaults group size to 5", async () => {
    api.getMyBuddyStatus.mockResolvedValue({ state: "none" });
    renderPanel();
    fireEvent.click(await screen.findByRole("radio", { name: /Group/ }));
    expect(screen.getByRole("button", { name: "5" })).toHaveAttribute("aria-pressed", "true");
  });

  it("waiting state does not pretend a buddy exists", async () => {
    api.getMyBuddyStatus.mockResolvedValue({ state: "queued", mode: "pair" });
    renderPanel();
    expect(await screen.findByText("Waiting for a buddy")).toBeInTheDocument();
    expect(screen.getByText(/never invent people/)).toBeInTheDocument();
    expect(screen.queryByText("CHAT SCREEN")).not.toBeInTheDocument();
  });

  it("a forming group of 2 stays out of chat", async () => {
    api.getMyBuddyStatus.mockResolvedValue({ state: "forming", mode: "group", matchId: "m1", matchStatus: "forming", memberCount: 2, maxSize: 5 });
    renderPanel();
    expect(await screen.findByTestId("member-count")).toHaveTextContent("2");
    expect(screen.getByText(/1 more needed/)).toBeInTheDocument();
    expect(screen.queryByText("CHAT SCREEN")).not.toBeInTheDocument();
  });

  it("routes to /buddy/:matchId once a pair is matched", async () => {
    api.getMyBuddyStatus.mockResolvedValue({ state: "matched", mode: "pair", matchId: "m9", matchStatus: "chatting", memberCount: 2, maxSize: 2 });
    renderPanel();
    expect(await screen.findByText("CHAT SCREEN")).toBeInTheDocument();
  });

  it("cancel calls the server and returns to mode selection", async () => {
    api.getMyBuddyStatus.mockResolvedValueOnce({ state: "queued", mode: "pair" }).mockResolvedValue({ state: "none" });
    api.cancelBuddyRequest.mockResolvedValue(undefined);
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Cancel request" }));
    await waitFor(() => expect(api.cancelBuddyRequest).toHaveBeenCalledWith("ev1", "pair"));
    expect(await screen.findByText("One-on-One")).toBeInTheDocument();
  });
});
