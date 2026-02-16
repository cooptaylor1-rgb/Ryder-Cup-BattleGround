/**
 * Captain Tools Section Component
 *
 * Quick access to captain-only tools.
 */
'use client';

import Link from 'next/link';
import { Shield, ChevronRight, Users, ClipboardCheck } from 'lucide-react';

export function CaptainToolsSection() {
    return (
        <section className="section-sm">
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="flex items-center gap-2">
                    <Shield size={14} style={{ color: 'var(--masters)' }} />
                    <h2 className="type-overline" style={{ color: 'var(--masters)' }}>Captain Tools</h2>
                </div>
                <Link
                    href="/captain"
                    className="type-caption"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--masters)' }}
                >
                    All Tools <ChevronRight size={14} />
                </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                <CaptainToolCard
                    href="/lineup/new"
                    icon={<Users size={20} style={{ color: 'var(--masters)' }} />}
                    label="Create Lineup"
                />
                <CaptainToolCard
                    href="/captain/checklist"
                    icon={<ClipboardCheck size={20} style={{ color: 'var(--info)' }} />}
                    label="Pre-Flight"
                />
                <CaptainToolCard
                    href="/players"
                    icon={<Users size={20} style={{ color: 'var(--color-accent)' }} />}
                    label="Players"
                />
            </div>
        </section>
    );
}

interface CaptainToolCardProps {
    href: string;
    icon: React.ReactNode;
    label: string;
}

function CaptainToolCard({ href, icon, label }: CaptainToolCardProps) {
    return (
        <Link
            href={href}
            className="card press-scale"
            style={{ padding: 'var(--space-3)', textAlign: 'center' }}
        >
            <div style={{ marginBottom: 'var(--space-2)' }}>{icon}</div>
            <p className="type-micro">{label}</p>
        </Link>
    );
}
