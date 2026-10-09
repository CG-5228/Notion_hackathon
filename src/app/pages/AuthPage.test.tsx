import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "@/lib/auth";
import { checkEmailDomain } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";
import { AuthPage } from "./AuthPage";

vi.mock("@/lib/auth", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/rpc", () => ({ checkEmailDomain: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signUp: vi.fn(), signInWithPassword: vi.fn(), resend: vi.fn() } },
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
}

function renderPage(entry = "/auth") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes><Route path="*" element={<><AuthPage /><LocationProbe /></>} /></Routes>
    </MemoryRouter>,
  );
}

function setSession(overrides: Partial<ReturnType<typeof useSession>> = {}) {
  vi.mocked(useSession).mockReturnValue({
    status: "signed_out",
    session: null,
    profile: null,
    configured: true,
    error: null,
    refreshProfile: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    ...overrides,
  });
}

const authSuccess = { data: { user: null, session: null }, error: null };

function fillSignUpForm(address = "alice@tcd.ie", secret = "long-password-123") {
  fireEvent.change(screen.getByLabelText("University email"), { target: { value: address } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: secret } });
}

beforeEach(() => {
  vi.resetAllMocks();
  setSession();
  vi.mocked(checkEmailDomain).mockResolvedValue({ allowed: true, universityName: "Trinity College Dublin", isDemo: false });
  vi.mocked(supabase.auth.signUp).mockResolvedValue(authSuccess as never);
  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue(authSuccess as never);
  vi.mocked(supabase.auth.resend).mockResolvedValue(authSuccess as never);
});

describe("AuthPage", () => {
  it("shows a visible page heading and accessible mode controls kept in the URL", async () => {
    renderPage("/auth?mode=signup&next=%2Fbuddy%2Fexample");

    expect(screen.getByRole("heading", { level: 1, name: "Good plans are better shared." })).toBeVisible();
    expect(screen.getByRole("button", { name: "Switch to create account" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("form", { name: "Create your student account" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Switch to sign in" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Switch to sign in" })).toHaveAttribute("aria-pressed", "true"));
    const afterSwitch = new URL(screen.getByTestId("location").textContent ?? "", window.location.origin);
    expect(afterSwitch.pathname).toBe("/auth");
    expect(afterSwitch.searchParams.get("mode")).toBeNull();
    expect(afterSwitch.searchParams.get("next")).toBe("/buddy/example");
  });

  it("announces required-field validation without making a request", async () => {
    renderPage("/auth?mode=signup");
    fireEvent.submit(screen.getByRole("form", { name: "Create your student account" }));

    expect(await screen.findByText("Enter your university email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(screen.getByLabelText("University email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    expect(checkEmailDomain).not.toHaveBeenCalled();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it("rejects personal email addresses early but still checks approved domains before signup", async () => {
    renderPage("/auth?mode=signup");
    fillSignUpForm("alice@gmail.com");
    fireEvent.click(screen.getByRole("button", { name: "Create account with university email" }));

    expect(await screen.findByText(/Personal email addresses can't be used/)).toBeInTheDocument();
    expect(checkEmailDomain).not.toHaveBeenCalled();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();

    vi.mocked(checkEmailDomain).mockResolvedValueOnce({ allowed: false, universityName: null, isDemo: false });
    fillSignUpForm("alice@unknown.ie");
    fireEvent.click(screen.getByRole("button", { name: "Create account with university email" }));
    expect(await screen.findByText(/exact university domain isn't approved/)).toBeInTheDocument();
    expect(checkEmailDomain).toHaveBeenCalledWith("alice@unknown.ie");
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it("normalizes signup email and shows a useful confirmation with resend and back actions", async () => {
    renderPage("/auth?mode=signup");
    fillSignUpForm("Alice@TCD.ie");
    fireEvent.click(screen.getByRole("button", { name: "Create account with university email" }));

    expect(await screen.findByRole("heading", { name: "Check your university inbox" })).toBeInTheDocument();
    expect(screen.getByText("alice@tcd.ie")).toBeInTheDocument();
    expect(screen.getByText(/Trinity College Dublin/)).toBeInTheDocument();
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "alice@tcd.ie",
      password: "long-password-123",
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });

    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation link" }));
    expect(await screen.findByText("Another confirmation link is on its way.")).toBeInTheDocument();
    expect(supabase.auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "alice@tcd.ie",
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });

    fireEvent.click(screen.getByRole("button", { name: "Use a different email" }));
    expect(screen.getByRole("form", { name: "Create your student account" })).toBeInTheDocument();
    expect(screen.getByLabelText("University email")).toHaveValue("Alice@TCD.ie");
  });

  it("toggles password visibility accessibly and enforces the signup length", async () => {
    renderPage("/auth?mode=signup");
    const password = screen.getByLabelText("Password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");

    fillSignUpForm("alice@tcd.ie", "short");
    fireEvent.click(screen.getByRole("button", { name: "Create account with university email" }));
    expect(await screen.findByText("Use at least 10 characters for your password.")).toBeInTheDocument();
    expect(checkEmailDomain).not.toHaveBeenCalled();
  });

  it("blocks duplicate submission while the sign-up request is pending", async () => {
    let resolveSignUp: ((value: typeof authSuccess) => void) | undefined;
    vi.mocked(supabase.auth.signUp).mockImplementation(() => new Promise((resolve) => { resolveSignUp = resolve; }) as never);
    renderPage("/auth?mode=signup");
    fillSignUpForm();

    const form = screen.getByRole("form", { name: "Create your student account" });
    fireEvent.submit(form);
    await waitFor(() => expect(supabase.auth.signUp).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("University email")).toBeDisabled();
    expect(screen.getByRole("button", { name: /checking email & sending link/i })).toBeDisabled();
    fireEvent.submit(form);
    expect(checkEmailDomain).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);

    resolveSignUp?.(authSuccess);
    expect(await screen.findByRole("heading", { name: "Check your university inbox" })).toBeInTheDocument();
  });

  it("keeps sign-in available without signup-only domain checks", async () => {
    renderPage("/auth");
    fireEvent.change(screen.getByLabelText("University email"), { target: { value: "student@gmail.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: "student@gmail.com", password: "short" }));
    expect(checkEmailDomain).not.toHaveBeenCalled();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it("does not redirect an authenticated user to an external or looping auth destination", () => {
    setSession({ status: "ready" });
    renderPage("/auth?next=https%3A%2F%2Fexample.com%2Fprivate");
    expect(screen.getByTestId("location").textContent).toBe("/");

    renderPage("/auth?next=%2Fcarrybetterplug%3Fmode%3Dsignup");
    expect(screen.getAllByTestId("location").at(-1)?.textContent).toBe("/");
  });

  it("sends accounts needing setup through a gated page rather than looping to auth or returning to the public home", () => {
    setSession({ status: "needs_age" });
    renderPage("/auth?next=%2Fonboarding");
    expect(screen.getByTestId("location").textContent).toBe("/onboarding");

    renderPage("/auth?next=%2Fcarrybetterplug");
    expect(screen.getAllByTestId("location").at(-1)?.textContent).toBe("/onboarding");
  });

  it("keeps auth actions honestly disabled when Supabase isn't configured", () => {
    setSession({ configured: false });
    renderPage("/auth?mode=signup");
    expect(screen.getByRole("alert")).toHaveTextContent("Backend not configured");
    const submit = screen.getByRole("button", { name: "Create account with university email" });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    fireEvent.submit(screen.getByRole("form"));
    expect(checkEmailDomain).not.toHaveBeenCalled();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });
});
