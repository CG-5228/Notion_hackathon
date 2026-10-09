import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { useSession } from "@/lib/auth";
import { RequireStudent } from "./RequireStudent";
import { AppRoutes } from "./routes";

vi.mock("@/lib/auth", () => ({ useSession: vi.fn() }));
vi.mock("./pages/ProfileSetup", () => ({ ProfileSetup: () => <h1>Complete your private profile</h1> }));
vi.mock("@/features/onboarding", () => ({ OnboardingScreen: () => <h1>Private interest onboarding</h1> }));

const refreshProfile = vi.fn();
const signOut = vi.fn();

function session(overrides: Partial<ReturnType<typeof useSession>> = {}) {
  vi.mocked(useSession).mockReturnValue({ status: "ready", configured: true, session: null, profile: null, error: null, refreshProfile, signOut, ...overrides });
}

function Location() {
  const location = useLocation();
  return <output aria-label="Current location">{location.pathname}{location.search}{location.hash}</output>;
}

function renderGate(path = "/events/example") {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/events/:id" element={<RequireStudent><h1>Private member feature</h1></RequireStudent>} /><Route path="/auth" element={<h1>Student sign in</h1>} /></Routes><Location /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  refreshProfile.mockResolvedValue(undefined);
  signOut.mockResolvedValue(undefined);
  session();
});

describe("student route gate", () => {
  it("does not grant access without the shared backend", () => {
    session({ configured: false });
    renderGate();
    expect(screen.getByRole("heading", { name: "Student spaces are getting ready." })).toBeInTheDocument();
    expect(screen.queryByText("Private member feature")).not.toBeInTheDocument();
  });

  it("preserves the full requested destination when redirecting signed-out students", async () => {
    session({ status: "signed_out" });
    renderGate("/events/example?view=details#meeting-point");
    await waitFor(() => expect(screen.getByLabelText("Current location")).toHaveTextContent(`/auth?next=${encodeURIComponent("/events/example?view=details#meeting-point")}`));
    expect(screen.queryByText("Private member feature")).not.toBeInTheDocument();
  });

  it("offers retry for a profile loading error instead of rejecting eligibility", async () => {
    session({ status: "unverified", error: "Network request failed" });
    renderGate();
    expect(screen.getByText(/not a decision about your eligibility/)).toBeInTheDocument();
    expect(screen.queryByText("Let's verify your student email.")).not.toBeInTheDocument();
    expect(screen.queryByText("Private member feature")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));
  });

  it("shows a failed retry without unlocking the feature", async () => {
    session({ error: "Session unavailable" });
    refreshProfile.mockRejectedValueOnce(new Error("Still offline"));
    renderGate();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We still couldn't check your account");
    expect(screen.queryByText("Private member feature")).not.toBeInTheDocument();
  });

  it("keeps sign-out failures actionable for unverified accounts", async () => {
    session({ status: "unverified" });
    signOut.mockRejectedValueOnce(new Error("Offline"));
    renderGate();
    fireEvent.click(screen.getByRole("button", { name: "Use another email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't sign you out");
    expect(screen.queryByText("Private member feature")).not.toBeInTheDocument();
  });

  it("requires profile completion before the actual onboarding route", () => {
    session({ status: "needs_age" });
    render(<MemoryRouter initialEntries={["/onboarding"]}><AppRoutes /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Complete your private profile" })).toBeInTheDocument();
    expect(screen.queryByText("Private interest onboarding")).not.toBeInTheDocument();
  });

  it("keeps features locked while the account is loading", () => {
    session({ status: "loading" });
    renderGate();
    expect(screen.getByText(/Checking your student account/)).toBeInTheDocument();
    expect(screen.queryByText("Private member feature")).not.toBeInTheDocument();
  });

  it("renders the feature for a ready student", () => {
    renderGate();
    expect(screen.getByRole("heading", { name: "Private member feature" })).toBeInTheDocument();
  });
});
