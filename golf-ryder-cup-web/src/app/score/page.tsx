'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useScoringStore, useAuthStore } from '@/lib/stores';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { createLogger } from '@/lib/utils/logger';
import { cn, formatPlayerName } from '@/lib/utils';
import { ChevronRight, Target } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import type { MatchState } from '@/lib/types/computed';
import type { Player } from '@/lib/types/models';
import {
  EmptyStatePremium,
  ErrorBoundary,
  NoScoresPremiumEmpty,
} from '@/components/ui';
import { BottomNav } from '@/components/layout';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';

/**
 * SCORE PAGE — Match List
 *
 * Fried Egg Golf Editorial Design:
 * - Cream canvas (#FAF8F5), warm ink (#1A1815)
 * - var(--font-serif) for display scores, var(--font-sans) for UI
 * - card-editorial for match cards, container-editorial for width
 * - Generous whitespace, restrained animations, no glow effects
 * - Active match uses score-monumental class for prominence
 */

const logger = createLogger('score');

export default function ScorePage() {
    const router = useRouter();
    const { currentTrip, sessions, players } = useTripStore();
    const { selectMatch } = useScoringStore();
    const { currentUser, isAuthenticated } = useAuthStore();

    // Find the current user's player record (P0-3)
    const currentUserPlayer = useMemo(() => {
        if (!isAuthenticated || !currentUser) return undefined;

        return players.find(p => {
            const playerEmail = p.email?.toLowerCase();
            const userEmail = currentUser.email?.toLowerCase();
            if (playerEmail && userEmail && playerEmail === userEmail) return true;

            const playerFirst = (p.firstName ?? '').toLowerCase();
            const playerLast = (p.lastName ?? '').toLowerCase();
            const userFirst = (currentUser.firstName ?? '').toLowerCase();
            const userLast = (currentUser.lastName ?? '').toLowerCase();

            if (!playerFirst || !userFirst || !playerLast || !userLast) return false;
            return playerFirst === userFirst && playerLast === userLast;
        });
    }, [currentUser, isAuthenticated, players]);

    // Track selected session - default to active or first available
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);


    // Determine the default active session (in progress or scheduled)
    const defaultActiveSession = sessions.find(s => s.status === 'inProgress') ||
        sessions.find(s => s.status === 'scheduled');

    // Use selected session if set, otherwise use default
    const activeSession = selectedSessionId
        ? sessions.find(s => s.id === selectedSessionId) || defaultActiveSession
        : defaultActiveSession;

    // Set initial selected session when sessions load - deferred to avoid setState-in-effect
    useEffect(() => {
        if (!selectedSessionId && defaultActiveSession) {
            // Defer to next tick to avoid cascading renders
            const timeoutId = setTimeout(() => {
                setSelectedSessionId(defaultActiveSession.id);
            }, 0);
            return () => clearTimeout(timeoutId);
        }
    }, [selectedSessionId, defaultActiveSession]);

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

    // PERF: Pre-index hole results by matchId to avoid O(n*m) filtering each render.
    const holeResultsByMatchId = useMemo(() => {
        const list = holeResults ?? [];
        const map = new Map<string, typeof list>();
        for (const r of list) {
            const arr = map.get(r.matchId) ?? [];
            arr.push(r);
            map.set(r.matchId, arr);
        }
        return map;
    }, [holeResults]);

    const matchStates: MatchState[] = (matches ?? []).map(match => {
        const results = holeResultsByMatchId.get(match.id) ?? [];
        return calculateMatchState(match, results);
    });

    const getMatchPlayers = (playerIds: string[]) => {
        return playerIds
            .map(id => players.find(p => p.id === id))
            .filter(Boolean) as typeof players;
    };

    const handleMatchSelect = async (matchId: string) => {
        try {
            await selectMatch(matchId);
            router.push(`/score/${matchId}`);
        } catch (error) {
            logger.error('Failed to select match', { matchId, error });
        }
    };

    // BUG-014 FIX: Distinguish loading state (undefined) from empty state ([] with length 0)
    // useLiveQuery returns undefined while loading, empty array when no data
    const isLoading = matches === undefined || holeResults === undefined;

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
                <PageHeader
                    title="Score"
                    subtitle="Sign in required"
                    icon={<Target size={16} className="text-[var(--masters)]" />}
                    onBack={() => router.back()}
                />

                <main className="container-editorial py-12">
                    <EmptyStatePremium
                        illustration="scorecard"
                        title="Sign in to view scores"
                        description="Match scoring is available after you sign in."
                        action={{
                            label: 'Sign In',
                            onClick: () => router.push('/login'),
                        }}
                        variant="large"
                    />
                </main>
                <BottomNav />
            </div>
        );
    }

    if (!currentTrip) {
        return (
            <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
                <PageHeader
                    title="Score"
                    subtitle="No active trip"
                    icon={<Target size={16} className="text-[var(--masters)]" />}
                    onBack={() => router.back()}
                />

                <main className="container-editorial py-12">
                    <EmptyStatePremium
                        illustration="scorecard"
                        title="No trip selected"
                        description="Pick a trip to view matches and scoring."
                        action={{
                            label: 'Back to Home',
                            onClick: () => router.push('/'),
                        }}
                        variant="large"
                    />
                </main>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
            <PageHeader
                title="Score"
                subtitle={currentTrip.name}
                icon={<Target size={16} className="text-[var(--masters)]" />}
                onBack={() => router.back()}
                rightSlot={<SyncStatusBadge showText />}
            />

            <main className="container-editorial">
                {/* Session Header */}
                {activeSession && (
                    <section className="pt-[var(--space-8)] pb-[var(--space-6)]">
                        <p className="type-overline mb-[var(--space-3)] text-[var(--masters)]">
                            Session {activeSession.sessionNumber}
                        </p>
                        <h1 className="type-display capitalize">{activeSession.sessionType}</h1>
                        <p className="type-caption mt-[var(--space-2)] text-[var(--ink-secondary)]">
                            {activeSession.status === 'inProgress'
                                ? 'In Progress'
                                : activeSession.status === 'completed'
                                  ? 'Complete'
                                  : 'Scheduled'}
                        </p>
                    </section>
                )}

                <hr className="divider" />

                {/* Matches - BUG-011 FIX: Wrap with ErrorBoundary for graceful error handling */}
                <section className="pt-[var(--space-6)] pb-[var(--space-8)]">
                    <h2 className="type-overline mb-[var(--space-6)] text-[var(--ink-secondary)]">Matches</h2>

                    <ErrorBoundary variant="compact" showDetails={process.env.NODE_ENV === 'development'}>
                        {isLoading ? (
                            <div className="flex flex-col gap-[var(--space-4)] py-[var(--space-8)]">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="card-editorial p-[var(--space-5)]">
                                        <div className="skeleton mb-3 h-3 w-[40%]" />
                                        <div className="skeleton mb-2 h-4 w-[70%]" />
                                        <div className="skeleton h-4 w-[60%]" />
                                    </div>
                                ))}
                            </div>
                        ) : matchStates.length > 0 ? (
                            <div className="flex flex-col gap-[var(--space-4)]">
                                {matchStates.map((matchState, index) => {
                                    // Check if current user is in this match (P0-3)
                                    const isUserMatch = currentUserPlayer && (
                                        matchState.match.teamAPlayerIds.includes(currentUserPlayer.id) ||
                                        matchState.match.teamBPlayerIds.includes(currentUserPlayer.id)
                                    );

                                    return (
                                        <MatchRow
                                            key={matchState.match.id}
                                            matchState={matchState}
                                            matchNumber={index + 1}
                                            teamAPlayers={getMatchPlayers(matchState.match.teamAPlayerIds)}
                                            teamBPlayers={getMatchPlayers(matchState.match.teamBPlayerIds)}
                                            onClick={() => handleMatchSelect(matchState.match.id)}
                                            isUserMatch={isUserMatch || false}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <NoScoresPremiumEmpty onStartScoring={() => router.push('/matchups')} />
                        )}
                    </ErrorBoundary>
                </section>

                {/* Session Selector */}
                {sessions.length > 1 && (
                    <>
                        <hr className="divider" />
                        <section className="pt-[var(--space-6)] pb-[var(--space-6)]">
                            <h2 className="type-overline mb-[var(--space-4)] text-[var(--ink-secondary)]">Sessions</h2>
                            <div className="flex gap-3 overflow-x-auto pb-2 -mx-[var(--space-5)] px-[var(--space-5)]">
                                {sessions.map(session => (
                                    <button
                                        key={session.id}
                                        onClick={() => setSelectedSessionId(session.id)}
                                        className={cn(
                                            session.id === activeSession?.id ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm',
                                            'whitespace-nowrap font-sans'
                                        )}
                                    >
                                        Session {session.sessionNumber}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </main>

            {/* Bottom Navigation */}
            <BottomNav />
        </div>
    );
}

/* ============================================
   Match Card — Editorial Design System
   card-editorial for structure, score-monumental for active match prominence
   ============================================ */
interface MatchRowProps {
    matchState: MatchState;
    matchNumber: number;
    teamAPlayers: Player[];
    teamBPlayers: Player[];
    onClick: () => void;
    isUserMatch?: boolean; // P0-3: Highlight user's match
}

function MatchRow({ matchState, matchNumber, teamAPlayers, teamBPlayers, onClick, isUserMatch = false }: MatchRowProps) {
    const { currentScore, holesPlayed, status, displayScore } = matchState;
    const isActive = status === 'inProgress';

    const formatPlayers = (playerList: Player[]) => {
        if (playerList.length === 0) return '\u2014';
        return playerList
            .map(p => formatPlayerName(p.firstName, p.lastName, 'short'))
            .join(' / ');
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                'card-editorial card-interactive relative w-full text-left transition-shadow',
                isActive ? 'p-[var(--space-6)]' : 'p-[var(--space-5)]',
                isUserMatch && 'border-2 border-[var(--masters)]'
            )}
        >
            {/* Your Match Badge (P0-3) */}
            {isUserMatch && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--masters)] px-3 py-[3px] text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-[var(--canvas)]">
                    Your Match
                </div>
            )}

            {/* Card header: match number + status */}
            <div className="mb-[var(--space-4)] flex items-center justify-between">
                <span
                    className={cn(
                        'type-overline',
                        isUserMatch ? 'text-[var(--masters)]' : 'text-[var(--ink-tertiary)]'
                    )}
                >
                    Match {matchNumber}
                </span>
                {status === 'inProgress' && <span className="type-overline text-[var(--masters)]">Live</span>}
                {status === 'completed' && <span className="type-overline text-[var(--ink-tertiary)]">Final</span>}
            </div>

            {/* Players + Score row */}
            <div className="flex items-center gap-4">
                {/* Players */}
                <div className="min-w-0 flex-1">
                    <div className="mb-[var(--space-2)] flex items-center gap-2">
                        <span className="team-dot team-dot-usa" />
                        <span
                            className={cn(
                                'truncate font-sans text-base text-[var(--ink)]',
                                currentScore > 0 ? 'font-bold' : 'font-medium'
                            )}
                        >
                            {formatPlayers(teamAPlayers)}
                        </span>
                        {currentScore > 0 && (
                            <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--team-usa)]">
                                UP
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="team-dot team-dot-europe" />
                        <span
                            className={cn(
                                'truncate font-sans text-base text-[var(--ink)]',
                                currentScore < 0 ? 'font-bold' : 'font-medium'
                            )}
                        >
                            {formatPlayers(teamBPlayers)}
                        </span>
                        {currentScore < 0 && (
                            <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--team-europe)]">
                                UP
                            </span>
                        )}
                    </div>
                </div>

                {/* Score — monumental for active matches, serif for all */}
                <div className="min-w-[70px] text-right">
                    <span
                        className={cn(
                            'block font-serif font-normal leading-none tracking-[-0.02em]',
                            isActive ? 'score-monumental' : 'text-2xl',
                            currentScore > 0
                                ? 'text-[var(--team-usa)]'
                                : currentScore < 0
                                  ? 'text-[var(--team-europe)]'
                                  : 'text-[var(--ink-tertiary)]'
                        )}
                    >
                        {displayScore}
                    </span>
                    {holesPlayed > 0 && status !== 'completed' && (
                        <p className="mt-1 text-sm font-medium text-[var(--ink-tertiary)]">thru {holesPlayed}</p>
                    )}
                    {status === 'scheduled' && holesPlayed === 0 && (
                        <p className="text-sm text-[var(--ink-tertiary)]">Not started</p>
                    )}
                </div>

                <ChevronRight size={18} strokeWidth={1.5} className="shrink-0 text-[var(--ink-tertiary)]" />
            </div>
        </button>
    );
}
