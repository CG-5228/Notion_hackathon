import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Notice, Spinner } from "@/components";
import type { MeetupOutcome } from "@/types";
import { chatApi } from "../api";
import { explainError } from "../text";
import { useMatchRoom } from "../useMatchRoom";

const OPTIONS: Array<{ value: MeetupOutcome; label: string; hint: string }> = [
  { value: "attended", label: "Attended", hint: "I went and we met up." },
  { value: "did_not_meet", label: "Did not meet", hint: "We didn't manage to meet." },
  { value: "dispute_other", label: "Dispute / other", hint: "Something else happened — a reviewer will look." },
];

/** Post-meetup self-report. Route: /meetups/:matchId/check-in */
export function AttendanceCheckIn({ matchId }: { matchId: string }) {
  const { state, refresh } = useMatchRoom(matchId, { withMessages: false });
  const [choice, setChoice] = useState<MeetupOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (state.phase === "loading") return <Spinner label="Loading" />;
  if (state.phase === "error") {
    return (
      <Card className="mx-auto max-w-xl space-y-3">
        <Notice tone="error" title="Couldn't load this meetup">{explainError(state.error)}</Notice>
        <Button variant="outline" onClick={() => void refresh()}>Try again</Button>
      </Card>
    );
  }
  const { view } = state;
  const starts = view.event.startsAt ? new Date(view.event.startsAt) : null;
  const notYet = starts ? starts.getTime() > Date.now() : false;
  const current = choice ?? view.myCheckIn;

  async function submit() {
    if (!current) return;
    setBusy(true); setError(null);
    try { setDone((await chatApi.submitOutcome(matchId, current)).message); void refresh(); }
    catch (e) { setError(explainError(e)); }
    finally { setBusy(false); }
  }

  return (
    <Card className="mx-auto max-w-xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lilac-deep">After the meetup</p>
        <h1 className="mt-1 text-2xl font-bold">{view.event.title ?? "How did it go?"}</h1>
      </div>
      {view.status !== "revealed" ? (
        <Notice tone="info">Check-ins are only for plans everyone agreed to. Nothing is tracked for chats without full agreement.</Notice>
      ) : notYet ? (
        <Notice tone="info">Check-in opens when the meetup starts{starts ? ` (${starts.toLocaleString()})` : ""}.</Notice>
      ) : (
        <>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">What happened?</legend>
            {OPTIONS.map((o) => (
              <label key={o.value}
                className={"flex cursor-pointer gap-3 rounded-2xl border p-3 " + (current === o.value ? "border-ink bg-sand" : "border-line")}>
                <input type="radio" name="outcome" value={o.value} checked={current === o.value} onChange={() => setChoice(o.value)} />
                <span><span className="block font-medium">{o.label}</span><span className="text-sm text-ink-muted">{o.hint}</span></span>
              </label>
            ))}
          </fieldset>
          {done && <Notice tone="success">{done}</Notice>}
          {error && <Notice tone="error">{error}</Notice>}
          <Button onClick={submit} disabled={!current || busy}>{busy ? "Saving…" : view.myCheckIn ? "Update my answer" : "Submit"}</Button>
        </>
      )}
      <p className="text-xs text-ink-muted">
        Attendance only counts when it's confirmed by more than one person. One person saying "did not meet" never lowers
        anyone's reliability by itself — it goes to review. We don't use location tracking.
      </p>
      <Link className="text-sm font-semibold underline" to={`/plans/${view.id}`}>Back to the plan</Link>
    </Card>
  );
}
