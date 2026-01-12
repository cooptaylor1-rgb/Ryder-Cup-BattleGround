'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useScoringStore } from '@/lib/stores';
import { AppShell } from '@/components/layout';
import { MatchCard } from '@/components/ui';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { cn, formatPlayerName } from '@/lib/utils';
import { ChevronRight, Calendar, Trophy } from 'lucide-react';
import type { MatchState } from '@/lib/types/computed';

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

    if (!currentTrip) {
        return null; // Will redirect
    }

    return (
        <AppShell headerTitle="Score">
            <div className="p-4 space-y-4">
                {/* Session Header */}
                {activeSession && (
                    <div className="card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-sm text-surface-500 mb-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Session {activeSession.sessionNumber}</span>
                                </div>
                                <h2 className="text-lg font-semibold capitalize">
                                    {activeSession.sessionType}
                                </h2>
                            </div>
                            <span className={cn(
                                'badge',
                                activeSession.status === 'inProgress' && 'badge-info',
                                activeSession.status === 'scheduled' && 'badge-default',
                                activeSession.status === 'completed' && 'badge-success'
                            )}>
                                {activeSession.status === 'inProgress' ? 'In Progress' :
                                    activeSession.status === 'scheduled' ? 'Scheduled' : 'Complete'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Match Cards */}
                {matchStates.length > 0 ? (
                    <div className="space-y-3">
                        {matchStates.map((matchState, index) => (
                            <MatchCard
                                key={matchState.match.id}
                                matchState={matchState}
                                matchNumber={index + 1}
                                teamAPlayers={getMatchPlayers(matchState.match.teamAPlayerIds)}
                                teamBPlayers={getMatchPlayers(matchState.match.teamBPlayerIds)}
                                onClick={() => handleMatchSelect(matchState.match.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="card p-8 text-center">
                        <Trophy className="w-12 h-12 mx-auto mb-4 text-surface-400" />
                        <p className="text-surface-500 mb-4">
                            {sessions.length === 0
                                ? 'No sessions created yet'
                                : 'No matches in this session'}
                        </p>
                        <button
                            onClick={() => router.push('/matchups')}
                            className="btn-primary"
                        >
                            Set Up Matchups
                        </button>
                    </div>
                )}

                {/* Session Selector */}
                {sessions.length > 1 && (
                    <section className="pt-4">
                        <h3 className="text-sm font-medium text-surface-500 mb-2">
                            Other Sessions
                        </h3>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {sessions.map(session => (
                                <button
                                    key={session.id}
                                    onClick={() => {/* TODO: Switch session */ }}
                                    className={cn(
                                        'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
                                        session.id === activeSession?.id
                                            ? 'bg-augusta-green text-white'
                                            : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400'
                                    )}
                                >
                                    Session {session.sessionNumber}
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </AppShell>
    );
}
