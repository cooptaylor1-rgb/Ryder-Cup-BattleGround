/**
 * Momentum Section Component
 *
 * Displays team momentum and win streaks.
 */
'use client';

import { Flame } from 'lucide-react';

interface MomentumSectionProps {
    teamAStreak?: number;
    teamBStreak?: number;
    teamATrend?: 'up' | 'down' | 'neutral';
    teamBTrend?: 'up' | 'down' | 'neutral';
}

export function MomentumSection({
    teamAStreak = 0,
    teamBStreak = 0,
    teamATrend = 'neutral',
    teamBTrend = 'neutral'
}: MomentumSectionProps) {
    return (
        <section className="section-sm">
            <h2 className="type-overline mb-[var(--space-4)]">Momentum</h2>
            <div className="grid grid-cols-2 gap-[var(--space-3)]">
                <MomentumCard team="USA" streak={teamAStreak} trend={teamATrend} />
                <MomentumCard team="EUR" streak={teamBStreak} trend={teamBTrend} />
            </div>
        </section>
    );
}

interface MomentumCardProps {
    team: 'USA' | 'EUR';
    streak: number;
    trend: 'up' | 'down' | 'neutral';
}

function MomentumCard({ team, streak, trend }: MomentumCardProps) {
    const teamColorClass =
        team === 'USA' ? 'text-[var(--team-usa)]' : 'text-[var(--team-europe)]';

    return (
        <div className="card p-[var(--space-4)]">
            <div className="flex items-center justify-between mb-[var(--space-2)]">
                <span className={`type-overline ${teamColorClass}`}>{team}</span>
                {trend === 'up' && <Flame size={16} className="text-[var(--error)]" />}
            </div>
            <div className="flex items-baseline gap-[var(--space-2)]">
                <span className={`score-large ${teamColorClass}`}>{streak}</span>
                <span className="type-caption">
                    {streak === 1 ? 'win streak' : streak > 1 ? 'win streak' : 'no streak'}
                </span>
            </div>
        </div>
    );
}
