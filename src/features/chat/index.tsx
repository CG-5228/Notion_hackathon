// RESERVED ENTRYPOINTS — owned by Member 5. Replace implementations; keep export names and props.
import { ReservedSlot } from "@/components";
export function BuddyChat({ matchId }: { matchId: string }) {
  return <ReservedSlot name="Pseudonymous chat" owner="Member 5"
    description={`Private chat for match ${matchId}. Identities stay hidden until everyone taps "Agree to Go".`} />;
}
export function PlanView({ matchId }: { matchId: string }) {
  return <ReservedSlot name="Your plan" owner="Member 5"
    description={`Confirmed plan, revealed buddies and cancellation for match ${matchId}.`} />;
}
export function AttendanceCheckIn({ matchId }: { matchId: string }) {
  return <ReservedSlot name="After the meetup" owner="Member 5"
    description={`Report Attended / Did not meet / Dispute for match ${matchId}. No automatic penalties.`} />;
}
