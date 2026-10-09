import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/lib/auth";
import { ButtonLink, Card, Notice, Spinner } from "@/components";
import { ProfileSetup } from "./pages/ProfileSetup";

/**
 * Client-side route gate for UX only. The real gate is server-side:
 * every RPC/RLS policy calls public.is_verified_student().
 */
export function RequireStudent({ children, allowNeedsAge = false }: { children: ReactNode; allowNeedsAge?: boolean }) {
  const { status, configured, signOut } = useSession();
  const location = useLocation();

  if (!configured) return <Notice tone="error" title="Backend not configured">Copy .env.example to .env and add the shared Supabase URL and anon key.</Notice>;
  if (status === "loading") return <Spinner label="Checking your student account" />;
  if (status === "signed_out") return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (status === "unverified") {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <h2 className="text-2xl font-bold">Student access only</h2>
        <p className="mt-2 text-sm text-ink-muted">Your account isn't linked to an approved university email yet. Confirm the link we emailed you, or sign up with your university address.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => void signOut()} className="text-sm font-semibold underline">Sign out</button>
          <ButtonLink to="/auth" variant="primary">Use university email</ButtonLink>
        </div>
      </Card>
    );
  }
  if (status === "needs_age" && !allowNeedsAge) return <ProfileSetup />;
  return <>{children}</>;
}
