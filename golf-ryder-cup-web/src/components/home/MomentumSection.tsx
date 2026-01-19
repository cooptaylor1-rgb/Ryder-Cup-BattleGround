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
            <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
                Momentum
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                <MomentumCard
                    team="USA"
                    streak={teamAStreak}
                    trend={teamATrend}
                    color="var(--team-usa)"
                />
                <MomentumCard
                    team="EUR"
                    streak={teamBStreak}
                    trend={teamBTrend}
                    color="var(--team-europe)"
                />
            </div>
        </section>
    );
}

interface MomentumCardProps {
    team: string;
    streak: number;
    trend: 'up' | 'down' | 'neutral';
    color: string;
}

function MomentumCard({ team, streak, trend, color }: MomentumCardProps) {
    return (
        <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span className="type-overline" style={{ color }}>{team}</span>
                {trend === 'up' && <Flame size={16} style={{ color: 'var(--error)' }} />}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                <span className="score-large" style={{ color }}>
                    {streak}
                </span>
                <span className="type-caption">
                    {streak === 1 ? 'win streak' : streak > 1 ? 'win streak' : 'no streak'}
                </span>
            </div>
        </div>
    );
}
