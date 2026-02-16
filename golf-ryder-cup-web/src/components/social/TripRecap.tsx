/**
 * Trip Recap Component
 *
 * Generates a beautiful summary of the entire trip with:
 * - Final standings
 * - MVP calculation
 * - Best matches
 * - Photo highlights
 * - Key moments
 */

'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { cn, formatPlayerName } from '@/lib/utils';
import { format } from 'date-fns';
import {
    Trophy,
    Medal,
    Star,
    Camera,
    Share2,
    Award,
    Flame,
    Target,
} from 'lucide-react';
import type { Player, Match, RyderCupSession } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';

interface TripRecapProps {
    tripName: string;
    startDate: string;
    endDate: string;
    teamAScore: number;
    teamBScore: number;
    sessions: RyderCupSession[];
    matches: Match[];
    matchStates: Map<string, MatchState>;
    players: Map<string, Player>;
    teamMembers: Map<string, { teamId: string; playerId: string }>;
    teams: { usa: string; europe: string };
    photos?: Array<{ id: string; url: string; caption?: string }>;
    className?: string;
}

interface PlayerRecord {
    player: Player;
    team: 'usa' | 'europe';
    wins: number;
    losses: number;
    halves: number;
    points: number;
}

export function TripRecap({
    tripName,
    startDate,
    endDate,
    teamAScore,
    teamBScore,
    sessions,
    matches,
    matchStates,
    players,
    teamMembers,
    teams,
    photos = [],
    className,
}: TripRecapProps) {
    const [activeSection, setActiveSection] = useState<'summary' | 'players' | 'matches' | 'photos'>('summary');

    // Calculate player records
    const playerRecords = useMemo(() => {
        const records = new Map<string, PlayerRecord>();

        // Initialize records
        players.forEach((player, playerId) => {
            const member = Array.from(teamMembers.values()).find(tm => tm.playerId === playerId);
            const team = member?.teamId === teams.usa ? 'usa' : 'europe';

            records.set(playerId, {
                player,
                team,
                wins: 0,
                losses: 0,
                halves: 0,
                points: 0,
            });
        });

        // Calculate from matches
        matches.forEach((match) => {
            const state = matchStates.get(match.id);
            if (!state || state.status !== 'completed') return;

            const teamAWon = state.currentScore > 0;
            const teamBWon = state.currentScore < 0;
            const _halved = state.currentScore === 0;

            // Team A players
            match.teamAPlayerIds.forEach((playerId) => {
                const record = records.get(playerId);
                if (record) {
                    if (teamAWon) {
                        record.wins++;
                        record.points += 1;
                    } else if (teamBWon) {
                        record.losses++;
                    } else {
                        record.halves++;
                        record.points += 0.5;
                    }
                }
            });

            // Team B players
            match.teamBPlayerIds.forEach((playerId) => {
                const record = records.get(playerId);
                if (record) {
                    if (teamBWon) {
                        record.wins++;
                        record.points += 1;
                    } else if (teamAWon) {
                        record.losses++;
                    } else {
                        record.halves++;
                        record.points += 0.5;
                    }
                }
            });
        });

        return Array.from(records.values())
            .filter(r => r.wins + r.losses + r.halves > 0)
            .sort((a, b) => b.points - a.points || b.wins - a.wins);
    }, [matches, matchStates, players, teamMembers, teams]);

    // Find MVP (most points)
    const mvp = playerRecords[0];

    // Find best single match (largest margin)
    const bestMatch: { match: Match; state: MatchState; margin: number } | null = useMemo(() => {
        let best: { match: Match; state: MatchState; margin: number } | null = null;

        matches.forEach((match: Match) => {
            const state = matchStates.get(match.id);
            if (!state || state.status !== 'completed') return;

            const margin = Math.abs(state.currentScore);
            if (!best || margin > best.margin) {
                best = { match, state, margin };
            }
        });

        return best;
    }, [matches, matchStates]);

    // Determine winner
    const winner = teamAScore > teamBScore ? 'usa' : teamBScore > teamAScore ? 'europe' : 'tied';

    return (
        <div className={cn('space-y-6', className)}>
            {/* Hero Banner */}
            <div
                className={cn(
                    'relative p-8 rounded-2xl overflow-hidden',
                    'bg-linear-to-br',
                    winner === 'usa'
                        ? 'from-[#1E3A5F] to-[#0D1F35]'
                        : winner === 'europe'
                            ? 'from-[#722F37] to-[#3D181C]'
                            : 'from-[#006747] to-[#004D35]'
                )}
            >
                {/* Trophy icon */}
                <div className="absolute top-4 right-4 opacity-10">
                    <Trophy className="w-32 h-32 text-[var(--canvas)]" />
                </div>

                <div className="relative z-10">
                    <div className="text-[color:var(--canvas)]/60 text-sm">
                        {format(new Date(startDate), 'MMM d')} - {format(new Date(endDate), 'MMM d, yyyy')}
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--canvas)] mt-1">{tripName}</h1>

                    {/* Final Score */}
                    <div className="flex items-center gap-8 mt-8">
                        <div className={cn(
                            'text-center',
                            winner === 'usa' && 'scale-110'
                        )}>
                            <div className="text-4xl mb-2">🇺🇸</div>
                            <div className="text-[var(--canvas)] text-5xl font-bold">{teamAScore}</div>
                            <div className="text-[color:var(--canvas)]/60">USA</div>
                        </div>

                        <div className="text-[color:var(--canvas)]/40 text-2xl">-</div>

                        <div className={cn(
                            'text-center',
                            winner === 'europe' && 'scale-110'
                        )}>
                            <div className="text-4xl mb-2">🇪🇺</div>
                            <div className="text-[var(--canvas)] text-5xl font-bold">{teamBScore}</div>
                            <div className="text-[color:var(--canvas)]/60">EUR</div>
                        </div>
                    </div>

                    {/* Winner announcement */}
                    <div className="mt-8 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[color:var(--canvas)]/10 text-[var(--canvas)]">
                            <Trophy className="w-5 h-5 text-secondary-gold" />
                            <span className="font-bold">
                                {winner === 'tied'
                                    ? 'Tournament Tied!'
                                    : `Team ${winner.toUpperCase()} Wins!`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {(['summary', 'players', 'matches', 'photos'] as const).map((section) => (
                    <button
                        key={section}
                        onClick={() => setActiveSection(section)}
                        className={cn(
                            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                            activeSection === section
                                ? 'bg-masters-primary text-[var(--canvas)]'
                                : 'bg-[var(--surface-secondary)] text-[var(--ink-tertiary)] hover:bg-[var(--surface)]'
                        )}
                    >
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                    </button>
                ))}
            </div>

            {/* Summary Section */}
            {activeSection === 'summary' && (
                <div className="space-y-4">
                    {/* MVP Card */}
                    {mvp && (
                        <div className="p-4 rounded-xl bg-secondary-gold/10 border border-secondary-gold/30">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-full bg-secondary-gold/20">
                                    <Award className="w-6 h-6 text-secondary-gold" />
                                </div>
                                <div>
                                    <div className="text-sm text-secondary-gold font-medium">Tournament MVP</div>
                                    <div className="text-lg font-bold">
                                        {formatPlayerName(mvp.player.firstName, mvp.player.lastName, 'full')}
                                    </div>
                                    <div className="text-sm text-[var(--ink-tertiary)]">
                                        {mvp.wins}W - {mvp.losses}L - {mvp.halves}H ({mvp.points} pts)
                                    </div>
                                </div>
                                <div className="ml-auto text-3xl">
                                    {mvp.team === 'usa' ? '🇺🇸' : '🇪🇺'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="card p-4">
                            <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-2">
                                <Target className="w-4 h-4" />
                                <span className="text-sm">Matches Played</span>
                            </div>
                            <div className="text-2xl font-bold">
                                {matches.filter(m => matchStates.get(m.id)?.status === 'completed').length}
                            </div>
                        </div>

                        <div className="card p-4">
                            <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-2">
                                <Flame className="w-4 h-4" />
                                <span className="text-sm">Sessions</span>
                            </div>
                            <div className="text-2xl font-bold">{sessions.length}</div>
                        </div>
                    </div>

                    {/* Best Match */}
                    {bestMatch !== null && (
                        <div className="card p-4">
                            <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-3">
                                <Star className="w-4 h-4" />
                                <span className="text-sm">Most Dominant Victory</span>
                            </div>
                            <div className="text-lg font-bold">
                                {(bestMatch as { match: Match; state: MatchState; margin: number }).state.displayScore}
                            </div>
                            <div className="text-sm text-[var(--ink-tertiary)] mt-1">
                                {(bestMatch as { match: Match; state: MatchState; margin: number }).match.teamAPlayerIds.map((id: string) => {
                                    const p = players.get(id);
                                    return p ? formatPlayerName(p.firstName, p.lastName, 'short') : '';
                                }).join(' & ')}
                                {' vs '}
                                {(bestMatch as { match: Match; state: MatchState; margin: number }).match.teamBPlayerIds.map((id: string) => {
                                    const p = players.get(id);
                                    return p ? formatPlayerName(p.firstName, p.lastName, 'short') : '';
                                }).join(' & ')}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Players Section */}
            {activeSection === 'players' && (
                <div className="space-y-3">
                    {playerRecords.map((record, index) => (
                        <div
                            key={record.player.id}
                            className={cn(
                                'flex items-center gap-4 p-4 rounded-xl',
                                'card'
                            )}
                        >
                            <div className="text-xl font-bold text-[var(--ink-tertiary)]/70 w-8">
                                #{index + 1}
                            </div>

                            <div className="flex-1">
                                <div className="font-medium">
                                    {formatPlayerName(record.player.firstName, record.player.lastName, 'full')}
                                </div>
                                <div className="text-sm text-[var(--ink-tertiary)]">
                                    {record.wins}W - {record.losses}L - {record.halves}H
                                </div>
                            </div>

                            <div className="text-xl">
                                {record.team === 'usa' ? '🇺🇸' : '🇪🇺'}
                            </div>

                            <div className="text-right">
                                <div className="text-xl font-bold">{record.points}</div>
                                <div className="text-xs text-[var(--ink-tertiary)]">points</div>
                            </div>

                            {index === 0 && (
                                <Medal className="w-6 h-6 text-secondary-gold" />
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Matches Section */}
            {activeSection === 'matches' && (
                <div className="space-y-4">
                    {sessions.map((session) => (
                        <div key={session.id}>
                            <h3 className="text-sm font-medium text-[var(--ink-tertiary)] mb-2">
                                {session.name}
                            </h3>
                            <div className="space-y-2">
                                {matches
                                    .filter((m) => m.sessionId === session.id)
                                    .flatMap((match) => {
                                        const state = matchStates.get(match.id);
                                        if (!state) return [];
                                        return [{ match, state }];
                                    })
                                    .map(({ match, state }) => (
                                        <div
                                            key={match.id}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--rule)]"
                                        >
                                            <div className="flex-1 text-sm">
                                                {match.teamAPlayerIds
                                                    .map((id) => players.get(id))
                                                    .filter((p): p is Player => Boolean(p))
                                                    .map((p) => formatPlayerName(p.firstName, p.lastName, 'short'))
                                                    .join(' & ')}
                                            </div>
                                            <div
                                                className={cn(
                                                    'font-bold',
                                                    state.currentScore > 0
                                                        ? 'text-team-usa'
                                                        : state.currentScore < 0
                                                          ? 'text-team-europe'
                                                          : 'text-[var(--ink-tertiary)]'
                                                )}
                                            >
                                                {state.displayScore}
                                            </div>
                                            <div className="flex-1 text-sm text-right">
                                                {match.teamBPlayerIds
                                                    .map((id) => players.get(id))
                                                    .filter((p): p is Player => Boolean(p))
                                                    .map((p) => formatPlayerName(p.firstName, p.lastName, 'short'))
                                                    .join(' & ')}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Photos Section */}
            {activeSection === 'photos' && (
                <div>
                    {photos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {photos.map((photo) => (
                                <div
                                    key={photo.id}
                                    className="aspect-square rounded-lg overflow-hidden bg-[var(--surface-secondary)] relative"
                                >
                                    <Image
                                        src={photo.url}
                                        alt={photo.caption || ''}
                                        fill
                                        className="object-cover"
                                        sizes="33vw"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-[var(--surface-secondary)] rounded-xl border border-[var(--rule)]">
                            <Camera className="w-12 h-12 mx-auto mb-3 text-[var(--ink-tertiary)]/60" />
                            <p className="text-[var(--ink-tertiary)]">No photos from this trip</p>
                        </div>
                    )}
                </div>
            )}

            {/* Share Button */}
            <button
                className={cn(
                    'w-full flex items-center justify-center gap-2 py-4 rounded-xl',
                    'bg-masters-primary text-[var(--canvas)]',
                    'hover:bg-masters-primary-dark transition-colors'
                )}
            >
                <Share2 className="w-5 h-5" />
                <span className="font-medium">Share Trip Recap</span>
            </button>
        </div>
    );
}

export default TripRecap;
