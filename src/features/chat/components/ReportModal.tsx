import React, { useState } from 'react';
import { ReportReason } from '../types.js';
import { reportEvent, reportUser } from '../services/chatService.js';

interface ReportModalProps {
  matchId?: string;
  targetPseudonym?: string;
  eventId?: string;
  eventTitle?: string;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  matchId,
  targetPseudonym,
  eventId,
  eventTitle,
  onClose,
}) => {
  const [reason, setReason] = useState<ReportReason>('safety_concern');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverMsg, setServerMsg] = useState('');

  const isEventReport = Boolean(eventId && !targetPseudonym);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      let res;
      if (isEventReport && eventId) {
        res = await reportEvent(eventId, reason, details);
      } else if (matchId && targetPseudonym) {
        res = await reportUser(matchId, targetPseudonym, reason, details);
      } else {
        throw new Error('Missing target for report.');
      }
      setSubmitted(true);
      setServerMsg(res.message);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-rose-900 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h3 id="report-modal-title" className="text-base font-bold">
              {isEventReport ? 'Report Event' : 'Submit Safety Report'}
            </h3>
            <p className="text-xs text-rose-200 mt-0.5">
              {isEventReport
                ? `Reporting: ${eventTitle || 'Event'}`
                : `Target: ${targetPseudonym || 'Match participant'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-rose-300 hover:text-white p-1 text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl mx-auto">
              ✓
            </div>
            <h4 className="font-bold text-sm text-slate-900">Report Received</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {serverMsg ||
                'Your report has been queued for moderation. We review all safety reports confidentially.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {/* Honest moderation disclosure */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px] leading-relaxed">
              <strong>Honest Notice:</strong> Report submissions are logged for asynchronous moderator review. Submitting a report does not constitute staffed 24/7 realtime dispatch. If you are in immediate physical danger, contact emergency services.
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reason for Report
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-xs"
              >
                <option value="safety_concern">Safety concern / Inappropriate conduct</option>
                <option value="harassment">Harassment or abusive language</option>
                <option value="inappropriate_content">Inappropriate or offensive content</option>
                <option value="impersonation">Suspected impersonation / Non-student</option>
                <option value="spam">Commercial spam or promotion</option>
                <option value="other">Other reason</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Details & Context
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide specific details to assist moderator investigation..."
                rows={3}
                required
                maxLength={2000}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition-colors shadow-sm"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
