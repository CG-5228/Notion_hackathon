import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, ButtonLink, Notice, Spinner } from "@/components";
import { listEvents } from "./api";
import { CATEGORIES, type EventDetail, type EventFilters } from "./types";
import { GoingCount, KindBadge, fmtDate, inputClass } from "./components/Labels";

type Props = {
  /** Defaults to navigating to /events/:id */
  onOpenEvent?: (id: string) => void;
  /** Defaults to linking to /activities/new */
  onCreateActivity?: () => void;
};

/** Signed-in home: curated public events + student activities with anonymous "going" counts. */
export function EventsFeed({ onOpenEvent, onCreateActivity }: Props = {}) {
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
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-ink-muted">Pick something to go to, then find a buddy or a small group for it.</p>
        {onCreateActivity
          ? <Button variant="mint" onClick={onCreateActivity}>＋ Create activity</Button>
          : <ButtonLink to="/activities/new" variant="mint">＋ Create activity</ButtonLink>}
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <input aria-label="Search" placeholder="Search title or place" value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className={`${inputClass} mt-0 sm:col-span-2`} />
        <select aria-label="Category" value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value as EventFilters["category"] })}
          className={`${inputClass} mt-0 capitalize`}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input aria-label="Up to date" type="date" value={filters.to ?? ""}
          onChange={(e) => setFilters({ ...filters, to: e.target.value || undefined })}
          className={`${inputClass} mt-0`} />
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!events && !error && <Spinner label="Loading events" />}
      {events?.length === 0 && (
        <p className="rounded-card border border-dashed border-ink/15 p-8 text-center text-ink-muted">
          No events match. Try different filters or create one.
        </p>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {events?.map((e) => {
          const body = (
            <>
              <KindBadge e={e} />
              <h2 className="mt-3 text-lg font-bold text-ink">{e.title}</h2>
              <p className="mt-1 text-sm text-ink-soft">{fmtDate(e.startsAt)} · {e.venuePublic}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <GoingCount n={e.goingCount} unis={e.universitiesRepresented} />
                <span className="text-xs font-semibold capitalize text-ink-muted">{e.category}</span>
              </div>
            </>
          );
          const cls = "block h-full w-full rounded-card border border-line bg-paper p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift";
          return (
            <li key={e.id}>
              {onOpenEvent
                ? <button type="button" onClick={() => onOpenEvent(e.id)} className={cls}>{body}</button>
                : <Link to={`/events/${e.id}`} className={cls}>{body}</Link>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
