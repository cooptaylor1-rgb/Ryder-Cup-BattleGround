/**
 * Active Tournament Hero Component
 *
 * Displays the main live tournament score with team standings.
 */
'use client';

import { ChevronRight, MapPin, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { TeamStandings } from '@/lib/types/computed';
import type { Trip } from '@/lib/types/models';

interface ActiveTournamentHeroProps {
    trip: Trip;
    standings: TeamStandings;
    onSelect: (tripId: string) => void;
}

export function ActiveTournamentHero({ trip, standings, onSelect }: ActiveTournamentHeroProps) {
    return (
        <section className="section">
            <button
                onClick={() => onSelect(trip.id)}
                className="w-full text-left press-scale card-interactive"
                style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-4)',
                    margin: 'calc(-1 * var(--space-4))'
                }}
            >
                {/* Live Badge */}
                <div className="live-indicator" style={{ marginBottom: 'var(--space-4)' }}>
                    Live
                </div>

                {/* Tournament Name */}
                <h1 className="type-display" style={{ marginBottom: 'var(--space-8)' }}>
                    {trip.name}
                </h1>

                {/* Score Hero — Team Identity Blocks */}
                <div className="score-vs">
                    {/* Team USA Block */}
                    <TeamScoreBlock
                        teamName="USA"
                        points={standings.teamAPoints}
                        isLeading={standings.teamAPoints >= standings.teamBPoints}
                        color="var(--team-usa)"
                        showPulse={standings.leader !== null}
                    />

                    {/* Separator */}
                    <div className="score-vs-divider">–</div>

                    {/* Team Europe Block */}
                    <TeamScoreBlock
                        teamName="EUR"
                        points={standings.teamBPoints}
                        isLeading={standings.teamBPoints > standings.teamAPoints}
                        color="var(--team-europe)"
                        showPulse={standings.leader !== null}
                    />
                </div>

                {/* Context — Location & Date */}
                <div
                    className="flex items-center justify-center gap-6 type-caption"
                    style={{ marginTop: 'var(--space-6)' }}
                >
                    {trip.location && (
                        <span className="flex items-center gap-2">
                            <MapPin size={14} strokeWidth={1.5} />
                            {trip.location}
                        </span>
                    )}
                    <span className="flex items-center gap-2">
                        <Calendar size={14} strokeWidth={1.5} />
                        {formatDate(trip.startDate, 'short')}
                    </span>
                </div>

                {/* Call to Action */}
                <div
                    className="flex items-center justify-center gap-2"
                    style={{
                        marginTop: 'var(--space-10)',
                        color: 'var(--masters)',
                        fontWeight: 500
                    }}
                >
                    <span>View standings</span>
                    <ChevronRight size={18} strokeWidth={2} />
                </div>
            </button>
        </section>
    );
}

interface TeamScoreBlockProps {
    teamName: string;
    points: number;
    isLeading: boolean;
    color: string;
    showPulse: boolean;
}

function TeamScoreBlock({ teamName, points, isLeading, color, showPulse }: TeamScoreBlockProps) {
    const teamClass = teamName === 'USA' ? 'usa' : 'europe';

    return (
        <div className={`score-vs-team score-vs-${teamClass} ${isLeading ? 'leading' : ''}`}>
            <span
                className={`team-dot team-dot-lg team-dot-${teamClass} ${showPulse ? 'team-dot-pulse' : ''}`}
                style={{ display: 'inline-block', marginBottom: 'var(--space-3)' }}
            />
            <p
                className="score-monumental"
                style={{ color: isLeading ? color : 'var(--ink-tertiary)' }}
            >
                {points}
            </p>
            <p
                className="type-overline"
                style={{ marginTop: 'var(--space-3)', color }}
            >
                {teamName}
            </p>
        </div>
    );
}
