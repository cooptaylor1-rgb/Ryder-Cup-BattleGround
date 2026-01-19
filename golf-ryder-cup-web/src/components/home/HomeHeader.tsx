/**
 * Home Page Header Component
 *
 * Premium header with branding and captain toggle.
 */
'use client';

import { Trophy, Sparkles } from 'lucide-react';
import { CaptainToggle } from '@/components/ui';

interface HomeHeaderProps {
    hasTrips: boolean;
    onShowWhatsNew: () => void;
}

export function HomeHeader({ hasTrips, onShowWhatsNew }: HomeHeaderProps) {
    return (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                    {hasTrips && <CaptainToggle />}
                    {hasTrips && (
                        <button
                            onClick={onShowWhatsNew}
                            className="press-scale"
                            style={{
                                padding: 'var(--space-2)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--masters)',
                                background: 'rgba(var(--masters-rgb), 0.1)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            aria-label="What's new"
                        >
                            <Sparkles className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
