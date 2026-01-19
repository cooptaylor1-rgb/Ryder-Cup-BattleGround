/**
 * Side Bets Section Component
 *
 * Quick view of active side bets with progressive disclosure.
 */
'use client';

import Link from 'next/link';
import { ChevronRight, DollarSign, Trophy, Target, Ruler, CircleDot, Zap } from 'lucide-react';
import type { SideBet } from '@/lib/types/models';

interface SideBetsSectionProps {
    sideBets: SideBet[];
    isCaptainMode: boolean;
}

export function SideBetsSection({ sideBets, isCaptainMode }: SideBetsSectionProps) {
    const activeBets = sideBets.filter(b => b.status === 'active');
    const activeSideBetsCount = activeBets.length;

    // Only show if there are active bets or captain mode is on
    if (activeSideBetsCount === 0 && !isCaptainMode) {
        return null;
    }

    return (
        <section className="section-sm">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <h2 className="type-overline">Side Bets</h2>
                <Link
                    href="/bets"
                    className="type-caption"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--masters)' }}
                >
                    {activeSideBetsCount > 0 ? 'View All' : 'Create'} <ChevronRight size={14} />
                </Link>
            </div>
            {activeSideBetsCount > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {activeBets.slice(0, 3).map(bet => (
                        <SideBetRow
                            key={bet.id}
                            type={bet.type || 'Custom'}
                            status={bet.status === 'active' ? 'In Progress' : 'Complete'}
                            icon={getBetIcon(bet.type)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-6" style={{ color: 'var(--ink-tertiary)' }}>
                    <DollarSign size={24} style={{ margin: '0 auto var(--space-2)' }} />
                    <p className="type-caption">No active side bets</p>
                    <p className="type-caption" style={{ marginTop: 'var(--space-1)' }}>
                        Add skins, KP, or custom bets
                    </p>
                </div>
            )}
        </section>
    );
}

function getBetIcon(betType?: string) {
    switch (betType?.toLowerCase()) {
        case 'skins':
            return <DollarSign size={16} />;
        case 'nassau':
            return <Trophy size={16} />;
        case 'ctp':
        case 'closest':
        case 'closest to pin':
            return <Target size={16} />;
        case 'longdrive':
        case 'long_drive':
        case 'long drive':
            return <Ruler size={16} />;
        case 'kp':
            return <CircleDot size={16} />;
        default:
            return <Zap size={16} />;
    }
}

interface SideBetRowProps {
    type: string;
    status: string;
    icon: React.ReactNode;
}

function SideBetRow({ type, status, icon }: SideBetRowProps) {
    return (
        <Link
            href="/bets"
            className="card press-scale"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                cursor: 'pointer',
                textDecoration: 'none',
            }}
        >
            <div style={{ color: 'var(--masters)' }}>{icon}</div>
            <div style={{ flex: 1 }}>
                <p className="type-title-sm">{type}</p>
                <p className="type-caption">{status}</p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--ink-tertiary)' }} />
        </Link>
    );
}
