import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { useSession } from "@/lib/auth";
import type { MyProfile } from "@/types";
import { AppShell } from "./AppShell";

vi.mock("@/lib/auth", () => ({ useSession: vi.fn() }));

const studentSession: Session = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: {
    id: "test-student",
    aud: "authenticated",
    created_at: "2026-10-09T00:00:00Z",
    app_metadata: {},
    user_metadata: {},
  },
};

function showShell(overrides: Partial<ReturnType<typeof useSession>> = {}) {
  vi.mocked(useSession).mockReturnValue({ status: "ready", configured: true, session: null, profile: null, error: null, refreshProfile: vi.fn(), signOut: vi.fn(), ...overrides });
  return render(<MemoryRouter><AppShell /></MemoryRouter>);
}

describe("demo account labelling", () => {
  it("clearly labels a server-reported demo profile", () => {
    showShell({ profile: { isDemo: true } as MyProfile });
    expect(screen.getByRole("alert")).toHaveTextContent("Demo account · synthetic student");
    expect(screen.getByRole("alert")).toHaveTextContent("email ownership and student identity have not been verified");
  });

  it("keeps the label while a trusted demo session's profile loads", () => {
    showShell({ status: "loading", session: { ...studentSession, user: { ...studentSession.user, app_metadata: { fyb_demo: true } } } });
    expect(screen.getByRole("alert")).toHaveTextContent("Demo account · synthetic student");
  });

  it("does not trust a user-editable demo marker", () => {
    showShell({ session: { ...studentSession, user: { ...studentSession.user, user_metadata: { fyb_demo: true } } } });
    expect(screen.queryByText("Demo account · synthetic student")).not.toBeInTheDocument();
  });

  it("makes sign-out failures actionable rather than pretending the account is signed out", async () => {
    const signOut = vi.fn().mockRejectedValue(new Error("Offline"));
    showShell({ signOut });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't sign you out. Please try again.");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });
});
