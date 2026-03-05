/**
 * Home Loading Skeleton Component
 *
 * Loading state for the home page.
 */
'use client';

import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HomeLoadingSkeleton() {
    return (
        <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
            <header className="header-premium">
                <div className="container-editorial flex items-center justify-between">
                    <div className="flex items-center gap-[var(--space-3)]">
                        <div
                            className={cn(
                                'w-8 h-8 rounded-[var(--radius-md)]',
                                'flex items-center justify-center',
                                'bg-gradient-to-br from-[var(--masters)] to-[var(--masters-deep)]',
                                'shadow-[var(--shadow-glow-green)]'
                            )}
                        >
                            <Trophy size={16} className="text-[var(--color-accent)]" />
                        </div>
                        <span className="type-overline tracking-[0.15em] text-[var(--ink)]">Ryder Cup Tracker</span>
                    </div>
                </div>
            </header>
            <main className="container-editorial pt-[var(--space-6)]">
                <div className="space-y-4 animate-pulse">
                    <div className="h-32 rounded-2xl bg-[color:var(--ink-tertiary)]/10" />
                    <div className="h-48 rounded-2xl bg-[color:var(--ink-tertiary)]/10" />
                    <div className="h-20 rounded-xl bg-[color:var(--ink-tertiary)]/10" />
                </div>
            </main>
        </div>
    );
}
