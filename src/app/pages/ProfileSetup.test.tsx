import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MyProfile } from "@/types";
import { useSession } from "@/lib/auth";
import { updateMyProfile } from "@/lib/rpc";
import { ProfileSetup } from "./ProfileSetup";

vi.mock("@/lib/auth", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/rpc", () => ({ updateMyProfile: vi.fn() }));

const refreshProfile = vi.fn(async () => undefined);
const profile: MyProfile = {
  userId: "student-1",
  displayName: null,
  avatarUrl: null,
  ageConfirmed: false,
  studentVerified: true,
  universityId: "uni-1",
  universityName: "Trinity College Dublin",
  isDemo: false,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useSession).mockReturnValue({
    status: "needs_age",
    session: null,
    profile,
    configured: true,
    error: null,
    refreshProfile,
    signOut: vi.fn(async () => undefined),
  });
  vi.mocked(updateMyProfile).mockResolvedValue(undefined);
});

describe("ProfileSetup", () => {
  it("explains the privacy and self-attestation limits with labeled controls", () => {
    render(<ProfileSetup />);
    expect(screen.getByRole("heading", { level: 1, name: "A small step before the good plans." })).toBeVisible();
    expect(screen.getByText(/Your display name is only revealed to your match after everyone agrees/)).toBeInTheDocument();
    expect(screen.getAllByText(/Age 18\+ is self-declared/)).toHaveLength(2);
    expect(screen.getByLabelText("Display name")).toHaveAttribute("aria-describedby", "profile-name-hint");
    expect(screen.getByLabelText(/I confirm I am 18 or older/)).toHaveAttribute("aria-describedby", "profile-age-hint");
  });

  it("saves a trimmed display name after valid age confirmation", async () => {
    render(<ProfileSetup />);
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "  Riley  " } });
    fireEvent.click(screen.getByLabelText(/I confirm I am 18 or older/));
    fireEvent.submit(screen.getByRole("form", { name: "Complete your student profile" }));

    await waitFor(() => expect(updateMyProfile).toHaveBeenCalledWith({ displayName: "Riley", ageConfirmed: true }));
    expect(refreshProfile).toHaveBeenCalledTimes(1);
  });

  it("announces invalid display name and missing age confirmation without saving", () => {
    render(<ProfileSetup />);
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "   " } });
    fireEvent.submit(screen.getByRole("form", { name: "Complete your student profile" }));

    expect(screen.getByText("Enter a display name with at least 2 characters.")).toBeInTheDocument();
    expect(screen.getByText("Confirm that you are 18 or older to continue.")).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/I confirm I am 18 or older/)).toHaveAttribute("aria-invalid", "true");
    expect(updateMyProfile).not.toHaveBeenCalled();
  });

  it("surfaces save failures and leaves the form available to retry", async () => {
    vi.mocked(updateMyProfile).mockRejectedValueOnce(new Error("Profile service unavailable"));
    render(<ProfileSetup />);
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Riley" } });
    fireEvent.click(screen.getByLabelText(/I confirm I am 18 or older/));
    fireEvent.submit(screen.getByRole("form", { name: "Complete your student profile" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Profile service unavailable");
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(refreshProfile).not.toHaveBeenCalled();
  });

  it("does not let a previously saved age confirmation be silently changed", () => {
    vi.mocked(useSession).mockReturnValue({
      status: "needs_age",
      session: null,
      profile: { ...profile, ageConfirmed: true },
      configured: true,
      error: null,
      refreshProfile,
      signOut: vi.fn(async () => undefined),
    });
    render(<ProfileSetup />);
    expect(screen.getByLabelText(/I confirm I am 18 or older/)).toBeChecked();
    expect(screen.getByLabelText(/I confirm I am 18 or older/)).toBeDisabled();
    expect(screen.getByText("This self-declaration is already saved.")).toBeInTheDocument();
  });
});
