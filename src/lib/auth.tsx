import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";
import { getMyProfile } from "./rpc";
import type { MyProfile } from "@/types";

/**
 * THE ONE auth provider. Other members use `useSession()` — never create another provider.
 *  - status 'loading'     : resolving session
 *  - status 'signed_out'  : no session
 *  - status 'unverified'  : signed in, but server says not a verified allowlisted student
 *  - status 'needs_age'   : verified student, 18+ self-attestation / display name missing
 *  - status 'ready'       : may use member features (server still re-checks every RPC)
 */
export type AuthStatus = "loading" | "signed_out" | "unverified" | "needs_age" | "ready";

type AuthValue = {
  status: AuthStatus;
  session: Session | null;
  profile: MyProfile | null;
  configured: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function deriveStatus(session: Session | null, profile: MyProfile | null, loading: boolean): AuthStatus {
  if (loading) return "loading";
  if (!session) return "signed_out";
  if (!profile || !profile.studentVerified) return "unverified";
  if (!profile.ageConfirmed || !profile.displayName) return "needs_age";
  return "ready";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); return; }
    try { setProfile(await getMyProfile()); setError(null); }
    catch (e) { setProfile(null); setError(e instanceof Error ? e.message : "Could not load profile"); }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(s);
      void loadProfile(s);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const value = useMemo<AuthValue>(() => ({
    status: deriveStatus(session, profile, loading),
    session, profile, error,
    configured: isSupabaseConfigured,
    refreshProfile: () => loadProfile(session),
    signOut: async () => { await supabase.auth.signOut(); setProfile(null); },
  }), [session, profile, loading, error, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSession must be used inside <AuthProvider>");
  return ctx;
}
