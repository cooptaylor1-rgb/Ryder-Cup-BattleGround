'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyStatePremium, ErrorBoundary, NoScoresEmpty } from '@/components/ui';
import { ChevronRight } from 'lucide-react';
import { cn, formatPlayerName } from '@/lib/utils';
import type { MatchState } from '@/lib/types/computed';
import type { Player, RyderCupSession } from '@/lib/types/models';
import type { TripPlayerLinkStatus } from '@/lib/utils/tripPlayerIdentity';

export function ScoreSignInState({
    onSignIn,
}: {
    onSignIn: () => void;
}) {
    return (
        <main className="container-editorial py-12">
            <EmptyStatePremium
                illustration="scorecard"
                title="Sign in to view scores"
                description="Match scoring is available after you sign in."
                action={{ label: 'Sign In', onClick: onSignIn }}
                variant="large"
            />
        </main>
    );
}

export function ScoreNoTripState({
    onBackHome,
}: {
    onBackHome: () => void;
}) {
    return (
        <main className="container-editorial py-12">
            <EmptyStatePremium
                illustration="scorecard"
                title="No trip selected"
                description="Pick a trip to view matches and scoring."
                action={{ label: 'Back to Home', onClick: onBackHome }}
                variant="large"
            />
        </main>
    );
}

interface ScorePageSectionsProps {
    activeSession: RyderCupSession | undefined;
    currentTripName: string;
    matchStates: MatchState[];
    sessionStats: { live: number; completed: number; userMatches: number };
    quickContinueMatchId?: string;
    sessions: RyderCupSession[];
    selectedSessionId: string | null;
    currentUserPlayerId?: string;
    currentUserPlayerLinkStatus: TripPlayerLinkStatus;
    isLoading: boolean;
    getMatchPlayers: (playerIds: string[]) => Player[];
    onSelectMatch: (matchId: string) => void;
    onSelectSession: (sessionId: string) => void;
    onGoToMatchups: () => void;
    onOpenProfile: () => void;
}

