// RESERVED ENTRYPOINTS — owned by Member 3. Replace implementations; keep export names and props.
import { ReservedSlot } from "@/components";
export function EventsFeed() {
  return <ReservedSlot name="Events feed" owner="Member 3"
    description="Curated public events and student activities with anonymous ‘going’ counts — never attendee names." />;
}
export function ActivityDetail({ eventId }: { eventId: string }) {
  return <ReservedSlot name="Event details" owner="Member 3"
    description={`Details, organiser link, RSVP and report for event ${eventId}.`} />;
}
export function CreateActivity() {
  return <ReservedSlot name="Create an activity" owner="Member 3"
    description="Campus-visible or invite-only activities at public meeting points — never home addresses." />;
}
