'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useScoringStore } from '@/lib/stores';
import { AppShellNew } from '@/components/layout';
import {
    Card,
    Badge,
    StatusBadge,
    SectionHeader,
    Button,
    MatchCardSkeleton,
    NoMatchesEmptyNew,
} from '@/components/ui';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { cn, formatPlayerName } from '@/lib/utils';
import { ChevronRight, Calendar, Trophy, Target, Users } from 'lucide-react';
import type { MatchState } from '@/lib/types/computed';
import type { Player } from '@/lib/types/models';

// Match card component with enhanced styling
interface MatchCardNewProps {
    matchState: MatchState;
    matchNumber: number;
    teamAPlayers: Player[];
    teamBPlayers: Player[];
    onClick: () => void;
}

function MatchCardNew({
    matchState,
    matchNumber,
    teamAPlayers,
    teamBPlayers,
    onClick,
}: MatchCardNewProps) {
    const { currentScore, holesPlayed, isDormie, status, displayScore } = matchState;

    const getStatusConfig = () => {
        if (status === 'completed') return { status: 'completed' as const, label: 'Complete' };
        if (isDormie) return { status: 'dormie' as const, label: 'Dormie' };
        if (holesPlayed > 0) return { status: 'inProgress' as const, label: `Hole ${holesPlayed}` };
        return { status: 'notStarted' as const, label: 'Not Started' };
    };

    const statusConfig = getStatusConfig();

    return (
        <Card interactive onClick={onClick} className="group">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center',
                        'bg-surface-elevated text-text-secondary',
                        'text-sm font-semibold',
                    )}>
                        {matchNumber}
                    </div>
                    <span className="text-sm font-medium text-text-secondary">
                        Match {matchNumber}
                    </span>
                </div>
                <StatusBadge status={statusConfig.status} />
            </div>

            {/* Teams vs Score Layout */}
            <div className="flex items-stretch gap-3">
                {/* Team A */}
                <div className={cn(
                    'flex-1 p-3 rounded-lg',
                    'bg-team-usa/5 border-l-[3px] border-team-usa',
                )}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-team-usa" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-team-usa">
                            USA
                        </span>
                    </div>
                    <div className="space-y-1">
                        {teamAPlayers.length > 0 ? (
                            teamAPlayers.map(player => (
                                <p key={player.id} className="text-sm font-medium text-text-primary truncate">
                                    {formatPlayerName(player.firstName, player.lastName, 'short')}
                                </p>
                            ))
                        ) : (
                            <p className="text-sm text-text-tertiary italic">No players</p>
                        )}
                    </div>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center justify-center px-4 min-w-[72px]">
                    <span className={cn(
                        'text-2xl font-bold font-mono',
                        currentScore > 0 && 'text-team-usa',
                        currentScore < 0 && 'text-team-europe',
                        currentScore === 0 && 'text-text-secondary',
                    )}>
                        {displayScore}
                    </span>
                    {holesPlayed > 0 && (
                        <span className="text-xs text-text-tertiary mt-1">
                            thru {holesPlayed}
                        </span>
                    )}
                </div>

                {/* Team B */}
                <div className={cn(
                    'flex-1 p-3 rounded-lg',
                    'bg-team-europe/5 border-r-[3px] border-team-europe',
                )}>
                    <div className="flex items-center justify-end gap-2 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-team-europe">
                            EUR
                        </span>
                        <div className="h-2 w-2 rounded-full bg-team-europe" />
                    </div>
                    <div className="space-y-1 text-right">
                        {teamBPlayers.length > 0 ? (
                            teamBPlayers.map(player => (
                                <p key={player.id} className="text-sm font-medium text-text-primary truncate">
                                    {formatPlayerName(player.firstName, player.lastName, 'short')}
                                </p>
                            ))
                        ) : (
                            <p className="text-sm text-text-tertiary italic">No players</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer - Tap to score hint */}
            <div className={cn(
                'flex items-center justify-center gap-2 mt-4 pt-3',
                'border-t border-surface-border/50',
                'text-text-tertiary group-hover:text-masters-green-light',
                'transition-colors duration-150',
            )}>
                <Target className="h-4 w-4" />
                <span className="text-xs font-medium">
                    {status === 'completed' ? 'View results' : 'Tap to score'}
                </span>
                <ChevronRight className="h-4 w-4" />
            </div>
        </Card>
    );
}

