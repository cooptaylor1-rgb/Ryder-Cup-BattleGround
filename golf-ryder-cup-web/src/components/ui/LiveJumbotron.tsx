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

import { useState, useEffect } from 'react';
import { cn, formatPlayerName } from '@/lib/utils';
import { useLiveScores, useRealtime } from '@/lib/supabase';
import type { Player, Match } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';
import { db, useLiveQuery } from '@/lib/db';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { Radio, Users, Trophy, Wifi, WifiOff, ChevronUp, ChevronDown, Minus } from 'lucide-react';

interface LiveJumbotronProps {
    tripId: string;
    sessionId?: string;
    className?: string;
}

export function LiveJumbotron({ tripId, sessionId, className }: LiveJumbotronProps) {
    const { isConnected, activeUsers, connectionStatus } = useRealtime(tripId);
    const { scores, isLoading } = useLiveScores(tripId);

    // Get matches from local DB
    const matches = useLiveQuery(async () => {
        if (sessionId) {
            return db.matches.where('sessionId').equals(sessionId).toArray();
        }
        // Get all sessions for this trip and their matches
        const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
        const sessionIds = sessions.map(s => s.id);
        return db.matches.where('sessionId').anyOf(sessionIds).toArray();
    }, [tripId, sessionId]);

    // Get players for lookup
    const players = useLiveQuery(() => db.players.toArray(), []);
    const playerMap = new Map(players?.map(p => [p.id, p]) || []);

    // Get hole results for match states
    const holeResults = useLiveQuery(async () => {
        if (!matches) return [];
        const matchIds = matches.map(m => m.id);
        return db.holeResults.where('matchId').anyOf(matchIds).toArray();
    }, [matches]);

    // Calculate match states
    const matchStates = new Map<string, MatchState>();
    if (matches && holeResults) {
        const resultsByMatch = new Map<string, typeof holeResults>();
        for (const result of holeResults) {
            const existing = resultsByMatch.get(result.matchId) || [];
            existing.push(result);
            resultsByMatch.set(result.matchId, existing);
        }

        for (const match of matches) {
            const results = resultsByMatch.get(match.id) || [];
            matchStates.set(match.id, calculateMatchState(match, results));
        }
    }

    // Separate matches by status
    const activeMatches = matches?.filter(m => m.status === 'inProgress') || [];
    const completedMatches = matches?.filter(m => m.status === 'completed') || [];
    const upcomingMatches = matches?.filter(m => m.status === 'scheduled') || [];

    // Calculate team totals
    let teamATotal = 0;
    let teamBTotal = 0;
    for (const state of matchStates.values()) {
        if (state.status === 'completed') {
            if (state.currentScore > 0) teamATotal += 1;
            else if (state.currentScore < 0) teamBTotal += 1;
            else {
                teamATotal += 0.5;
                teamBTotal += 0.5;
            }
        }
    }

    if (isLoading || !matches) {
        return (
            <div className={cn('flex items-center justify-center min-h-[50vh]', className)}>
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-masters-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-surface-500">Loading live scores...</p>
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
                        <div className="flex items-center gap-2 text-sm text-surface-500">
                            <Users className="w-4 h-4" />
                            <span>{activeUsers.length} viewing</span>
                        </div>
                    )}
                </div>

                {/* Team totals */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-sm text-surface-500 block">USA</span>
                        <span className="text-2xl font-bold text-team-usa">{teamATotal}</span>
                    </div>
                    <div className="w-px h-8 bg-surface-300 dark:bg-surface-700" />
                    <div className="text-left">
                        <span className="text-sm text-surface-500 block">EUR</span>
                        <span className="text-2xl font-bold text-team-europe">{teamBTotal}</span>
                    </div>
                </div>
            </div>

            {/* Active Matches - Large Cards */}
            {activeMatches.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-surface-500 uppercase tracking-wide mb-3">
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
                    <h3 className="text-sm font-medium text-surface-500 uppercase tracking-wide mb-3">
                        Completed ({completedMatches.length})
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {completedMatches.map((match, idx) => {
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
                    <h3 className="text-sm font-medium text-surface-500 uppercase tracking-wide mb-3">
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
                    <Trophy className="w-12 h-12 mx-auto mb-4 text-surface-400" />
                    <p className="text-lg text-surface-500">No matches yet</p>
                    <p className="text-sm text-surface-400 mt-1">Create matches to start tracking scores</p>
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

function LiveMatchCard({
    match,
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
            'bg-surface-card transition-all duration-300',
            scoreChanged && 'animate-score-pop',
            currentScore > 0 ? 'border-team-usa/30' : currentScore < 0 ? 'border-team-europe/30' : 'border-surface-300 dark:border-surface-700'
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
            <div className="text-xs text-surface-500 mb-3">Match {matchNumber}</div>

            {/* Score display */}
            <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex-1 text-center">
                    <div className="text-xs text-team-usa font-medium mb-1">USA</div>
                    <div className="text-lg font-medium">
                        {teamAPlayers.map(p => formatPlayerName(p.firstName, p.lastName, 'short')).join(' & ')}
                    </div>
                </div>

                <div className={cn(
                    'text-4xl font-bold min-w-[80px] text-center',
                    scoreChanged && 'scale-110',
                    currentScore > 0 ? 'text-team-usa' : currentScore < 0 ? 'text-team-europe' : 'text-surface-500'
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
            <div className="text-center text-sm text-surface-500">
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
}

interface CompletedMatchCardProps {
    match: Match;
    matchState?: MatchState;
    teamAPlayers: Player[];
    teamBPlayers: Player[];
}

function CompletedMatchCard({
    match,
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
            'bg-surface-card',
            winningTeam === 'usa' ? 'border-team-usa/30' : winningTeam === 'europe' ? 'border-team-europe/30' : 'border-surface-300 dark:border-surface-700'
        )}>
            <div className="flex items-center gap-3">
                <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    winningTeam === 'usa' ? 'bg-team-usa text-white' :
                    winningTeam === 'europe' ? 'bg-team-europe text-white' :
                    'bg-surface-300 dark:bg-surface-600 text-surface-600 dark:text-surface-300'
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
                    {winningTeam === 'halved' && <Minus className="w-5 h-5 text-surface-400" />}
                </div>
            </div>
        </div>
    );
}

interface UpcomingMatchCardProps {
    match: Match;
    teamAPlayers: Player[];
    teamBPlayers: Player[];
    matchNumber: number;
}

function UpcomingMatchCard({
    match,
    teamAPlayers,
    teamBPlayers,
    matchNumber,
}: UpcomingMatchCardProps) {
    return (
        <div className="p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 opacity-75">
            <div className="text-xs text-surface-400 mb-2">Match {matchNumber}</div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-team-usa" />
                <span className="text-sm truncate flex-1">
                    {teamAPlayers.map(p => formatPlayerName(p.firstName, p.lastName, 'short')).join(' & ') || 'TBD'}
                </span>
            </div>
            <div className="text-center text-xs text-surface-400 my-1">vs</div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-team-europe" />
                <span className="text-sm truncate flex-1">
                    {teamBPlayers.map(p => formatPlayerName(p.firstName, p.lastName, 'short')).join(' & ') || 'TBD'}
                </span>
            </div>
        </div>
    );
}

export default LiveJumbotron;
