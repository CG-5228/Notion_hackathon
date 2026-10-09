import { useRef, useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Button, Card, Icon, LogoMark, Notice } from "@/components";
import { supabase } from "@/lib/supabase";
import { useSession, type AuthStatus } from "@/lib/auth";
import { checkEmailDomain } from "@/lib/rpc";
import { emailDomain, isObviouslyPersonal, normalizeEmail } from "@/lib/email";
import { COPY } from "@/types";

type Mode = "signin" | "signup";
type Confirmation = { email: string; universityName: string };

function resolveSafeNext(value: string | null, status: AuthStatus): string {
  const fallback = status === "needs_age" ? "/onboarding" : "/";
  if (!value) return fallback;

  try {
    const target = new URL(value, window.location.origin);
    if (target.origin !== window.location.origin) return fallback;
    const path = target.pathname.replace(/\/+$/, "").toLowerCase() || "/";
    if (path === "/auth" || (status === "needs_age" && path === "/")) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

function emailRedirectUrl() {
  return `${window.location.origin}/onboarding`;
}

export function AuthPage() {
  const [params, setParams] = useSearchParams();
  const { status, configured } = useSession();
  const mode: Mode = params.get("mode") === "signup" ? "signup" : "signin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const safeNext = resolveSafeNext(params.get("next"), status);

  if (status === "ready" || status === "needs_age") return <Navigate to={safeNext} replace />;

  function changeMode(nextMode: Mode) {
    if (busy || nextMode === mode) return;
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setPassword("");
    setPasswordVisible(false);
    const nextParams = new URLSearchParams(params);
    if (nextMode === "signup") nextParams.set("mode", "signup");
    else nextParams.delete("mode");
    setParams(nextParams);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || confirmation || !configured) return;

    setError(null);
    const cleanEmail = normalizeEmail(email);
    let nextEmailError: string | null = null;
    let nextPasswordError: string | null = null;

    if (!cleanEmail) nextEmailError = "Enter your university email address.";
    else if (!emailDomain(cleanEmail) || emailInput.current?.validity.typeMismatch) {
      nextEmailError = "Enter a valid email address, like you@university.edu.";
    } else if (mode === "signup" && isObviouslyPersonal(cleanEmail)) {
      nextEmailError = "Personal email addresses can't be used. Please use an approved university email.";
    }

    if (!password) nextPasswordError = "Enter your password.";
    else if (mode === "signup" && password.length < 10) {
      nextPasswordError = "Use at least 10 characters for your password.";
    }

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      if (nextEmailError) emailInput.current?.focus();
      else passwordInput.current?.focus();
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const check = await checkEmailDomain(cleanEmail);
        if (!check.allowed) {
          setEmailError("That exact university domain isn't approved yet. Please use an approved university email.");
          emailInput.current?.focus();
          return;
        }
        const { error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: emailRedirectUrl() },
        });
        if (signUpError) throw signUpError;
        setConfirmation({ email: cleanEmail, universityName: check.universityName ?? "your university" });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (!confirmation || !configured || resending) return;
    setResendError(null);
    setResendSent(false);
    setResending(true);
    try {
      const { error: resendAuthError } = await supabase.auth.resend({
        type: "signup",
        email: confirmation.email,
        options: { emailRedirectTo: emailRedirectUrl() },
      });
      if (resendAuthError) throw resendAuthError;
      setResendSent(true);
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "We couldn't resend the link. Please try again.");
    } finally {
      setResending(false);
    }
  }

  function returnToSignUp() {
    setConfirmation(null);
    setResendSent(false);
    setResendError(null);
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    if (mode !== "signup") changeMode("signup");
  }

  return (
    <div className="mx-auto grid max-w-6xl items-stretch gap-6 lg:grid-cols-[0.94fr_1.06fr] lg:gap-8">
      <section aria-labelledby="auth-page-title" className="relative isolate overflow-hidden rounded-[2rem] bg-forest p-6 text-paper shadow-lift sm:p-9 lg:p-10">
        <div aria-hidden="true" className="absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-brand/30 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-24 -z-10 h-72 w-72 rounded-full bg-sage/10 blur-3xl" />
        <div className="hidden items-center gap-3 lg:flex">
          <LogoMark size={42} />
          <span className="font-display text-xl font-extrabold tracking-tight">find your buddy<span className="text-brand-light">.</span></span>
        </div>
        <p className="mt-9 hidden text-xs font-bold uppercase tracking-[0.18em] text-brand-light lg:block">A little less solo</p>
        <h1 id="auth-page-title" className="max-w-lg text-3xl font-extrabold leading-[1.08] sm:text-4xl lg:mt-3 lg:text-5xl">Good plans are better shared.</h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-paper/80 lg:mt-4 lg:text-base">
          Start with a university email. Meet around something you already want to do.
        </p>

        <ol aria-label="How your account stays private" className="mt-8 hidden space-y-5 lg:block">
          <li className="flex gap-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-light font-bold text-brand">01</span>
            <div>
              <p className="font-semibold">Your inbox stays yours</p>
              <p className="mt-1 text-sm leading-relaxed text-paper/75">We check a confirmed email against an exact, approved university-domain list.</p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-light font-bold text-brand">02</span>
            <div>
              <p className="font-semibold">Your name starts private</p>
              <p className="mt-1 text-sm leading-relaxed text-paper/75">Matches begin with a pseudonym. Limited profile details appear only after everyone agrees.</p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-light font-bold text-brand">03</span>
            <div>
              <p className="font-semibold">No hidden claims</p>
              <p className="mt-1 text-sm leading-relaxed text-paper/75">Age is self-declared; a university email doesn't prove current enrolment.</p>
            </div>
          </li>
        </ol>
        <p className="mt-8 hidden border-t border-white/15 pt-5 text-xs leading-relaxed text-paper/70 lg:block">{COPY.verificationLimit}</p>
      </section>

      <Card className="h-full p-6 sm:p-9 lg:p-10">
        {confirmation ? (
          <div className="flex h-full flex-col justify-center">
            <div role="status" className="text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-light text-brand">
                <Icon name="mail" size={28} />
              </span>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-brand">Email confirmation</p>
              <h2 id="confirmation-title" className="mt-2 text-3xl font-extrabold">Check your university inbox</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
                We sent a confirmation link to <strong className="break-all text-ink">{confirmation.email}</strong> for {confirmation.universityName}. Open it to confirm you control that inbox, then return here to continue.
              </p>
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">Nothing appeared? Check your spam folder or request another link. Confirmation shows control of an email address; it doesn't prove current enrolment.</p>
            </div>
            <div className="mt-7 space-y-3">
              {resendSent && <Notice tone="success">Another confirmation link is on its way.</Notice>}
              {resendError && <Notice tone="error">{resendError}</Notice>}
              {!configured && <Notice tone="error" title="Backend not configured">Add the shared Supabase URL and anon key before requesting another link.</Notice>}
              <Button type="button" variant="outline" className="w-full" disabled={!configured || resending} onClick={() => void resendConfirmation()}>
                <Icon name="mail" size={18} />{resending ? "Sending another link…" : "Resend confirmation link"}
              </Button>
              <button type="button" disabled={resending} onClick={returnToSignUp} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-50">
                <Icon name="arrow-left" size={17} />Use a different email
              </button>
              <button type="button" disabled={resending} onClick={() => { setConfirmation(null); changeMode("signin"); }} className="mx-auto block min-h-11 px-4 text-sm font-semibold text-ink-muted underline decoration-line underline-offset-4 hover:text-ink disabled:opacity-50">
                Back to sign in
              </button>
            </div>
          </div>
        ) : (
          <section aria-labelledby="auth-form-title">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Your student account</p>
            <h2 id="auth-form-title" className="mt-2 text-2xl font-extrabold lg:text-3xl">{mode === "signup" ? "Make room for good plans." : "Welcome back."}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {mode === "signup" ? "Create an account with your approved university email." : "Sign in with the university email you confirmed."}
            </p>

            <fieldset disabled={busy} className="mt-6 rounded-full bg-paper p-1.5">
              <legend className="sr-only">Account action</legend>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" aria-label="Switch to sign in" aria-pressed={mode === "signin"} onClick={() => changeMode("signin")}
                  className={`min-h-11 rounded-full px-3 text-sm font-bold transition ${mode === "signin" ? "bg-surface text-ink shadow-soft" : "text-ink-muted hover:text-ink"}`}>
                  Sign in
                </button>
                <button type="button" aria-label="Switch to create account" aria-pressed={mode === "signup"} onClick={() => changeMode("signup")}
                  className={`min-h-11 rounded-full px-3 text-sm font-bold transition ${mode === "signup" ? "bg-surface text-ink shadow-soft" : "text-ink-muted hover:text-ink"}`}>
                  Create account
                </button>
              </div>
            </fieldset>

            {!configured && <Notice tone="warning" title="Backend not configured" className="mt-5">Connect the shared Supabase project to enable sign-in.<details className="mt-2"><summary className="font-semibold">Team setup details</summary><p className="mt-2">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. No offline access or verification bypass is available.</p></details></Notice>}
            {error && <Notice tone="error" className="mt-5">{error}</Notice>}

            <form aria-label={mode === "signup" ? "Create your student account" : "Sign in to your account"} onSubmit={onSubmit} noValidate className="mt-6 space-y-5" aria-busy={busy}>
              <div>
                <label htmlFor="auth-email" className="text-sm font-bold">University email</label>
                <div className="relative mt-2">
                  <Icon name="mail" size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input ref={emailInput} id="auth-email" type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required
                    value={email} disabled={busy} onChange={(event) => { setEmail(event.target.value); setEmailError(null); setError(null); }}
                    placeholder="you@university.ie" aria-invalid={Boolean(emailError)} aria-describedby={`auth-email-hint${emailError ? " auth-email-error" : ""}`}
                    className="h-14 w-full rounded-2xl border border-line bg-surface pl-12 pr-4 text-ink outline-none transition placeholder:text-ink-muted/65 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60" />
                </div>
                <p id="auth-email-hint" className="mt-2 text-xs leading-relaxed text-ink-muted">Use the exact university email address you can confirm.</p>
                {emailError && <p id="auth-email-error" role="alert" className="mt-2 text-sm font-semibold text-danger">{emailError}</p>}
              </div>

              <div>
                <label htmlFor="auth-password" className="text-sm font-bold">Password</label>
                <div className="relative mt-2">
                  <Icon name="lock" size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input ref={passwordInput} id="auth-password" type={passwordVisible ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 10 : undefined}
                    value={password} disabled={busy} onChange={(event) => { setPassword(event.target.value); setPasswordError(null); setError(null); }}
                    placeholder={mode === "signup" ? "At least 10 characters" : "Your password"} aria-invalid={Boolean(passwordError)} aria-describedby={`auth-password-hint${passwordError ? " auth-password-error" : ""}`}
                    className="h-14 w-full rounded-2xl border border-line bg-surface pl-12 pr-14 text-ink outline-none transition placeholder:text-ink-muted/65 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60" />
                  <button type="button" aria-label={passwordVisible ? "Hide password" : "Show password"} aria-pressed={passwordVisible} aria-controls="auth-password" disabled={busy} onClick={() => setPasswordVisible((visible) => !visible)}
                    className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-ink-muted transition hover:bg-paper hover:text-ink disabled:opacity-50">
                    <Icon name={passwordVisible ? "eye-off" : "eye"} size={19} />
                  </button>
                </div>
                <p id="auth-password-hint" className="mt-2 text-xs leading-relaxed text-ink-muted">
                  {mode === "signup" ? "Choose at least 10 characters. You can reveal it while typing." : "Enter the password for your account."}
                </p>
                {passwordError && <p id="auth-password-error" role="alert" className="mt-2 text-sm font-semibold text-danger">{passwordError}</p>}
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={busy || !configured}>
                {busy ? (mode === "signup" ? "Checking email & sending link…" : "Signing in…") : (mode === "signup" ? "Create account with university email" : "Sign in")}
                {!busy && <Icon name="arrow-right" size={19} />}
              </Button>
            </form>
            <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-xs leading-relaxed text-ink-muted">
              <Icon name="lock" size={15} className="mt-0.5 shrink-0" />Your email is used for account access. It is never shown to a match.
            </p>
          </section>
        )}
      </Card>
      <p className="px-2 text-xs leading-relaxed text-ink-muted lg:hidden">{COPY.verificationLimit}</p>
    </div>
  );
}
