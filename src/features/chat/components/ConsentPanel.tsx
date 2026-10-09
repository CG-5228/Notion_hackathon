import { useState } from "react";
import { Button, Notice } from "@/components";
import { COPY } from "@/types";
import { chatApi } from "../api";
import { explainError } from "../text";
import type { ChatMatchView } from "../types";

/** Independent "Agree to Go" per member, with clear N-of-M state and a leave option. */
export function ConsentPanel({ view, onChange, onLeft }:
  { view: ChatMatchView; onChange: (v: ChatMatchView) => void; onLeft: () => void }) {
  const [busy, setBusy] = useState<"agree" | "leave" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const revealed = view.status === "revealed";
  const canAgree = view.chatEnabled && (view.status === "chatting" || view.status === "locked") && !view.iAgreed;

  async function agree() {
    setBusy("agree"); setError(null);
    try { onChange(await chatApi.agreeToGo(view.id, view.membershipVersion)); }
    catch (e) { setError(explainError(e)); }
    finally { setBusy(null); }
  }
  async function leave() {
    setBusy("leave"); setError(null);
    try { await chatApi.leaveMatch(view.id); onLeft(); }
    catch (e) { setError(explainError(e)); setBusy(null); }
  }

  return (
    <section aria-labelledby="consent-title" className="space-y-3 rounded-2xl border border-line bg-sand/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="consent-title" className="text-base font-semibold">Agree to go</h3>
        <p className="text-sm font-medium" aria-live="polite">
          {view.agreedCount} of {view.memberCount} agreed
        </p>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Who has agreed">
        {view.participants.map((p) => (
          <li key={p.pseudonym}
            className={p.agreed ? "rounded-full bg-mint/50 px-3 py-1 text-xs" : "rounded-full bg-paper px-3 py-1 text-xs text-ink-muted"}>
            {p.agreed ? "✓ " : "… "}{p.pseudonym}{p.isMe ? " (you)" : ""}
          </li>
        ))}
      </ul>
      {!revealed && (
        <p className="text-sm text-ink-muted">
          Names stay hidden until <strong>everyone</strong> agrees.
          {view.status === "locked" && " Membership is locked while people decide; if anyone leaves, everyone agrees again."}
        </p>
      )}
      <Notice tone="warning">{view.mode === "pair" ? COPY.pairWarning : COPY.groupNotice}</Notice>
      {error && <Notice tone="error">{error}</Notice>}
      {!revealed && (
        <div className="flex flex-wrap gap-2">
          <Button variant="mint" onClick={agree} disabled={!canAgree || busy !== null}>
            {view.iAgreed ? "You agreed — waiting for others" : busy === "agree" ? "Agreeing…" : "Agree to Go"}
          </Button>
          {!confirmLeave ? (
            <Button variant="ghost" onClick={() => setConfirmLeave(true)} disabled={busy !== null}>Not for me</Button>
          ) : (
            <span className="flex items-center gap-2">
              <span className="text-sm">Leave this {view.mode === "pair" ? "match" : "group"}?</span>
              <Button variant="danger" onClick={leave} disabled={busy !== null}>{busy === "leave" ? "Leaving…" : "Yes, leave"}</Button>
              <Button variant="ghost" onClick={() => setConfirmLeave(false)}>Cancel</Button>
            </span>
          )}
        </div>
      )}
    </section>
  );
}
