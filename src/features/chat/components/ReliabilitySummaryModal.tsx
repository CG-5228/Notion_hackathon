import React from 'react';
import { ReliabilityBand } from '../types.js';

interface ReliabilitySummaryModalProps {
  band: ReliabilityBand;
  score?: number | null;
  sampleSize?: number;
  pseudonym?: string;
  onClose: () => void;
}

export const ReliabilitySummaryModal: React.FC<ReliabilitySummaryModalProps> = ({
  band,
  score,
  sampleSize = 0,
  pseudonym,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reliability-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h3 id="reliability-modal-title" className="text-lg font-semibold">
              Reliability & Attendance Policy
            </h3>
            {pseudonym && (
              <p className="text-xs text-slate-300">
                Reviewing status for buddy: <span className="font-medium text-emerald-300">{pseudonym}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1 text-sm transition-colors"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-sm text-slate-600">
          {/* Important prominent disclaimer */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
            <p className="font-semibold text-amber-950 flex items-center gap-1.5">
              ⚠️ Attendance is never guaranteed
            </p>
            <p className="text-xs mt-1 text-amber-800">
              Any student may cancel or experience unexpected circumstances. A high reliability score is not a prediction, not a safety certification, and not a guarantee of physical safety or attendance.
            </p>
          </div>

          {/* Current Score State */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Status Band:</span>
              <span className="font-semibold text-slate-900 capitalize">
                {band.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Verified Meetups Sample:</span>
              <span className="font-semibold text-slate-900">
                {sampleSize} {sampleSize === 1 ? 'meetup' : 'meetups'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Calculated Percentage:</span>
              <span className="font-semibold text-slate-900">
                {score !== null && score !== undefined ? `${score}%` : 'Not displayed (<3 outcomes)'}
              </span>
            </div>
          </div>

          {/* Policy Explanation */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              How the Score Works
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              To protect students from unfair penalties, scores are only calculated over independently corroborated, evidence-backed outcomes:
            </p>
            <ul className="text-xs space-y-1.5 text-slate-600 list-disc pl-4">
              <li>
                <strong className="text-slate-800">Advance cancellations:</strong> Cancelling more than 2 hours before a meetup is completely neutral and does not penalize either student.
              </li>
              <li>
                <strong className="text-slate-800">Late cancellations:</strong> Reviewed fairly; validated emergencies are excused and excluded.
              </li>
              <li>
                <strong className="text-slate-800">No unverified accusations:</strong> A single complaint does not penalize a peer. Confirmed attendance requires mutual corroboration by both parties.
              </li>
              <li>
                <strong className="text-slate-800">Conservative threshold:</strong> A percentage score is only unlocked after at least 3 resolved meetups. New students start in the neutral "New" band.
              </li>
            </ul>
          </div>

          {/* Mathematical formula box */}
          <div className="p-3 bg-slate-100 rounded-lg font-mono text-[11px] text-slate-800 border border-slate-300">
            score = round(100 * (attended + 0.5 * late_cancel) / (attended + late_cancel + confirmed_no_show))
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
