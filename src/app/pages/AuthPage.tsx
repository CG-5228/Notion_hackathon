import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Button, Card, Notice, LogoMark } from "@/components";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/auth";
import { checkEmailDomain } from "@/lib/rpc";
import { emailDomain, isObviouslyPersonal, normalizeEmail } from "@/lib/email";
import { COPY } from "@/types";

type Mode = "signin" | "signup";

export function AuthPage() {
  const [params] = useSearchParams();
  const { status, configured } = useSession();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const next = params.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (status === "ready" || status === "needs_age") return <Navigate to={safeNext} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const clean = normalizeEmail(email);
    if (!emailDomain(clean)) return setError("Enter a valid email address.");
    if (mode === "signup") {
      if (isObviouslyPersonal(clean)) return setError("Personal emails can't be used. Please use your university email address.");
      if (password.length < 10) return setError("Use at least 10 characters for your password.");
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const check = await checkEmailDomain(clean);
        if (!check.allowed) { setError("That university isn't on our approved list yet. Only exact, admin-approved university domains can join."); return; }
        const { error } = await supabase.auth.signUp({ email: clean, password, options: { emailRedirectTo: `${window.location.origin}/onboarding` } });
        if (error) throw error;
        setSent(check.universityName ?? "your university");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: clean, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
      <div className="hidden md:block">
        <LogoMark size={56} />
        <h1 className="mt-6 text-5xl font-extrabold leading-tight">Students only.<br /><span className="text-lilac-deep">On purpose.</span></h1>
        <p className="mt-4 text-ink-soft">Sign up with your university email. We confirm you control it before you can see events or meet anyone.</p>
        <p className="mt-6 text-xs text-ink-muted">{COPY.verificationLimit}</p>
      </div>
      <Card className="p-8">
        {sent ? (
          <div className="text-center" role="status">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint text-2xl">✉</div>
            <h2 className="mt-4 text-2xl font-bold">Check your uni inbox</h2>
            <p className="mt-2 text-sm text-ink-muted">We sent a confirmation link for {sent}. You'll get access once it's confirmed.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 rounded-full bg-sand p-1" role="tablist">
              {(["signin", "signup"] as Mode[]).map((m) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); }}
                  className={`rounded-full py-2 text-sm font-semibold transition ${mode === m ? "bg-paper shadow-soft" : "text-ink-muted"}`}>
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
            {!configured && <Notice tone="error" className="mb-4">Backend not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</Notice>}
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <label className="block">
                <span className="text-sm font-semibold">University email</span>
                <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@tcd.ie"
                  className="mt-1.5 h-12 w-full rounded-xl border border-line bg-paper px-4 outline-none transition focus:border-lilac-deep" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Password</span>
                <input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 10 : undefined}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 h-12 w-full rounded-xl border border-line bg-paper px-4 outline-none transition focus:border-lilac-deep" />
              </label>
              {error && <Notice tone="error">{error}</Notice>}
              <Button type="submit" size="lg" className="w-full" disabled={busy || !configured}>
                {busy ? "Please wait…" : mode === "signup" ? "Send confirmation link" : "Sign in"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
