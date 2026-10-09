import { ReliabilityBand, ReliabilitySummary } from '../types.js';

export interface OutcomeCounts {
  confirmedAttended: number;
  upheldLateCancel: number;
  confirmedNoShow: number;
}

/**
 * Calculates conservative reliability metrics over EVIDENCE-BACKED, RESOLVED outcomes only.
 *
 * Formula:
 *   score = round(100 * (confirmed_attended + 0.5 * upheld_late_cancel) /
 *                 (confirmed_attended + upheld_late_cancel + confirmed_no_show))
 *
 * Rules:
 * - Denominator must be >= 3 resolved qualifying outcomes to display an exact numeric score.
 * - Under 3 outcomes, returns band 'new' with score = null ("New / Not enough verified history").
 * - Advance cancellations (>2h beforehand) are completely neutral and excluded.
 * - Pending, disputed, or excused emergency cancellations are excluded.
 * - This is PROPOSED policy, never a personal safety certification or attendance guarantee.
 */
export function calculateReliability(counts: OutcomeCounts): ReliabilitySummary {
  const { confirmedAttended, upheldLateCancel, confirmedNoShow } = counts;
  const totalQualifying = confirmedAttended + upheldLateCancel + confirmedNoShow;

  const disclaimer =
    'Attendance is never guaranteed regardless of history. Meetups must always take place in public venues.';

  if (totalQualifying < 3) {
    return {
      band: 'new',
      score: null,
      sampleSize: totalQualifying,
      confirmedAttended,
      upheldLateCancel,
      confirmedNoShow,
      label: 'New / Not enough verified history',
      disclaimer,
    };
  }

  const rawScore =
    (100 * (confirmedAttended + 0.5 * upheldLateCancel)) / totalQualifying;
  const score = Math.round(rawScore);

  let band: ReliabilityBand = 'mixed';
  let label = 'Mixed Attendance History';

  if (score >= 85) {
    band = 'generally_reliable';
    label = 'Generally Reliable';
  } else if (score < 60) {
    band = 'repeated_verified_no_shows';
    label = 'Repeated Verified No-Shows';
  }

  return {
    band,
    score,
    sampleSize: totalQualifying,
    confirmedAttended,
    upheldLateCancel,
    confirmedNoShow,
    label,
    disclaimer,
  };
}

/**
 * Helper for user-friendly badge display in pseudonymous chats.
 */
export function getBandDisplay(band: ReliabilityBand): {
  label: string;
  colorClass: string;
  description: string;
} {
  switch (band) {
    case 'generally_reliable':
      return {
        label: 'Generally Reliable',
        colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        description: '>=3 resolved meetups with high corroborated attendance.',
      };
    case 'mixed':
      return {
        label: 'Mixed History',
        colorClass: 'bg-amber-100 text-amber-800 border-amber-300',
        description: 'Has occasional unexcused cancellations or disputed meetups.',
      };
    case 'repeated_verified_no_shows':
      return {
        label: 'Notice: Repeated No-Shows',
        colorClass: 'bg-rose-100 text-rose-800 border-rose-300',
        description: 'Multiple verified unexcused absences on record.',
      };
    case 'new':
    default:
      return {
        label: 'New Buddy',
        colorClass: 'bg-slate-100 text-slate-700 border-slate-300',
        description: 'Fewer than 3 resolved meetups. Attendance is not guaranteed.',
      };
  }
}
