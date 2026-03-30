'use client';

import { useState } from 'react';
import { Scale, HelpCircle } from 'lucide-react';

import type { FairnessScore } from '../lineupBuilderTypes';

function FairnessMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
        {label}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--rule)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${value}%`,
              background: color,
            }}
          />
        </div>
        <span className="text-xs font-medium" style={{ color }}>
          {value}%
        </span>
      </div>
    </div>
  );
}

export interface FairnessIndicatorProps {
  score: FairnessScore;
}

export function FairnessIndicator({ score }: FairnessIndicatorProps) {
  const [showInfo, setShowInfo] = useState(false);

  const getColor = (value: number) => {
    if (value >= 80) return 'var(--success)';
    if (value >= 60) return 'var(--warning)';
    return 'var(--error)';
  };

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5" style={{ color: 'var(--masters)' }} />
          <span className="font-medium" style={{ color: 'var(--ink)' }}>
            Fairness Score
          </span>
          <button
            onClick={() => setShowInfo((current) => !current)}
            className="p-1 rounded-full transition-colors hover:bg-[color:var(--ink)]/5"
            aria-label="What is fairness score?"
          >
            <HelpCircle size={16} style={{ color: 'var(--ink-tertiary)' }} />
          </button>
        </div>
        <span className="text-xl font-bold" style={{ color: getColor(score.overall) }}>
          {score.overall}%
        </span>
      </div>

      {showInfo && (
        <div
          className="mb-3 p-3 rounded-lg text-sm"
          style={{ background: 'var(--canvas-sunken)', color: 'var(--ink-secondary)' }}
        >
          <p className="mb-2">
            <strong>Fairness Score</strong> measures how balanced the matchups are:
          </p>
          <ul className="space-y-1 text-xs">
            <li>
              • <strong>Handicap Balance:</strong> Compares total handicaps between teams in each
              match. Closer totals = fairer matches.
            </li>
            <li>
              • <strong>Experience Balance:</strong> Considers matches played. Spreading experience
              evenly creates fairer pairings.
            </li>
            <li>
              • <strong>80%+</strong> = Great balance, <strong>60-79%</strong> = Acceptable,{' '}
              <strong>&lt;60%</strong> = Consider adjustments
            </li>
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FairnessMetric
          label="Handicap Balance"
          value={score.handicapBalance}
          color={getColor(score.handicapBalance)}
        />
        <FairnessMetric
          label="Experience Balance"
          value={score.experienceBalance}
          color={getColor(score.experienceBalance)}
        />
      </div>
    </div>
  );
}
