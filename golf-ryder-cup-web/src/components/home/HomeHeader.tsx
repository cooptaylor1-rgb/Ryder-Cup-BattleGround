/**
 * Home Page Header — Fried Egg Editorial
 *
 * Minimal, warm, confident. Just the brand name
 * and captain toggle. Nothing more.
 */
'use client';

import { CaptainToggle } from '@/components/ui';

interface HomeHeaderProps {
    hasTrips: boolean;
    onShowWhatsNew: () => void;
}

export function HomeHeader({ hasTrips }: HomeHeaderProps) {
    return (
        <header className="header-premium">
            <div className="container-editorial" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="type-overline" style={{ letterSpacing: '0.15em', color: 'var(--ink)' }}>
                    Ryder Cup Tracker
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {hasTrips && <CaptainToggle />}
                </div>
            </div>
        </header>
    );
}
