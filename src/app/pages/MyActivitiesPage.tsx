import { ButtonLink, Icon } from "@/components";
import { MyActivities } from "@/features/events";
import { MyBuddyActivityOverview } from "@/features/matching";

export function MyActivitiesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow mb-3 text-brand">Something to look forward to</p><h1 className="text-3xl font-bold sm:text-4xl">My plans</h1><p className="mt-3 text-sm text-ink-muted">Your next good thing, all in one place.</p></div>
        <ButtonLink to="/activities/new"><Icon name="plus" size={18} />New activity</ButtonLink>
      </div>
      <MyActivities />
      <MyBuddyActivityOverview />
    </div>
  );
}
