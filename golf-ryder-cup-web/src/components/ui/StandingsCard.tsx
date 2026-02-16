/**
 * Standings Card Component
 *
 * Premium display of tournament standings with team points.
 * Features animated progress bars, hero score display, and magic number.
 *
 * Design inspired by The Masters app leaderboard presentation.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { TeamStandings, MagicNumber } from '@/lib/types/computed';
import { Trophy, Target } from 'lucide-react';

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
    const [animatedTeamA, setAnimatedTeamA] = useState(0);
    const [animatedTeamB, setAnimatedTeamB] = useState(0);
    const [scoreChanged, setScoreChanged] = useState(false);
    const prevTeamARef = useRef(teamAPoints);
    const prevTeamBRef = useRef(teamBPoints);

    const pointsToWin = 14.5; // Standard Ryder Cup
    const teamAProgress = (animatedTeamA / pointsToWin) * 100;
    const teamBProgress = (animatedTeamB / pointsToWin) * 100;

    // Animate progress bars on mount and update
    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedTeamA(teamAPoints);
            setAnimatedTeamB(teamBPoints);
        }, 100);
        return () => clearTimeout(timer);
    }, [teamAPoints, teamBPoints]);

    // Trigger celebration animation on score change
    useEffect(() => {
        if (teamAPoints !== prevTeamARef.current || teamBPoints !== prevTeamBRef.current) {
            setScoreChanged(true);
            const timer = setTimeout(() => setScoreChanged(false), 600);
            prevTeamARef.current = teamAPoints;
            prevTeamBRef.current = teamBPoints;
            return () => clearTimeout(timer);
        }
    }, [teamAPoints, teamBPoints]);

    // Format score for display
    const formatScore = (score: number) => {
        return Number.isInteger(score) ? score.toString() : score.toFixed(1);
    };

    return (
        <div className="card-premium texture-grain overflow-hidden">
            {/* Premium Header with gradient */}
            <div
                className="p-4 relative"
                style={{
                    background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                }}
            >
                {/* Subtle pattern overlay */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='%23fff' fill-opacity='0.3'/%3E%3C/svg%3E")`,
                    }}
                />
                <div className="relative flex items-center justify-between text-[var(--canvas)]">
                    <div>
                        <h2 className="type-title text-[var(--canvas)]">Tournament Standings</h2>
                        <p className="type-caption text-[color:var(--canvas)]/75 mt-0.5">
                            {matchesCompleted} of {totalMatches} matches complete
                        </p>
                    </div>
                    <Trophy className="w-6 h-6 text-[color:var(--canvas)]/80" />
                </div>
            </div>

            {/* Hero Score Display */}
            <div className="standings-hero py-8">
                <div className="flex items-center justify-center gap-6 sm:gap-10">
                    {/* Team A */}
                    <div className="text-center">
                        <div
                            className="w-5 h-5 rounded-full mx-auto mb-3 shadow-lg"
                            style={{
                                background: 'linear-gradient(135deg, var(--team-usa) 0%, var(--team-usa-deep) 100%)',
                                boxShadow: '0 2px 8px var(--team-usa-glow)',
                            }}
                        />
                        <p className="type-overline text-[var(--ink-tertiary)] mb-2">{teamAName}</p>
                        <p
                            className={cn(
                                'standings-score tabular-nums',
                                leader === 'teamA' ? 'text-[var(--team-usa)]' : 'text-[var(--ink-secondary)]',
                                scoreChanged && leader === 'teamA' && 'animate-score-win'
                            )}
                        >
                            {formatScore(teamAPoints)}
                        </p>
                    </div>

                    {/* Versus Divider */}
                    <div className="flex flex-col items-center gap-1 min-w-20">
                        <span className="versus-text text-center">
                            {leader ? (
                                <span className={leader === 'teamA' ? 'text-[var(--team-usa)]' : 'text-[var(--team-europe)]'}>
                                    {leader === 'teamA' ? teamAName : teamBName}
                                    <br />
                                    <span className="text-[var(--ink-tertiary)]">leads</span>
                                </span>
                            ) : (
                                'Tied'
                            )}
                        </span>
                        {margin > 0 && (
                            <span className="text-xl font-bold text-[var(--ink-secondary)] mt-1">
                                +{margin}
                            </span>
                        )}
                    </div>

                    {/* Team B */}
                    <div className="text-center">
                        <div
                            className="w-5 h-5 rounded-full mx-auto mb-3 shadow-lg"
                            style={{
                                background: 'linear-gradient(135deg, var(--team-europe) 0%, var(--team-europe-deep) 100%)',
                                boxShadow: '0 2px 8px var(--team-europe-glow)',
                            }}
                        />
                        <p className="type-overline text-[var(--ink-tertiary)] mb-2">{teamBName}</p>
                        <p
                            className={cn(
                                'standings-score tabular-nums',
                                leader === 'teamB' ? 'text-[var(--team-europe)]' : 'text-[var(--ink-secondary)]',
                                scoreChanged && leader === 'teamB' && 'animate-score-win'
                            )}
                        >
                            {formatScore(teamBPoints)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Premium Progress Bars */}
            <div className="px-6 pb-5 space-y-4">
                <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="type-caption font-medium">{teamAName}</span>
                        <span className="type-caption text-[var(--ink-tertiary)]">
                            {formatScore(teamAPoints)}/{pointsToWin} to win
                        </span>
                    </div>
                    <div className="progress-premium">
                        <div
                            className="progress-premium-fill team-usa"
                            style={{ width: `${Math.min(teamAProgress, 100)}%` }}
                        />
                        <div
                            className="progress-target"
                            style={{ left: '100%' }}
                            title={`${pointsToWin} points to win`}
                        />
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="type-caption font-medium">{teamBName}</span>
                        <span className="type-caption text-[var(--ink-tertiary)]">
                            {formatScore(teamBPoints)}/{pointsToWin} to win
                        </span>
                    </div>
                    <div className="progress-premium">
                        <div
                            className="progress-premium-fill team-europe"
                            style={{ width: `${Math.min(teamBProgress, 100)}%` }}
                        />
                        <div
                            className="progress-target"
                            style={{ left: '100%' }}
                            title={`${pointsToWin} points to win`}
                        />
                    </div>
                </div>
            </div>

            {/* Magic Number Section */}
            <div className="border-t border-[var(--rule)] p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-[var(--masters)]" />
                    <span className="type-caption font-semibold">Points to Clinch</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div
                        className={cn(
                            'text-center p-3 rounded-xl border transition-all duration-300',
                            magicNumber.teamAClinched
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                : 'bg-[color:var(--team-usa)]/5 border-[color:var(--team-usa)]/10'
                        )}
                    >
                        <p
                            className={cn(
                                'text-2xl font-bold',
                                magicNumber.teamAClinched ? 'text-green-600 dark:text-green-400' : 'text-[var(--team-usa)]'
                            )}
                        >
                            {magicNumber.teamAClinched ? '✓' : magicNumber.teamANeeded.toFixed(1)}
                        </p>
                        <p className="type-micro mt-1">
                            {magicNumber.teamAClinched ? 'Clinched!' : `${teamAName} needs`}
                        </p>
                    </div>
                    <div
                        className={cn(
                            'text-center p-3 rounded-xl border transition-all duration-300',
                            magicNumber.teamBClinched
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                : 'bg-[color:var(--team-europe)]/5 border-[color:var(--team-europe)]/10'
                        )}
                    >
                        <p
                            className={cn(
                                'text-2xl font-bold',
                                magicNumber.teamBClinched ? 'text-green-600 dark:text-green-400' : 'text-[var(--team-europe)]'
                            )}
                        >
                            {magicNumber.teamBClinched ? '✓' : magicNumber.teamBNeeded.toFixed(1)}
                        </p>
                        <p className="type-micro mt-1">
                            {magicNumber.teamBClinched ? 'Clinched!' : `${teamBName} needs`}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StandingsCard;
