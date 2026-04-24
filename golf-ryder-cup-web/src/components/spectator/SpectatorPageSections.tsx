'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Clock,
    Flag,
    RefreshCw,
    Share2,
    Target,
    Trophy,
    Tv,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { colors } from '@/lib/design-system/tokens';
import type { SpectatorMatch, SpectatorView } from '@/lib/types/captain';

export function SpectatorLoadingState() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
            <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--masters)] border-t-transparent" />
                <p className="text-[var(--ink-secondary)]">Loading scoreboard...</p>
            </div>
        </div>
    );
}

export function SpectatorUnavailableState({
    loadError,
    onRetry,
    onGoHome,
}: {
    loadError: string | null;
    onRetry: () => void;
    onGoHome: () => void;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] p-4">
            <div className="text-center">
                <Trophy className="mx-auto mb-4 h-16 w-16 text-[var(--ink-tertiary)]" />
                <h2 className="mb-2 text-2xl font-bold text-[var(--ink-primary)]">
                    {loadError ? 'Unable to Load Scoreboard' : 'Tournament Not Found'}
                </h2>
                <p className="mb-6 text-[var(--ink-secondary)]">
                    {loadError ? loadError : "This tournament doesn't exist or has been removed."}
                </p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    {loadError ? (
                        <button
                            onClick={onRetry}
                            className="rounded-xl bg-[var(--masters)] px-6 py-3 text-[var(--canvas)]"
                        >
                            Retry
                        </button>
                    ) : null}
                    <button
                        onClick={onGoHome}
                        className="rounded-xl border border-[var(--rule)] bg-[var(--surface-raised)] px-6 py-3 text-[var(--ink-primary)]"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        </div>
    );
}

interface SpectatorPageSectionsProps {
    spectatorView: SpectatorView;
    loadError: string | null;
    lastUpdated: Date | null;
    isOnline: boolean;
    onBack: () => void;
    onRefresh: () => void;
    onShare: () => void;
    onToggleFullscreen: () => void;
}

