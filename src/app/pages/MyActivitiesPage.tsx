import { ButtonLink, ReservedSlot } from "@/components";
import { MyActivities } from "@/features/events";

export function MyActivitiesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold sm:text-4xl">My plans</h1>
        <ButtonLink to="/activities/new" variant="mint">＋ New activity</ButtonLink>
      </div>
      <MyActivities />
      <ReservedSlot name="Your matches & plans" owner="Members 4 & 5" description="Waiting requests, active chats and confirmed plans will appear here once matching and chat are integrated." />
    </div>
  );
}
