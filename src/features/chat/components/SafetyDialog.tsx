import { useEffect, useRef, useState } from "react";
import { Button, Notice } from "@/components";
import { chatApi } from "../api";
import { explainError } from "../text";
import { REPORT_REASONS, type ReportReason } from "../types";

type Mode = "report" | "block";

/** Report / block a member by PSEUDONYM. The server resolves the account; nothing is revealed here. */
export function SafetyDialog({ matchId, pseudonym, mode, mapLabel, onClose, onBlocked }: {
  matchId: string; pseudonym: string; mode: Mode; mapLabel?: string;
  onClose: () => void; onBlocked?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<ReportReason>("harassment");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal?.(); }, []);
  const who = mapLabel ?? pseudonym;

  async function submit() {
    setBusy(true); setError(null);
    try {
      if (mode === "report") {
        await chatApi.reportUser(pseudonym, matchId, reason, details);
        setDone("Report submitted. It's stored privately for review. We don't monitor chats live — if you're in danger, call 112 or 999.");
      } else {
        await chatApi.blockUser(pseudonym, matchId);
        setDone(`${who} is blocked. You won't be matched again, and you've been separated from this chat.`);
        onBlocked?.();
      }
    } catch (e) { setError(explainError(e)); }
    finally { setBusy(false); }
  }

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="safety-title"
      className="m-auto w-[min(92vw,28rem)] rounded-card border border-line bg-paper p-6 text-ink shadow-lift backdrop:bg-ink/40">
      <h2 id="safety-title" className="text-xl font-bold">{mode === "report" ? `Report ${who}` : `Block ${who}?`}</h2>
      {done ? (
        <div className="mt-4 space-y-4"><Notice tone="success">{done}</Notice>
          <Button onClick={() => ref.current?.close()}>Close</Button></div>
      ) : (
        <div className="mt-4 space-y-4">
          {mode === "report" ? (
            <>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">What happened?</legend>
                {REPORT_REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="reason" value={r.value} checked={reason === r.value}
                      onChange={() => setReason(r.value)} />{r.label}
                  </label>
                ))}
              </fieldset>
              <label className="block text-sm font-medium">Details (optional)
                <textarea value={details} maxLength={1000} onChange={(e) => setDetails(e.target.value)} rows={3}
                  className="mt-1 w-full rounded-xl border border-line bg-paper p-2 text-sm" />
              </label>
              <p className="text-xs text-ink-muted">They won't be told who reported them. A report alone never changes anyone's reliability.</p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              You'll stop seeing each other's messages and won't be matched together again.
              {" "}In a group, you'll leave this group and everyone's agreements reset.
            </p>
          )}
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex gap-2">
            <Button variant={mode === "block" ? "danger" : "primary"} onClick={submit} disabled={busy}>
              {busy ? "Sending…" : mode === "report" ? "Submit report" : "Block"}
            </Button>
            <Button variant="ghost" onClick={() => ref.current?.close()}>Cancel</Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
