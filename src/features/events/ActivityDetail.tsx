import { useEffect, useState } from "react";
import { getEvent, reportEvent, setGoing } from "./api";
import type { EventDetail } from "./types";
import { GoingCount, KindBadge, fmtDate } from "./components/Labels";

type Props = {
  eventId: string;
  /** From ?invite= for invite-only links */
  inviteHash?: string | null;
  /** Member 1 wires to /find-buddy/:eventId (Member 4's pair/group selector) */
  onFindBuddy: (eventId: string) => void;
};

export function ActivityDetail({ eventId, inviteHash, onFindBuddy }: Props) {
  const [e, setE] = useState<EventDetail | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  useEffect(() => {
    getEvent(eventId, inviteHash).then(setE).catch((x) => { setErr(x.message); setE(null); });
  }, [eventId, inviteHash]);

  if (e === undefined) return <p className="p-4 text-slate-500">Loading…</p>;
  if (!e) return <p className="p-4 text-slate-700">{err ?? "This activity isn't available to you."}</p>;

  const toggle = async () => {
    setBusy(true); setErr(null);
    try {
      const n = await setGoing(e.id, !e.iAmGoing, inviteHash);
      setE({ ...e, iAmGoing: !e.iAmGoing, goingCount: n });
    } catch (x: any) { setErr(x.message ?? "Could not update RSVP"); }
    finally { setBusy(false); }
  };

  const submitReport = async () => {
    try { await reportEvent(e.id, reason.trim()); setReportMsg("Report sent privately to moderators."); setReportOpen(false); }
    catch { setReportMsg("Reporting will be available once safety tools are connected."); }
  };

  return (
    <article className="mx-auto max-w-2xl space-y-4 p-4">
      <KindBadge e={e} />
      <h1 className="text-2xl font-bold text-slate-900">{e.title}</h1>
      <p className="text-slate-700">
        {fmtDate(e.startsAt)}{e.endsAt && ` – ${fmtDate(e.endsAt)}`}<br />
        <span className="font-medium">Meeting point:</span> {e.venuePublic}
      </p>
      {e.description && <p className="whitespace-pre-line text-slate-800">{e.description}</p>}

      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        <p><span className="font-medium">Source:</span>{" "}
          {e.kind === "curated_public" && e.sourceUrl
            ? <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Official organiser page</a>
            : "Posted by a verified student"}
          {e.reviewStatus === "curated" && " · reviewed by curators"}
          {e.reviewStatus === "pending" && " · awaiting review"}
        </p>
        {e.ratingCount > 0 && e.ratingAvg !== null && (
          <p className="mt-1">Rated {e.ratingAvg.toFixed(1)}/5 from {e.ratingCount} participant rating{e.ratingCount === 1 ? "" : "s"}.</p>
        )}
        <p className="mt-1 text-xs text-slate-500">Ratings and RSVPs don't guarantee safety or attendance. Meet in public places.</p>
      </div>

      <GoingCount n={e.goingCount} unis={e.universitiesRepresented} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={toggle} disabled={busy} aria-pressed={e.iAmGoing}
          className={`rounded-lg border px-4 py-3 font-semibold ${e.iAmGoing ? "bg-emerald-600 text-white" : "bg-white text-slate-900"}`}>
          {e.iAmGoing ? "✓ I'm Going" : "I'm Going"}
        </button>
        <button onClick={() => onFindBuddy(e.id)}
          className="flex-1 rounded-lg bg-slate-900 px-4 py-4 text-lg font-bold text-white">
          Find Your Buddy
        </button>
      </div>
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}

      <div>
        <button onClick={() => setReportOpen((o) => !o)} className="text-sm text-slate-600 underline">Report this event</button>
        {reportOpen && (
          <div className="mt-2 space-y-2">
            <textarea value={reason} onChange={(x) => setReason(x.target.value)} maxLength={500}
              placeholder="What's wrong with this event?" className="w-full rounded-lg border p-2" />
            <button disabled={reason.trim().length < 5} onClick={submitReport}
              className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Send report</button>
          </div>
        )}
        {reportMsg && <p className="mt-1 text-sm text-slate-600">{reportMsg}</p>}
      </div>
    </article>
  );
}
