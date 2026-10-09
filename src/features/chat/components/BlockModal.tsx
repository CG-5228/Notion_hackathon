import React, { useState } from 'react';
import { blockUser } from '../services/chatService.js';

interface BlockModalProps {
  matchId: string;
  targetPseudonym: string;
  onBlocked: () => void;
  onClose: () => void;
}

export const BlockModal: React.FC<BlockModalProps> = ({
  matchId,
  targetPseudonym,
  onBlocked,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);

  const handleBlockConfirm = async () => {
    try {
      setLoading(true);
      await blockUser(matchId, targetPseudonym);
      alert(`User ${targetPseudonym} has been blocked. Communication in this match is now terminated.`);
      onBlocked();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to block user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-modal-title"
    >
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
        <div className="w-11 h-11 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-lg font-bold">
          🚫
        </div>

        <div>
          <h3 id="block-modal-title" className="text-base font-bold text-slate-900">
            Block {targetPseudonym}?
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Blocking this student will immediately:
          </p>
        </div>

        <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
          <li>Terminate shared communication in this match immediately.</li>
          <li>Prevent future pair matching and co-group placement together.</li>
          <li>Sever all message delivery between your accounts.</li>
        </ul>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleBlockConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            {loading ? 'Blocking...' : 'Confirm Block'}
          </button>
        </div>
      </div>
    </div>
  );
};
