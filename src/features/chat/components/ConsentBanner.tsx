import React, { useState } from 'react';
import { BuddyMatchParticipant, MatchMode } from '../types.js';

interface ConsentBannerProps {
  mode: MatchMode;
  status: string;
  membershipVersion: number;
  participants: BuddyMatchParticipant[];
  myPseudonym: string;
  onAgree: () => Promise<void>;
  onLeave: () => Promise<void>;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({
  mode,
  status,
  membershipVersion,
  participants,
  myPseudonym,
  onAgree,
  onLeave,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalMembers = participants.length;
  const agreedMembers = participants.filter((p) => p.agreed).length;
  const hasMyAgreement = participants.some(
    (p) => p.pseudonym === myPseudonym && p.agreed
  );
  const isRevealed = status === 'revealed';

  const handleAgreeClick = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await onAgree();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record agreement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveClick = async () => {
    if (
      !window.confirm(
        'Are you sure you want to decline or leave this match? All current agreements will be reset.'
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      await onLeave();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to exit match.');
    } finally {
      setLoading(false);
    }
  };

  if (isRevealed) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎉</span>
          <div>
            <h4 className="font-semibold text-sm">Unanimous Agreement Confirmed!</h4>
            <p className="text-xs text-emerald-800 mt-0.5">
              All {totalMembers} members consented to meet in person. Profile details below have been revealed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg space-y-4 border border-indigo-900/50">
      {/* Prominent Required Warnings */}
      <div className="p-3 bg-amber-500/15 border border-amber-400/30 rounded-xl text-amber-200 text-xs leading-relaxed">
        {mode === 'pair' ? (
          <div>
            <strong className="text-amber-100 block mb-0.5 font-medium">⚠️ Important Attendance Notice:</strong>
            We cannot guarantee your buddy will attend. They may cancel or not show up. Consider group matching if you'd prefer not to depend on one person.
          </div>
        ) : (
          <div>
            <strong className="text-amber-100 block mb-0.5 font-medium">⚠️ Group Attendance Notice:</strong>
            A group may reduce dependence on one person, but nobody's attendance is guaranteed.
          </div>
        )}
      </div>

      {/* Progress & Consent Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              In-Person Meetup Consent
            </span>
            <span className="text-[11px] px-2 py-0.5 bg-indigo-800/60 rounded-full text-indigo-200">
              v{membershipVersion}
            </span>
          </div>
          <p className="text-sm font-medium mt-1">
            <span className="text-emerald-400 font-bold">{agreedMembers}</span> of{' '}
            <span className="font-bold">{totalMembers}</span> members agreed to meet
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Profiles remain 100% anonymous until unanimous {totalMembers}/{totalMembers} agreement.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || hasMyAgreement}
            onClick={handleAgreeClick}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
              hasMyAgreement
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer active:scale-95'
            }`}
          >
            {hasMyAgreement ? '✓ You Agreed' : 'Agree to Go'}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleLeaveClick}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-rose-300 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-800 transition-colors"
          >
            Leave / Decline
          </button>
        </div>
      </div>

      {/* Member agreement breakdown chips */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-indigo-900/40">
        {participants.map((p) => (
          <div
            key={p.pseudonym}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${
              p.agreed
                ? 'bg-emerald-950/40 text-emerald-200 border-emerald-700/50'
                : 'bg-slate-800/40 text-slate-300 border-slate-700/50'
            }`}
          >
            <span className={p.agreed ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {p.agreed ? '✓' : '○'}
            </span>
            <span className="font-medium">
              {p.pseudonym} {p.pseudonym === myPseudonym && '(You)'}
            </span>
          </div>
        ))}
      </div>

      {errorMsg && (
        <div className="p-2.5 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-200">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
