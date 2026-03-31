'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { EmptyStatePremium } from '@/components/ui';
import { Clock3, Flag, Maximize2, RefreshCw, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import type { Match, Player } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';

interface LivePageSectionsProps {
    activeSession: { id: string; name: string } | null;
    matches: Match[] | undefined;
    isLoadingMatches: boolean;
    isConnected: boolean;
    lastUpdate: Date;
    soundEnabled: boolean;
    isFullscreen: boolean;
    flashMatchId: string | null;
    getMatchState: (matchId: string) => MatchState | undefined;
    getPlayer: (id: string) => Player | undefined;
    onToggleSound: () => void;
    onToggleFullscreen: () => void;
    onRefresh: () => void;
    onGoToSchedule: () => void;
    onGoToMatchups: () => void;
}

export function LiveNoTripState({
    onGoHome,
    onGoMore,
}: {
    onGoHome: () => void;
    onGoMore: () => void;
}) {
    return (
        <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
            <main className="container-editorial py-12">
                <EmptyStatePremium
                    illustration="scorecard"
                    title="No trip selected"
                    description="Start or select a trip to view the live jumbotron."
                    action={{ label: 'Go Home', onClick: onGoHome }}
                    secondaryAction={{ label: 'More', onClick: onGoMore }}
                    variant="large"
                />
            </main>
        </div>
    );
}

export function LivePageSections({
    activeSession,
    matches,
    isLoadingMatches,
    isConnected,
    lastUpdate,
    soundEnabled,
    isFullscreen,
    flashMatchId,
    getMatchState,
    getPlayer,
    onToggleSound,
    onToggleFullscreen,
    onRefresh,
    onGoToSchedule,
    onGoToMatchups,
}: LivePageSectionsProps) {
    const controlButtonClass =
        'min-h-11 min-w-11 rounded-[1rem] border border-[var(--rule)] bg-[color:var(--surface-raised)]/74 p-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]';

    return (
        <main className="container-editorial py-6">
            {activeSession ? (
                <section className="mb-[var(--space-6)] overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--canvas)_84%,transparent),color-mix(in_srgb,var(--canvas-sunken)_94%,transparent))] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
                    <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
                        <div className="flex items-start justify-between gap-[var(--space-4)]">
                            <div className="min-w-0">
                                <p className="type-overline tracking-[0.18em] text-[var(--ink-tertiary)]">
                                    Live Jumbotron
                                </p>
                                <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3rem)] italic leading-[1.02] text-[var(--ink)]">
                                    {activeSession.name}
                                </h1>
                                <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]" aria-live="polite">
                                    {isConnected
                                        ? `Connected and listening. Last update ${lastUpdate.toLocaleTimeString()}.`
                                        : `Using cached data. Last update ${lastUpdate.toLocaleTimeString()}.`}
                                </p>
                            </div>

                            <LiveStatusPill
                                connected={isConnected}
                                label={isConnected ? 'Live Feed' : 'Offline View'}
                            />
                        </div>

                        <div className="mt-[var(--space-4)] grid grid-cols-2 gap-[var(--space-3)] md:grid-cols-4">
                            <LiveFactCard
                                icon={<Flag size={14} strokeWidth={1.7} />}
                                label="Matches"
                                value={matches?.length ?? 0}
                            />
                            <LiveFactCard
                                icon={<Clock3 size={14} strokeWidth={1.7} />}
                                label="Updated"
                                value={lastUpdate.toLocaleTimeString([], {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })}
                                valueClassName="font-sans text-[0.95rem] not-italic"
                            />
                            <LiveFactCard
                                icon={
                                    soundEnabled ? (
                                        <Volume2 size={14} strokeWidth={1.7} />
                                    ) : (
                                        <VolumeX size={14} strokeWidth={1.7} />
                                    )
                                }
                                label="Sound"
                                value={soundEnabled ? 'On' : 'Off'}
                                valueClassName="font-sans text-[0.95rem] not-italic"
                            />
                            <LiveFactCard
                                icon={<Maximize2 size={14} strokeWidth={1.7} />}
                                label="View"
                                value={isFullscreen ? 'Fullscreen' : 'Windowed'}
                                valueClassName="font-sans text-[0.95rem] not-italic"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-4)]">
                        <button
                            onClick={onToggleSound}
                            className={controlButtonClass}
                            aria-label={soundEnabled ? 'Mute live update sounds' : 'Enable live update sounds'}
                            aria-pressed={soundEnabled}
                            title={soundEnabled ? 'Mute live update sounds' : 'Enable live update sounds'}
                        >
                            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>
                        <button
                            onClick={onToggleFullscreen}
                            className={controlButtonClass}
                            aria-label="Toggle fullscreen"
                            title="Toggle fullscreen"
                        >
                            <Maximize2 size={18} />
                        </button>
                        <button
                            onClick={onRefresh}
                            className={controlButtonClass}
                            aria-label="Refresh live scores"
                            title="Refresh live scores"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </section>
            ) : null}

            {!activeSession ? (
                <LiveNoSessionState onGoToSchedule={onGoToSchedule} onGoToMatchups={onGoToMatchups} />
            ) : isLoadingMatches ? (
                <div className="grid grid-cols-1 gap-4 animate-pulse md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="h-56 rounded-[1.5rem] border border-[var(--rule)] bg-[var(--surface-elevated)]"
                        />
                    ))}
                </div>
            ) : matches && matches.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {matches.map((match) => (
                        <LiveMatchCard
                            key={match.id}
                            match={match}
                            state={getMatchState(match.id)}
                            getPlayer={getPlayer}
                            isFlashing={flashMatchId === match.id}
                        />
                    ))}
                </div>
            ) : (
                <div className="mx-auto max-w-xl py-12">
                    <EmptyStatePremium
                        illustration="scorecard"
                        title="No live matches"
                        description="Start a session to see live scores here."
                        action={{ label: 'Go to Matchups', onClick: onGoToMatchups }}
                        secondaryAction={{ label: 'View Schedule', onClick: onGoToSchedule }}
                        variant="large"
                    />
                </div>
            )}
        </main>
    );
}

