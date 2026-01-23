/**
 * Match Card Component
 *
 * Displays match status in session overview.
 * Shows players, current score, and quick navigation to scoring.
 */

'use client';

import { cn, formatPlayerName } from '@/lib/utils';
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

export function MatchCard({
    matchState,
    teamAPlayers,
    teamBPlayers,
    matchNumber,
    onClick,
}: MatchCardProps) {
    const { currentScore, holesPlayed, isClosedOut: _isClosedOut, isDormie, displayScore, status } = matchState;

    const getStatusBadge = () => {
        if (status === 'completed') {
            return (
                <span className="badge badge-success">Complete</span>
            );
        }
        if (isDormie) {
            return (
                <span className="badge badge-warning">Dormie</span>
            );
        }
        if (holesPlayed > 0) {
            return (
                <span className="badge badge-info">Hole {holesPlayed}</span>
            );
        }
        return (
            <span className="badge badge-default">Not Started</span>
        );
    };

    const getScoreColor = () => {
        if (currentScore > 0) return 'text-team-usa';
        if (currentScore < 0) return 'text-team-europe';
        return 'text-surface-500';
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                'card p-4 cursor-pointer',
                'hover:bg-surface-50 dark:hover:bg-surface-750',
                'transition-colors duration-150',
                'active:scale-[0.99]'
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-surface-500 dark:text-surface-400">
                    Match {matchNumber}
                </span>
                {getStatusBadge()}
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
                            <p className="text-sm text-surface-400 italic">No players</p>
                        )}
                    </div>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center justify-center px-4">
                    <span className={cn(
                        'text-2xl font-bold',
                        getScoreColor()
                    )}>
                        {displayScore}
                    </span>
                    {holesPlayed > 0 && (
                        <span className="text-xs text-surface-500">
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
                            <p className="text-sm text-surface-400 italic">No players</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Hole Strip */}
            {holesPlayed > 0 && (
                <div className="pt-2 border-t border-surface-200 dark:border-surface-700">
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
            <div className="flex items-center justify-end mt-2 text-surface-400">
                <span className="text-xs mr-1">Score</span>
                <ChevronRight className="w-4 h-4" />
            </div>
        </div>
    );
}

export default MatchCard;
