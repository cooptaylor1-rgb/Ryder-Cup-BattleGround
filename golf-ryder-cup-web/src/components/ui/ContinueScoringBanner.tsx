/**
 * Continue Scoring Banner Component
 *
 * A prominent, sticky banner for power users that appears when they have an
 * in-progress match. Provides instant 1-tap access to resume scoring.
 *
 * Power User Optimization:
 * - Fixed at top for instant visibility
 * - Large touch target
 * - Shows match context (hole, score state)
 * - Auto-navigates to the exact match
 */

'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Play, ChevronRight } from 'lucide-react';
import type { MatchState } from '@/lib/types/computed';
import type { Match } from '@/lib/types/models';

interface ContinueScoringBannerProps {
  match: Match;
  matchState?: MatchState;
  /** Player names in the match for context */
  matchDescription?: string;
  className?: string;
}

export function ContinueScoringBanner({
  match,
  matchState,
  matchDescription,
  className,
}: ContinueScoringBannerProps) {
  const router = useRouter();

  const handleContinue = () => {
    router.push(`/score/${match.id}`);
  };

  // Format the score display
  const getScoreDisplay = () => {
    if (!matchState) return '';
    // Check if match is all square (scores are equal)
    if (matchState.currentScore === 0) return 'AS';
    const leader = matchState.winningTeam;
    const holesUp = Math.abs(matchState.currentScore);
    if (leader && holesUp > 0) {
      return `${leader === 'teamA' ? 'USA' : 'EUR'} ${holesUp} UP`;
    }
    return '';
  };

  const scoreDisplay = getScoreDisplay();
  const currentHole = match.currentHole || 1;

  return (
    <button
      onClick={handleContinue}
      className={cn(
        'w-full relative overflow-hidden rounded-xl px-4 py-3',
        'transition-all duration-200 active:scale-[0.98]',
        'group cursor-pointer text-left',
        'border-2',
        className
      )}
      style={{
        background:
          'linear-gradient(135deg, rgba(0, 103, 71, 0.12) 0%, rgba(0, 103, 71, 0.05) 100%)',
        borderColor: 'var(--masters, #006747)',
      }}
    >
      {/* Content */}
      <div className="relative flex items-center gap-3">
        {/* Play icon */}
        <div
          className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--masters, #006747)' }}
        >
          <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--masters, #006747)' }}>
              Continue Scoring
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: 'rgba(0, 103, 71, 0.15)',
                color: 'var(--masters, #006747)',
              }}
            >
              Hole {currentHole}
            </span>
          </div>
          {matchDescription && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {matchDescription}
              {scoreDisplay && (
                <span className="ml-2 font-medium" style={{ color: 'var(--ink)' }}>
                  • {scoreDisplay}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight
          className="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{ color: 'var(--masters, #006747)' }}
        />
      </div>
    </button>
  );
}

export default ContinueScoringBanner;
