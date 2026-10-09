import { act, render, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import type { MyProfile } from "@/types";
import { AuthProvider, useSession } from "./auth";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  getMyProfile: vi.fn(),
}));

vi.mock("./supabase", () => ({
  isSupabaseConfigured: true,
  supabase: { auth: {
    getSession: authMocks.getSession,
    onAuthStateChange: authMocks.onAuthStateChange,
    signOut: authMocks.signOut,
  } },
}));

vi.mock("./rpc", () => ({ getMyProfile: authMocks.getMyProfile }));

type AuthListener = (event: string, session: Session | null) => void;

let authListener: AuthListener | null = null;
let currentSession: ReturnType<typeof useSession> | null = null;
const unsubscribe = vi.fn();

function Probe() {
  currentSession = useSession();
  return null;
}

function session(userId: string): Session {
  return { user: { id: userId } } as Session;
}

function profile(userId: string, overrides: Partial<MyProfile> = {}): MyProfile {
  return {
    userId,
    displayName: "A student",
    avatarUrl: null,
    ageConfirmed: true,
    studentVerified: true,
    universityId: "uni",
    universityName: "University",
    isDemo: false,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderProvider() {
  return render(<AuthProvider><Probe /></AuthProvider>);
}

function emitAuthEvent(event: string, nextSession: Session | null) {
  if (!authListener) throw new Error("Auth listener is not registered");
  act(() => authListener?.(event, nextSession));
}

beforeEach(() => {
  vi.clearAllMocks();
  authListener = null;
  currentSession = null;
  authMocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  authMocks.onAuthStateChange.mockImplementation((listener: AuthListener) => {
    authListener = listener;
    return { data: { subscription: { unsubscribe } } };
  });
  authMocks.signOut.mockResolvedValue({ error: null });
  authMocks.getMyProfile.mockResolvedValue(null);
});

describe("AuthProvider lifecycle", () => {
  it("does not let initial hydration overwrite a newer auth event", async () => {
    const hydration = deferred<{ data: { session: Session }; error: null }>();
    authMocks.getSession.mockReturnValueOnce(hydration.promise);
    authMocks.getMyProfile.mockResolvedValue(profile("new-user"));
    renderProvider();

    await waitFor(() => expect(authMocks.getSession).toHaveBeenCalledTimes(1));
    emitAuthEvent("SIGNED_IN", session("new-user"));
    await waitFor(() => expect(authMocks.getMyProfile).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(currentSession?.status).toBe("ready"));

    await act(async () => {
      hydration.resolve({ data: { session: session("old-user") }, error: null });
      await hydration.promise;
    });

    expect(currentSession?.session?.user.id).toBe("new-user");
    expect(currentSession?.profile?.userId).toBe("new-user");
  });

  it("ignores a late profile response after the session changes", async () => {
    const oldProfile = deferred<MyProfile | null>();
    authMocks.getSession.mockResolvedValue({ data: { session: session("old-user") }, error: null });
    authMocks.getMyProfile.mockReturnValueOnce(oldProfile.promise).mockResolvedValueOnce(profile("new-user"));
    renderProvider();

    await waitFor(() => expect(authMocks.getMyProfile).toHaveBeenCalledTimes(1));
    emitAuthEvent("SIGNED_IN", session("new-user"));
    expect(authMocks.getMyProfile).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(authMocks.getMyProfile).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(currentSession?.profile?.userId).toBe("new-user"));

    await act(async () => {
      oldProfile.resolve(profile("old-user"));
      await oldProfile.promise;
    });

    expect(currentSession?.status).toBe("ready");
    expect(currentSession?.session?.user.id).toBe("new-user");
    expect(currentSession?.profile?.userId).toBe("new-user");
    expect(currentSession?.error).toBeNull();
  });

  it("does not retain a stale profile error after a session change", async () => {
    const oldProfile = deferred<MyProfile | null>();
    authMocks.getSession.mockResolvedValue({ data: { session: session("old-user") }, error: null });
    authMocks.getMyProfile.mockReturnValueOnce(oldProfile.promise).mockResolvedValueOnce(profile("new-user"));
    renderProvider();

    await waitFor(() => expect(authMocks.getMyProfile).toHaveBeenCalledTimes(1));
    emitAuthEvent("SIGNED_IN", session("new-user"));
    await waitFor(() => expect(currentSession?.profile?.userId).toBe("new-user"));

    await act(async () => {
      oldProfile.reject(new Error("old account request failed"));
      await oldProfile.promise.catch(() => undefined);
    });

    expect(currentSession?.status).toBe("ready");
    expect(currentSession?.profile?.userId).toBe("new-user");
    expect(currentSession?.error).toBeNull();
  });

  it("rejects a profile belonging to a different session user", async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: session("signed-in-user") }, error: null });
    authMocks.getMyProfile.mockResolvedValue(profile("other-user"));
    renderProvider();

    await waitFor(() => expect(currentSession?.error).toMatch(/does not match/i));
    expect(currentSession?.profile).toBeNull();
    expect(currentSession?.status).toBe("unverified");
  });

  it("reports rejected session hydration and retries it through refreshProfile", async () => {
    authMocks.getSession
      .mockRejectedValueOnce(new Error("session service unavailable"))
      .mockResolvedValueOnce({ data: { session: session("student") }, error: null });
    authMocks.getMyProfile.mockResolvedValue(profile("student"));
    renderProvider();

    expect(currentSession?.status).toBe("loading");
    await waitFor(() => expect(currentSession?.error).toBe("session service unavailable"));
    expect(currentSession?.status).toBe("signed_out");
    expect(currentSession?.session).toBeNull();
    expect(currentSession?.profile).toBeNull();
    await act(async () => { await currentSession?.refreshProfile(); });

    expect(authMocks.getSession).toHaveBeenCalledTimes(2);
    expect(currentSession?.status).toBe("ready");
    expect(currentSession?.error).toBeNull();
  });

  it("reports returned session errors for the recovery gate", async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: session("student") },
      error: { message: "returned session error" },
    });
    renderProvider();

    await waitFor(() => expect(currentSession?.error).toBe("returned session error"));
    expect(currentSession?.profile).toBeNull();
    expect(authMocks.getMyProfile).not.toHaveBeenCalled();
  });

  it("preserves profile RPC errors and retries the current session", async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: session("student") }, error: null });
    authMocks.getMyProfile
      .mockRejectedValueOnce(new Error("profile service unavailable"))
      .mockResolvedValueOnce(profile("student"));
    renderProvider();

    await waitFor(() => expect(currentSession?.error).toBe("profile service unavailable"));
    expect(currentSession?.status).toBe("unverified");
    expect(currentSession?.profile).toBeNull();
    await act(async () => { await currentSession?.refreshProfile(); });

    expect(authMocks.getSession).toHaveBeenCalledTimes(1);
    expect(authMocks.getMyProfile).toHaveBeenCalledTimes(2);
    expect(currentSession?.status).toBe("ready");
    expect(currentSession?.error).toBeNull();
  });

  it("surfaces sign-out errors without clearing the active profile", async () => {
    const signOutError = new Error("sign-out was rejected");
    authMocks.getSession.mockResolvedValue({ data: { session: session("student") }, error: null });
    authMocks.getMyProfile.mockResolvedValue(profile("student"));
    renderProvider();
    await waitFor(() => expect(currentSession?.status).toBe("ready"));
    authMocks.signOut.mockResolvedValueOnce({ error: signOutError });

    let caught: unknown;
    await act(async () => {
      try { await currentSession?.signOut(); }
      catch (error) { caught = error; }
    });

    expect(caught).toBe(signOutError);
    expect(currentSession?.session?.user.id).toBe("student");
    expect(currentSession?.profile?.userId).toBe("student");
    expect(currentSession?.error).toBe("sign-out was rejected");
  });

  it("does not overwrite a newer auth event while sign-out is pending", async () => {
    const pendingSignOut = deferred<{ error: null }>();
    authMocks.getSession.mockResolvedValue({ data: { session: session("student") }, error: null });
    authMocks.getMyProfile.mockResolvedValue(profile("student"));
    renderProvider();
    await waitFor(() => expect(currentSession?.status).toBe("ready"));
    authMocks.signOut.mockReturnValueOnce(pendingSignOut.promise);

    let signOutPromise!: Promise<void>;
    act(() => { signOutPromise = currentSession!.signOut(); });
    emitAuthEvent("SIGNED_IN", session("student"));
    await waitFor(() => {
      expect(authMocks.getMyProfile).toHaveBeenCalledTimes(2);
      expect(currentSession?.status).toBe("ready");
    });

    await act(async () => {
      pendingSignOut.resolve({ error: null });
      await signOutPromise;
    });

    expect(currentSession?.session?.user.id).toBe("student");
    expect(currentSession?.profile?.userId).toBe("student");
    expect(currentSession?.status).toBe("ready");
  });

  it("rejects an old sign-out failure without affecting a newer session", async () => {
    const pendingSignOut = deferred<{ error: Error }>();
    const signOutError = new Error("old account sign-out failed");
    authMocks.getSession.mockResolvedValue({ data: { session: session("old-user") }, error: null });
    authMocks.getMyProfile
      .mockResolvedValueOnce(profile("old-user"))
      .mockResolvedValueOnce(profile("new-user"));
    renderProvider();
    await waitFor(() => expect(currentSession?.profile?.userId).toBe("old-user"));
    authMocks.signOut.mockReturnValueOnce(pendingSignOut.promise);

    let caught: unknown;
    let signOutPromise!: Promise<void>;
    act(() => {
      signOutPromise = currentSession!.signOut().catch((error: unknown) => { caught = error; });
    });
    emitAuthEvent("SIGNED_IN", session("new-user"));
    await waitFor(() => {
      expect(authMocks.getMyProfile).toHaveBeenCalledTimes(2);
      expect(currentSession?.profile?.userId).toBe("new-user");
    });

    await act(async () => {
      pendingSignOut.resolve({ error: signOutError });
      await signOutPromise;
    });

    expect(caught).toBe(signOutError);
    expect(currentSession?.session?.user.id).toBe("new-user");
    expect(currentSession?.profile?.userId).toBe("new-user");
    expect(currentSession?.status).toBe("ready");
    expect(currentSession?.error).toBeNull();
  });

  it("invalidates a pending profile request when sign-out succeeds", async () => {
    const pendingProfile = deferred<MyProfile | null>();
    authMocks.getSession.mockResolvedValue({ data: { session: session("student") }, error: null });
    authMocks.getMyProfile.mockReturnValueOnce(pendingProfile.promise);
    renderProvider();
    await waitFor(() => expect(authMocks.getMyProfile).toHaveBeenCalledTimes(1));

    await act(async () => { await currentSession?.signOut(); });
    expect(currentSession?.status).toBe("signed_out");
    expect(currentSession?.profile).toBeNull();

    await act(async () => {
      pendingProfile.resolve(profile("student"));
      await pendingProfile.promise;
    });
    expect(currentSession?.status).toBe("signed_out");
    expect(currentSession?.session).toBeNull();
    expect(currentSession?.profile).toBeNull();
  });

  it("ignores auth and profile work after unmount", async () => {
    const pendingProfile = deferred<MyProfile | null>();
    authMocks.getSession.mockResolvedValue({ data: { session: session("student") }, error: null });
    authMocks.getMyProfile.mockReturnValueOnce(pendingProfile.promise);
    const view = renderProvider();
    await waitFor(() => expect(authMocks.getMyProfile).toHaveBeenCalledTimes(1));
    const staleListener = authListener;

    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    act(() => staleListener?.("SIGNED_IN", session("other-user")));
    expect(authMocks.getMyProfile).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendingProfile.resolve(profile("student"));
      await pendingProfile.promise;
    });
    expect(authMocks.getMyProfile).toHaveBeenCalledTimes(1);
  });
});
