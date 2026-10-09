import { useState, type FormEvent } from "react";
import { Button, Card, Notice } from "@/components";
import { useSession } from "@/lib/auth";
import { updateMyProfile } from "@/lib/rpc";

/** Shown to verified students missing a display name or 18+ self-attestation. */
export function ProfileSetup() {
  const { profile, refreshProfile } = useSession();
  const [name, setName] = useState(profile?.displayName ?? "");
  const [adult, setAdult] = useState(profile?.ageConfirmed ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 40) return setError("Display name must be 2–40 characters.");
    if (!adult) return setError("You must confirm you are 18 or older.");
    setBusy(true); setError(null);
    try { await updateMyProfile({ displayName: trimmed, ageConfirmed: true }); await refreshProfile(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save."); }
    finally { setBusy(false); }
  }

  return (
    <Card className="mx-auto max-w-lg p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-deep">Verified · {profile?.universityName}</p>
      <h2 className="mt-2 text-3xl font-bold">Nearly there</h2>
      <p className="mt-2 text-sm text-ink-muted">Your name stays private. Buddies only see it after everyone agrees to go.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold">Display name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
            className="mt-1.5 h-12 w-full rounded-xl border border-line bg-paper px-4 outline-none focus:border-lilac-deep" />
        </label>
        <label className="flex items-start gap-3 rounded-xl bg-sand p-4 text-sm">
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1 h-4 w-4 accent-ink" />
          <span>I confirm I am 18 or older. <span className="text-ink-muted">(Self-declared — we don't check ID.)</span></span>
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Saving…" : "Continue"}</Button>
      </form>
    </Card>
  );
}
