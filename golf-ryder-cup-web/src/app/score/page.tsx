'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useScoringStore } from '@/lib/stores';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { formatPlayerName } from '@/lib/utils';
import { ChevronRight, ChevronLeft, Home, Target, Users, Trophy, MoreHorizontal } from 'lucide-react';
import type { MatchState } from '@/lib/types/computed';
import type { Player } from '@/lib/types/models';

/**
 * SCORE PAGE — Match List
 *
 * Design Philosophy:
 * - Each match is a dignified row, not a cramped card
 * - Scores use the serif font for warmth
 * - Team colors identify sides at a glance
 * - Status is clear without visual clutter
 */

export default function ScorePage() {
    const router = useRouter();
    const { currentTrip, sessions, players } = useTripStore();
    const { selectMatch } = useScoringStore();

    useEffect(() => {
        if (!currentTrip) {
            router.push('/');
        }
    }, [currentTrip, router]);

    const activeSession = sessions.find(s => s.status === 'inProgress') ||
        sessions.find(s => s.status === 'scheduled');

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
        await selectMatch(matchId);
        router.push(`/score/${matchId}`);
    };

    const isLoading = matches === undefined || holeResults === undefined;

    if (!currentTrip) return null;

    return (
        <div className="min-h-screen pb-nav" style={{ background: 'var(--canvas)' }}>
            {/* Header */}
            <header className="header">
                <div className="container-editorial flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2"
                        style={{ color: 'var(--ink-secondary)' }}
                        aria-label="Back"
                    >
                        <ChevronLeft size={22} strokeWidth={1.75} />
                    </button>
                    <div>
                        <span className="type-overline">Score</span>
                        <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                            {currentTrip.name}
                        </p>
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
                        <div style={{ padding: 'var(--space-8) 0' }}>
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
                        <div>
                            {matchStates.map((matchState, index) => (
                                <MatchRow
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
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <Target size={28} strokeWidth={1.5} />
                            </div>
                            <p className="empty-state-title">No matches scheduled</p>
                            <p className="empty-state-text">Set up matchups to start scoring</p>
                            <Link href="/matchups" className="btn btn-primary">
                                Set Up Matches
                            </Link>
                        </div>
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
            <nav className="bottom-nav">
                <Link href="/" className="nav-item">
                    <Home size={22} strokeWidth={1.75} />
                    <span>Home</span>
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
}

function MatchRow({ matchState, matchNumber, teamAPlayers, teamBPlayers, onClick }: MatchRowProps) {
    const { currentScore, holesPlayed, status, displayScore } = matchState;

    const formatPlayers = (playerList: Player[]) => {
        if (playerList.length === 0) return '—';
        return playerList
            .map(p => formatPlayerName(p.firstName, p.lastName, 'short'))
            .join(' / ');
    };

    return (
        <button onClick={onClick} className="match-row w-full text-left">
            {/* Match number */}
            <span
                style={{
                    width: '28px',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--ink-tertiary)',
                    textAlign: 'center'
                }}
            >
                {matchNumber}
            </span>

            {/* Players */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="team-dot team-dot-usa" />
                    <span
                        className="truncate type-body-sm"
                        style={{ fontWeight: currentScore > 0 ? 600 : 400 }}
                    >
                        {formatPlayers(teamAPlayers)}
                    </span>
                </div>
                <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-2)' }}>
                    <span className="team-dot team-dot-europe" />
                    <span
                        className="truncate type-body-sm"
                        style={{ fontWeight: currentScore < 0 ? 600 : 400 }}
                    >
                        {formatPlayers(teamBPlayers)}
                    </span>
                </div>
            </div>

            {/* Score */}
            <div className="text-right" style={{ minWidth: '64px' }}>
                <span
                    className="score-medium"
                    style={{
                        color: currentScore > 0 ? 'var(--team-usa)' :
                            currentScore < 0 ? 'var(--team-europe)' : 'var(--ink-secondary)'
                    }}
                >
                    {displayScore}
                </span>
                {holesPlayed > 0 && (
                    <p className="type-micro" style={{ marginTop: '4px' }}>
                        {status === 'completed' ? 'Final' : `thru ${holesPlayed}`}
                    </p>
                )}
                {status === 'scheduled' && holesPlayed === 0 && (
                    <p className="type-micro">Not started</p>
                )}
            </div>

            <ChevronRight
                size={20}
                strokeWidth={1.5}
                style={{ color: 'var(--ink-tertiary)', marginLeft: 'var(--space-2)' }}
            />
        </button>
    );
}
