// RESERVED ENTRYPOINT — owned by Member 4. Replace implementation; keep export name and props.
// Must show COPY.pairWarning / COPY.groupNotice from "@/types" before confirming.
import { ReservedSlot } from "@/components";
export function BuddyRequestPanel({ eventId }: { eventId: string }) {
  return <ReservedSlot name="Find your buddy" owner="Member 4"
    description={`Choose one-on-one or a group of 3–5 for event ${eventId}. Real server-side matching only.`} />;
}
