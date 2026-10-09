import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, ButtonLink, Card, Icon, Notice, Spinner } from "@/components";
import { COPY, GROUP_MIN_TO_CHAT } from "@/types";
import { chatApi } from "../api";
import { MAX_MESSAGE_LENGTH, decodeEntities, explainError, validateMessage } from "../text";
import { useMatchRoom } from "../useMatchRoom";
import type { ChatMatchView } from "../types";
import { ConsentPanel } from "./ConsentPanel";
import { Icebreakers } from "./Icebreakers";
import { ReliabilityBadge } from "./ReliabilityBadge";
import { RevealedProfiles } from "./RevealedProfiles";
import { SafetyDialog } from "./SafetyDialog";

const statusLabel: Record<ChatMatchView["status"], string> = {
  forming: "Waiting for more people",
  chatting: "Chatting",
  locked: "Deciding — membership locked",
  revealed: "Everyone agreed",
  closed: "Closed",
};

/** Private pseudonymous chat for a pair (2) or group (3–5). Route: /buddy/:matchId */
export function BuddyChat({ matchId }: { matchId: string }) {
  const { state, refresh, setView, appendMessage } = useMatchRoom(matchId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [safety, setSafety] = useState<{ pseudonym: string; mode: "report" | "block" } | null>(null);
  const [left, setLeft] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const messageCount = state.phase === "ready" ? state.messages.length : 0;
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end" }); }, [messageCount]);

  if (left) {
    return (
      <Card className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="text-2xl font-bold">You've left this chat</h1>
        <p className="text-ink-muted">{left}</p>
        <p className="text-sm text-ink-muted">Nobody is re-matched with you automatically — you can search again from the event.</p>
        <Link className="font-semibold underline" to="/my-activities">Back to my activities</Link>
      </Card>
    );
  }
  if (state.phase === "loading") return <Spinner label="Opening chat" />;
  if (state.phase === "error") {
    return (
      <Card className="mx-auto max-w-xl space-y-4">
        <Notice tone="error" title="Couldn't open this chat">{explainError(state.error)}</Notice>
        <Button variant="outline" onClick={() => void refresh()}>Try again</Button>
      </Card>
    );
  }

  const { view, messages } = state;
  const others = view.participants.filter((p) => !p.isMe);
  const needed = view.mode === "pair" ? 2 : GROUP_MIN_TO_CHAT;

  async function send(e: FormEvent) {
    e.preventDefault();
    const problem = validateMessage(draft);
    if (problem) { setSendError(problem); return; }
    setSending(true); setSendError(null);
    try { appendMessage(await chatApi.sendMessage(matchId, draft.trim())); setDraft(""); }
    catch (err) { setSendError(explainError(err)); }
    finally { setSending(false); }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_20rem]">
      <section className="flex min-h-[70vh] flex-col rounded-card border border-line bg-paper shadow-soft" aria-label="Chat">
        <header className="border-b border-line p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lilac-deep">
            {view.mode === "pair" ? "One-on-one" : `Group · ${view.memberCount}/${view.maxSize}`} · {statusLabel[view.status]}
          </p>
          <h1 className="mt-1 text-xl font-bold">{view.event.title ?? "Your buddy chat"}</h1>
          <p className="text-sm text-ink-muted">You appear as <strong>{view.myPseudonym}</strong></p>
        </header>

        {!view.chatEnabled ? (
          <div className="flex-1 p-6">
            <Notice tone="info" title={view.status === "closed" ? "This chat is closed" : "Chat isn't open yet"}>
              {view.status === "closed"
                ? "This match has ended. You can look for a new buddy from the event page."
                : `Chat opens when ${needed} people are here (${view.memberCount} so far). We only match real students — nobody is invented to fill a group.`}
            </Notice>
          </div>
        ) : (
          <>
            <ol className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite" aria-label="Messages">
              {messages.length === 0 && (
                <li className="py-10 text-center text-sm text-ink-muted">
                  No messages yet. Say hi — {view.status === "revealed" ? "your plan starts here." : "names stay hidden for now."}
                </li>
              )}
              {messages.map((m) => m.kind === "system" ? (
                <li key={m.id} className="text-center text-xs text-ink-muted">{decodeEntities(m.body)}</li>
              ) : (
                <li key={m.id} className={m.isOwn ? "ml-auto max-w-[80%]" : "max-w-[80%]"}>
                  <p className="mb-0.5 text-xs text-ink-muted">{m.isOwn ? "You" : m.pseudonym}</p>
                  <p className={(m.isOwn ? "bg-ink text-paper" : "bg-sand text-ink") + " whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm"}>
                    {decodeEntities(m.body)}
                  </p>
                </li>
              ))}
              <div ref={endRef} />
            </ol>
            <form onSubmit={send} className="space-y-2 border-t border-line p-3">
              {messages.length < 3 && <Icebreakers onPick={setDraft} />}
              <div className="flex gap-2">
                <label htmlFor="chat-input" className="sr-only">Message</label>
                <textarea id="chat-input" value={draft} rows={1} maxLength={MAX_MESSAGE_LENGTH}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(e); } }}
                  className="min-h-11 flex-1 resize-none rounded-2xl border border-line bg-paper px-3 py-2.5 text-sm"
                  placeholder="Message…" />
                <Button type="submit" disabled={sending || !draft.trim()}>{sending ? "Sending…" : "Send"}</Button>
              </div>
              {sendError && <p role="alert" className="text-sm text-danger">{sendError}</p>}
            </form>
          </>
        )}
      </section>

      <aside className="space-y-4">
        {view.status !== "closed" && view.chatEnabled && (
          <ConsentPanel view={view} onChange={setView}
            onLeft={() => setLeft("Everyone else's agreements were reset so the rest can decide again.")} />
        )}
        {view.status === "revealed" && (
          <Card className="min-w-0 space-y-4 !p-4" role="region" aria-labelledby="buddy-profiles-title">
            <div>
              <div className="flex items-center gap-2.5 text-forest">
                <Icon name="users" />
                <h2 id="buddy-profiles-title" className="text-lg font-semibold">{view.mode === "pair" ? "Your buddy" : "Your buddies"}</h2>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">Names shared with everyone’s agreement.</p>
            </div>
            <RevealedProfiles profiles={view.revealedProfiles ?? []} />
            <ButtonLink to={`/plans/${view.id}`} variant="outline" className="w-full justify-between">
              Open the plan<Icon name="arrow-right" size={16} />
            </ButtonLink>
          </Card>
        )}
        <Card className="space-y-3 p-4">
          <h2 className="text-base font-semibold">People here</h2>
          <ul className="space-y-3">
            {others.map((p) => (
              <li key={p.pseudonym} className="space-y-1">
                <p className="text-sm font-medium">{p.pseudonym}</p>
                <ReliabilityBadge band={p.reliabilityBand} />
                <div className="flex gap-3 text-xs">
                  <button className="underline" onClick={() => setSafety({ pseudonym: p.pseudonym, mode: "report" })}>Report</button>
                  <button className="text-danger underline" onClick={() => setSafety({ pseudonym: p.pseudonym, mode: "block" })}>Block</button>
                </div>
              </li>
            ))}
            {others.length === 0 && <li className="text-sm text-ink-muted">Nobody else yet.</li>}
          </ul>
          <p className="text-xs text-ink-muted">{COPY.attendanceDisclaimer}</p>
        </Card>
        <Notice tone="info">{COPY.safetyTip}</Notice>
      </aside>

      {safety && (
        <SafetyDialog matchId={matchId} pseudonym={safety.pseudonym} mode={safety.mode}
          onClose={() => setSafety(null)}
          onBlocked={() => setLeft("You blocked a member. You won't see each other's messages or be matched again.")} />
      )}
    </div>
  );
}
