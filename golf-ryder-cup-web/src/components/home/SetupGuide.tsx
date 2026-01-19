/**
 * Setup Guide Component
 *
 * Step-by-step guide for captains to set up their trip.
 */
'use client';

import Link from 'next/link';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import type { Player, Team, RyderCupSession } from '@/lib/types/models';

interface SetupGuideProps {
    players: Player[];
    teams: Team[];
    sessions: RyderCupSession[];
}

export function SetupGuide({ players, teams, sessions }: SetupGuideProps) {
    return (
        <section className="section-sm">
            <div
                className="card"
                style={{
                    padding: 'var(--space-5)',
                    background: 'linear-gradient(135deg, rgba(0, 103, 71, 0.08) 0%, rgba(0, 103, 71, 0.03) 100%)',
                    border: '1px solid rgba(0, 103, 71, 0.2)',
                }}
            >
                <div className="flex items-start gap-3 mb-4">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--masters)' }}
                    >
                        <ClipboardCheck size={20} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <p className="type-title-sm">Get Your Trip Ready</p>
                        <p className="type-caption" style={{ marginTop: '2px' }}>
                            Complete these steps to start your golf competition
                        </p>
                    </div>
                </div>
                <div className="space-y-2">
                    <SetupStep
                        number={1}
                        label="Add Players"
                        done={players.length >= 4}
                        href="/players"
                        hint={`${players.length} added`}
                    />
                    <SetupStep
                        number={2}
                        label="Assign Teams"
                        done={teams.length >= 2 && players.some(() => teams.some(t => t.id))}
                        href="/captain/draft"
                        hint="Draft players to teams"
                    />
                    <SetupStep
                        number={3}
                        label="Create First Session"
                        done={sessions.length > 0}
                        href="/lineup/new"
                        hint="Set up matchups"
                    />
                </div>
            </div>
        </section>
    );
}

interface SetupStepProps {
    number: number;
    label: string;
    done: boolean;
    href: string;
    hint?: string;
}

function SetupStep({ number, label, done, href, hint }: SetupStepProps) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 p-3 rounded-lg transition-colors"
            style={{
                background: done ? 'rgba(0, 103, 71, 0.1)' : 'var(--surface)',
                border: `1px solid ${done ? 'rgba(0, 103, 71, 0.3)' : 'var(--rule)'}`,
            }}
        >
            <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                    background: done ? 'var(--masters)' : 'var(--rule)',
                    color: done ? 'white' : 'var(--ink-tertiary)',
                }}
            >
                {done ? '✓' : number}
            </div>
            <div className="flex-1">
                <p className="type-title-sm" style={{ color: done ? 'var(--masters)' : 'var(--ink)' }}>
                    {label}
                </p>
                {hint && (
                    <p className="type-micro" style={{ marginTop: '2px' }}>
                        {hint}
                    </p>
                )}
            </div>
            <ChevronRight size={16} style={{ color: done ? 'var(--masters)' : 'var(--ink-tertiary)' }} />
        </Link>
    );
}
