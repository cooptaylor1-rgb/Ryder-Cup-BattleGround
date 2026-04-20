'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyStatePremium, InlineLoadingSkeleton } from '@/components/ui';
import { LineupBuilder, type FairnessScore, type MatchSlot, type SessionConfig } from '@/components/captain';
import { ChevronRight, Edit3, Eye, Play, Users } from 'lucide-react';
import { parseDateInLocalZone } from '@/lib/utils';
import type { Match } from '@/lib/types';
import type { RyderCupSession } from '@/lib/types/models';
import type { SessionLineupViewMode } from './sessionLineupData';

export function SessionLineupNoTripState({ onBackHome }: { onBackHome: () => void }) {
    return (
        <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
            <main className="container-editorial py-12">
                <EmptyStatePremium
                    illustration="trophy"
                    title="No active trip"
                    description="Start or select a trip to view this session."
                    action={{ label: 'Back to Home', onClick: onBackHome }}
                    variant="large"
                />
            </main>
        </div>
    );
}

export function SessionLineupMissingState({
    onBackToLineups,
}: {
    onBackToLineups: () => void;
}) {
    return (
        <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]" role="alert">
            <main className="container-editorial py-12">
                <EmptyStatePremium
                    illustration="calendar"
                    title="Session not found"
                    description="This session may have been deleted or hasn’t synced yet."
                    action={{ label: 'Back to Lineups', onClick: onBackToLineups }}
                    variant="large"
                />
            </main>
        </div>
    );
}

export function SessionLineupHeroSection({
    session,
    matchesCount,
}: {
    session: RyderCupSession;
    matchesCount: number;
}) {
    return (
        <section className="pt-[var(--space-8)]">
            <div className="card-editorial overflow-hidden p-[var(--space-5)] sm:p-[var(--space-6)]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="type-overline text-[var(--masters)]">Session room</p>
                        <h1 className="mt-[var(--space-2)] font-serif text-[length:var(--text-3xl)] font-normal tracking-[-0.03em] text-[var(--ink)]">
                            {session.name}
                        </h1>
                        <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                            {session.sessionType} • {session.pointsPerMatch} point
                            {session.pointsPerMatch === 1 ? '' : 's'} per match
                        </p>
                    </div>
                    <SessionPageStatus status={session.status} />
                </div>

                <div className="mt-[var(--space-6)] grid grid-cols-3 gap-3">
                    <SessionInfoFact
                        label="Date"
                        value={
                            session.scheduledDate
                                ? parseDateInLocalZone(session.scheduledDate).toLocaleDateString()
                                : 'Unscheduled'
                        }
                    />
                    <SessionInfoFact label="Time" value={session.timeSlot || 'TBD'} />
                    <SessionInfoFact label="Matches" value={matchesCount} />
                </div>
            </div>
        </section>
    );
}

export function SessionLineupModeToggle({
    viewMode,
    canEdit,
    onSelectMatches,
    onSelectEdit,
}: {
    viewMode: SessionLineupViewMode;
    canEdit: boolean;
    onSelectMatches: () => void;
    onSelectEdit: () => void;
}) {
    return (
        <section className="section-sm">
            <div className="flex gap-2">
                <button
                    onClick={onSelectMatches}
                    className={`flex-1 rounded-xl py-3 font-medium transition-all ${
                        viewMode === 'matches'
                            ? 'bg-masters text-[var(--canvas)]'
                            : 'border border-[color:var(--rule)]/30 bg-[color:var(--surface)]/60 text-[var(--ink-primary)] hover:border-[color:var(--rule)]/60 hover:bg-[var(--surface)]'
                    } flex items-center justify-center gap-2`}
                >
                    <Eye size={16} />
                    View Matches
                </button>
                <button
                    onClick={onSelectEdit}
                    disabled={!canEdit}
                    className={`flex-1 rounded-xl py-3 font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        viewMode === 'edit'
                            ? 'bg-masters text-[var(--canvas)]'
                            : 'border border-[color:var(--rule)]/30 bg-[color:var(--surface)]/60 text-[var(--ink-primary)] hover:border-[color:var(--rule)]/60 hover:bg-[var(--surface)]'
                    } flex items-center justify-center gap-2`}
                >
                    <Edit3 size={16} />
                    Edit Lineup
                </button>
            </div>
        </section>
    );
}

