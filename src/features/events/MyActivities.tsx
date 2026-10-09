import { useEffect, useState } from "react";
import { listMyActivities } from "./api";
import type { MyActivity } from "./types";
import { fmtDate } from "./components/Labels";

type Props = { onOpenEvent: (id: string) => void };

/** Own hosted activities and own RSVPs only. Never an attendee list. */
export function MyActivities({ onOpenEvent }: Props) {
  const [items, setItems] = useState<MyActivity[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { listMyActivities().then(setItems).catch((e) => setErr(e.message)); }, []);

  const inviteLink = (a: MyActivity) => `${window.location.origin}/events/${a.id}?invite=${a.inviteHash}`;

  return (
    <section className="mx-auto max-w-2xl p-4">
      <h1 className="mb-3 text-2xl font-bold text-slate-900">My activities</h1>
      {err && <p role="alert" className="text-red-700">{err}</p>}
      {items?.length === 0 && <p className="text-slate-500">Nothing yet. RSVP or create an activity.</p>}
      <ul className="space-y-2">
        {items?.map((a) => (
          <li key={a.id} className="rounded-xl border bg-white p-3">
            <button onClick={() => onOpenEvent(a.id)} className="text-left">
              <span className="text-xs font-medium uppercase text-slate-500">{a.relation === "hosting" ? "Hosting" : "Going"}</span>
              <p className="font-semibold text-slate-900">{a.title}</p>
              <p className="text-sm text-slate-600">{fmtDate(a.startsAt)} · {a.venuePublic} · {a.goingCount} going</p>
            </button>
            {a.relation === "hosting" && a.inviteHash && (
              <button onClick={() => navigator.clipboard.writeText(inviteLink(a))} className="mt-1 text-sm underline">
                Copy invite link
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
