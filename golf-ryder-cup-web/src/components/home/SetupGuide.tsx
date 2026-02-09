/**
 * Setup Guide Component
 *
 * Step-by-step guide for captains to set up their trip.
 */
'use client';

import Link from 'next/link';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
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
                className="card border border-[rgba(0,103,71,0.2)] bg-[linear-gradient(135deg,_rgba(0,103,71,0.08)_0%,_rgba(0,103,71,0.03)_100%)] p-[var(--space-5)]"
            >
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[var(--masters)] text-white">
                        <ClipboardCheck size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="type-title-sm">Get Your Trip Ready</p>
                        <p className="type-caption mt-0.5">
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
            className={cn(
                'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                done
                    ? 'bg-[rgba(0,103,71,0.1)] border-[rgba(0,103,71,0.3)] hover:bg-[rgba(0,103,71,0.15)]'
                    : 'bg-[var(--surface)] border-[var(--rule)] hover:bg-[rgba(15,13,10,0.04)]'
            )}
        >
            <div
                className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    done ? 'bg-[var(--masters)] text-white' : 'bg-[var(--rule)] text-[var(--ink-tertiary)]'
                )}
            >
                {done ? '✓' : number}
            </div>
            <div className="flex-1">
                <p className={cn('type-title-sm', done ? 'text-[var(--masters)]' : 'text-[var(--ink)]')}>{label}</p>
                {hint && <p className="type-micro mt-0.5 text-[var(--ink-secondary)]">{hint}</p>}
            </div>
            <ChevronRight
                size={16}
                className={cn(done ? 'text-[var(--masters)]' : 'text-[var(--ink-tertiary)]')}
            />
        </Link>
    );
}
