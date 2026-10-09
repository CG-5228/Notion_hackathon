import { useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/lib/auth";
import { Button, ButtonLink, Card, Icon, Notice, Spinner } from "@/components";
import { ProfileSetup } from "./pages/ProfileSetup";

/** UX gate only; RPCs and RLS must independently enforce student access. */
export function RequireStudent({ children }: { children: ReactNode }) {
  const { status, configured, error, refreshProfile, signOut } = useSession();
  const location = useLocation();
  const [action, setAction] = useState<"retry" | "signout" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function retry() {
    setAction("retry");
    setActionError(null);
    try { await refreshProfile(); }
    catch { setActionError("We still couldn't check your account. Please try again."); }
    finally { setAction(null); }
  }

  async function leaveAccount() {
    setAction("signout");
    setActionError(null);
    try { await signOut(); }
    catch { setActionError("We couldn't sign you out. Please try again."); }
    finally { setAction(null); }
  }

  if (!configured) return (
    <Card className="mx-auto max-w-xl !p-7 sm:!p-9">
      <span className="mb-6 grid h-13 w-13 place-items-center rounded-2xl bg-sage text-mint-deep"><Icon name="lock" size={24} /></span>
      <p className="eyebrow text-brand">The shared backend isn't connected yet</p>
      <h1 className="mt-3 text-3xl font-bold">Student spaces are getting ready.</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">You can explore the idea for now. Signing in and member features will be available once the team's shared Supabase backend is configured.</p>
      <details className="mt-5 rounded-xl border border-line p-4 text-xs leading-relaxed text-ink-muted"><summary className="font-semibold text-ink">Setup details for the team</summary><p className="mt-3">Copy .env.example to .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. No student access is granted without the server checks.</p></details>
      <ButtonLink to="/" className="mt-6">Back to Discover<Icon name="arrow-right" size={17} /></ButtonLink>
    </Card>
  );
  if (status === "loading") return <Spinner label="Checking your student account" />;
  if (error) return (
    <Card className="mx-auto max-w-lg !p-8">
      <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-warn-bg text-warn-ink"><Icon name="info" size={24} /></span>
      <h1 className="text-2xl font-bold">We couldn't check your student account.</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">This is a loading problem, not a decision about your eligibility. Member features stay locked until we can confirm your account.</p>
      {actionError && <Notice tone="error" className="mt-4">{actionError}</Notice>}
      <div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => void retry()} disabled={action !== null}>{action === "retry" ? "Checking…" : "Try again"}</Button><ButtonLink to="/" variant="outline">Back to Discover</ButtonLink></div>
    </Card>
  );
  if (status === "signed_out") {
    const next = location.pathname + location.search + location.hash;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }
  if (status === "unverified") return (
    <Card className="mx-auto max-w-lg !p-8">
      <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-brand-light text-brand"><Icon name="mail" size={24} /></span>
      <h1 className="text-2xl font-bold">Let's verify your student email.</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">Member features require a confirmed email at an approved university. Open the confirmation link in your inbox, then check again. If your university isn't approved, access remains locked.</p>
      {actionError && <Notice tone="error" className="mt-4">{actionError}</Notice>}
      <div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => void retry()} disabled={action !== null}>{action === "retry" ? "Checking…" : "Check again"}</Button><Button onClick={() => void leaveAccount()} variant="outline" disabled={action !== null}>{action === "signout" ? "Signing out…" : "Use another email"}</Button></div>
    </Card>
  );
  if (status === "needs_age") return <ProfileSetup />;
  return <>{children}</>;
}
