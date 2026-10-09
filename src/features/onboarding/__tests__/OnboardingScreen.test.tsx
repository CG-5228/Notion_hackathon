import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingScreen } from "../OnboardingScreen";

const mocks = vi.hoisted(() => ({
  fetchAiIcebreakers: vi.fn(() => Promise.resolve(null)),
  loadMyInterests: vi.fn(() => Promise.resolve([{ tag: "coffee" as const, shareable: false }])),
}));

vi.mock("@/lib/auth", () => ({
  useSession: () => ({ session: { user: { id: "student-1" } } }),
}));
vi.mock("../ai", () => ({ fetchAiIcebreakers: mocks.fetchAiIcebreakers }));
vi.mock("../store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../store")>();
  return { ...actual, loadMyInterests: mocks.loadMyInterests };
});

describe("OnboardingScreen saved answers", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.fetchAiIcebreakers.mockReset();
    mocks.fetchAiIcebreakers.mockResolvedValue(null);
    mocks.loadMyInterests.mockReset();
    mocks.loadMyInterests.mockResolvedValue([{ tag: "coffee", shareable: false }]);
  });

  it("restores a saved answer when its icebreaker question is shown again", async () => {
    const userId = "student-1";
    localStorage.setItem(`fyb.onboarding.answers.${userId}`, JSON.stringify({
      userId,
      answers: [{
        questionId: "coffee",
        question: "Quick coffee between lectures or a long café chat?",
        answer: "Quick coffee",
      }],
    }));

    render(<MemoryRouter><OnboardingScreen /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("button", { name: "Coffee" })).toHaveAttribute("aria-pressed", "true"));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByRole("button", { name: "Quick coffee" })).toHaveAttribute("aria-pressed", "true");
  });
});
