'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyStatePremium, ErrorBoundary, NoScoresEmpty } from '@/components/ui';
import { Activity, ChevronRight, Crown, Flag, Trophy, Users, type LucideIcon } from 'lucide-react';
import { cn, formatPlayerName } from '@/lib/utils';
import type { MatchState } from '@/lib/types/computed';
import type { Player, RyderCupSession } from '@/lib/types/models';
import type { TripPlayerLinkStatus } from '@/lib/utils/tripPlayerIdentity';

export function ScoreSignInState({ onSignIn }: { onSignIn: () => void }) {
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

export function ScoreNoTripState({ onBackHome }: { onBackHome: () => void }) {
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
  const featuredMatchState = React.useMemo(() => {
    if (quickContinueMatchId) {
      return matchStates.find((state) => state.match.id === quickContinueMatchId);
    }

    return (
      matchStates.find((state) => state.status === 'inProgress') ??
      matchStates.find((state) => state.status === 'scheduled') ??
      matchStates[0]
    );
  }, [matchStates, quickContinueMatchId]);

  const liveLeaderboard = React.useMemo(
    () =>
      [...matchStates]
        .sort((left, right) => {
          const statusRank = (state: MatchState) =>
            state.status === 'inProgress' ? 0 : state.status === 'scheduled' ? 1 : 2;
          const rankDelta = statusRank(left) - statusRank(right);
          if (rankDelta !== 0) return rankDelta;
          if (left.status === 'inProgress' && right.status === 'inProgress') {
            return right.holesPlayed - left.holesPlayed;
          }
          return left.match.matchOrder - right.match.matchOrder;
        })
        .slice(0, 4),
    [matchStates]
  );

  const userMatchStates = React.useMemo(
    () =>
      currentUserPlayerId
        ? matchStates.filter(
            (state) =>
              state.match.teamAPlayerIds.includes(currentUserPlayerId) ||
              state.match.teamBPlayerIds.includes(currentUserPlayerId)
          )
        : [],
    [currentUserPlayerId, matchStates]
  );

  return (
    <main className="container-editorial">
      {activeSession ? (
        <section className="pt-[var(--space-8)]">
          <div className="card-editorial overflow-hidden p-[var(--space-5)] sm:p-[var(--space-6)]">
            <div className="grid gap-[var(--space-6)] lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-[var(--space-4)]">
                  <div className="min-w-0">
                    <p className="type-overline tracking-[0.16em] text-[var(--masters)]">
                      Current Session
                    </p>
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
                  <ScoreSessionStat icon={Activity} label="Live" value={sessionStats.live} />
                  <ScoreSessionStat icon={Trophy} label="Complete" value={sessionStats.completed} />
                  <ScoreSessionStat
                    icon={Users}
                    label="Your Matches"
                    value={sessionStats.userMatches}
                  />
                </div>

                {featuredMatchState ? (
                  <FeaturedMatchPanel
                    matchState={featuredMatchState}
                    teamAPlayers={getMatchPlayers(featuredMatchState.match.teamAPlayerIds)}
                    teamBPlayers={getMatchPlayers(featuredMatchState.match.teamBPlayerIds)}
                    onClick={() => onSelectMatch(featuredMatchState.match.id)}
                    isQuickContinue={featuredMatchState.match.id === quickContinueMatchId}
                  />
                ) : null}
              </div>

              <div className="rounded-[28px] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,var(--canvas)_0%,var(--surface-secondary)_100%)] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="type-overline text-[var(--ink-secondary)]">Live board</p>
                    <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                      Every match at a glance.
                    </p>
                  </div>
                  <Flag size={18} className="text-[var(--masters)]" />
                </div>

                {liveLeaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {liveLeaderboard.map((state) => (
                      <LeaderboardRow
                        key={state.match.id}
                        matchState={state}
                        teamAPlayers={getMatchPlayers(state.match.teamAPlayerIds)}
                        teamBPlayers={getMatchPlayers(state.match.teamBPlayerIds)}
                        onClick={() => onSelectMatch(state.match.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-[20px] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/72 px-4 py-5 text-sm text-[var(--ink-secondary)]">
                    Matches will appear here as soon as the session is published.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {sessions.length > 1 ? (
        <section className="pt-[var(--space-6)]">
          <div className="card-editorial p-[var(--space-4)]">
            <div className="mb-[var(--space-4)]">
              <p className="type-overline text-[var(--ink-secondary)]">Sessions</p>
              <p className="mt-2 text-sm text-[var(--ink-secondary)]">
                Switch sessions without losing your place.
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

      <section className="pb-[var(--space-8)] pt-[var(--space-6)]">
        <div className="mb-[var(--space-5)] flex items-end justify-between gap-4">
          <div>
            <p className="type-overline text-[var(--ink-secondary)]">Matches</p>
            <h2 className="mt-2 font-serif text-[length:var(--text-2xl)] font-normal tracking-[-0.02em] text-[var(--ink)]">
              Select a match to score.
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

        {userMatchStates.length > 0 ? (
          <div className="mb-[var(--space-5)] rounded-[28px] border border-[color:var(--masters)]/20 bg-[color:var(--masters)]/8 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="type-overline text-[var(--masters)]">Your card</p>
                <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                  Jump directly into the match that matters to you.
                </p>
              </div>
              <Crown size={18} className="text-[var(--masters)]" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {userMatchStates.map((state) => (
                <LeaderboardRow
                  key={state.match.id}
                  matchState={state}
                  teamAPlayers={getMatchPlayers(state.match.teamAPlayerIds)}
                  teamBPlayers={getMatchPlayers(state.match.teamBPlayerIds)}
                  onClick={() => onSelectMatch(state.match.id)}
                  emphasized
                />
              ))}
            </div>
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
                const isUserMatch =
                  !!currentUserPlayerId &&
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

function formatPlayerList(playerList: Player[]) {
  if (playerList.length === 0) return 'Lineup pending';
  return playerList
    .map((player) => formatPlayerName(player.firstName, player.lastName, 'short'))
    .join(' / ');
}

function getMatchLeaderLabel(matchState: MatchState, teamAName: string, teamBName: string) {
  if (matchState.status === 'completed') {
    if (matchState.winningTeam === 'teamA') return `${teamAName} won ${matchState.displayScore}`;
    if (matchState.winningTeam === 'teamB') return `${teamBName} won ${matchState.displayScore}`;
    return `Halved ${matchState.displayScore}`;
  }

  if (matchState.holesPlayed === 0) return 'Opening tee';
  if (matchState.currentScore > 0) return `${teamAName} leads ${matchState.displayScore}`;
  if (matchState.currentScore < 0) return `${teamBName} leads ${matchState.displayScore}`;
  return `All square thru ${matchState.holesPlayed}`;
}

function getMatchProgressLabel(matchState: MatchState) {
  if (matchState.status === 'completed') return 'Final';
  if (matchState.holesPlayed === 0) return 'Not started';
  return `Thru ${matchState.holesPlayed} · ${matchState.holesRemaining} left`;
}

function scoreTone(matchState: MatchState) {
  if (matchState.currentScore > 0) return 'text-[var(--team-usa)]';
  if (matchState.currentScore < 0) return 'text-[var(--team-europe)]';
  return 'text-[var(--ink-tertiary)]';
}

function FeaturedMatchPanel({
  matchState,
  teamAPlayers,
  teamBPlayers,
  onClick,
  isQuickContinue,
}: {
  matchState: MatchState;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  onClick: () => void;
  isQuickContinue: boolean;
}) {
  const teamALabel = formatPlayerList(teamAPlayers);
  const teamBLabel = formatPlayerList(teamBPlayers);

  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-[var(--space-5)] w-full rounded-[28px] border border-[color:var(--masters)]/20 bg-[linear-gradient(135deg,rgba(0,102,68,0.12)_0%,rgba(255,255,255,0.78)_100%)] px-[var(--space-5)] py-[var(--space-4)] text-left shadow-[0_8px_20px_rgba(0,102,68,0.08)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--masters)]/40 active:scale-[0.99]"
      aria-label={isQuickContinue ? 'Continue scoring active match' : 'Open featured match'}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="type-overline text-[var(--masters)]">
            {isQuickContinue ? 'Continue scoring' : 'Featured match'}
          </p>
          <p className="mt-2 truncate type-title-sm text-[var(--ink)]">
            {teamALabel} vs {teamBLabel}
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--ink-secondary)]">
            {getMatchLeaderLabel(matchState, 'USA', 'Europe')}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              'font-serif text-[length:var(--text-3xl)] leading-none',
              scoreTone(matchState)
            )}
          >
            {matchState.displayScore}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">
            {getMatchProgressLabel(matchState)}
          </p>
        </div>
        <ChevronRight size={18} className="mt-2 shrink-0 text-[var(--ink-tertiary)]" />
      </div>
    </button>
  );
}

function LeaderboardRow({
  matchState,
  teamAPlayers,
  teamBPlayers,
  onClick,
  emphasized = false,
}: {
  matchState: MatchState;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  onClick: () => void;
  emphasized?: boolean;
}) {
  const teamALabel = formatPlayerList(teamAPlayers);
  const teamBLabel = formatPlayerList(teamBPlayers);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-[20px] border px-3 py-3 text-left transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--masters)]/35 active:scale-[0.99]',
        emphasized
          ? 'border-[color:var(--masters)]/25 bg-[color:var(--canvas)]/90'
          : 'border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/72'
      )}
      aria-label={`Open Match ${matchState.match.matchOrder}`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
          Match {matchState.match.matchOrder}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-[var(--ink)]">{teamALabel}</p>
        <p className="mt-0.5 truncate text-sm text-[var(--ink-secondary)]">{teamBLabel}</p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            'font-serif text-[length:var(--text-xl)] leading-none',
            scoreTone(matchState)
          )}
        >
          {matchState.displayScore}
        </p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">
          {getMatchProgressLabel(matchState)}
        </p>
      </div>
    </button>
  );
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
  const teamALabel = formatPlayerList(teamAPlayers);
  const teamBLabel = formatPlayerList(teamBPlayers);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open Match ${matchNumber}${isUserMatch ? ' (Your Match)' : ''}`}
      className={cn(
        'card-editorial card-interactive relative w-full overflow-hidden text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--masters)]/35',
        isActive ? 'p-[var(--space-6)]' : 'p-[var(--space-5)]',
        isUserMatch && 'border-2 border-[var(--masters)]',
        !isUserMatch && 'border border-[color:var(--rule)]/75'
      )}
    >
      {isUserMatch ? (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--masters)] px-3 py-[3px] text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-[var(--canvas)]">
          Your Match
        </div>
      ) : null}

      <div className="mb-[var(--space-4)] flex items-center justify-between border-b border-[var(--rule-faint)] pb-[var(--space-3)]">
        <div>
          <span
            className={cn(
              'type-overline',
              isUserMatch ? 'text-[var(--masters)]' : 'text-[var(--ink-tertiary)]'
            )}
          >
            Match {matchNumber}
          </span>
          <p className="mt-2 text-sm font-medium text-[var(--ink-secondary)]">
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
              {teamALabel}
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
              {teamBLabel}
            </span>
            {currentScore < 0 ? (
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--team-europe)]">
                UP
              </span>
            ) : null}
          </div>
        </div>

        <div className="min-w-[92px] rounded-[22px] border border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/78 px-3 py-3 text-right">
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
            <p className="mt-1 text-sm font-semibold text-[var(--ink-secondary)]">
              thru {holesPlayed}
            </p>
          ) : null}
          {status === 'scheduled' && holesPlayed === 0 ? (
            <p className="text-sm font-medium text-[var(--ink-secondary)]">Not started</p>
          ) : null}
        </div>

        <ChevronRight size={18} strokeWidth={1.5} className="shrink-0 text-[var(--ink-tertiary)]" />
      </div>
    </button>
  );
});

function ScoreSessionStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[20px] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/72 px-3 py-3 text-center">
      <Icon size={15} className="mx-auto text-[var(--masters)]" />
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {label}
      </p>
      <p className="mt-1 font-serif text-[length:var(--text-xl)] text-[var(--ink)]">{value}</p>
    </div>
  );
}

function SessionStatusPill({
  status,
}: {
  status: 'scheduled' | 'inProgress' | 'paused' | 'completed';
}) {
  const label =
    status === 'inProgress'
      ? 'Live'
      : status === 'paused'
        ? 'Paused'
        : status === 'completed'
          ? 'Final'
          : 'Scheduled';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
        status === 'inProgress'
          ? 'bg-[color:var(--masters)]/12 text-[var(--masters)]'
          : status === 'paused'
            ? 'bg-[color:var(--ink)]/8 text-[var(--ink-secondary)]'
            : status === 'completed'
              ? 'bg-[color:var(--ink)]/8 text-[var(--ink-secondary)]'
              : 'bg-[color:var(--gold)]/15 text-[var(--gold)]'
      )}
    >
      {label}
    </span>
  );
}
