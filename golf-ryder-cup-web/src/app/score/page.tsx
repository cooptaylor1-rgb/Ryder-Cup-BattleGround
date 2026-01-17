'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useScoringStore, useAuthStore } from '@/lib/stores';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { createLogger } from '@/lib/utils/logger';
import { formatPlayerName } from '@/lib/utils';
import { ChevronRight, ChevronLeft, Home, Target, Users, Trophy, MoreHorizontal, CalendarDays } from 'lucide-react';
import type { MatchState } from '@/lib/types/computed';
import type { Player } from '@/lib/types/models';
import { NoScoresPremiumEmpty, PageSkeleton, MatchCardSkeleton } from '@/components/ui';

/**
 * SCORE PAGE — Match List
 *
 * Design Philosophy:
 * - Each match is a dignified row, not a cramped card
 * - Scores use the serif font for warmth
 * - Team colors identify sides at a glance
 * - Status is clear without visual clutter
 */

const logger = createLogger('score');

export default function ScorePage() {
    const router = useRouter();
    const { currentTrip, sessions, players } = useTripStore();
    const { selectMatch } = useScoringStore();
    const { currentUser, isAuthenticated } = useAuthStore();

    // Find the current user's player record (P0-3)
    const currentUserPlayer = useMemo(() => {
        if (!isAuthenticated || !currentUser) return null;
        return players.find(
            p =>
                (p.email && currentUser.email && p.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                (p.firstName.toLowerCase() === currentUser.firstName.toLowerCase() &&
                    p.lastName.toLowerCase() === currentUser.lastName.toLowerCase())
        );
    }, [currentUser, isAuthenticated, players]);

    // Track selected session - default to active or first available
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    useEffect(() => {
        if (!currentTrip) {
            router.push('/');
        }
    }, [currentTrip, router]);

    // Determine the default active session (in progress or scheduled)
    const defaultActiveSession = sessions.find(s => s.status === 'inProgress') ||
        sessions.find(s => s.status === 'scheduled');

    // Use selected session if set, otherwise use default
    const activeSession = selectedSessionId
        ? sessions.find(s => s.id === selectedSessionId) || defaultActiveSession
        : defaultActiveSession;

    // Set initial selected session when sessions load
    useEffect(() => {
        if (!selectedSessionId && defaultActiveSession) {
            setSelectedSessionId(defaultActiveSession.id);
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

    const matchStates: MatchState[] = matches.map(match => {
        const results = holeResults.filter(r => r.matchId === match.id);
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

    const isLoading = matches === undefined || holeResults === undefined;

    if (!currentTrip) {
        return (
            <PageSkeleton>
                <div className="space-y-4 mt-4">
                    <MatchCardSkeleton />
                    <MatchCardSkeleton />
                    <MatchCardSkeleton />
                </div>
            </PageSkeleton>
        );
    }

    return (
        <div className="min-h-screen pb-nav page-premium-enter texture-grain" style={{ background: 'var(--canvas)' }}>
            {/* Premium Header */}
            <header className="header-premium">
                <div className="container-editorial flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 press-scale"
                        style={{ color: 'var(--ink-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        aria-label="Back"
                    >
                        <ChevronLeft size={22} strokeWidth={1.75} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: 'var(--radius-md)',
                                background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'var(--shadow-glow-green)',
                            }}
                        >
                            <Target size={16} style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <div>
                            <span className="type-overline" style={{ letterSpacing: '0.1em' }}>Score</span>
                            <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                                {currentTrip.name}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container-editorial">
                {/* Session Header */}
                {activeSession && (
                    <section className="section">
                        <div className="live-indicator" style={{ marginBottom: 'var(--space-3)' }}>
                            Session {activeSession.sessionNumber}
                        </div>
                        <h1 className="type-display capitalize">
                            {activeSession.sessionType}
                        </h1>
                        <p className="type-caption" style={{ marginTop: 'var(--space-2)' }}>
                            {activeSession.status === 'inProgress' ? 'In Progress' :
                                activeSession.status === 'completed' ? 'Complete' : 'Scheduled'}
                        </p>
                    </section>
                )}

                <hr className="divider" />

                {/* Matches */}
                <section className="section-sm">
                    <h2 className="type-overline" style={{ marginBottom: 'var(--space-6)' }}>
                        Matches
                    </h2>

                    {isLoading ? (
                        <div className="skeleton-group" style={{ padding: 'var(--space-8) 0' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="player-row">
                                    <div className="skeleton" style={{ width: '24px', height: '16px' }} />
                                    <div className="flex-1">
                                        <div className="skeleton" style={{ width: '60%', height: '16px', marginBottom: '8px' }} />
                                        <div className="skeleton" style={{ width: '50%', height: '16px' }} />
                                    </div>
                                    <div className="skeleton" style={{ width: '40px', height: '24px' }} />
                                </div>
                            ))}
                        </div>
                    ) : matchStates.length > 0 ? (
                        <div className="stagger-fast">
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
                                        animationDelay={index * 50}
                                        isUserMatch={isUserMatch || false}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <NoScoresPremiumEmpty onStartScoring={() => router.push('/matchups')} />
                    )}
                </section>

                {/* Session Selector */}
                {sessions.length > 1 && (
                    <>
                        <hr className="divider" />
                        <section className="section-sm">
                            <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
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
                                        style={{ whiteSpace: 'nowrap' }}
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
            <nav className="nav-premium bottom-nav">
                <Link href="/" className="nav-item">
                    <Home size={22} strokeWidth={1.75} />
                    <span>Home</span>
                </Link>
                <Link href="/schedule" className="nav-item">
                    <CalendarDays size={22} strokeWidth={1.75} />
                    <span>Schedule</span>
                </Link>
                <Link href="/score" className="nav-item nav-item-active">
                    <Target size={22} strokeWidth={1.75} />
                    <span>Score</span>
                </Link>
                <Link href="/matchups" className="nav-item">
                    <Users size={22} strokeWidth={1.75} />
                    <span>Matches</span>
                </Link>
                <Link href="/standings" className="nav-item">
                    <Trophy size={22} strokeWidth={1.75} />
                    <span>Standings</span>
                </Link>
                <Link href="/more" className="nav-item">
                    <MoreHorizontal size={22} strokeWidth={1.75} />
                    <span>More</span>
                </Link>
            </nav>
        </div>
    );
}

/* ============================================
   Match Row — Dignified Match Display
   ============================================ */
interface MatchRowProps {
    matchState: MatchState;
    matchNumber: number;
    teamAPlayers: Player[];
    teamBPlayers: Player[];
    onClick: () => void;
    animationDelay?: number;
    isUserMatch?: boolean; // P0-3: Highlight user's match
}

function MatchRow({ matchState, matchNumber, teamAPlayers, teamBPlayers, onClick, animationDelay = 0, isUserMatch = false }: MatchRowProps) {
    const { currentScore, holesPlayed, status, displayScore } = matchState;

    const formatPlayers = (playerList: Player[]) => {
        if (playerList.length === 0) return '—';
        return playerList
            .map(p => formatPlayerName(p.firstName, p.lastName, 'short'))
            .join(' / ');
    };

    // Determine leading team for row styling
    const isUSALeading = currentScore > 0;
    const isEuropeLeading = currentScore < 0;
    const teamRowClass = isUSALeading
        ? 'team-row team-row-usa team-row-accent team-row-accent-usa'
        : isEuropeLeading
            ? 'team-row team-row-europe team-row-accent team-row-accent-europe'
            : '';

    return (
        <button
            onClick={onClick}
            className={`match-row row-interactive w-full text-left stagger-item ${teamRowClass} active:scale-[0.98]`}
            style={{
                paddingLeft: 'var(--space-4)',
                paddingRight: 'var(--space-4)',
                paddingTop: 'var(--space-4)',
                paddingBottom: 'var(--space-4)',
                marginLeft: 'calc(-1 * var(--space-4))',
                marginRight: 'calc(-1 * var(--space-4))',
                borderRadius: 'var(--radius-lg)',
                border: isUserMatch ? '2px solid var(--masters)' : undefined,
                background: isUserMatch ? 'rgba(var(--masters-rgb), 0.08)' : undefined,
                position: 'relative',
                animationDelay: `${animationDelay}ms`,
                minHeight: '72px',
                transition: 'transform 0.1s ease, background 0.15s ease',
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
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRadius: 'var(--radius-full)',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 4px rgba(0, 103, 71, 0.3)',
                    }}
                >
                    Your Match
                </div>
            )}

            {/* Match number */}
            <span
                style={{
                    width: '32px',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: isUserMatch ? 'var(--masters)' : 'var(--ink-secondary)',
                    textAlign: 'center'
                }}
            >
                {matchNumber}
            </span>

            {/* Players */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`team-dot team-dot-usa ${status === 'inProgress' && isUSALeading ? 'team-dot-pulse' : ''}`} />
                    <span
                        className="truncate text-base"
                        style={{ fontWeight: currentScore > 0 ? 700 : 500 }}
                    >
                        {formatPlayers(teamAPlayers)}
                    </span>
                    {currentScore > 0 && (
                        <span className="team-badge team-badge-solid-usa" style={{ fontSize: '10px', padding: '3px 8px', fontWeight: 700 }}>
                            UP
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-2)' }}>
                    <span className={`team-dot team-dot-europe ${status === 'inProgress' && isEuropeLeading ? 'team-dot-pulse' : ''}`} />
                    <span
                        className="truncate text-base"
                        style={{ fontWeight: currentScore < 0 ? 700 : 500 }}
                    >
                        {formatPlayers(teamBPlayers)}
                    </span>
                    {currentScore < 0 && (
                        <span className="team-badge team-badge-solid-europe" style={{ fontSize: '10px', padding: '3px 8px', fontWeight: 700 }}>
                            UP
                        </span>
                    )}
                </div>
            </div>

            {/* Score */}
            <div className="text-right" style={{ minWidth: '70px' }}>
                <span
                    className="text-2xl font-bold"
                    style={{
                        fontFamily: "'Instrument Serif', Georgia, serif",
                        color: currentScore > 0 ? 'var(--team-usa)' :
                            currentScore < 0 ? 'var(--team-europe)' : 'var(--ink-secondary)'
                    }}
                >
                    {displayScore}
                </span>
                {holesPlayed > 0 && (
                    <p className="text-sm font-medium" style={{ marginTop: '4px', color: 'var(--ink-secondary)' }}>
                        {status === 'completed' ? 'Final' : `thru ${holesPlayed}`}
                    </p>
                )}
                {status === 'scheduled' && holesPlayed === 0 && (
                    <p className="text-sm font-medium" style={{ color: 'var(--ink-tertiary)' }}>Not started</p>
                )}
            </div>

            <ChevronRight
                size={20}
                strokeWidth={1.5}
                className="row-chevron"
                style={{ color: 'var(--ink-tertiary)', marginLeft: 'var(--space-2)' }}
            />
        </button>
    );
}
