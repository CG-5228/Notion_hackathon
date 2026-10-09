import React, { useState } from 'react';
import { MeetupOutcomeKind } from '../types.js';
import { submitMeetupOutcome } from '../services/chatService.js';

interface AttendanceCheckInProps {
  matchId: string;
  onComplete?: () => void;
}

export const AttendanceCheckIn: React.FC<AttendanceCheckInProps> = ({
  matchId,
  onComplete,
}) => {
  const [selectedKind, setSelectedKind] = useState<MeetupOutcomeKind | null>(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const handleSubmit = async () => {
    if (!selectedKind) return;
    try {
      setLoading(true);
      const res = await submitMeetupOutcome(matchId, selectedKind, details);
      setSubmitted(true);
      setFeedbackMessage(res.message);
      if (onComplete) onComplete();
    } catch (err: any) {
      alert(err?.message || 'Error submitting attendance report.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl mx-auto">
          ✓
        </div>
        <h3 className="text-base font-bold text-slate-900">Feedback Submitted</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          {feedbackMessage ||
            'Thank you for confirming your meetup outcome. Attendance scores are corroborated independently across participants to ensure fairness.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5 max-w-xl mx-auto">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
          Post-Event Check-In
        </span>
        <h2 className="text-lg font-bold text-slate-900 mt-2">
          Did you meet up with your buddy?
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Your feedback is private. Scores are only updated when outcomes are mutually confirmed.
        </p>
      </div>

      {/* Fair policy disclaimer */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
        <strong className="text-slate-900 block font-medium">How attendance confirmation works:</strong>
        <p className="text-[11px] text-slate-500">
          • Confirmed attendance requires mutual corroboration by both parties (or group members).<br />
          • A single unverified accusation never penalizes anyone's score.<br />
          • Conflicts and disputes remain pending for review.
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        <label
          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
            selectedKind === 'attended'
              ? 'border-emerald-500 bg-emerald-50/50'
              : 'border-slate-200 hover:bg-slate-50'
          }`}
        >
          <input
            type="radio"
            name="outcome"
            value="attended"
            checked={selectedKind === 'attended'}
            onChange={() => setSelectedKind('attended')}
            className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
          />
          <div>
            <span className="font-semibold text-xs text-slate-900 block">
              Yes, we attended and met up
            </span>
            <span className="text-[11px] text-slate-500">
              We met at the agreed venue and attended the activity together.
            </span>
          </div>
        </label>

        <label
          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
            selectedKind === 'did_not_meet'
              ? 'border-amber-500 bg-amber-50/50'
              : 'border-slate-200 hover:bg-slate-50'
          }`}
        >
          <input
            type="radio"
            name="outcome"
            value="did_not_meet"
            checked={selectedKind === 'did_not_meet'}
            onChange={() => setSelectedKind('did_not_meet')}
            className="mt-0.5 text-amber-600 focus:ring-amber-500"
          />
          <div>
            <span className="font-semibold text-xs text-slate-900 block">
              We did not meet up
            </span>
            <span className="text-[11px] text-slate-500">
              One or both participants were unable to meet. (Neutral unless verified review applies).
            </span>
          </div>
        </label>

        <label
          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
            selectedKind === 'dispute'
              ? 'border-indigo-500 bg-indigo-50/50'
              : 'border-slate-200 hover:bg-slate-50'
          }`}
        >
          <input
            type="radio"
            name="outcome"
            value="dispute"
            checked={selectedKind === 'dispute'}
            onChange={() => setSelectedKind('dispute')}
            className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <span className="font-semibold text-xs text-slate-900 block">
              Dispute, emergency or other circumstance
            </span>
            <span className="text-[11px] text-slate-500">
              Personal emergency, venue cancellation, or communication difficulty occurred.
            </span>
          </div>
        </label>
      </div>

      {selectedKind && (
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Additional Context (optional)
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Share any helpful context for our review..."
            rows={2}
            className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            maxLength={1000}
          />
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!selectedKind || loading}
          onClick={handleSubmit}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          {loading ? 'Submitting...' : 'Submit Post-Event Report'}
        </button>
      </div>
    </div>
  );
};
