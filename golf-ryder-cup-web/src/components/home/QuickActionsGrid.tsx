/**
 * Quick Actions Grid Component
 *
 * Grid of quick action buttons for common tasks.
 */
'use client';

import Link from 'next/link';
import { Tv, MessageCircle, BarChart3, Award } from 'lucide-react';

interface QuickActionsGridProps {
    liveMatchesCount: number;
    unreadMessages: number;
}

export function QuickActionsGrid({ liveMatchesCount, unreadMessages }: QuickActionsGridProps) {
    return (
        <section className="section-sm">
            <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
                Quick Actions
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
                <QuickActionButton
                    icon={<Tv size={20} />}
                    label="Live"
                    href="/live"
                    badge={liveMatchesCount > 0 ? String(liveMatchesCount) : undefined}
                    color="var(--error)"
                />
                <QuickActionButton
                    icon={<MessageCircle size={20} />}
                    label="Chat"
                    href="/social"
                    badge={unreadMessages > 0 ? String(unreadMessages) : undefined}
                    color="var(--team-usa)"
                />
                <QuickActionButton
                    icon={<BarChart3 size={20} />}
                    label="Stats"
                    href="/trip-stats"
                    color="var(--masters)"
                />
                <QuickActionButton
                    icon={<Award size={20} />}
                    label="Awards"
                    href="/achievements"
                    color="var(--warning)"
                />
            </div>
        </section>
    );
}

interface QuickActionButtonProps {
    icon: React.ReactNode;
    label: string;
    href: string;
    badge?: string;
    color?: string;
}

function QuickActionButton({ icon, label, href, badge, color }: QuickActionButtonProps) {
    return (
        <Link
            href={href}
            className="press-scale quick-action-btn"
        >
            <div style={{ position: 'relative' }}>
                <div style={{ color: color || 'var(--ink-secondary)' }}>{icon}</div>
                {badge && (
                    <span
                        style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-8px',
                            padding: '2px 6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--error)',
                            color: 'var(--canvas)',
                            minWidth: '16px',
                            textAlign: 'center',
                        }}
                    >
                        {badge}
                    </span>
                )}
            </div>
            <span className="type-micro">{label}</span>
        </Link>
    );
}
