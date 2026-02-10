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
                className="w-full text-left press-scale card-interactive bg-transparent border-0 rounded-[var(--radius-xl)] p-[var(--space-4)] m-[calc(-1*var(--space-4))]"
            >
                {/* Live Badge */}
                <div className="live-indicator mb-[var(--space-4)]">Live</div>

                {/* Tournament Name */}
                <h1 className="type-display mb-[var(--space-8)]">{trip.name}</h1>

                {/* Score Hero — Team Identity Blocks */}
                <div className="score-vs">
                    {/* Team USA Block */}
                    <TeamScoreBlock
                        teamName="USA"
                        points={standings.teamAPoints}
                        isLeading={standings.teamAPoints >= standings.teamBPoints}
                        showPulse={standings.leader !== null}
                    />

                    {/* Separator */}
                    <div className="score-vs-divider">–</div>

                    {/* Team Europe Block */}
                    <TeamScoreBlock
                        teamName="EUR"
                        points={standings.teamBPoints}
                        isLeading={standings.teamBPoints > standings.teamAPoints}
                        showPulse={standings.leader !== null}
                    />
                </div>

                {/* Context — Location & Date */}
                <div className="flex items-center justify-center gap-6 type-caption mt-[var(--space-6)]">
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
                <div className="flex items-center justify-center gap-2 mt-[var(--space-10)] text-[var(--masters)] font-medium">
                    <span>View standings</span>
                    <ChevronRight size={18} strokeWidth={2} />
                </div>
            </button>
        </section>
    );
}

interface TeamScoreBlockProps {
    teamName: 'USA' | 'EUR';
    points: number;
    isLeading: boolean;
    showPulse: boolean;
}

function TeamScoreBlock({ teamName, points, isLeading, showPulse }: TeamScoreBlockProps) {
    const teamClass = teamName === 'USA' ? 'usa' : 'europe';
    const teamColorClass =
        teamName === 'USA' ? 'text-[var(--team-usa)]' : 'text-[var(--team-europe)]';
    const scoreColorClass = isLeading ? teamColorClass : 'text-[var(--ink-tertiary)]';

    return (
        <div className={`score-vs-team score-vs-${teamClass} ${isLeading ? 'leading' : ''}`}>
            <span
                className={`team-dot team-dot-lg team-dot-${teamClass} ${showPulse ? 'team-dot-pulse' : ''} inline-block mb-[var(--space-3)]`}
            />
            <p className={`score-monumental ${scoreColorClass}`}>{points}</p>
            <p className={`type-overline mt-[var(--space-3)] ${teamColorClass}`}>{teamName}</p>
        </div>
    );
}
