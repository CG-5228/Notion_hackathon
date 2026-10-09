import { Link } from "react-router-dom";
import { Button, Card, Notice, Spinner } from "@/components";
import { GROUP_MIN_TO_CHAT } from "@/types";
import type { BuddyActivity, BuddyActivityState } from "../api";
import { useMyBuddyActivity } from "../useMyBuddyActivity";

const groups: { state: BuddyActivityState; title: string }[] = [
  { state: "waiting", title: "Waiting requests" },
  { state: "forming", title: "Groups forming" },
  { state: "chat", title: "Active chats" },
  { state: "confirmed", title: "Confirmed plans" },
];

function formatStartsAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function stateLabel(item: BuddyActivity) {
  if (item.state === "waiting") return item.mode === "pair" ? "Waiting for a buddy" : "Waiting for a group";
  if (item.state === "forming") return item.mode === "pair" ? "Buddy match forming" : "Group forming";
  if (item.state === "chat") return item.mode === "pair" ? "Buddy chat" : "Group chat";
  return "Plan confirmed";
}

function stateDescription(item: BuddyActivity) {
  if (item.state === "waiting") return "Your request is in the queue. No match has been made yet.";
  if (item.state === "forming") {
    if (item.mode === "pair") return `${item.memberCount ?? 0} of 2 people matched. Chat opens when your buddy joins.`;
    return `${item.memberCount ?? 0} here. Chat opens when at least ${GROUP_MIN_TO_CHAT} people have joined.`;
  }
  if (item.state === "chat") return "Keep chatting while everyone decides. Names stay hidden until everyone agrees.";
  return "Everyone agreed to meet. Attendance is not guaranteed.";
}

function activityHref(item: BuddyActivity) {
  if (item.state === "waiting" || item.state === "forming" || !item.matchId) return `/find-buddy/${item.eventId}`;
  if (item.state === "confirmed") return `/plans/${item.matchId}`;
  return `/buddy/${item.matchId}`;
}

function actionLabel(item: BuddyActivity) {
  if (item.state === "waiting") return "View request";
  if (item.state === "forming") return "Check group";
  if (item.state === "confirmed") return "View plan";
  return "Open chat";
}

function ActivityCard({ item }: { item: BuddyActivity }) {
  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">{stateLabel(item)}</p>
        <h4 className="break-words font-semibold text-ink">{item.eventTitle}</h4>
        <p className="text-sm text-ink-muted">
          {formatStartsAt(item.startsAt)} · {item.venuePublic}
        </p>
        <p className="text-sm text-ink-soft">{stateDescription(item)}</p>
      </div>
      <Link
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        to={activityHref(item)}
      >
        {actionLabel(item)}
      </Link>
    </Card>
  );
}

export function MyBuddyActivityOverview() {
  const { items, errorMessage, refresh } = useMyBuddyActivity();

  return (
    <section aria-labelledby="my-matches-heading" className="space-y-4">
      <h2 className="text-xl font-bold" id="my-matches-heading">Your matches &amp; plans</h2>
      {items === null && !errorMessage && <Spinner label="Loading your matches and plans" />}
      {errorMessage && (
        <Card className="space-y-3 p-4">
          <Notice tone="error" title="Couldn't load your matches and plans">
            {errorMessage}
          </Notice>
          <Button variant="outline" onClick={() => void refresh()}>Try again</Button>
        </Card>
      )}
      {items?.length === 0 && !errorMessage && (
        <Card className="p-4">
          <p className="text-sm text-ink-muted">Your buddy requests, chats, and confirmed plans will appear here.</p>
        </Card>
      )}
      {items && items.length > 0 && groups.map((group) => {
        const groupedItems = items.filter((item) => item.state === group.state);
        if (groupedItems.length === 0) return null;
        return (
          <section aria-label={group.title} className="space-y-3" key={group.state}>
            <h3 className="text-lg font-semibold">{group.title}</h3>
            <ul className="space-y-3">
              {groupedItems.map((item) => (
                <li key={`${item.state}:${item.matchId ?? item.eventId}`}><ActivityCard item={item} /></li>
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
