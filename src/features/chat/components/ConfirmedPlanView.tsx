import React, { useState } from 'react';
import { EventSummary, MatchMode } from '../types.js';
import { cancelConfirmedPlan } from '../services/chatService.js';

interface ConfirmedPlanViewProps {
  matchId: string;
  mode: MatchMode;
  eventSummary?: EventSummary;
  onNavigateToCheckIn?: () => void;
  onPlanCancelled?: () => void;
}

export const ConfirmedPlanView: React.FC<ConfirmedPlanViewProps> = ({
  matchId,
  mode,
  eventSummary,
  onNavigateToCheckIn,
  onPlanCancelled,
}) => {
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellationResult, setCancellationResult] = useState<{
    kind: string;
    message: string;
  } | null>(null);

  const handleCancelSubmit = async () => {
    try {
      setCancelling(true);
      const res = await cancelConfirmedPlan(matchId, cancelReason);
      setCancellationResult({ kind: res.kind, message: res.message });
      setShowCancelModal(false);
      if (onPlanCancelled) onPlanCancelled();
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel plan.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Confirmed Meetup Plan
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-2">
            {eventSummary?.title || 'Confirmed Student Meetup'}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          className="px-3.5 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors self-start sm:self-auto"
        >
          Can't Make It?
        </button>
      </div>

      {/* Prominent Mandatory No-Guarantee Disclaimer */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 space-y-1">
        <p className="font-semibold text-xs flex items-center gap-1.5 text-amber-900">
          ⚠️ Attendance is not guaranteed
        </p>
        <p className="text-xs text-amber-800 leading-relaxed">
          {mode === 'pair'
            ? 'We cannot guarantee your buddy will attend. They may cancel or not show up. Never wait at an unfamiliar or private location.'
            : "A group may reduce dependence on one person, but nobody's attendance is guaranteed. Always verify with group members before departing."}
        </p>
      </div>

      {/* Meetup Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
            Public Meeting Venue
          </span>
          <p className="font-medium text-slate-900 text-sm">
            {eventSummary?.venuePublic || 'Main Entrance / Public Foyer'}
          </p>
          <p className="text-slate-500 text-[11px]">
            Always choose well-lit, public meeting spots on campus or venue lobbies.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
            Scheduled Starts At
          </span>
          <p className="font-medium text-slate-900 text-sm">
            {eventSummary?.startsAt
              ? new Date(eventSummary.startsAt).toLocaleString()
              : 'Upcoming event'}
          </p>
          <p className="text-slate-500 text-[11px]">
            Advance notice (&gt;2h) is neutral. Please notify your buddy if your plans change.
          </p>
        </div>
      </div>

      {/* Cancellation Notice if recorded */}
      {cancellationResult && (
        <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-800">
          <strong>Notice:</strong> {cancellationResult.message}
        </div>
      )}

      {/* Check-In Action */}
      {onNavigateToCheckIn && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onNavigateToCheckIn}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            Go to Post-Event Check-In →
          </button>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Cancel Your Meetup Plan</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              We understand plans change. Giving advance notice (&gt;2 hours beforehand) is completely neutral and does not affect your attendance history.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Note (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule conflict, feeling unwell, exam deadline..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Keep Plan
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
              >
                {cancelling ? 'Submitting...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