function LiveNoSessionState({
    onGoToSchedule,
    onGoToMatchups,
}: {
    onGoToSchedule: () => void;
    onGoToMatchups: () => void;
}) {
    return (
        <div className="mx-auto max-w-xl py-12">
            <EmptyStatePremium
                illustration="scorecard"
                title="No active session"
                description="Once a session is in progress, live matches will appear here automatically."
                action={{ label: 'View Schedule', onClick: onGoToSchedule }}
                secondaryAction={{ label: 'Go to Matchups', onClick: onGoToMatchups }}
                variant="large"
            />
        </div>
    );
}

interface LiveMatchCardProps {
    match: Match;
    state?: MatchState;
    getPlayer: (id: string) => Player | undefined;
    isFlashing?: boolean;
}

const LiveMatchCard = React.memo(function LiveMatchCard({ match, state, getPlayer, isFlashing }: LiveMatchCardProps) {
    const teamAPlayers = match.teamAPlayerIds.map((id) => getPlayer(id)).filter(Boolean) as Player[];
    const teamBPlayers = match.teamBPlayerIds.map((id) => getPlayer(id)).filter(Boolean) as Player[];

    const formatPlayerNames = (players: Player[]) => {
        if (players.length === 0) return 'TBD';
        if (players.length === 1) return players[0].lastName;
        return players.map((player) => player.lastName).join(' / ');
    };

    const isTeamAWinning = state ? state.currentScore > 0 : false;
    const isTeamBWinning = state ? state.currentScore < 0 : false;
    const isHalved = state?.currentScore === 0;

    const getStatusText = () => {
        if (!state) return 'Not Started';
        if (state.status === 'completed') {
            if (state.winningTeam === 'halved') return 'Halved';
            return state.displayScore;
        }
        if (state.holesPlayed === 0) return 'Not Started';
        return `Thru ${state.holesPlayed}`;
    };

    const getScoreDisplay = () => {
        if (!state || state.holesPlayed === 0) return 'AS';
        if (state.currentScore === 0) return 'AS';
        const absScore = Math.abs(state.currentScore);
        return `${absScore} UP`;
    };

    const statusText = getStatusText();
    const scoreDisplay = getScoreDisplay();

    return (
        <div
            className={`overflow-hidden rounded-[1.75rem] border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-raised)_86%,transparent),color-mix(in_srgb,var(--canvas-sunken)_94%,transparent))] transition-all duration-500 ${
                isFlashing
                    ? 'scale-[1.02] border-[var(--masters)] shadow-[0_18px_36px_rgba(22,101,52,0.2)]'
                    : 'border-[var(--rule)] shadow-[0_12px_30px_rgba(46,34,18,0.06)]'
            }`}
        >
            <div className="flex items-center justify-between border-b border-[var(--rule)] bg-[color:var(--surface-raised)]/70 px-4 py-3">
                <span className="type-overline text-[var(--ink-tertiary)]">Match {match.matchOrder}</span>
                <span
                    className={
                        `rounded-full border px-2.5 py-1 text-xs font-medium ` +
                        (state?.status === 'inProgress'
                            ? 'border-[color:var(--error)]/25 bg-[color:var(--error)]/10 text-[var(--error)]'
                            : state?.status === 'completed'
                              ? 'border-[color:var(--success)]/25 bg-[color:var(--success)]/10 text-[var(--success)]'
                              : 'border-[var(--rule)] bg-[var(--canvas)] text-[var(--ink-tertiary)]')
                    }
                >
                    {state?.status === 'inProgress' ? (
                        <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--error)]" />
                    ) : null}
                    {statusText}
                </span>
            </div>

            <div className="px-4 pt-4">
                <div className="rounded-[1.25rem] border border-[var(--rule)] bg-[color:var(--surface-raised)]/72 px-[var(--space-4)] py-[var(--space-4)] text-center">
                    <p className="type-micro uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                        {state?.status === 'completed' ? 'Final Margin' : 'Current Margin'}
                    </p>
                    <p className="mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--ink)]">
                        {scoreDisplay}
                    </p>
                    <p className="mt-[var(--space-2)] type-caption text-[var(--ink-secondary)]">
                        {state?.status === 'completed'
                            ? state?.winningTeam === 'halved'
                                ? 'Both sides finished level.'
                                : 'Result confirmed.'
                            : state?.holesPlayed
                              ? `Through ${state.holesPlayed} hole${state.holesPlayed === 1 ? '' : 's'}`
                              : 'Awaiting the opening hole.'}
                    </p>
                </div>
            </div>

            <div className="p-4">
                <div
                    className={`mb-3 flex items-center justify-between rounded-[1rem] border px-4 py-3 transition-all ${
                        isTeamAWinning
                            ? 'border-[color:var(--team-usa)]/18 bg-[color:var(--team-usa)]/12'
                            : 'border-[var(--rule)] bg-[color:var(--surface-raised)]/62'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-[var(--team-usa)]" />
                        <span
                            className={`font-medium ${
                                isTeamAWinning ? 'text-[var(--ink)]' : 'text-[var(--ink-secondary)]'
                            }`}
                        >
                            {formatPlayerNames(teamAPlayers)}
                        </span>
                    </div>
                    {isTeamAWinning ? (
                        <span
                            className={`text-lg font-bold text-[var(--team-usa)] ${
                                isFlashing ? 'animate-bounce' : ''
                            }`}
                        >
                            {scoreDisplay}
                        </span>
                    ) : null}
                </div>

                <div
                    className={`flex items-center justify-between rounded-[1rem] border px-4 py-3 transition-all ${
                        isTeamBWinning
                            ? 'border-[color:var(--team-europe)]/18 bg-[color:var(--team-europe)]/12'
                            : 'border-[var(--rule)] bg-[color:var(--surface-raised)]/62'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-[var(--team-europe)]" />
                        <span
                            className={`font-medium ${
                                isTeamBWinning ? 'text-[var(--ink)]' : 'text-[var(--ink-secondary)]'
                            }`}
                        >
                            {formatPlayerNames(teamBPlayers)}
                        </span>
                    </div>
                    {isTeamBWinning ? (
                        <span
                            className={`text-lg font-bold text-[var(--team-europe)] ${
                                isFlashing ? 'animate-bounce' : ''
                            }`}
                        >
                            {scoreDisplay}
                        </span>
                    ) : null}
                </div>

                {isHalved && state && state.holesPlayed > 0 ? (
                    <div className="mt-2 text-center">
                        <span className="text-sm text-[var(--ink-tertiary)]">All Square</span>
                    </div>
                ) : null}
            </div>

            {state && state.status === 'inProgress' ? (
                <div className="px-4 pb-4">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="type-micro uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                            Hole Progress
                        </p>
                        <p className="type-caption text-[var(--ink-secondary)]">
                            Hole {state.holesPlayed + 1} of 18
                        </p>
                    </div>
                    <div className="flex gap-1">
                        {Array.from({ length: 18 }, (_, index) => {
                            const holeNum = index + 1;
                            const isPlayed = holeNum <= state.holesPlayed;
                            const isCurrent = holeNum === state.holesPlayed + 1;
                            return (
                                <div
                                    key={index}
                                    className={`h-1 flex-1 rounded-full transition-all ${
                                        isCurrent
                                            ? 'animate-pulse bg-[var(--masters)]'
                                            : isPlayed
                                              ? 'bg-[color:var(--ink-tertiary)]/40'
                                              : 'bg-[var(--surface-elevated)]'
                                    }`}
                                />
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
});

function LiveStatusPill({ connected, label }: { connected: boolean; label: string }) {
    return (
        <div
            className="inline-flex items-center gap-[var(--space-2)] rounded-full border px-[var(--space-3)] py-[var(--space-2)]"
            style={{
                borderColor: connected ? 'rgba(22,163,74,0.2)' : 'var(--rule)',
                background: connected ? 'rgba(22,163,74,0.08)' : 'color-mix(in srgb, var(--surface-raised) 68%, transparent)',
            }}
            title={connected ? 'Live — connected' : 'Offline — using cached data'}
        >
            {connected ? (
                <Wifi size={14} className="text-[var(--success)]" />
            ) : (
                <WifiOff size={14} className="text-[var(--ink-tertiary)]" />
            )}
            <span
                className={`text-xs font-medium uppercase tracking-[0.14em] ${
                    connected ? 'text-[var(--success)]' : 'text-[var(--ink-tertiary)]'
                }`}
            >
                {label}
            </span>
        </div>
    );
}

function LiveFactCard({
    icon,
    label,
    value,
    valueClassName,
}: {
    icon: ReactNode;
    label: string;
    value: ReactNode;
    valueClassName?: string;
}) {
    return (
        <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[color:var(--surface-raised)]/68 px-[var(--space-4)] py-[var(--space-3)]">
            <div className="flex items-center gap-[var(--space-2)] text-[var(--masters)]">
                {icon}
                <p className="type-micro uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                    {label}
                </p>
            </div>
            <p
                className={`mt-[4px] font-serif text-[1.2rem] italic leading-[1.2] text-[var(--ink)] ${
                    valueClassName ?? ''
                }`}
            >
                {value}
            </p>
        </div>
    );
}
