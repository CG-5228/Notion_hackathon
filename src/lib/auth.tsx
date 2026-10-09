import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

type AuthState = Pick<AuthValue, "session" | "profile" | "error"> & { loading: boolean };

const AuthContext = createContext<AuthValue | null>(null);

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "string") return error || fallback;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

export function deriveStatus(session: Session | null, profile: MyProfile | null, loading: boolean): AuthStatus {
  if (loading) return "loading";
  if (!session) return "signed_out";
  if (!profile || !profile.studentVerified) return "unverified";
  if (!profile.ageConfirmed || !profile.displayName) return "needs_age";
  return "ready";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    profile: null,
    loading: isSupabaseConfigured,
    error: null,
  });
  const activeLifecycleRef = useRef<number | null>(null);
  const nextLifecycleRef = useRef(0);
  const workVersionRef = useRef(0);
  const authEventRevisionRef = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  const hydrationFailedRef = useRef(false);

  const beginSessionResolution = useCallback((session: Session | null) => {
    const workVersion = ++workVersionRef.current;
    sessionRef.current = session;
    hydrationFailedRef.current = false;
    setAuthState({ session, profile: null, loading: session !== null, error: null });
    return workVersion;
  }, []);

  const requestProfile = useCallback(async (session: Session, workVersion: number, lifecycle: number) => {
    const isCurrent = () =>
      activeLifecycleRef.current === lifecycle &&
      workVersionRef.current === workVersion &&
      sessionRef.current?.user.id === session.user.id;

    try {
      const profile = await getMyProfile();
      if (!isCurrent()) return;
      if (profile && profile.userId !== session.user.id) {
        setAuthState((current) => isCurrent() ? {
          ...current,
          session,
          profile: null,
          loading: false,
          error: "The loaded profile does not match the signed-in account.",
        } : current);
        return;
      }
      setAuthState((current) => isCurrent() ? { ...current, session, profile, loading: false } : current);
    } catch (error) {
      if (!isCurrent()) return;
      setAuthState((current) => isCurrent() ? {
        ...current,
        session,
        profile: null,
        loading: false,
        error: errorMessage(error, "Could not load profile"),
      } : current);
    }
  }, []);

  const hydrateSession = useCallback(async (lifecycle: number, authRevision: number) => {
    if (activeLifecycleRef.current !== lifecycle || authEventRevisionRef.current !== authRevision) return;

    const workVersion = ++workVersionRef.current;
    sessionRef.current = null;
    hydrationFailedRef.current = false;
    setAuthState({ session: null, profile: null, loading: true, error: null });
    const isCurrent = () =>
      activeLifecycleRef.current === lifecycle &&
      authEventRevisionRef.current === authRevision &&
      workVersionRef.current === workVersion;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (!isCurrent()) return;
      if (error) throw error;
      const profileWorkVersion = beginSessionResolution(data.session);
      if (data.session) await requestProfile(data.session, profileWorkVersion, lifecycle);
    } catch (error) {
      if (!isCurrent()) return;
      hydrationFailedRef.current = true;
      sessionRef.current = null;
      setAuthState((current) => isCurrent() ? {
        ...current,
        session: null,
        profile: null,
        loading: false,
        error: errorMessage(error, "Could not load session"),
      } : current);
    }
  }, [beginSessionResolution, requestProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const lifecycle = ++nextLifecycleRef.current;
    activeLifecycleRef.current = lifecycle;
    const initialAuthRevision = authEventRevisionRef.current;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const scheduleProfileLoad = (session: Session, workVersion: number) => {
      // Run the RPC only after Supabase's auth callback has released its internal lock.
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (activeLifecycleRef.current !== lifecycle || workVersionRef.current !== workVersion) return;
        void requestProfile(session, workVersion, lifecycle);
      }, 0);
      timers.add(timer);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (activeLifecycleRef.current !== lifecycle) return;
      authEventRevisionRef.current += 1;
      const workVersion = beginSessionResolution(session);
      if (session) scheduleProfileLoad(session, workVersion);
    });

    void hydrateSession(lifecycle, initialAuthRevision);

    return () => {
      if (activeLifecycleRef.current === lifecycle) {
        activeLifecycleRef.current = null;
        workVersionRef.current += 1;
      }
      timers.forEach(clearTimeout);
      subscription.unsubscribe();
    };
  }, [beginSessionResolution, hydrateSession, requestProfile]);

  const refreshProfile = useCallback(async () => {
    const lifecycle = activeLifecycleRef.current;
    if (!isSupabaseConfigured || lifecycle === null) return;

    if (hydrationFailedRef.current) {
      await hydrateSession(lifecycle, authEventRevisionRef.current);
      return;
    }

    const session = sessionRef.current;
    if (!session) return;
    const workVersion = beginSessionResolution(session);
    await requestProfile(session, workVersion, lifecycle);
  }, [beginSessionResolution, hydrateSession, requestProfile]);

  const signOut = useCallback(async () => {
    const lifecycle = activeLifecycleRef.current;
    const startingAuthRevision = authEventRevisionRef.current;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      if (lifecycle === null || activeLifecycleRef.current !== lifecycle) return;

      if (authEventRevisionRef.current !== startingAuthRevision) return;

      authEventRevisionRef.current += 1;
      workVersionRef.current += 1;
      hydrationFailedRef.current = false;
      sessionRef.current = null;
      setAuthState({ session: null, profile: null, loading: false, error: null });
    } catch (error) {
      if (
        lifecycle !== null &&
        activeLifecycleRef.current === lifecycle &&
        authEventRevisionRef.current === startingAuthRevision
      ) {
        setAuthState((current) => ({ ...current, error: errorMessage(error, "Could not sign out") }));
      }
      throw error;
    }
  }, []);

  const value = useMemo<AuthValue>(() => ({
    status: deriveStatus(authState.session, authState.profile, authState.loading),
    session: authState.session,
    profile: authState.profile,
    configured: isSupabaseConfigured,
    error: authState.error,
    refreshProfile,
    signOut,
  }), [authState, refreshProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSession must be used inside <AuthProvider>");
  return ctx;
}
