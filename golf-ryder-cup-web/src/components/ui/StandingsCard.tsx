/**
 * Standings Card Component
 *
 * Displays overall tournament standings with team points.
 * Prominent display of score differential and magic number.
 */

'use client';

import { cn } from '@/lib/utils';
import type { TeamStandings, MagicNumber } from '@/lib/types/computed';
import { Trophy, Target, TrendingUp } from 'lucide-react';

interface StandingsCardProps {
    standings: TeamStandings;
    magicNumber: MagicNumber;
    teamAName?: string;
    teamBName?: string;
}

export function StandingsCard({
    standings,
    magicNumber,
    teamAName = 'Team USA',
    teamBName = 'Team Europe',
}: StandingsCardProps) {
    const { teamAPoints, teamBPoints, matchesCompleted, totalMatches, leader, margin } = standings;

    const pointsToWin = 14.5; // Standard Ryder Cup
    const teamAProgress = (teamAPoints / pointsToWin) * 100;
    const teamBProgress = (teamBPoints / pointsToWin) * 100;

    return (
        <div className="card overflow-hidden">
            {/* Header */}
            <div className="bg-augusta-green text-white p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Tournament Standings</h2>
                    <Trophy className="w-5 h-5 opacity-80" />
                </div>
                <p className="text-sm opacity-80 mt-1">
                    {matchesCompleted} of {totalMatches} matches complete
                </p>
            </div>

            {/* Score Display */}
            <div className="p-6">
                <div className="flex items-center justify-between">
                    {/* Team A */}
                    <div className="text-center">
                        <div className="w-3 h-3 rounded-full bg-team-usa mx-auto mb-2" />
                        <p className="text-sm font-medium text-surface-600 dark:text-surface-400">
                            {teamAName}
                        </p>
                        <p className={cn(
                            'text-4xl font-bold mt-1',
                            leader === 'teamA' ? 'text-team-usa' : 'text-surface-700 dark:text-surface-300'
                        )}>
                            {teamAPoints}
                        </p>
                    </div>

                    {/* Separator */}
                    <div className="px-6 py-2 text-center">
                        <p className="text-sm text-surface-400 uppercase tracking-wide">
                            {leader ? (
                                <>
                                    <span className={leader === 'teamA' ? 'text-team-usa' : 'text-team-europe'}>
                                        {leader === 'teamA' ? 'USA' : 'EUR'}
                                    </span>
                                    {' leads'}
                                </>
                            ) : (
                                'Tied'
                            )}
                        </p>
                        <p className="text-2xl font-bold text-surface-700 dark:text-surface-300 mt-1">
                            {margin > 0 ? `+${margin}` : 'Even'}
                        </p>
                    </div>

                    {/* Team B */}
                    <div className="text-center">
                        <div className="w-3 h-3 rounded-full bg-team-europe mx-auto mb-2" />
                        <p className="text-sm font-medium text-surface-600 dark:text-surface-400">
                            {teamBName}
                        </p>
                        <p className={cn(
                            'text-4xl font-bold mt-1',
                            leader === 'teamB' ? 'text-team-europe' : 'text-surface-700 dark:text-surface-300'
                        )}>
                            {teamBPoints}
                        </p>
                    </div>
                </div>

                {/* Progress Bars */}
                <div className="mt-6 space-y-3">
                    <div>
                        <div className="flex justify-between text-xs text-surface-500 mb-1">
                            <span>{teamAName}</span>
                            <span>{teamAPoints}/{pointsToWin} to win</span>
                        </div>
                        <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-team-usa transition-all duration-500"
                                style={{ width: `${Math.min(teamAProgress, 100)}%` }}
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-surface-500 mb-1">
                            <span>{teamBName}</span>
                            <span>{teamBPoints}/{pointsToWin} to win</span>
                        </div>
                        <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-team-europe transition-all duration-500"
                                style={{ width: `${Math.min(teamBProgress, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Magic Number */}
            <div className="border-t border-surface-200 dark:border-surface-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-augusta-green" />
                    <span className="text-sm font-medium">Magic Number</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-team-usa/5">
                        <p className="text-2xl font-bold text-team-usa">
                            {magicNumber.teamAClinched ? '✓' : magicNumber.teamANeeded}
                        </p>
                        <p className="text-xs text-surface-500 mt-1">
                            {magicNumber.teamAClinched ? 'Clinched!' : 'USA needs'}
                        </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-team-europe/5">
                        <p className="text-2xl font-bold text-team-europe">
                            {magicNumber.teamBClinched ? '✓' : magicNumber.teamBNeeded}
                        </p>
                        <p className="text-xs text-surface-500 mt-1">
                            {magicNumber.teamBClinched ? 'Clinched!' : 'EUR needs'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StandingsCard;
