import type { ReliabilityBand } from "@/types";
import type { ReliabilityCounts } from "./types";

/** Minimum resolved, evidence-backed outcomes before a number is ever shown. */
export const MIN_SAMPLE_FOR_SCORE = 3;

/**
 * PROPOSED policy (mirrors private.m5_reliability in 0004):
 *   score = round(100 * (attended + 0.5 * upheldLateCancel) / (attended + upheldLateCancel + noShow))
 * Inputs must already exclude advance cancels, pending/disputed cases and excused emergencies.
 * Not a probability, not a safety rating, not an attendance forecast.
 */
export function reliabilityScore(c: ReliabilityCounts): { score: number | null; sample: number; band: ReliabilityBand } {
  const sample = c.confirmedAttended + c.upheldLateCancel + c.confirmedNoShow;
  if (sample < MIN_SAMPLE_FOR_SCORE) return { score: null, sample, band: "new" };
  const score = Math.round((100 * (c.confirmedAttended + 0.5 * c.upheldLateCancel)) / sample);
  const band: ReliabilityBand =
    score >= 80 ? "generally_reliable" : c.confirmedNoShow >= 2 ? "repeated_verified_no_shows" : "mixed";
  return { score, sample, band };
}

export const BAND_LABEL: Record<ReliabilityBand, string> = {
  new: "New / Not enough verified history",
  generally_reliable: "Generally reliable",
  mixed: "Mixed history",
  repeated_verified_no_shows: "Repeated verified no-shows",
};

/** Clearly labelled DEMO history for explaining the formula. Never attached to a real user. */
export const DEMO_EXAMPLES: Array<{ label: string; counts: ReliabilityCounts }> = [
  { label: "DEMO · 2 verified meetups", counts: { confirmedAttended: 2, upheldLateCancel: 0, confirmedNoShow: 0 } },
  { label: "DEMO · 4 attended, 1 upheld late cancel", counts: { confirmedAttended: 4, upheldLateCancel: 1, confirmedNoShow: 0 } },
  { label: "DEMO · 2 attended, 2 verified no-shows", counts: { confirmedAttended: 2, upheldLateCancel: 0, confirmedNoShow: 2 } },
];
