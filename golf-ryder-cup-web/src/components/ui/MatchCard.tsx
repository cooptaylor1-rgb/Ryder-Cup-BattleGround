/**
 * Match Card Component
 *
 * Displays match status in session overview.
 * Shows players, current score, and quick navigation to scoring.
 */

'use client';

import React from 'react';
import { cn, formatPlayerName } from '@/lib/utils';
import { getScoreColorClass, getMatchStatusDisplay } from '@/lib/utils/matchDisplay';
import type { MatchState } from '@/lib/types/computed';
import type { Player } from '@/lib/types/models';
import { HoleStrip } from './HoleIndicator';
import { ChevronRight } from 'lucide-react';

interface MatchCardProps {
    matchState: MatchState;
    teamAPlayers: Player[];
    teamBPlayers: Player[];
    matchNumber: number;
    onClick?: () => void;
}

export const MatchCard = React.memo(function MatchCard({
    matchState,
    teamAPlayers,
    teamBPlayers,
    matchNumber,
    onClick,
}: MatchCardProps) {
    const { currentScore, holesPlayed, isClosedOut: _isClosedOut, isDormie, displayScore, status } = matchState;

    const statusDisplay = getMatchStatusDisplay(status, holesPlayed, isDormie);

    return (
        <div
            onClick={onClick}
            className={cn(
                'card p-4 cursor-pointer',
                'hover:bg-[var(--surface-secondary)]',
                'transition-colors duration-150',
                'active:scale-[0.99]'
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[var(--ink-tertiary)]">
                    Match {matchNumber}
                </span>
                <span className={`badge badge-${statusDisplay.tone}`}>{statusDisplay.label}</span>
            </div>

            {/* Teams */}
            <div className="flex items-stretch gap-3 mb-3">
                {/* Team A */}
                <div className="flex-1 p-3 rounded-lg bg-team-usa/5 border-l-4 border-team-usa">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-team-usa" />
                        <span className="text-xs font-medium text-team-usa uppercase">USA</span>
                    </div>
                    <div className="space-y-0.5">
                        {teamAPlayers.map(player => (
                            <p key={player.id} className="text-sm font-medium truncate">
                                {formatPlayerName(player.firstName, player.lastName, 'short')}
                            </p>
                        ))}
                        {teamAPlayers.length === 0 && (
                            <p className="text-sm text-[var(--ink-tertiary)] italic">No players</p>
                        )}
                    </div>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center justify-center px-4">
                    <span className={cn(
                        'text-2xl font-bold',
                        getScoreColorClass(currentScore)
                    )}>
                        {displayScore}
                    </span>
                    {holesPlayed > 0 && (
                        <span className="text-xs text-[var(--ink-tertiary)]">
                            thru {holesPlayed}
                        </span>
                    )}
                </div>

                {/* Team B */}
                <div className="flex-1 p-3 rounded-lg bg-team-europe/5 border-r-4 border-team-europe">
                    <div className="flex items-center justify-end gap-2 mb-1">
                        <span className="text-xs font-medium text-team-europe uppercase">EUR</span>
                        <div className="w-2 h-2 rounded-full bg-team-europe" />
                    </div>
                    <div className="space-y-0.5 text-right">
                        {teamBPlayers.map(player => (
                            <p key={player.id} className="text-sm font-medium truncate">
                                {formatPlayerName(player.firstName, player.lastName, 'short')}
                            </p>
                        ))}
                        {teamBPlayers.length === 0 && (
                            <p className="text-sm text-[var(--ink-tertiary)] italic">No players</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Hole Strip */}
            {holesPlayed > 0 && (
                <div className="pt-2 border-t border-[var(--rule)]">
                    <HoleStrip
                        results={matchState.holeResults.map(r => ({
                            holeNumber: r.holeNumber,
                            winner: r.winner,
                        }))}
                        size="sm"
                    />
                </div>
            )}

            {/* Footer with navigation hint */}
            <div className="flex items-center justify-end mt-2 text-[var(--ink-tertiary)]">
                <span className="text-xs mr-1">Score</span>
                <ChevronRight className="w-4 h-4" />
            </div>
        </div>
    );
});

export default MatchCard;