export function SpectatorPageSections({
    spectatorView,
    loadError,
    lastUpdated,
    isOnline,
    onBack,
    onRefresh,
    onShare,
    onToggleFullscreen,
}: SpectatorPageSectionsProps) {
    return (
        <div className="min-h-screen bg-[var(--surface)]">
            <header className="sticky top-0 z-50 border-b border-[var(--rule)] bg-[var(--surface-raised)]">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="rounded-lg p-2 transition-colors hover:bg-[var(--surface-secondary)]"
                        >
                            <ArrowLeft className="h-5 w-5 text-[var(--ink-secondary)]" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-[var(--ink-primary)]">
                                {spectatorView.tripName}
                            </h1>
                            <p className="flex items-center gap-2 text-xs text-[var(--ink-tertiary)]">
                                <span
                                    className={`h-2 w-2 rounded-full ${
                                        spectatorView.currentStatus === 'live'
                                            ? 'animate-pulse bg-[var(--success)]'
                                            : spectatorView.currentStatus === 'completed'
                                              ? 'bg-[var(--ink-tertiary)]'
                                              : 'bg-[var(--warning)]'
                                    }`}
                                />
                                {spectatorView.currentStatus === 'live'
                                    ? 'LIVE'
                                    : spectatorView.currentStatus === 'completed'
                                      ? 'FINAL'
                                      : 'UPCOMING'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {loadError ? (
                            <div className="flex items-center gap-1 rounded border border-[color:var(--error)]/20 bg-[color:var(--error)]/10 px-2 py-1 text-xs text-[var(--error)]">
                                <span className="h-2 w-2 rounded-full bg-[var(--error)]" />
                                Error
                            </div>
                        ) : null}

                        <div
                            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                                isOnline ? 'text-[var(--success)]' : 'text-[var(--error)]'
                            }`}
                        >
                            {isOnline ? (
                                <Wifi className="h-3 w-3" />
                            ) : (
                                <WifiOff className="h-3 w-3" />
                            )}
                        </div>

                        <button
                            onClick={onShare}
                            className="rounded-lg p-2 transition-colors hover:bg-[var(--surface-secondary)]"
                            title="Share scoreboard"
                        >
                            <Share2 className="h-4 w-4 text-[var(--ink-secondary)]" />
                        </button>

                        <button
                            onClick={onRefresh}
                            className="rounded-lg p-2 transition-colors hover:bg-[var(--surface-secondary)]"
                            title="Refresh"
                        >
                            <RefreshCw className="h-4 w-4 text-[var(--ink-secondary)]" />
                        </button>

                        <button
                            onClick={onToggleFullscreen}
                            className="rounded-lg p-2 transition-colors hover:bg-[var(--surface-secondary)]"
                            title="Fullscreen"
                        >
                            <Tv className="h-4 w-4 text-[var(--ink-secondary)]" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl p-4 pb-20 lg:p-8 lg:pb-24">
                <div className="mb-8 grid grid-cols-2 gap-4 lg:gap-8">
                    <TeamScoreCard
                        teamName={spectatorView.teamA.name}
                        points={spectatorView.teamA.points}
                        color={colors.team.usa.primary}
                        isLeading={spectatorView.teamA.points > spectatorView.teamB.points}
                        pointsToWin={spectatorView.pointsToWin}
                    />
                    <TeamScoreCard
                        teamName={spectatorView.teamB.name}
                        points={spectatorView.teamB.points}
                        color={colors.team.europe.primary}
                        isLeading={spectatorView.teamB.points > spectatorView.teamA.points}
                        pointsToWin={spectatorView.pointsToWin}
                    />
                </div>

                {spectatorView.magicNumber ? (
                    <MagicNumberBanner
                        team={
                            spectatorView.magicNumber.team === 'A'
                                ? spectatorView.teamA.name
                                : spectatorView.teamB.name
                        }
                        points={spectatorView.magicNumber.points}
                        teamColor={
                            spectatorView.magicNumber.team === 'A'
                                ? colors.team.usa.primary
                                : colors.team.europe.primary
                        }
                    />
                ) : null}

                {spectatorView.liveMatches.length > 0 ? (
                    <section className="mb-8">
                        <div className="mb-4 flex items-center gap-2">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--success)]" />
                            <h2 className="text-lg font-semibold text-[var(--ink-primary)]">
                                Live Matches
                            </h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {spectatorView.liveMatches.map((match) => (
                                <LiveMatchCard key={match.id} match={match} />
                            ))}
                        </div>
                    </section>
                ) : null}

                {spectatorView.recentResults.length > 0 ? (
                    <section>
                        <div className="mb-4 flex items-center gap-2">
                            <Flag className="h-4 w-4 text-[var(--ink-secondary)]" />
                            <h2 className="text-lg font-semibold text-[var(--ink-primary)]">
                                Recent Results
                            </h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {spectatorView.recentResults.map((match) => (
                                <CompletedMatchCard key={match.id} match={match} />
                            ))}
                        </div>
                    </section>
                ) : null}

                {spectatorView.liveMatches.length === 0 &&
                spectatorView.recentResults.length === 0 ? (
                    <div className="py-16 text-center">
                        <Clock className="mx-auto mb-4 h-16 w-16 text-[var(--ink-tertiary)]" />
                        <h3 className="mb-2 text-xl font-semibold text-[var(--ink-primary)]">
                            Tournament Hasn&apos;t Started
                        </h3>
                        <p className="text-[var(--ink-secondary)]">
                            Check back when matches begin!
                        </p>
                    </div>
                ) : null}
            </main>

            <footer className="fixed bottom-0 left-0 right-0 border-t border-[var(--rule)] bg-[var(--surface-raised)] px-4 py-2">
                <div className="mx-auto flex max-w-7xl items-center justify-between text-xs text-[var(--ink-tertiary)]">
                    <span>Spectator Mode • Read Only</span>
                    <span>Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}</span>
                </div>
            </footer>
        </div>
    );
}

function TeamScoreCard({
    teamName,
    points,
    color,
    isLeading,
    pointsToWin,
}: {
    teamName: string;
    points: number;
    color: string;
    isLeading: boolean;
    pointsToWin: number;
}) {
    const percentage = Math.min(100, (points / pointsToWin) * 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--surface-raised)] p-6 lg:p-8"
        >
            {isLeading ? (
                <div className="absolute right-4 top-4">
                    <Trophy className="h-6 w-6 text-[var(--warning)]" />
                </div>
            ) : null}

            <h3 className="mb-4 text-lg font-semibold lg:text-xl" style={{ color }}>
                {teamName}
            </h3>

            <div className="mb-4 text-5xl font-bold text-[var(--ink-primary)] lg:text-7xl">
                {points}
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[var(--rule)]">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                />
            </div>
            <p className="mt-2 text-xs text-[var(--ink-tertiary)]">
                {pointsToWin - points > 0 ? `${pointsToWin - points} to win` : 'Winner!'}
            </p>
        </motion.div>
    );
}

function MagicNumberBanner({
    team,
    points,
    teamColor,
}: {
    team: string;
    points: number;
    teamColor: string;
}) {
    const hasClinched = points <= 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 rounded-xl border-2 p-4 text-center"
            style={{
                borderColor: teamColor,
                backgroundColor: `${teamColor}15`,
            }}
        >
            <div className="flex items-center justify-center gap-3">
                <Target className="h-5 w-5" style={{ color: teamColor }} />
                <span className="text-[var(--ink-primary)]">
                    {hasClinched ? (
                        <>
                            <strong style={{ color: teamColor }}>{team}</strong> has clinched
                            the cup
                        </>
                    ) : (
                        <>
                            <strong style={{ color: teamColor }}>{team}</strong> needs{' '}
                            <strong className="text-[var(--warning)]">{points}</strong> points
                            to clinch
                        </>
                    )}
                </span>
            </div>
        </motion.div>
    );
}

const LiveMatchCard = React.memo(function LiveMatchCard({ match }: { match: SpectatorMatch }) {
    const leadingTeam = match.leadingTeam;
    const scoreColor =
        leadingTeam === 'teamA'
            ? colors.team.usa.light
            : leadingTeam === 'teamB'
              ? colors.team.europe.light
              : colors.text.secondary;
    const isTeamALeading = leadingTeam === 'teamA';
    const isTeamBLeading = leadingTeam === 'teamB';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--surface-raised)] p-4"
        >
            <div className="absolute right-3 top-3 flex items-center gap-1">
                {match.isDormie ? (
                    <span className="rounded bg-[color:var(--warning)]/15 px-2 py-0.5 text-xs font-medium text-[var(--warning)]">
                        DORMIE
                    </span>
                ) : null}
                <span className="flex items-center gap-1 rounded bg-[color:var(--success)]/15 px-2 py-0.5 text-xs font-medium text-[var(--success)]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--success)]" />
                    LIVE
                </span>
            </div>

            <div className="mb-3">
                <p className="mb-1 text-xs text-[var(--ink-tertiary)]">{match.sessionName}</p>
                <p className="text-sm text-[var(--ink-secondary)]">Thru {match.thruHole}</p>
            </div>

            <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="flex-1 truncate font-medium text-[var(--ink-primary)]">
                        {match.teamAPlayers}
                    </span>
                    <span
                        className="w-8 text-center font-mono"
                        style={{
                            color:
                                isTeamALeading ? colors.team.usa.light : colors.text.secondary,
                        }}
                    >
                        {isTeamALeading ? '●' : ''}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="flex-1 truncate font-medium text-[var(--ink-primary)]">
                        {match.teamBPlayers}
                    </span>
                    <span
                        className="w-8 text-center font-mono"
                        style={{
                            color:
                                isTeamBLeading ? colors.team.europe.light : colors.text.secondary,
                        }}
                    >
                        {isTeamBLeading ? '●' : ''}
                    </span>
                </div>
            </div>

            <div className="border-t border-[var(--rule)] pt-2 text-center">
                <span className="text-lg font-bold" style={{ color: scoreColor }}>
                    {match.currentScore}
                </span>
            </div>
        </motion.div>
    );
});

const CompletedMatchCard = React.memo(function CompletedMatchCard({ match }: { match: SpectatorMatch }) {
    const result = match.result || '';
    const leadingTeam = match.leadingTeam;
    const isHalved = leadingTeam === 'halved' || result.toLowerCase() === 'halved' || result === '';
    const isTeamAWin = match.status === 'completed' && leadingTeam === 'teamA';
    const isTeamBWin = match.status === 'completed' && leadingTeam === 'teamB';

    return (
        <div className="rounded-xl border border-[var(--rule)] bg-[var(--surface-raised)] p-4 opacity-80">
            <div className="mb-3">
                <p className="mb-1 text-xs text-[var(--ink-tertiary)]">{match.sessionName}</p>
            </div>

            <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between">
                    <span
                        className={`flex-1 truncate font-medium ${
                            isTeamAWin ? 'text-[var(--ink-primary)]' : 'text-[var(--ink-tertiary)]'
                        }`}
                    >
                        {match.teamAPlayers}
                    </span>
                    {isTeamAWin ? <Trophy className="h-4 w-4 text-[var(--warning)]" /> : null}
                </div>
                <div className="flex items-center justify-between">
                    <span
                        className={`flex-1 truncate font-medium ${
                            isTeamBWin ? 'text-[var(--ink-primary)]' : 'text-[var(--ink-tertiary)]'
                        }`}
                    >
                        {match.teamBPlayers}
                    </span>
                    {isTeamBWin ? <Trophy className="h-4 w-4 text-[var(--warning)]" /> : null}
                </div>
            </div>

            <div className="border-t border-[var(--rule)] pt-2 text-center">
                <span className="text-sm font-medium text-[var(--ink-secondary)]">
                    {isHalved ? 'Halved' : result || 'Final'}
                </span>
            </div>
        </div>
    );
});
