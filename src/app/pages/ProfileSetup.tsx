import { useState, type FormEvent } from "react";
import { Button, Card, Icon, Notice } from "@/components";
import { useSession } from "@/lib/auth";
import { updateMyProfile } from "@/lib/rpc";
import { COPY } from "@/types";

/** Shown to verified students missing a display name or 18+ self-attestation. */
export function ProfileSetup() {
  const { profile, refreshProfile } = useSession();
  const [name, setName] = useState(profile?.displayName ?? "");
  const [adult, setAdult] = useState(profile?.ageConfirmed ?? false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    const trimmed = name.trim();
    const nextNameError = trimmed.length < 2
      ? "Enter a display name with at least 2 characters."
      : trimmed.length > 40
        ? "Display name must be 40 characters or fewer."
        : null;
    const nextAgeError = adult ? null : "Confirm that you are 18 or older to continue.";
    setNameError(nextNameError);
    setAgeError(nextAgeError);
    if (nextNameError || nextAgeError) return;

    setBusy(true);
    try {
      await updateMyProfile({ displayName: trimmed, ageConfirmed: true });
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your profile. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl items-stretch gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:gap-8">
      <section aria-labelledby="profile-story-title" className="rounded-[2rem] bg-sage p-6 sm:p-9 lg:p-10">
        <span className="hidden h-12 w-12 place-items-center rounded-2xl bg-surface text-forest shadow-soft lg:grid">
          <Icon name="lock" size={23} />
        </span>
        <p className="text-xs font-bold uppercase tracking-[0.17em] text-forest lg:mt-7">Your profile, your call</p>
        <h1 id="profile-story-title" className="mt-3 max-w-md text-3xl font-extrabold leading-[1.08] lg:text-4xl">A small step before the good plans.</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">Choose a display name and confirm you meet the age requirement. You stay in control of what a match sees.</p>
        <ul className="mt-7 hidden space-y-4 lg:block">
          <li className="flex gap-3 text-sm leading-relaxed text-ink-soft"><Icon name="check" size={19} className="mt-0.5 shrink-0 text-forest" /><span>Your email and account details stay private.</span></li>
          <li className="flex gap-3 text-sm leading-relaxed text-ink-soft"><Icon name="check" size={19} className="mt-0.5 shrink-0 text-forest" /><span>Your display name is only revealed to your match after everyone agrees.</span></li>
          <li className="flex gap-3 text-sm leading-relaxed text-ink-soft"><Icon name="check" size={19} className="mt-0.5 shrink-0 text-forest" /><span>Your age confirmation is self-declared; we don't check ID.</span></li>
        </ul>
        <p className="mt-7 hidden border-t border-forest/15 pt-5 text-xs leading-relaxed text-ink-muted lg:block">{COPY.verificationLimit}</p>
      </section>

      <Card className="p-6 sm:p-9 lg:p-10">
        <section aria-labelledby="profile-setup-title">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Almost there{profile?.universityName ? ` · ${profile.universityName}` : ""}</p>
          <h2 id="profile-setup-title" className="mt-2 text-3xl font-extrabold">Set up your profile</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">This helps your future match know what to call you. Your real name is not required.</p>

          {error && <Notice tone="error" className="mt-5">{error}</Notice>}
          <form aria-label="Complete your student profile" onSubmit={onSubmit} noValidate className="mt-6 space-y-6" aria-busy={busy}>
            <div>
              <label htmlFor="profile-display-name" className="text-sm font-bold">Display name</label>
              <input id="profile-display-name" type="text" autoComplete="nickname" required minLength={2} maxLength={40} value={name} disabled={busy}
                onChange={(event) => { setName(event.target.value); setNameError(null); setError(null); }}
                aria-invalid={Boolean(nameError)} aria-describedby={`profile-name-hint${nameError ? " profile-name-error" : ""}`}
                className="mt-2 h-14 w-full rounded-2xl border border-line bg-surface px-4 text-ink outline-none transition placeholder:text-ink-muted/65 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60" />
              <p id="profile-name-hint" className="mt-2 text-xs leading-relaxed text-ink-muted">2–40 characters. It stays private until everyone in your match agrees to reveal profiles.</p>
              {nameError && <p id="profile-name-error" role="alert" className="mt-2 text-sm font-semibold text-danger">{nameError}</p>}
            </div>

            <div>
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${ageError ? "border-danger/50 bg-danger/5" : "border-line bg-paper hover:border-forest/30"}`} htmlFor="profile-age-confirmation">
                <input id="profile-age-confirmation" type="checkbox" checked={adult} disabled={busy || Boolean(profile?.ageConfirmed)}
                  onChange={(event) => { setAdult(event.target.checked); setAgeError(null); setError(null); }}
                  aria-invalid={Boolean(ageError)} aria-describedby={`profile-age-hint${ageError ? " profile-age-error" : ""}`}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-forest disabled:cursor-not-allowed" />
                <span>
                  <span className="block text-sm font-bold">I confirm I am 18 or older.</span>
                  <span id="profile-age-hint" className="mt-1 block text-xs leading-relaxed text-ink-muted">
                    {profile?.ageConfirmed ? "This self-declaration is already saved." : "This is self-declared. We don't check ID."}
                  </span>
                  {ageError && <span id="profile-age-error" role="alert" className="mt-2 block text-sm font-semibold text-danger">{ageError}</span>}
                </span>
              </label>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Saving your profile…" : "Continue"}
              {!busy && <Icon name="arrow-right" size={19} />}
            </Button>
          </form>
        </section>
      </Card>
      <p className="px-2 text-xs leading-relaxed text-ink-muted lg:hidden">{COPY.verificationLimit}</p>
    </div>
  );
}