export function SessionStartButton({
    onStart,
}: {
    onStart: () => void;
}) {
    return (
        <section className="section-sm">
            <Button variant="primary" fullWidth onClick={onStart} leftIcon={<Play size={18} />}>
                Start Session
            </Button>
        </section>
    );
}

interface SessionLineupMatchesSectionProps {
    isLoading: boolean;
    matches: Match[];
    canEdit: boolean;
    session: RyderCupSession;
    teamAName: string;
    teamBName: string;
    getMatchPlayerNames: (playerIds: string[]) => string;
    getMatchScoreDisplay: (match: Match) => string;
    onOpenMatch: (matchId: string) => void;
}

export function SessionLineupMatchesSection({
    isLoading,
    matches,
    canEdit,
    session,
    teamAName,
    teamBName,
    getMatchPlayerNames,
    getMatchScoreDisplay,
    onOpenMatch,
}: SessionLineupMatchesSectionProps) {
    return (
        <section className="section">
            <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
                Matches
            </h2>

            {isLoading ? (
                <div className="card" style={{ padding: 'var(--space-6)' }}>
                    <p className="type-meta" style={{ marginBottom: 'var(--space-4)' }}>
                        Loading matches…
                    </p>
                    <InlineLoadingSkeleton lines={4} />
                </div>
            ) : matches.length === 0 ? (
                <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
                    <Users
                        size={32}
                        style={{ color: 'var(--ink-tertiary)', margin: '0 auto var(--space-3)' }}
                    />
                    <p className="type-title-sm" style={{ marginBottom: 'var(--space-2)' }}>
                        No Matches Yet
                    </p>
                    <p className="type-caption">
                        {canEdit ? 'Switch to Edit mode to build the lineup' : 'Lineup not yet created'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {matches.map((match, index) => {
                        const teamANames = getMatchPlayerNames(match.teamAPlayerIds);
                        const teamBNames = getMatchPlayerNames(match.teamBPlayerIds);
                        const canScore = match.status === 'inProgress' || session.status === 'inProgress';

                        return (
                            <Link
                                key={match.id}
                                href={canScore ? `/score/${match.id}` : '#'}
                                className={`card-editorial block overflow-hidden p-[var(--space-4)] ${
                                    canScore ? 'press-scale' : ''
                                }`}
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <span
                                        className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold"
                                        style={{
                                            background:
                                                match.status === 'completed'
                                                    ? 'var(--success)'
                                                    : match.status === 'inProgress'
                                                      ? 'var(--masters)'
                                                      : 'var(--canvas-sunken)',
                                            color:
                                                match.status !== 'scheduled'
                                                    ? 'white'
                                                    : 'var(--ink-secondary)',
                                        }}
                                    >
                                        {index + 1}
                                    </span>
                                    <span
                                        className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                                        style={{
                                            background:
                                                match.status === 'completed'
                                                    ? 'rgba(76, 175, 80, 0.12)'
                                                    : match.status === 'inProgress'
                                                      ? 'rgba(0, 102, 68, 0.12)'
                                                      : 'rgba(26, 24, 21, 0.08)',
                                            color:
                                                match.status === 'completed'
                                                    ? 'var(--success)'
                                                    : match.status === 'inProgress'
                                                      ? 'var(--masters)'
                                                      : 'var(--ink-tertiary)',
                                        }}
                                    >
                                        {getMatchScoreDisplay(match)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-[20px] border border-[color:rgba(20,92,163,0.16)] bg-[linear-gradient(180deg,rgba(20,92,163,0.10)_0%,rgba(255,255,255,0.72)_100%)] p-3">
                                        <p className="type-micro mb-1" style={{ color: 'var(--team-usa)' }}>
                                            {teamAName}
                                        </p>
                                        <p className="type-title-sm">{teamANames || 'TBD'}</p>
                                    </div>

                                    <div className="rounded-[20px] border border-[color:rgba(114,47,55,0.16)] bg-[linear-gradient(180deg,rgba(114,47,55,0.10)_0%,rgba(255,255,255,0.72)_100%)] p-3">
                                        <p className="type-micro mb-1" style={{ color: 'var(--team-europe)' }}>
                                            {teamBName}
                                        </p>
                                        <p className="type-title-sm">{teamBNames || 'TBD'}</p>
                                    </div>
                                </div>

                                {canScore ? (
                                    <button
                                        onClick={(event) => {
                                            event.preventDefault();
                                            onOpenMatch(match.id);
                                        }}
                                        className="mt-3 flex w-full items-center justify-center gap-2 border-t pt-3"
                                        style={{ borderColor: 'var(--rule)' }}
                                    >
                                        <span className="type-meta" style={{ color: 'var(--masters)' }}>
                                            {match.status === 'inProgress' ? 'Continue Scoring' : 'Start Scoring'}
                                        </span>
                                        <ChevronRight size={16} style={{ color: 'var(--masters)' }} />
                                    </button>
                                ) : null}
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

interface SessionLineupEditorSectionProps {
    sessionConfig: SessionConfig | null;
    lineupTeamA: LineupPlayer[];
    lineupTeamB: LineupPlayer[];
    teamALabel: string;
    teamBLabel: string;
    initialMatches: MatchSlot[];
    calculateFairness: (matchSlots: MatchSlot[]) => FairnessScore;
    onDeleteMatch: (matchId: string) => Promise<boolean | void>;
    onSaveDraft: (matches: MatchSlot[]) => void;
    onPublish: (matches: MatchSlot[]) => void;
}

type LineupPlayer = import('@/components/captain').Player;

export function SessionLineupEditorSection({
    sessionConfig,
    lineupTeamA,
    lineupTeamB,
    teamALabel,
    teamBLabel,
    initialMatches,
    calculateFairness,
    onDeleteMatch,
    onSaveDraft,
    onPublish,
}: SessionLineupEditorSectionProps) {
    return (
        <section className="section">
            {sessionConfig ? (
                <LineupBuilder
                    session={sessionConfig}
                    teamAPlayers={lineupTeamA}
                    teamBPlayers={lineupTeamB}
                    teamALabel={teamALabel}
                    teamBLabel={teamBLabel}
                    initialMatches={initialMatches}
                    onSave={onSaveDraft}
                    onPublish={onPublish}
                    onDeleteMatch={onDeleteMatch}
                    calculateFairness={calculateFairness}
                    isLocked={false}
                />
            ) : null}
        </section>
    );
}

export function SessionInfoFact({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-[20px] border border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/72 px-3 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                {label}
            </p>
            <p className="mt-1 font-serif text-[length:var(--text-xl)] text-[var(--ink)]">{value}</p>
        </div>
    );
}

export function SessionPageStatus({
    status,
}: {
    status: Match['status'] | 'scheduled' | 'paused';
}) {
    const label =
        status === 'inProgress'
            ? 'Live'
            : status === 'paused'
              ? 'Paused'
              : status === 'completed'
                ? 'Complete'
                : 'Scheduled';
    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                status === 'inProgress'
                    ? 'bg-[color:rgba(0,102,68,0.12)] text-[var(--masters)]'
                    : status === 'completed'
                      ? 'bg-[color:rgba(76,175,80,0.12)] text-[var(--success)]'
                      : 'bg-[color:rgba(26,24,21,0.08)] text-[var(--ink-secondary)]'
            }`}
        >
            {label}
        </span>
    );
}
