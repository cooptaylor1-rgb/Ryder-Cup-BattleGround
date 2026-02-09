/**
 * Home Loading Skeleton Component
 *
 * Loading state for the home page.
 */
'use client';

import { Trophy } from 'lucide-react';
import { BottomNav, type NavBadges } from '@/components/layout';

interface HomeLoadingSkeletonProps {
    navBadges?: NavBadges;
}

export function HomeLoadingSkeleton({ navBadges = {} }: HomeLoadingSkeletonProps) {
    return (
        <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
            <header className="header-premium">
                <div className="container-editorial" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                                boxShadow: 'var(--shadow-glow-green)'
                            }}
                        >
                            <Trophy size={16} style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <span className="type-overline" style={{ letterSpacing: '0.15em', color: 'var(--ink)' }}>Ryder Cup Tracker</span>
                    </div>
                </div>
            </header>
            <main className="container-editorial" style={{ paddingTop: 'var(--space-6)' }}>
                <div className="space-y-4 animate-pulse">
                    <div className="h-32 rounded-2xl bg-muted/50" />
                    <div className="h-48 rounded-2xl bg-muted/50" />
                    <div className="h-20 rounded-xl bg-muted/50" />
                </div>
            </main>
            <BottomNav badges={navBadges} />
        </div>
    );
}
