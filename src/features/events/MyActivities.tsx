import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Notice, Spinner } from "@/components";
import { backendErrorMessage } from "@/lib/backend-errors";
import { listMyActivities } from "./api";
import type { MyActivity } from "./types";
import { fmtDate } from "./components/Labels";

type Props = {
  /** Defaults to linking to /events/:id */
  onOpenEvent?: (id: string) => void;
};

/** Own hosted activities and own RSVPs only. Never an attendee list. */
export function MyActivities({ onOpenEvent }: Props = {}) {
  const [items, setItems] = useState<MyActivity[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    listMyActivities().then((d) => alive && setItems(d))
      .catch((e) => alive && setErr(backendErrorMessage(e, "Could not load your activities. Please try again.")));
    return () => { alive = false; };
  }, []);

  const inviteLink = (a: MyActivity) => `${window.location.origin}/events/${a.id}?invite=${a.inviteHash}`;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">Events I'm going to</h2>
      {err && <Notice tone="error">{err}</Notice>}
      {!items && !err && <Spinner label="Loading your activities" />}
      {items?.length === 0 && <p className="text-ink-muted">Nothing yet. Say you're going to an event, or create an activity.</p>}
      <ul className="space-y-2">
        {items?.map((a) => {
          const cls = "block text-left";
          const body = (
            <>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{a.relation === "hosting" ? "Hosting" : "Going"}</span>
              <span className="block font-semibold text-ink">{a.title}</span>
              <span className="block text-sm text-ink-soft">{fmtDate(a.startsAt)} · {a.venuePublic} · {a.goingCount} going</span>
            </>
          );
          return (
            <li key={a.id} className="rounded-card border border-line bg-paper p-4 shadow-soft">
              {onOpenEvent
                ? <button type="button" onClick={() => onOpenEvent(a.id)} className={cls}>{body}</button>
                : <Link to={`/events/${a.id}`} className={cls}>{body}</Link>}
              {a.relation === "hosting" && a.visibility === "invite_only" && a.inviteHash && (
                <p className="mt-2 break-all text-xs text-ink-muted">
                  Private invite link (share only with people you trust): <code>{inviteLink(a)}</code>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