export default function ScorePage() {
    const router = useRouter();
    const { currentTrip, sessions, players, teams, teamMembers } = useTripStore();
    const { selectMatch } = useScoringStore();

    // Redirect if no trip selected
    useEffect(() => {
        if (!currentTrip) {
            router.push('/');
        }
    }, [currentTrip, router]);

    // Get active session (first in-progress or next scheduled)
    const activeSession = sessions.find(s => s.status === 'inProgress') ||
        sessions.find(s => s.status === 'scheduled');

    // Get matches for active session
    const matches = useLiveQuery(
        async () => {
            if (!activeSession) return [];
            return db.matches
                .where('sessionId')
                .equals(activeSession.id)
                .sortBy('matchNumber');
        },
        [activeSession?.id],
        []
    );

    // Get all hole results for these matches
    const holeResults = useLiveQuery(
        async () => {
            if (!matches || matches.length === 0) return [];
            const matchIds = matches.map(m => m.id);
            return db.holeResults
                .where('matchId')
                .anyOf(matchIds)
                .toArray();
        },
        [matches],
        []
    );

    // Calculate match states
    const matchStates: MatchState[] = matches.map(match => {
        const results = holeResults.filter(r => r.matchId === match.id);
        return calculateMatchState(match, results);
    });

    // Helper to get players for a match
    const getMatchPlayers = (playerIds: string[]) => {
        return playerIds
            .map(id => players.find(p => p.id === id))
            .filter(Boolean) as typeof players;
    };

    const handleMatchSelect = async (matchId: string) => {
        await selectMatch(matchId);
        router.push(`/score/${matchId}`);
    };

    const isLoading = matches === undefined || holeResults === undefined;

    if (!currentTrip) {
        return null; // Will redirect
    }

    return (
        <AppShellNew
            headerTitle="Score"
            headerSubtitle={currentTrip.name}
        >
            <div className="px-5 pt-10 max-w-[480px] mx-auto pb-24 space-y-10">
                {/* Session Header - Masters refined */}
                {activeSession && (
                    <Card variant="elevated" className="bg-masters-green/5 border-masters-green/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    'h-11 w-11 rounded-xl flex items-center justify-center',
                                    'bg-masters-green text-magnolia',
                                )}>
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-text-secondary">
                                        Session {activeSession.sessionNumber}
                                    </p>
                                    <h2 className="font-serif text-xl font-semibold text-magnolia capitalize">
                                        {activeSession.sessionType}
                                    </h2>
                                </div>
                            </div>
                            <StatusBadge
                                status={
                                    activeSession.status === 'inProgress'
                                        ? 'inProgress'
                                        : activeSession.status === 'completed'
                                            ? 'completed'
                                            : 'scheduled'
                                }
                            />
                        </div>
                    </Card>
                )}

                {/* Matches Section */}
                <section>
                    <SectionHeader
                        title="Matches"
                        subtitle={matchStates.length > 0 ? `${matchStates.length} matches` : undefined}
                        icon={Target}
                        className="mb-4"
                    />

                    {/* Loading state */}
                    {isLoading && (
                        <div className="space-y-3">
                            <MatchCardSkeleton />
                            <MatchCardSkeleton />
                            <MatchCardSkeleton />
                        </div>
                    )}

                    {/* Match cards */}
                    {!isLoading && matchStates.length > 0 && (
                        <div className="space-y-3">
                            {matchStates.map((matchState, index) => (
                                <MatchCardNew
                                    key={matchState.match.id}
                                    matchState={matchState}
                                    matchNumber={index + 1}
                                    teamAPlayers={getMatchPlayers(matchState.match.teamAPlayerIds)}
                                    teamBPlayers={getMatchPlayers(matchState.match.teamBPlayerIds)}
                                    onClick={() => handleMatchSelect(matchState.match.id)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoading && matchStates.length === 0 && (
                        <Card variant="outlined" padding="none">
                            <NoMatchesEmptyNew onSetupMatchups={() => router.push('/matchups')} />
                        </Card>
                    )}
                </section>

                {/* Session Selector */}
                {sessions.length > 1 && (
                    <section>
                        <SectionHeader
                            title="Other Sessions"
                            size="sm"
                            className="mb-3"
                        />
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                            {sessions.map(session => (
                                <button
                                    key={session.id}
                                    onClick={() => {/* TODO: Switch session */ }}
                                    className={cn(
                                        'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
                                        'transition-colors duration-150',
                                        session.id === activeSession?.id
                                            ? 'bg-masters-green text-magnolia'
                                            : 'bg-surface-elevated text-text-secondary hover:bg-surface-highlight',
                                    )}
                                >
                                    Session {session.sessionNumber}
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </AppShellNew>
    );
}
