import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Notice, Spinner } from "@/components";
import { COPY } from "@/types";
import { getEvent, reportEvent, setGoing } from "./api";
import type { EventDetail } from "./types";
import { GoingCount, KindBadge, fmtDate, inputClass } from "./components/Labels";

type Props = {
  eventId: string;
  /** Invite-only link hash. Defaults to the `?invite=` query param. */
  inviteHash?: string | null;
  /** Defaults to navigating to /find-buddy/:eventId (Member 4's pair/group selector). */
  onFindBuddy?: (eventId: string) => void;
};

export function ActivityDetail({ eventId, inviteHash, onFindBuddy }: Props) {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const invite = inviteHash ?? search.get("invite");
  const [e, setE] = useState<EventDetail | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reportInFlight = useRef(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setE(undefined);
    setErr(null);
    setReportMsg(null);
    setReportOpen(false);
    setReason("");
    getEvent(eventId, invite)
      .then((d) => alive && setE(d))
      .catch((x) => { if (alive) { setErr(x.message); setE(null); } });
    return () => { alive = false; };
  }, [eventId, invite]);

  if (e === undefined) return <Spinner label="Loading event" />;
  if (!e) return <Notice tone="error">{err ?? "This activity isn't available to you."}</Notice>;

  const toggle = async () => {
    setBusy(true); setErr(null);
    try {
      const n = await setGoing(e.id, !e.iAmGoing, invite);
      setE({ ...e, iAmGoing: !e.iAmGoing, goingCount: n });
    } catch (x) { setErr(x instanceof Error ? x.message : "Could not update RSVP"); }
    finally { setBusy(false); }
  };

  const findBuddy = () => (onFindBuddy ? onFindBuddy(e.id) : navigate(`/find-buddy/${e.id}`));

  const submitReport = async () => {
    if (reportInFlight.current || reason.trim().length < 5) return;
    reportInFlight.current = true;
    setReportBusy(true);
    setReportMsg(null);
    try {
      await reportEvent(e.id, reason.trim());
      setReportMsg("Report submitted privately. This does not mean a moderator is monitoring live.");
      setReportOpen(false);
      setReason("");
    } catch (error) {
      const unavailable = typeof error === "object" && error !== null && "code" in error
        && (error.code === "PGRST202" || error.code === "42883");
      setReportMsg(unavailable
        ? "Reporting is not connected yet. Your report has not been sent."
        : "Your report could not be sent. Your reason is saved here; please try again.");
    } finally {
      reportInFlight.current = false;
      setReportBusy(false);
    }
  };

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <div>
        <KindBadge e={e} />
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{e.title}</h1>
        <p className="mt-2 text-ink-soft">
          {fmtDate(e.startsAt)}{e.endsAt && ` – ${fmtDate(e.endsAt)}`}
        </p>
        <p className="text-ink-soft"><span className="font-semibold text-ink">Meeting point:</span> {e.venuePublic}</p>
      </div>

      {e.description && <p className="whitespace-pre-line leading-relaxed text-ink">{e.description}</p>}

      <Card className="space-y-1 bg-sand text-sm text-ink-soft">
        <p><span className="font-semibold text-ink">Source:</span>{" "}
          {e.kind === "curated_public" && e.sourceUrl
            ? <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Official organiser page</a>
            : "Posted by a verified student"}
          {e.reviewStatus === "curated" && " · reviewed by curators"}
          {e.reviewStatus === "pending" && " · awaiting review"}
        </p>
        {e.ratingCount > 0 && e.ratingAvg !== null && (
          <p>Rated {e.ratingAvg.toFixed(1)}/5 from {e.ratingCount} participant rating{e.ratingCount === 1 ? "" : "s"}.</p>
        )}
        <p className="text-xs text-ink-muted">Participant ratings do not establish real-world safety.</p>
        <p className="text-xs text-ink-muted">{COPY.safetyTip} {COPY.attendanceDisclaimer}</p>
      </Card>

      <GoingCount n={e.goingCount} unis={e.universitiesRepresented} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant={e.iAmGoing ? "mint" : "outline"} size="lg" onClick={toggle} disabled={busy} aria-pressed={e.iAmGoing}>
          {e.iAmGoing ? "✓ I'm going" : "I'm going"}
        </Button>
        <Button size="lg" className="flex-1" onClick={findBuddy}>Find your buddy →</Button>
      </div>
      {!e.iAmGoing && <p className="text-sm text-ink-muted">Mark yourself as going before requesting a buddy or group for this event.</p>}
      {err && <Notice tone="error">{err}</Notice>}

      <div>
        <Button variant="outline" disabled={reportBusy} onClick={() => setReportOpen((o) => !o)}>
          Report this event
        </Button>
        {reportOpen && (
          <div className="mt-2 space-y-2">
            <textarea aria-label="Report reason" disabled={reportBusy} value={reason} onChange={(x) => setReason(x.target.value)} maxLength={500} rows={3}
              placeholder="What's wrong with this event?" className={inputClass} />
            <Button variant="danger" disabled={reportBusy || reason.trim().length < 5} onClick={submitReport}>{reportBusy ? "Sending report…" : "Send report"}</Button>
          </div>
        )}
        {reportMsg && <p role="status" className="mt-2 text-sm text-ink-muted">{reportMsg}</p>}
      </div>
    </article>
  );
}
