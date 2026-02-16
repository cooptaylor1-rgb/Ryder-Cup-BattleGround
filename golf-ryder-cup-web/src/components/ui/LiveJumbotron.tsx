/**
 * Live Jumbotron Component
 *
 * Full-screen view showing all active matches with real-time updates.
 * Perfect for displaying on a TV in the clubhouse or viewing from the cart.
 *
 * Features:
 * - Auto-updates via Supabase real-time
 * - Team-colored design with animations
 * - Shows active users/scorers
 * - Dramatic score change animations
 */

'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { cn, formatPlayerName } from '@/lib/utils';
import { useLiveScores, useRealtime } from '@/lib/supabase';
import type { Player, Match } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';
import { db, useLiveQuery } from '@/lib/db';
import { useTripMatchData } from '@/lib/hooks/useSessionMatchData';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { Radio, Users, Trophy, ChevronUp, ChevronDown, Minus, WifiOff } from 'lucide-react';

interface LiveJumbotronProps {
    tripId: string;
    sessionId?: string;
    className?: string;
}

export function LiveJumbotron({ tripId, sessionId: _sessionId, className }: LiveJumbotronProps) {
    const { isConnected, activeUsers, connectionStatus: _connectionStatus } = useRealtime(tripId);
    const { scores, isLoading } = useLiveScores(tripId);

    // Get matches and hole results in a single compound query (eliminates N+1 pattern)
    const { matches, holeResults, isLoading: matchDataLoading } = useTripMatchData(tripId);

    // Get players for lookup
    const players = useLiveQuery(() => db.players.toArray(), []);
    const playerMap = useMemo(
        () => new Map(players?.map(p => [p.id, p]) || []),
        [players]
    );

    // Calculate match states (memoized to avoid recalculating on every render)
    const matchStates = useMemo(() => {
        const states = new Map<string, MatchState>();
        if (!matches || !holeResults) return states;

        const resultsByMatch = new Map<string, typeof holeResults>();
        for (const result of holeResults) {
            const existing = resultsByMatch.get(result.matchId) || [];
            existing.push(result);
            resultsByMatch.set(result.matchId, existing);
        }

        for (const match of matches) {
            const results = resultsByMatch.get(match.id) || [];
            states.set(match.id, calculateMatchState(match, results));
        }
        return states;
    }, [matches, holeResults]);

    // Separate matches by status (memoized to avoid re-filtering on every render)
    const { activeMatches, completedMatches, upcomingMatches } = useMemo(() => ({
        activeMatches: matches?.filter(m => m.status === 'inProgress') || [],
        completedMatches: matches?.filter(m => m.status === 'completed') || [],
        upcomingMatches: matches?.filter(m => m.status === 'scheduled') || [],
    }), [matches]);

    // Calculate team totals (memoized)
    const { teamATotal, teamBTotal } = useMemo(() => {
        let a = 0;
        let b = 0;
        for (const state of matchStates.values()) {
            if (state.status === 'completed') {
                if (state.currentScore > 0) a += 1;
                else if (state.currentScore < 0) b += 1;
                else { a += 0.5; b += 0.5; }
            }
        }
        return { teamATotal: a, teamBTotal: b };
    }, [matchStates]);

    if (isLoading || matchDataLoading) {
        return (
            <div className={cn('flex items-center justify-center min-h-[50vh]', className)}>
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-masters-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[var(--ink-tertiary)]">Loading live scores...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header with connection status */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                        isConnected
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
                    )}>
                        {isConnected ? (
                            <>
                                <Radio className="w-4 h-4 animate-pulse" />
                                <span>Live</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-4 h-4" />
                                <span>Offline</span>
                            </>
                        )}
                    </div>

                    {activeUsers.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-[var(--ink-tertiary)]">
                            <Users className="w-4 h-4" />
                            <span>{activeUsers.length} viewing</span>
                        </div>
                    )}
                </div>

                {/* Team totals */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-sm text-[var(--ink-tertiary)] block">USA</span>
                        <span className="text-2xl font-bold text-team-usa">{teamATotal}</span>
                    </div>
                    <div className="w-px h-8 bg-[color:var(--rule)]/40" />
                    <div className="text-left">
                        <span className="text-sm text-[var(--ink-tertiary)] block">EUR</span>
                        <span className="text-2xl font-bold text-team-europe">{teamBTotal}</span>
                    </div>
                </div>
            </div>

            {/* Active Matches - Large Cards */}
            {activeMatches.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-[var(--ink-tertiary)] uppercase tracking-wide mb-3">
                        In Progress ({activeMatches.length})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {activeMatches.map((match, idx) => {
                            const state = matchStates.get(match.id);
                            const liveScore = scores.get(match.id);
                            const teamAPlayers = match.teamAPlayerIds.map(id => playerMap.get(id)).filter(Boolean) as Player[];
                            const teamBPlayers = match.teamBPlayerIds.map(id => playerMap.get(id)).filter(Boolean) as Player[];

                            return (
                                <LiveMatchCard
                                    key={match.id}
                                    match={match}
                                    matchState={state}
                                    teamAPlayers={teamAPlayers}
                                    teamBPlayers={teamBPlayers}
                                    matchNumber={idx + 1}
                                    isLive={isConnected}
                                    lastUpdate={liveScore?.lastUpdate}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Completed Matches */}
            {completedMatches.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-[var(--ink-tertiary)] uppercase tracking-wide mb-3">
                        Completed ({completedMatches.length})
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {completedMatches.map((match, _idx) => {
                            const state = matchStates.get(match.id);
                            const teamAPlayers = match.teamAPlayerIds.map(id => playerMap.get(id)).filter(Boolean) as Player[];
                            const teamBPlayers = match.teamBPlayerIds.map(id => playerMap.get(id)).filter(Boolean) as Player[];

                            return (
                                <CompletedMatchCard
                                    key={match.id}
                                    match={match}
                                    matchState={state}
                                    teamAPlayers={teamAPlayers}
                                    teamBPlayers={teamBPlayers}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Upcoming Matches */}
            {upcomingMatches.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-[var(--ink-tertiary)] uppercase tracking-wide mb-3">
                        Upcoming ({upcomingMatches.length})
                    </h3>
                    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                        {upcomingMatches.map((match, idx) => {
                            const teamAPlayers = match.teamAPlayerIds.map(id => playerMap.get(id)).filter(Boolean) as Player[];
                            const teamBPlayers = match.teamBPlayerIds.map(id => playerMap.get(id)).filter(Boolean) as Player[];

                            return (
                                <UpcomingMatchCard
                                    key={match.id}
                                    match={match}
                                    teamAPlayers={teamAPlayers}
                                    teamBPlayers={teamBPlayers}
                                    matchNumber={idx + 1}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {matches.length === 0 && (
                <div className="text-center py-12">
                    <Trophy className="w-12 h-12 mx-auto mb-4 text-[var(--ink-tertiary)]" />
                    <p className="text-lg text-[var(--ink-tertiary)]">No matches yet</p>
                    <p className="text-sm text-[var(--ink-tertiary)] mt-1">Create matches to start tracking scores</p>
                </div>
            )}
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface LiveMatchCardProps {
    match: Match;
    matchState?: MatchState;
    teamAPlayers: Player[];
    teamBPlayers: Player[];
    matchNumber: number;
    isLive: boolean;
    lastUpdate?: Date;
}

const LiveMatchCard = memo(function LiveMatchCard({
    match: _match,
    matchState,
    teamAPlayers,
    teamBPlayers,
    matchNumber,
    isLive,
    lastUpdate,
}: LiveMatchCardProps) {
    const [scoreChanged, setScoreChanged] = useState(false);

    // Animate on score change
    useEffect(() => {
        if (lastUpdate) {
            setScoreChanged(true);
            const timer = setTimeout(() => setScoreChanged(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [lastUpdate]);

    const displayScore = matchState?.displayScore || 'AS';
    const currentScore = matchState?.currentScore || 0;
    const holesPlayed = matchState?.holesPlayed || 0;

    return (
        <div className={cn(
            'relative p-4 rounded-xl border-2 overflow-hidden',
            'bg-[var(--surface)] transition-all duration-300',
            scoreChanged && 'animate-score-pop',
            currentScore > 0 ? 'border-team-usa/30' : currentScore < 0 ? 'border-team-europe/30' : 'border-[color:var(--rule)]/40'
        )}>
            {/* Live indicator */}
            {isLive && (
                <div className="absolute top-2 right-2">
                    <span className="flex items-center gap-1 text-xs text-success">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        LIVE
                    </span>
                </div>
            )}

            {/* Match number */}
            <div className="text-xs text-[var(--ink-tertiary)] mb-3">Match {matchNumber}</div>

            {/* Score display */}
            <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex-1 text-center">
                    <div className="text-xs text-team-usa font-medium mb-1">USA</div>
                    <div className="text-lg font-medium">
                        {teamAPlayers.map(p => formatPlayerName(p.firstName, p.lastName, 'short')).join(' & ')}
                    </div>
                </div>

                <div className={cn(
                    'text-4xl font-bold min-w-20 text-center',
                    scoreChanged && 'scale-110',
                    currentScore > 0 ? 'text-team-usa' : currentScore < 0 ? 'text-team-europe' : 'text-[var(--ink-tertiary)]'
                )}>
                    {displayScore}
                </div>

                <div className="flex-1 text-center">
                    <div className="text-xs text-team-europe font-medium mb-1">EUR</div>
                    <div className="text-lg font-medium">
                        {teamBPlayers.map(p => formatPlayerName(p.firstName, p.lastName, 'short')).join(' & ')}
                    </div>
                </div>
            </div>

            {/* Hole indicator */}
            <div className="text-center text-sm text-[var(--ink-tertiary)]">
                {holesPlayed > 0 ? (
                    <span>Thru {holesPlayed} holes</span>
                ) : (
                    <span>Starting soon</span>
                )}
                {matchState?.isDormie && (
                    <span className="ml-2 px-2 py-0.5 bg-warning/20 text-warning rounded text-xs font-medium">
                        DORMIE
                    </span>
                )}
            </div>
        </div>
    );
});

interface CompletedMatchCardProps {
    match: Match;
    matchState?: MatchState;
    teamAPlayers: Player[];
    teamBPlayers: Player[];
}

const CompletedMatchCard = memo(function CompletedMatchCard({
    match: _match,
    matchState,
    teamAPlayers,
    teamBPlayers,
}: CompletedMatchCardProps) {
    const currentScore = matchState?.currentScore || 0;
    const displayScore = matchState?.displayScore || 'AS';
    const winningTeam = currentScore > 0 ? 'usa' : currentScore < 0 ? 'europe' : 'halved';

    return (
        <div className={cn(
            'p-3 rounded-lg border',
            'bg-[var(--surface)]',
            winningTeam === 'usa' ? 'border-team-usa/30' : winningTeam === 'europe' ? 'border-team-europe/30' : 'border-[color:var(--rule)]/40'
        )}>
            <div className="flex items-center gap-3">
                <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    winningTeam === 'usa' ? 'bg-team-usa text-[var(--canvas)]' :
                        winningTeam === 'europe' ? 'bg-team-europe text-[var(--canvas)]' :
                            'bg-[color:var(--ink-tertiary)]/15 text-[var(--ink-secondary)]'
                )}>
                    {winningTeam === 'halved' ? '=' : displayScore}
                </div>

                <div className="flex-1 min-w-0">
                    <div className={cn(
                        'text-sm font-medium truncate',
                        winningTeam === 'usa' && 'text-team-usa'
                    )}>
                        {teamAPlayers.map(p => formatPlayerName(p.firstName, p.lastName, 'short')).join(' & ')}
                    </div>
                    <div className={cn(
                        'text-sm font-medium truncate',
                        winningTeam === 'europe' && 'text-team-europe'
                    )}>
                        {teamBPlayers.map(p => formatPlayerName(p.firstName, p.lastName, 'short')).join(' & ')}
                    </div>
                </div>

                <div className="text-right">
                    {winningTeam === 'usa' && <ChevronUp className="w-5 h-5 text-team-usa" />}
                    {winningTeam === 'europe' && <ChevronDown className="w-5 h-5 text-team-europe" />}
                    {winningTeam === 'halved' && <Minus className="w-5 h-5 text-[var(--ink-tertiary)]" />}
                </div>
            </div>
        </div>
    );
});

interface UpcomingMatchCardProps {
    match: Match;
    teamAPlayers: Player[];
    teamBPlayers: Player[];
    matchNumber: number;
}

const UpcomingMatchCard = memo(function UpcomingMatchCard({
    match: _match,
    teamAPlayers,
    teamBPlayers,
    matchNumber,
}: UpcomingMatchCardProps) {
    return (
        <div className="p-3 rounded-lg border border-[color:var(--rule)]/40 bg-[color:var(--surface-secondary)]/60 opacity-80">
            <div className="text-xs text-[var(--ink-tertiary)] mb-2">Match {matchNumber}</div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-team-usa" />
                <span className="text-sm truncate flex-1">
                    {teamAPlayers.map(p => formatPlayerName(p.firstName, p.lastName, 'short')).join(' & ') || 'TBD'}
                </span>
            </div>
            <div className="text-center text-xs text-[var(--ink-tertiary)] my-1">vs</div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-team-europe" />
                <span className="text-sm truncate flex-1">
                    {teamBPlayers.map(p => formatPlayerName(p.firstName, p.lastName, 'short')).join(' & ') || 'TBD'}
                </span>
            </div>
        </div>
    );
});

export default LiveJumbotron;
