import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Notice, Spinner } from "@/components";
import { COPY } from "@/types";
import { chatApi } from "../api";
import { explainError } from "../text";
import { useMatchRoom } from "../useMatchRoom";
import type { MyReliability } from "../types";
import { ReliabilityPanel } from "./ReliabilityPanel";
import { RevealedProfiles } from "./RevealedProfiles";
import { SafetyDialog } from "./SafetyDialog";

/** Confirmed plan after unanimous agreement. Route: /plans/:matchId */
export function PlanView({ matchId }: { matchId: string }) {
  const { state, refresh } = useMatchRoom(matchId, { withMessages: false });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<MyReliability | null>(null);
  const [safety, setSafety] = useState<string | null>(null);

  useEffect(() => { chatApi.myReliability().then(setMine).catch(() => setMine(null)); }, []);

  if (result) {
    return (
      <Card className="mx-auto max-w-xl space-y-3">
        <h1 className="text-2xl font-bold">Plan cancelled</h1>
        <Notice tone="success">{result}</Notice>
        <p className="text-sm text-ink-muted">The others have been told you can't make it.</p>
        <Link className="font-semibold underline" to="/my-activities">Back to my activities</Link>
      </Card>
    );
  }
  if (state.phase === "loading") return <Spinner label="Loading plan" />;
  if (state.phase === "error") {
    return (
      <Card className="mx-auto max-w-xl space-y-3">
        <Notice tone="error" title="Couldn't load this plan">{explainError(state.error)}</Notice>
        <Button variant="outline" onClick={() => void refresh()}>Try again</Button>
      </Card>
    );
  }
  const { view } = state;
  if (view.status !== "revealed") {
    return (
      <Card className="mx-auto max-w-xl space-y-3">
        <Notice tone="info" title="Not a confirmed plan yet">
          A plan only exists once everyone in the chat has agreed to go. Nothing is tracked before that.
        </Notice>
        <Link className="font-semibold underline" to={`/buddy/${view.id}`}>Back to the chat</Link>
      </Card>
    );
  }

  const starts = view.event.startsAt ? new Date(view.event.startsAt) : null;
  const started = starts ? starts.getTime() <= Date.now() : false;
  const hoursLeft = starts ? (starts.getTime() - Date.now()) / 36e5 : Infinity;

  async function cancel() {
    setBusy(true); setError(null);
    try { setResult((await chatApi.cancelPlan(matchId, reason)).message); }
    catch (e) { setError(explainError(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lilac-deep">Confirmed plan · {view.mode === "pair" ? "One-on-one" : "Group"}</p>
        <h1 className="text-3xl font-bold">{view.event.title}</h1>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-ink-muted">When</dt><dd className="font-medium">{starts ? starts.toLocaleString() : "Time to be confirmed"}</dd></div>
          <div><dt className="text-ink-muted">Meeting point</dt><dd className="font-medium">{view.event.venuePublic ?? "Agree on a public spot in chat"}</dd></div>
        </dl>
        <Notice tone="warning" title="Attendance is not guaranteed">
          {view.mode === "pair" ? COPY.pairWarning : COPY.groupNotice}
        </Notice>
        <Notice tone="info">{COPY.safetyTip}</Notice>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Going with</h2>
        <RevealedProfiles profiles={view.revealedProfiles ?? []} />
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="font-semibold underline" to={`/buddy/${view.id}`}>Open chat</Link>
          {view.participants.filter((p) => !p.isMe).map((p, i) => (
            <button key={p.pseudonym} className="underline" onClick={() => setSafety(p.pseudonym)}>
              Report {view.revealedProfiles?.[i]?.displayName ?? p.pseudonym}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        {started ? (
          <>
            <h2 className="text-lg font-semibold">After the meetup</h2>
            <Link className="font-semibold underline" to={`/meetups/${view.id}/check-in`}>Tell us how it went</Link>
          </>
        ) : !cancelOpen ? (
          <>
            <h2 className="text-lg font-semibold">Can't make it?</h2>
            <p className="text-sm text-ink-muted">
              {hoursLeft > 2
                ? "Cancelling more than 2 hours before is neutral — it never counts against you."
                : "It's less than 2 hours before. A late cancellation goes to review — it isn't an automatic penalty, and emergencies are excused."}
            </p>
            <Button variant="outline" onClick={() => setCancelOpen(true)}>Can't Make It</Button>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium">Reason (optional, shared only with reviewers)
              <textarea rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-paper p-2 text-sm" />
            </label>
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex gap-2">
              <Button variant="danger" onClick={cancel} disabled={busy}>{busy ? "Cancelling…" : "Confirm cancellation"}</Button>
              <Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep my plan</Button>
            </div>
          </>
        )}
      </Card>

      <ReliabilityPanel mine={mine} />

      {safety && <SafetyDialog matchId={matchId} pseudonym={safety} mode="report" onClose={() => setSafety(null)} />}
    </div>
  );
}