export function ScorePageSections({
    activeSession,
    currentTripName,
    matchStates,
    sessionStats,
    quickContinueMatchId,
    sessions,
    selectedSessionId,
    currentUserPlayerId,
    currentUserPlayerLinkStatus,
    isLoading,
    getMatchPlayers,
    onSelectMatch,
    onSelectSession,
    onGoToMatchups,
    onOpenProfile,
}: ScorePageSectionsProps) {
    return (
        <main className="container-editorial">
            {activeSession ? (
                <section className="pt-[var(--space-8)]">
                    <div className="card-editorial overflow-hidden p-[var(--space-5)] sm:p-[var(--space-6)]">
                        <div className="flex items-start justify-between gap-[var(--space-4)]">
                            <div>
                                <p className="type-overline text-[var(--masters)]">Scoring Room</p>
                                <h1 className="type-display mt-[var(--space-2)] capitalize">
                                    {activeSession.sessionType}
                                </h1>
                                <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                                    Session {activeSession.sessionNumber} for {currentTripName}
                                </p>
                            </div>
                            <SessionStatusPill status={activeSession.status} />
                        </div>

                        <div className="mt-[var(--space-5)] grid grid-cols-3 gap-3">
                            <ScoreSessionStat label="Live" value={sessionStats.live} />
                            <ScoreSessionStat label="Complete" value={sessionStats.completed} />
                            <ScoreSessionStat label="Your Matches" value={sessionStats.userMatches} />
                        </div>

                        {quickContinueMatchId ? (
                            <button
                                onClick={() => onSelectMatch(quickContinueMatchId)}
                                className="mt-[var(--space-5)] flex w-full items-center justify-between gap-[var(--space-4)] rounded-[24px] border border-[color:rgba(0,102,68,0.15)] bg-[linear-gradient(135deg,rgba(0,102,68,0.12)_0%,rgba(255,255,255,0.72)_100%)] px-[var(--space-5)] py-[var(--space-4)] text-left transition-transform active:scale-[0.99]"
                                aria-label="Continue scoring active match"
                            >
                                <div>
                                    <p className="type-overline text-[var(--masters)]">Quick Action</p>
                                    <p className="mt-[var(--space-1)] type-title-sm text-[var(--ink)]">
                                        Continue live match
                                    </p>
                                    <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                                        Jump straight back into the only match currently underway.
                                    </p>
                                </div>
                                <ChevronRight size={18} className="text-[var(--ink-tertiary)]" />
                            </button>
                        ) : null}
                    </div>
                </section>
            ) : null}

            <section className="pb-[var(--space-8)] pt-[var(--space-6)]">
                <div className="mb-[var(--space-5)] flex items-end justify-between gap-4">
                    <div>
                        <p className="type-overline text-[var(--ink-secondary)]">Matches</p>
                        <h2 className="mt-2 font-serif text-[length:var(--text-2xl)] font-normal tracking-[-0.02em] text-[var(--ink)]">
                            Choose a card and start walking.
                        </h2>
                    </div>
                    <p className="hidden text-sm text-[var(--ink-tertiary)] sm:block">
                        {matchStates.length} match{matchStates.length === 1 ? '' : 'es'}
                    </p>
                </div>

                {!currentUserPlayerId ? (
                    <div className="mb-[var(--space-5)] rounded-[1.2rem] border border-[color:var(--warning)]/18 bg-[color:var(--warning)]/8 p-[var(--space-4)]">
                        <p className="text-sm font-semibold text-[var(--warning)]">Roster link needed</p>
                        <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
                            {currentUserPlayerLinkStatus === 'ambiguous-email-match' ||
                            currentUserPlayerLinkStatus === 'ambiguous-name-match'
                                ? 'There is more than one possible roster match for your profile. Review it before relying on personal scoring shortcuts.'
                                : "You're signed in, but this trip does not have a linked player entry for your profile yet."}
                        </p>
                        <button
                            type="button"
                            onClick={onOpenProfile}
                            className="mt-[var(--space-3)] inline-flex text-sm font-semibold text-[var(--masters)]"
                        >
                            Link profile to roster
                        </button>
                    </div>
                ) : null}

                <ErrorBoundary variant="compact" showDetails={process.env.NODE_ENV === 'development'}>
                    {isLoading ? (
                        <div className="flex flex-col gap-[var(--space-4)] py-[var(--space-8)]">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="card-editorial p-[var(--space-5)]">
                                    <div className="skeleton mb-3 h-3 w-[40%]" />
                                    <div className="skeleton mb-2 h-4 w-[70%]" />
                                    <div className="skeleton h-4 w-[60%]" />
                                </div>
                            ))}
                        </div>
                    ) : matchStates.length > 0 ? (
                        <div className="flex flex-col gap-[var(--space-4)]">
                            {matchStates.map((matchState, index) => {
                                const isUserMatch = !!currentUserPlayerId &&
                                    (matchState.match.teamAPlayerIds.includes(currentUserPlayerId) ||
                                        matchState.match.teamBPlayerIds.includes(currentUserPlayerId));

                                return (
                                    <MatchRow
                                        key={matchState.match.id}
                                        matchState={matchState}
                                        matchNumber={index + 1}
                                        teamAPlayers={getMatchPlayers(matchState.match.teamAPlayerIds)}
                                        teamBPlayers={getMatchPlayers(matchState.match.teamBPlayerIds)}
                                        onClick={() => onSelectMatch(matchState.match.id)}
                                        isUserMatch={isUserMatch}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <NoScoresEmpty onStartScoring={onGoToMatchups} />
                    )}
                </ErrorBoundary>
            </section>

            {sessions.length > 1 ? (
                <section className="pb-[var(--space-6)] pt-[var(--space-6)]">
                    <div className="card-editorial p-[var(--space-4)]">
                        <div className="mb-[var(--space-4)]">
                            <p className="type-overline text-[var(--ink-secondary)]">Sessions</p>
                            <p className="mt-2 text-sm text-[var(--ink-secondary)]">
                                Move between scheduled blocks without losing the scoring thread.
                            </p>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-1">
                            {sessions.map((session) => (
                                <Button
                                    key={session.id}
                                    variant={session.id === selectedSessionId ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() => onSelectSession(session.id)}
                                    className="whitespace-nowrap font-sans"
                                >
                                    Session {session.sessionNumber}
                                </Button>
                            ))}
                        </div>
                    </div>
                </section>
            ) : null}
        </main>
    );
}

interface MatchRowProps {
    matchState: MatchState;
    matchNumber: number;
    teamAPlayers: Player[];
    teamBPlayers: Player[];
    onClick: () => void;
    isUserMatch?: boolean;
}

const MatchRow = React.memo(function MatchRow({
    matchState,
    matchNumber,
    teamAPlayers,
    teamBPlayers,
    onClick,
    isUserMatch = false,
}: MatchRowProps) {
    const { currentScore, holesPlayed, status, displayScore } = matchState;
    const isActive = status === 'inProgress';

    const formatPlayers = (playerList: Player[]) => {
        if (playerList.length === 0) return '\u2014';
        return playerList
            .map((player) => formatPlayerName(player.firstName, player.lastName, 'short'))
            .join(' / ');
    };

    return (
        <button
            onClick={onClick}
            aria-label={`Open Match ${matchNumber}${isUserMatch ? ' (Your Match)' : ''}`}
            className={cn(
                'card-editorial card-interactive relative w-full overflow-hidden text-left transition-shadow',
                isActive ? 'p-[var(--space-6)]' : 'p-[var(--space-5)]',
                isUserMatch && 'border-2 border-[var(--masters)]'
            )}
        >
            {isUserMatch ? (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--masters)] px-3 py-[3px] text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-[var(--canvas)]">
                    Your Match
                </div>
            ) : null}

            <div className="mb-[var(--space-4)] flex items-center justify-between">
                <div>
                    <span
                        className={cn(
                            'type-overline',
                            isUserMatch ? 'text-[var(--masters)]' : 'text-[var(--ink-tertiary)]'
                        )}
                    >
                        Match {matchNumber}
                    </span>
                    <p className="mt-2 text-sm text-[var(--ink-secondary)]">
                        {status === 'inProgress'
                            ? 'Currently being scored'
                            : status === 'completed'
                              ? 'Card closed'
                              : 'Waiting to start'}
                    </p>
                </div>
                <SessionStatusPill
                    status={
                        status === 'inProgress'
                            ? 'inProgress'
                            : status === 'completed'
                              ? 'completed'
                              : 'scheduled'
                    }
                />
            </div>

            <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                    <div className="mb-[var(--space-3)] flex items-center gap-2">
                        <span className="team-dot team-dot-usa" />
                        <span
                            className={cn(
                                'truncate font-sans text-base text-[var(--ink)]',
                                currentScore > 0 ? 'font-bold' : 'font-medium'
                            )}
                        >
                            {formatPlayers(teamAPlayers)}
                        </span>
                        {currentScore > 0 ? (
                            <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--team-usa)]">
                                UP
                            </span>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="team-dot team-dot-europe" />
                        <span
                            className={cn(
                                'truncate font-sans text-base text-[var(--ink)]',
                                currentScore < 0 ? 'font-bold' : 'font-medium'
                            )}
                        >
                            {formatPlayers(teamBPlayers)}
                        </span>
                        {currentScore < 0 ? (
                            <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--team-europe)]">
                                UP
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="min-w-[86px] rounded-[22px] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/72 px-3 py-3 text-right">
                    <span
                        className={cn(
                            'block font-serif font-normal leading-none tracking-[-0.02em]',
                            isActive ? 'score-monumental' : 'text-2xl',
                            currentScore > 0
                                ? 'text-[var(--team-usa)]'
                                : currentScore < 0
                                  ? 'text-[var(--team-europe)]'
                                  : 'text-[var(--ink-tertiary)]'
                        )}
                    >
                        {displayScore}
                    </span>
                    {holesPlayed > 0 && status !== 'completed' ? (
                        <p className="mt-1 text-sm font-medium text-[var(--ink-tertiary)]">
                            thru {holesPlayed}
                        </p>
                    ) : null}
                    {status === 'scheduled' && holesPlayed === 0 ? (
                        <p className="text-sm text-[var(--ink-tertiary)]">Not started</p>
                    ) : null}
                </div>

                <ChevronRight size={18} strokeWidth={1.5} className="shrink-0 text-[var(--ink-tertiary)]" />
            </div>
        </button>
    );
});

function ScoreSessionStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-[20px] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/72 px-3 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                {label}
            </p>
            <p className="mt-1 font-serif text-[length:var(--text-xl)] text-[var(--ink)]">{value}</p>
        </div>
    );
}

function SessionStatusPill({ status }: { status: 'scheduled' | 'inProgress' | 'completed' }) {
    const label =
        status === 'inProgress' ? 'Live' : status === 'completed' ? 'Final' : 'Scheduled';

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
                status === 'inProgress'
                    ? 'bg-[color:rgba(0,102,68,0.12)] text-[var(--masters)]'
                    : status === 'completed'
                      ? 'bg-[color:rgba(26,24,21,0.08)] text-[var(--ink-secondary)]'
                      : 'bg-[color:rgba(201,162,39,0.15)] text-[var(--gold)]'
            )}
        >
            {label}
        </span>
    );
}
