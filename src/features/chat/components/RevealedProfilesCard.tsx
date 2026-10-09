import React from 'react';
import { RevealedProfile } from '../types.js';

interface RevealedProfilesCardProps {
  profiles: RevealedProfile[];
  onReport: (pseudonym: string) => void;
  onBlock: (pseudonym: string) => void;
}

export const RevealedProfilesCard: React.FC<RevealedProfilesCardProps> = ({
  profiles,
  onReport,
  onBlock,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Revealed Student Profiles ({profiles.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Privacy-safe details revealed by mutual unanimous consent.
          </p>
        </div>
        <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-medium">
          Verified School Accounts
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {profiles.map((profile, idx) => (
          <div
            key={profile.pseudonym || idx}
            className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start gap-3">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-sm border border-indigo-200">
                  {profile.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">
                    {profile.displayName}
                  </h4>
                  {profile.pseudonym && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({profile.pseudonym})
                    </span>
                  )}
                </div>
                <p className="text-xs text-indigo-600 font-medium truncate mt-0.5">
                  {profile.university}
                </p>
              </div>
            </div>

            {profile.sharedInterests && profile.sharedInterests.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {profile.sharedInterests.map((interest) => (
                  <span
                    key={interest}
                    className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-600"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/50">
              <button
                type="button"
                onClick={() => onReport(profile.pseudonym || profile.displayName)}
                className="text-[11px] text-slate-500 hover:text-rose-600 transition-colors"
              >
                Report
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => onBlock(profile.pseudonym || profile.displayName)}
                className="text-[11px] text-slate-500 hover:text-rose-600 transition-colors"
              >
                Block
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
