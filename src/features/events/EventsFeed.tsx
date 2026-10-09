import { useEffect, useState } from "react";
import { listEvents } from "./api";
import { CATEGORIES, type EventDetail, type EventFilters } from "./types";
import { GoingCount, KindBadge, fmtDate } from "./components/Labels";

type Props = {
  /** Member 1 wires this to navigate to /events/:id */
  onOpenEvent: (id: string) => void;
  /** Member 1 wires this to /activities/new */
  onCreateActivity?: () => void;
};

export function EventsFeed({ onOpenEvent, onCreateActivity }: Props) {
  const [filters, setFilters] = useState<EventFilters>({ search: "", category: "" });
  const [events, setEvents] = useState<EventDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      setError(null);
      listEvents(filters)
        .then((d) => alive && setEvents(d))
        .catch((e) => alive && setError(e.message ?? "Could not load events"));
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [filters]);

  return (
    <section className="mx-auto max-w-3xl p-4">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Find something to do</h1>
          <p className="text-sm text-slate-600">Pick an activity, then find a buddy or a small group for it.</p>
        </div>
        {onCreateActivity && (
          <button onClick={onCreateActivity} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
            + Create activity
          </button>
        )}
      </header>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <input aria-label="Search" placeholder="Search title or place" value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="rounded-lg border px-3 py-2 sm:col-span-2" />
        <select aria-label="Category" value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value as EventFilters["category"] })}
          className="rounded-lg border px-3 py-2">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input aria-label="Up to date" type="date" value={filters.to ?? ""}
          onChange={(e) => setFilters({ ...filters, to: e.target.value || undefined })}
          className="rounded-lg border px-3 py-2" />
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!events && !error && <p className="text-slate-500">Loading events…</p>}
      {events?.length === 0 && <p className="text-slate-500">No events match. Try different filters or create one.</p>}

      <ul className="space-y-3">
        {events?.map((e) => (
          <li key={e.id}>
            <button onClick={() => onOpenEvent(e.id)}
              className="w-full rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow">
              <KindBadge e={e} />
              <h2 className="mt-2 text-lg font-semibold text-slate-900">{e.title}</h2>
              <p className="text-sm text-slate-700">{fmtDate(e.startsAt)} · {e.venuePublic}</p>
              <div className="mt-1 flex items-center justify-between">
                <GoingCount n={e.goingCount} unis={e.universitiesRepresented} />
                <span className="text-xs capitalize text-slate-500">{e.category}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
