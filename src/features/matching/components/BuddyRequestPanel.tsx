import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Notice, Spinner } from "@/components";
import { cn } from "@/lib/cn";
import { COPY, DEFAULT_GROUP_SIZE, GROUP_MIN_TO_CHAT, GROUP_SIZES, type GroupMaxSize, type MatchMode } from "@/types";
import { friendlyError, matchingApi } from "../api";
import { useBuddyStatus } from "../useBuddyStatus";

export const PAIR_WARNING_TEXT = COPY.pairWarning;
export const GROUP_NOTICE_TEXT = COPY.groupNotice;

/** Find Your Buddy: choose 1-on-1 or a group (3–5), then show true server state. */
export function BuddyRequestPanel({ eventId }: { eventId: string }) {
  const navigate = useNavigate();
  const { status, setStatus, error, refresh } = useBuddyStatus(eventId);
  const [mode, setMode] = useState<MatchMode | null>(null);
  const [size, setSize] = useState<GroupMaxSize>(DEFAULT_GROUP_SIZE);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Route to Member 5's chat only for a legitimate active match (pair of 2, or group >= 3).
  const chatReady =
    status?.state === "matched" &&
    (status.mode === "pair" || status.memberCount >= GROUP_MIN_TO_CHAT);
  useEffect(() => {
    if (chatReady && status && "matchId" in status) navigate(`/buddy/${status.matchId}`);
  }, [chatReady, status, navigate]);

  useEffect(() => setAck(false), [mode]);

  async function submit() {
    if (!mode) return;
    setBusy(true); setActionError(null);
    try {
      await matchingApi.requestBuddy(eventId, mode, mode === "group" ? size : undefined);
      await refresh();
    } catch (e) {
      setActionError(friendlyError(e));
    } finally { setBusy(false); }
  }

  async function cancel(m: MatchMode) {
    setBusy(true); setActionError(null);
    try {
      await matchingApi.cancelBuddyRequest(eventId, m);
      setStatus({ state: "none" });
      await refresh();
    } catch (e) {
      setActionError(friendlyError(e));
    } finally { setBusy(false); }
  }

  if (!status && !error) return <Spinner label="Checking your buddy status" />;
  if (error && !status) return <Notice tone="error">{friendlyError(error)}</Notice>;

  if (status?.state === "queued") {
    return (
      <Card className="space-y-4" aria-live="polite">
        <h2 className="text-xl font-semibold text-ink">
          {status.mode === "pair" ? "Waiting for a buddy" : "Waiting for a group"}
        </h2>
        <p className="text-ink-muted">
          Nobody else has asked for a {status.mode === "pair" ? "one-on-one buddy" : "group"} for this event yet.
          We'll match you as soon as another verified student does — we never invent people.
        </p>
        {actionError && <Notice tone="error">{actionError}</Notice>}
        <Button variant="outline" disabled={busy} onClick={() => cancel(status.mode)}>Cancel request</Button>
      </Card>
    );
  }

  if (status?.state === "forming") {
    return (
      <Card className="space-y-4" aria-live="polite">
        <h2 className="text-xl font-semibold text-ink">Your group is forming</h2>
        <p className="text-3xl font-bold text-ink" data-testid="member-count">
          {status.memberCount} <span className="text-base font-normal text-ink-muted">of up to {status.maxSize}</span>
        </p>
        <p className="text-ink-muted">
          Group chat opens once {GROUP_MIN_TO_CHAT} students have joined. {Math.max(0, GROUP_MIN_TO_CHAT - status.memberCount)} more needed.
        </p>
        <Notice tone="info">{COPY.groupNotice}</Notice>
        {actionError && <Notice tone="error">{actionError}</Notice>}
        <Button variant="outline" disabled={busy} onClick={() => cancel("group")}>Leave group</Button>
      </Card>
    );
  }

  if (status?.state === "matched") {
    return <Spinner label="Opening your private chat" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Find your buddy</h2>
        <p className="text-ink-muted">Choose how you'd like to go. Everyone stays anonymous until you all agree.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2" role="radiogroup" aria-label="Matching mode">
        <ModeCard selected={mode === "pair"} onSelect={() => setMode("pair")} title="One-on-One" subtitle="Exactly 2 students">
          <p className="font-bold text-warn-ink">{COPY.pairWarning}</p>
        </ModeCard>
        <ModeCard selected={mode === "group"} onSelect={() => setMode("group")} title="Group" subtitle="3–5 students">
          <p className="text-ink">{COPY.groupNotice}</p>
          <p className="mt-1 text-ink-muted">More flexibility if someone drops out — but it guarantees nothing.</p>
        </ModeCard>
      </div>

      {mode === "group" && (
        <fieldset className="space-y-2">
          <legend className="font-semibold text-ink">Maximum group size</legend>
          <div className="flex gap-2">
            {GROUP_SIZES.map((n) => (
              <button key={n} type="button" aria-pressed={size === n} onClick={() => setSize(n)}
                className={cn("h-11 w-14 rounded-full border font-semibold transition",
                  size === n ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink hover:border-ink/40")}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {mode && (
        <Card className="space-y-4">
          <Notice tone="warning" title="Before you continue">
            {mode === "pair" ? COPY.pairWarning : COPY.groupNotice}
          </Notice>
          <label className="flex items-start gap-3 text-sm text-ink">
            <input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            I understand attendance isn't guaranteed and I'll meet in a public place.
          </label>
          {actionError && <Notice tone="error">{actionError}</Notice>}
          <Button size="lg" disabled={!ack || busy} onClick={submit}>
            {busy ? "Finding…" : mode === "pair" ? "Find a buddy" : `Find a group (max ${size})`}
          </Button>
        </Card>
      )}
    </div>
  );
}

function ModeCard({ selected, onSelect, title, subtitle, children }:
  { selected: boolean; onSelect: () => void; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect}
      className={cn("rounded-card border p-5 text-left text-sm transition",
        selected ? "border-ink bg-mint/20 shadow-soft" : "border-line bg-paper hover:border-ink/30")}>
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="mb-3 text-ink-muted">{subtitle}</p>
      {children}
    </button>
  );
}
