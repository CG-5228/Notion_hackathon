// Member 3 entrypoints — export names and props match docs/CONTRACTS.md.
import { useNavigate, useSearchParams } from "react-router-dom";
import { EventsFeed as Feed } from "./EventsFeed";
import { ActivityDetail as Detail } from "./ActivityDetail";
import { CreateActivity as Create } from "./CreateActivity";
import { MyActivities as Mine } from "./MyActivities";

export function EventsFeed() {
  const nav = useNavigate();
  return <Feed onOpenEvent={(id) => nav(`/events/${id}`)} onCreateActivity={() => nav("/activities/new")} />;
}

export function ActivityDetail({ eventId }: { eventId: string }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  return <Detail eventId={eventId} inviteHash={params.get("invite")} onFindBuddy={(id) => nav(`/find-buddy/${id}`)} />;
}

export function CreateActivity() {
  const nav = useNavigate();
  return <Create onCreated={(id, hash) => nav(`/events/${id}${hash ? `?invite=${hash}` : ""}`)} />;
}

export function MyActivities() {
  const nav = useNavigate();
  return <Mine onOpenEvent={(id) => nav(`/events/${id}`)} />;
}

export { getEvent, listEvents, setGoing, reportEvent } from "./api";
export type { EventDetail, EventFilters, MyActivity } from "./types";
