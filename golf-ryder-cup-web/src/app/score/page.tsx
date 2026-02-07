'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useScoringStore, useAuthStore } from '@/lib/stores';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { createLogger } from '@/lib/utils/logger';
import { formatPlayerName } from '@/lib/utils';
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
    const _hasNoMatches = !isLoading && matches.length === 0; // Used for future empty state UI

    if (!isAuthenticated) {
        return (
            <div
                className="min-h-screen pb-nav"
                style={{ background: 'var(--canvas)', fontFamily: 'var(--font-sans)' }}
            >
                <PageHeader
                    title="Score"
                    subtitle="Sign in required"
                    icon={<Target size={16} style={{ color: 'var(--masters)' }} />}
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
            <div
                className="min-h-screen pb-nav"
                style={{ background: 'var(--canvas)', fontFamily: 'var(--font-sans)' }}
            >
                <PageHeader
                    title="Score"
                    subtitle="No active trip"
                    icon={<Target size={16} style={{ color: 'var(--masters)' }} />}
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
        <div className="min-h-screen pb-nav" style={{ background: 'var(--canvas)', fontFamily: 'var(--font-sans)' }}>
            <PageHeader
                title="Score"
                subtitle={currentTrip.name}
                icon={<Target size={16} style={{ color: 'var(--masters)' }} />}
                onBack={() => router.back()}
            />

            <main className="container-editorial">
                {/* Session Header */}
                {activeSession && (
                    <section style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-6)' }}>
                        <p className="type-overline" style={{ color: 'var(--masters)', marginBottom: 'var(--space-3)' }}>
                            Session {activeSession.sessionNumber}
                        </p>
                        <h1 className="type-display capitalize">
                            {activeSession.sessionType}
                        </h1>
                        <p className="type-caption" style={{ marginTop: 'var(--space-2)', color: 'var(--ink-secondary)' }}>
                            {activeSession.status === 'inProgress' ? 'In Progress' :
                                activeSession.status === 'completed' ? 'Complete' : 'Scheduled'}
                        </p>
                    </section>
                )}

                <hr className="divider" />

                {/* Matches - BUG-011 FIX: Wrap with ErrorBoundary for graceful error handling */}
                <section style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-8)' }}>
                    <h2 className="type-overline" style={{ marginBottom: 'var(--space-6)', color: 'var(--ink-secondary)' }}>
                        Matches
                    </h2>

                    <ErrorBoundary variant="compact" showDetails={process.env.NODE_ENV === 'development'}>
                        {isLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-8) 0' }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="card-editorial" style={{ padding: 'var(--space-5)' }}>
                                        <div className="skeleton" style={{ width: '40%', height: '12px', marginBottom: '12px' }} />
                                        <div className="skeleton" style={{ width: '70%', height: '16px', marginBottom: '8px' }} />
                                        <div className="skeleton" style={{ width: '60%', height: '16px' }} />
                                    </div>
                                ))}
                            </div>
                        ) : matchStates.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
                        <section style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
                            <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)', color: 'var(--ink-secondary)' }}>
                                Sessions
                            </h2>
                            <div
                                className="flex gap-3 overflow-x-auto pb-2"
                                style={{ margin: '0 calc(-1 * var(--space-5))', padding: '0 var(--space-5)' }}
                            >
                                {sessions.map(session => (
                                    <button
                                        key={session.id}
                                        onClick={() => setSelectedSessionId(session.id)}
                                        className={session.id === activeSession?.id ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                                        style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}
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
            className="card-editorial card-interactive w-full text-left"
            style={{
                padding: isActive ? 'var(--space-6)' : 'var(--space-5)',
                position: 'relative',
                borderColor: isUserMatch ? 'var(--masters)' : undefined,
                borderWidth: isUserMatch ? '2px' : undefined,
                transition: 'box-shadow 0.15s ease',
            }}
        >
            {/* Your Match Badge (P0-3) */}
            {isUserMatch && (
                <div
                    style={{
                        position: 'absolute',
                        top: '-10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '3px 12px',
                        background: 'var(--masters)',
                        color: 'white',
                        fontSize: '10px',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        borderRadius: 'var(--radius-full)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Your Match
                </div>
            )}

            {/* Card header: match number + status */}
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                <span
                    className="type-overline"
                    style={{ color: isUserMatch ? 'var(--masters)' : 'var(--ink-tertiary)' }}
                >
                    Match {matchNumber}
                </span>
                {status === 'inProgress' && (
                    <span
                        className="type-overline"
                        style={{ color: 'var(--masters)' }}
                    >
                        Live
                    </span>
                )}
                {status === 'completed' && (
                    <span
                        className="type-overline"
                        style={{ color: 'var(--ink-tertiary)' }}
                    >
                        Final
                    </span>
                )}
            </div>

            {/* Players + Score row */}
            <div className="flex items-center gap-4">
                {/* Players */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-2)' }}>
                        <span className="team-dot team-dot-usa" />
                        <span
                            className="truncate"
                            style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: 'var(--text-base)',
                                fontWeight: currentScore > 0 ? 700 : 500,
                                color: 'var(--ink)',
                            }}
                        >
                            {formatPlayers(teamAPlayers)}
                        </span>
                        {currentScore > 0 && (
                            <span style={{
                                fontSize: '10px',
                                fontFamily: 'var(--font-sans)',
                                fontWeight: 700,
                                color: 'var(--team-usa)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                UP
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="team-dot team-dot-europe" />
                        <span
                            className="truncate"
                            style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: 'var(--text-base)',
                                fontWeight: currentScore < 0 ? 700 : 500,
                                color: 'var(--ink)',
                            }}
                        >
                            {formatPlayers(teamBPlayers)}
                        </span>
                        {currentScore < 0 && (
                            <span style={{
                                fontSize: '10px',
                                fontFamily: 'var(--font-sans)',
                                fontWeight: 700,
                                color: 'var(--team-europe)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                UP
                            </span>
                        )}
                    </div>
                </div>

                {/* Score — monumental for active matches, serif for all */}
                <div className="text-right" style={{ minWidth: '70px' }}>
                    <span
                        className={isActive ? 'score-monumental' : ''}
                        style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: isActive ? undefined : 'var(--text-2xl)',
                            fontWeight: 400,
                            lineHeight: 1,
                            letterSpacing: '-0.02em',
                            color: currentScore > 0 ? 'var(--team-usa)' :
                                currentScore < 0 ? 'var(--team-europe)' : 'var(--ink-tertiary)',
                            display: 'block',
                        }}
                    >
                        {displayScore}
                    </span>
                    {holesPlayed > 0 && status !== 'completed' && (
                        <p style={{
                            marginTop: '4px',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 500,
                            color: 'var(--ink-tertiary)',
                        }}>
                            thru {holesPlayed}
                        </p>
                    )}
                    {status === 'scheduled' && holesPlayed === 0 && (
                        <p style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--ink-tertiary)',
                        }}>
                            Not started
                        </p>
                    )}
                </div>

                <ChevronRight
                    size={18}
                    strokeWidth={1.5}
                    style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }}
                />
            </div>
        </button>
    );
}
