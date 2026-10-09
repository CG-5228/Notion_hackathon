import React, { useState } from 'react';
import { ReliabilityBand } from '../types.js';
import { getBandDisplay } from '../utils/reliability.js';
import { ReliabilitySummaryModal } from './ReliabilitySummaryModal.js';

interface ReliabilityBadgeProps {
  band: ReliabilityBand;
  score?: number | null;
  sampleSize?: number;
  pseudonym?: string;
  showDetailsOnClick?: boolean;
}

export const ReliabilityBadge: React.FC<ReliabilityBadgeProps> = ({
  band,
  score,
  sampleSize = 0,
  pseudonym,
  showDetailsOnClick = true,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const display = getBandDisplay(band);

  return (
    <>
      <button
        type="button"
        onClick={() => showDetailsOnClick && setIsModalOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${display.colorClass} ${
          showDetailsOnClick ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
        }`}
        title={`${display.description} Click for reliability policy.`}
        aria-label={`Reliability status: ${display.label}`}
      >
        <span>{display.label}</span>
        {score !== null && score !== undefined && (
          <span className="font-semibold">({score}%)</span>
        )}
      </button>

      {isModalOpen && (
        <ReliabilitySummaryModal
          band={band}
          score={score}
          sampleSize={sampleSize}
          pseudonym={pseudonym}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};
