import type { ReliabilityBand } from "@/types";
import { cn } from "@/lib/cn";
import { BAND_LABEL } from "../reliability";

const tone: Record<ReliabilityBand, string> = {
  new: "bg-sand text-ink-muted",
  generally_reliable: "bg-mint/40 text-ink",
  mixed: "bg-sun/50 text-ink",
  repeated_verified_no_shows: "bg-warn-bg text-warn-ink",
};

/** Coarse band only — no numbers or history in anonymous chats. */
export function ReliabilityBadge({ band, className }: { band: ReliabilityBand; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tone[band], className)}
      title="Based only on verified past meetups. Attendance is never guaranteed.">
      {BAND_LABEL[band]}
    </span>
  );
}
