/**
 * Your Match Card Component (P0-1)
 *
 * Hero card showing the current user's match on the Home page.
 * Provides one-tap access to scoring - eliminates 3+ navigation steps.
 *
 * Features:
 * - Shows match details (opponent, tee time, format)
 * - Countdown to tee time if scheduled
 * - Live score if in progress
 * - Prominent CTA to enter scoring
 */

'use client';

import { useMemo } from 'react';
import { Target, Clock, ChevronRight, Zap } from 'lucide-react';
import type { Match, Player, RyderCupSession } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';
import { formatPlayerName } from '@/lib/utils';

interface YourMatchCardProps {
    match: Match;
    matchState?: MatchState;
    session: RyderCupSession;
    currentUserPlayer: Player;
    allPlayers: Player[];
    teamAName?: string;
    teamBName?: string;
    onEnterScore: () => void;
}

export function YourMatchCard({
    match,
    matchState,
    session,
    currentUserPlayer,
    allPlayers,
    teamAName = 'USA',
    teamBName = 'Europe',
    onEnterScore,
}: YourMatchCardProps) {
    // Determine which team the user is on
    const userTeam = useMemo(() => {
        if (match.teamAPlayerIds.includes(currentUserPlayer.id)) return 'A';
        if (match.teamBPlayerIds.includes(currentUserPlayer.id)) return 'B';
        return null;
    }, [match, currentUserPlayer]);

    // Get partner and opponents
    const { partner, opponents } = useMemo(() => {
        const getPlayer = (id: string) => allPlayers.find(p => p.id === id);

        if (userTeam === 'A') {
            const partnerIds = match.teamAPlayerIds.filter(id => id !== currentUserPlayer.id);
            const partner = partnerIds.length > 0 ? getPlayer(partnerIds[0]) : null;
            const opponents = match.teamBPlayerIds.map(getPlayer).filter(Boolean) as Player[];
            return { partner, opponents };
        } else if (userTeam === 'B') {
            const partnerIds = match.teamBPlayerIds.filter(id => id !== currentUserPlayer.id);
            const partner = partnerIds.length > 0 ? getPlayer(partnerIds[0]) : null;
            const opponents = match.teamAPlayerIds.map(getPlayer).filter(Boolean) as Player[];
            return { partner, opponents };
        }

        return { partner: null, opponents: [] };
    }, [match, currentUserPlayer, allPlayers, userTeam]);

    // Calculate time until tee time
    const teeTimeInfo = useMemo(() => {
        if (!session.scheduledDate) return null;

        const sessionDate = new Date(session.scheduledDate);
        const now = new Date();

        // Estimate tee time based on session time slot and match order
        const baseHour = session.timeSlot === 'AM' ? 8 : 13;
        const intervalMinutes = session.sessionType === 'singles' ? 8 : 10;
        sessionDate.setHours(baseHour, (match.matchOrder - 1) * intervalMinutes, 0, 0);

        const diffMs = sessionDate.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 0) {
            return { text: 'Started', isPast: true };
        } else if (diffMins < 60) {
            return { text: `in ${diffMins} min`, isPast: false };
        } else if (diffMins < 1440) {
            const hours = Math.floor(diffMins / 60);
            return { text: `in ${hours}h ${diffMins % 60}m`, isPast: false };
        } else {
            return {
                text: sessionDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                isPast: false
            };
        }
    }, [session, match.matchOrder]);

    const isLive = match.status === 'inProgress';
    const formatLabel = session.sessionType.charAt(0).toUpperCase() + session.sessionType.slice(1);

    return (
        <button
            onClick={onEnterScore}
            className="w-full text-left card-premium active:scale-[0.98]"
            style={{
                padding: 'var(--space-5)',
                border: isLive ? '2px solid var(--masters)' : '1px solid var(--rule)',
                background: isLive
                    ? 'linear-gradient(135deg, rgba(var(--masters-rgb), 0.1) 0%, var(--canvas-raised) 100%)'
                    : 'var(--canvas-raised)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-xl)',
                transition: 'all 0.15s ease',
                boxShadow: isLive ? '0 4px 20px rgba(0, 103, 71, 0.15)' : undefined,
            }}
        >
            {/* Header: Badge + Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-2) var(--space-3)',
                            background: isLive ? 'var(--masters)' : 'var(--canvas-sunken)',
                            borderRadius: 'var(--radius-full)',
                            color: isLive ? 'white' : 'var(--ink-secondary)',
                            fontSize: '12px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        <Target size={14} />
                        Your Match
                    </div>
                    {isLive && (
                        <span className="live-indicator" style={{ fontSize: '10px', padding: '2px 8px' }}>
                            Live
                        </span>
                    )}
                </div>

                {/* Time/Status */}
                {!isLive && teeTimeInfo && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-1)',
                            color: teeTimeInfo.isPast ? 'var(--warning)' : 'var(--ink-secondary)',
                            fontSize: 'var(--text-sm)',
                        }}
                    >
                        <Clock size={14} />
                        <span>{teeTimeInfo.text}</span>
                    </div>
                )}
            </div>

            {/* Match Info */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <span
                        className="type-micro"
                        style={{
                            color: 'var(--ink-tertiary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                        }}
                    >
                        Match {match.matchOrder} • {formatLabel}
                    </span>
                </div>

                {/* Players Display */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    {/* You (and partner) */}
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: '4px', fontSize: '16px' }}>
                            You{partner && ` & ${formatPlayerName(partner.firstName, partner.lastName, 'short')}`}
                        </p>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: userTeam === 'A' ? 'var(--team-usa)' : 'var(--team-europe)' }}>
                            {userTeam === 'A' ? teamAName : teamBName}
                        </p>
                    </div>

                    {/* VS */}
                    <div style={{
                        padding: 'var(--space-2) var(--space-4)',
                        background: 'var(--canvas-sunken)',
                        borderRadius: 'var(--radius-lg)',
                        color: 'var(--ink-secondary)',
                        fontWeight: 700,
                        fontSize: '13px',
                    }}>
                        VS
                    </div>

                    {/* Opponents */}
                    <div style={{ flex: 1, textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: '4px', fontSize: '16px' }}>
                            {opponents.map(o => formatPlayerName(o.firstName, o.lastName, 'short')).join(' & ')}
                        </p>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: userTeam === 'A' ? 'var(--team-europe)' : 'var(--team-usa)' }}>
                            {userTeam === 'A' ? teamBName : teamAName}
                        </p>
                    </div>
                </div>
            </div>

            {/* Live Score (if in progress) */}
            {isLive && matchState && (
                <div
                    style={{
                        padding: 'var(--space-3)',
                        background: 'var(--canvas-sunken)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-4)',
                        textAlign: 'center',
                    }}
                >
                    <p
                        className="score-large"
                        style={{
                            color: matchState.currentScore > 0
                                ? (userTeam === 'A' ? 'var(--team-usa)' : 'var(--team-europe)')
                                : matchState.currentScore < 0
                                    ? (userTeam === 'A' ? 'var(--team-europe)' : 'var(--team-usa)')
                                    : 'var(--ink-secondary)',
                        }}
                    >
                        {matchState.displayScore}
                    </p>
                    <p className="type-micro" style={{ color: 'var(--ink-tertiary)' }}>
                        thru {matchState.holesPlayed}
                    </p>
                </div>
            )}

            {/* CTA */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-4)',
                    background: 'var(--masters)',
                    borderRadius: 'var(--radius-xl)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '16px',
                    minHeight: '52px',
                    boxShadow: '0 2px 8px rgba(0, 103, 71, 0.3)',
                }}
            >
                <Zap size={20} />
                <span>{isLive ? 'Continue Scoring' : 'Enter Score'}</span>
                <ChevronRight size={20} />
            </div>
        </button>
    );
}

export default YourMatchCard;
