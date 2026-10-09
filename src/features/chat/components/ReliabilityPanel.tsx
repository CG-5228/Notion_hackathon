import { Card } from "@/components";
import { COPY } from "@/types";
import { BAND_LABEL, DEMO_EXAMPLES, MIN_SAMPLE_FOR_SCORE, reliabilityScore } from "../reliability";
import type { MyReliability } from "../types";

/** Caller's OWN reliability (more detail than others ever see) + labelled DEMO examples. */
export function ReliabilityPanel({ mine }: { mine: MyReliability | null }) {
  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">Your reliability</h2>
      {mine ? (
        mine.score === null ? (
          <p><strong>{COPY.reliabilityEmpty}</strong>
            <span className="block text-sm text-ink-muted">{mine.sampleCount} of {MIN_SAMPLE_FOR_SCORE} verified outcomes needed before a number is shown.</span></p>
        ) : (
          <p><strong className="text-2xl">{mine.score}%</strong> · {BAND_LABEL[mine.band]}
            <span className="block text-sm text-ink-muted">Based on {mine.sampleCount} verified outcomes.</span></p>
        )
      ) : <p className="text-sm text-ink-muted">Couldn't load your history right now.</p>}
      {!!mine?.pendingReview && <p className="text-sm text-ink-muted">{mine.pendingReview} item(s) are waiting for review and don't count yet.</p>}
      <p className="text-xs text-ink-muted">
        {COPY.attendanceDisclaimer} It's not a prediction and not a safety rating. Cancelling more than 2 hours ahead,
        disputes still under review, and excused emergencies never count. Others only see a broad label, never your number.
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer font-medium">How the score works (demo examples)</summary>
        <ul className="mt-2 space-y-1">
          {DEMO_EXAMPLES.map((d) => {
            const r = reliabilityScore(d.counts);
            return <li key={d.label} className="text-ink-muted">{d.label} → {r.score === null ? COPY.reliabilityEmpty : `${r.score}% · ${BAND_LABEL[r.band]}`}</li>;
          })}
        </ul>
        <p className="mt-2 text-xs text-ink-muted">These are made-up DEMO histories, not real students.</p>
      </details>
    </Card>
  );
}
