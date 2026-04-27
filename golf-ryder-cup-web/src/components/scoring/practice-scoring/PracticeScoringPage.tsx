'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Flag,
  ListChecks,
  Medal,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react';

import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import { upsertPracticeScore } from '@/lib/services/practiceScoreService';
import { useToastStore, useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Match, Player, PracticeScore, TeeSet } from '@/lib/types/models';
import { cn, formatPlayerName } from '@/lib/utils';
import {
  LeaderboardRankPill,
  ScoreStatCell,
  ScoreToParValue,
  formatScoreToPar,
  scoreToParToneClass,
} from '../scoreDisplayPrimitives';
import {
  allocateStrokes,
  computePracticeLeaderboard,
  type LeaderboardRow,
} from './practiceLeaderboard';
import {
  ballsCountedForHole,
  computeSessionPracticeLeaderboard,
  getGroupScoreToPar,
} from './sessionLeaderboard';

interface PracticeScoringPageProps {
  matchId: string;
}

/**
 * Per-player stroke entry for a practice group. Replaces the
 * PracticeMatchEmptyState that shipped in P0 — now the captain can
 * actually record scores hole-by-hole and see a live gross/net
 * leaderboard for the group.
 *
 * Intentionally separate from MatchScoringPageClient (which is
 * team-vs-team match play). Keeping them split avoids cramming two
 * very different scoring models into a single component.
 */
export function PracticeScoringPage({ matchId }: PracticeScoringPageProps) {
  const router = useRouter();
  const { currentTrip, players } = useTripStore(
    useShallow((s) => ({ currentTrip: s.currentTrip, players: s.players }))
  );
  const { showToast } = useToastStore(useShallow((s) => ({ showToast: s.showToast })));

  const match = useLiveQuery(
    () => db.matches.get(matchId),
    [matchId],
    null as Match | null | undefined
  );
  const scores = useLiveQuery(
    () => db.practiceScores.where('matchId').equals(matchId).toArray(),
    [matchId],
    [] as PracticeScore[]
  );
  const teeSet = useLiveQuery(
    async () => (match?.teeSetId ? ((await db.teeSets.get(match.teeSetId)) ?? null) : null),
    [match?.teeSetId],
    null as TeeSet | null
  );
  const session = useLiveQuery(
    async () => (match?.sessionId ? ((await db.sessions.get(match.sessionId)) ?? null) : null),
    [match?.sessionId],
    null
  );
  const sessionMatches = useLiveQuery(
    async () => {
      if (!match?.sessionId) return [] as Match[];
      return db.matches.where('sessionId').equals(match.sessionId).toArray();
    },
    [match?.sessionId],
    [] as Match[]
  );
  const sessionMatchIds = useMemo(
    () =>
      (sessionMatches ?? [])
        .filter((sessionMatch) => sessionMatch.mode === 'practice')
        .map((sessionMatch) => sessionMatch.id)
        .sort(),
    [sessionMatches]
  );
  const sessionScores = useLiveQuery(
    async () => {
      if (sessionMatchIds.length === 0) return [] as PracticeScore[];
      return db.practiceScores.where('matchId').anyOf(sessionMatchIds).toArray();
    },
    [sessionMatchIds.join(',')],
    [] as PracticeScore[]
  );

  const [currentHole, setCurrentHole] = useState(1);

  // When the underlying match loads, jump to the first hole without
  // a full set of scores entered so the captain lands where they
  // left off rather than always at hole 1.
  useEffect(() => {
    if (!match || scores.length === 0) return;
    let nextHole: number | null = null;
    for (let hole = 1; hole <= 18; hole += 1) {
      const entered = scores.filter((s) => s.holeNumber === hole);
      if (entered.length < match.teamAPlayerIds.length + match.teamBPlayerIds.length) {
        nextHole = hole;
        break;
      }
    }

    if (nextHole === null) return;
    const updateTimer = window.setTimeout(() => {
      setCurrentHole(nextHole);
    }, 0);

    return () => {
      window.clearTimeout(updateTimer);
    };
  }, [match, scores]);

  const groupPlayers = useMemo<Player[]>(() => {
    if (!match) return [];
    const ids = [...match.teamAPlayerIds, ...match.teamBPlayerIds];
    const byId = new Map(players.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is Player => Boolean(p));
  }, [match, players]);

  const scoresByHolePlayer = useMemo(() => {
    const map = new Map<string, PracticeScore>();
    for (const score of scores) {
      map.set(`${score.holeNumber}:${score.playerId}`, score);
    }
    return map;
  }, [scores]);

  const leaderboard = useMemo<LeaderboardRow[]>(
    () => computePracticeLeaderboard(groupPlayers, scores, teeSet ?? null),
    [groupPlayers, scores, teeSet]
  );

  const sessionLeaderboard = useMemo(() => {
    if (!session) return null;
    return computeSessionPracticeLeaderboard({
      session,
      matches: sessionMatches ?? [],
      scores: sessionScores ?? [],
      players,
      teeSet: teeSet ?? null,
    });
  }, [players, session, sessionMatches, sessionScores, teeSet]);

  const activeGroup = useMemo(
    () => sessionLeaderboard?.groups.find((group) => group.matchId === match?.id),
    [match?.id, sessionLeaderboard]
  );
  const activeGroupRank = useMemo(() => {
    if (!sessionLeaderboard || !activeGroup) return undefined;
    const index = sessionLeaderboard.groups.findIndex(
      (group) => group.matchId === activeGroup.matchId
    );
    return index >= 0 && activeGroup.holesPlayed > 0 ? index + 1 : undefined;
  }, [activeGroup, sessionLeaderboard]);
  const activeHoleResult = activeGroup?.holes[currentHole - 1];

  const currentHoleScores = useMemo(
    () => groupPlayers.map((player) => scoresByHolePlayer.get(`${currentHole}:${player.id}`)),
    [currentHole, groupPlayers, scoresByHolePlayer]
  );

  const enteredOnCurrentHole = currentHoleScores.filter(
    (score) => typeof score?.gross === 'number'
  ).length;
  const currentHoleComplete =
    groupPlayers.length > 0 && enteredOnCurrentHole === groupPlayers.length;
  const currentHoleProgress =
    groupPlayers.length > 0 ? Math.round((enteredOnCurrentHole / groupPlayers.length) * 100) : 0;

  const completedHoleCount = useMemo(() => {
    if (groupPlayers.length === 0) return 0;
    return Array.from({ length: 18 }, (_, index) => index + 1).filter((hole) => {
      const entered = groupPlayers.filter((player) => {
        const score = scoresByHolePlayer.get(`${hole}:${player.id}`);
        return typeof score?.gross === 'number';
      }).length;
      return entered === groupPlayers.length;
    }).length;
  }, [groupPlayers, scoresByHolePlayer]);

  const holePar = teeSet?.holePars?.[currentHole - 1] ?? (teeSet ? Math.round(teeSet.par / 18) : 4);
  const holeYardage = teeSet?.yardages?.[currentHole - 1];
  const holeStrokeIndex = teeSet?.holeHandicaps?.[currentHole - 1];
  const ballsRequired =
    activeHoleResult?.ballsCounted ?? ballsCountedForHole(session?.sessionType, currentHole);
  const groupParTarget = holePar * ballsRequired;
  const currentGroupNet = activeHoleResult?.groupNet;
  const currentGroupGross = activeHoleResult?.groupGross;
  const currentGroupVsPar =
    typeof currentGroupNet === 'number' ? currentGroupNet - groupParTarget : undefined;
  const groupTotalVsPar = activeGroup ? getGroupScoreToPar(activeGroup) : undefined;
  const countedContributions =
    activeHoleResult?.contributions.filter((contribution) => contribution.counted) ?? [];
  const waitingForCountedBalls = Math.max(ballsRequired - countedContributions.length, 0);
  const practiceSideByPlayerId = useMemo(() => {
    const map = new Map<string, 'teamA' | 'teamB'>();
    if (!match) return map;
    for (const playerId of match.teamAPlayerIds) map.set(playerId, 'teamA');
    for (const playerId of match.teamBPlayerIds) map.set(playerId, 'teamB');
    return map;
  }, [match]);
  const hasPracticeSides = Boolean(match?.teamBPlayerIds.length);

  const playerSnapshots = useMemo(
    () =>
      groupPlayers.map((player) => {
        const entry = scoresByHolePlayer.get(`${currentHole}:${player.id}`);
        const contribution = activeHoleResult?.contributions.find(
          (item) => item.playerId === player.id
        );
        const gross = entry?.gross;
        const courseHandicap =
          teeSet && player.handicapIndex !== undefined
            ? Math.round((player.handicapIndex * (teeSet.slope || 113)) / 113)
            : null;
        const strokesReceived =
          teeSet && courseHandicap !== null
            ? (allocateStrokes(courseHandicap, teeSet.holeHandicaps || [])[currentHole - 1] ?? 0)
            : 0;
        const net = typeof gross === 'number' ? gross - strokesReceived : undefined;
        const toPar = typeof net === 'number' ? net - holePar : undefined;
        const leaderboardRow = leaderboard.find((row) => row.player.id === player.id);
        const leaderboardIndex = leaderboard.findIndex((row) => row.player.id === player.id);
        const rank =
          leaderboardRow && leaderboardRow.holesPlayed > 0 && leaderboardIndex >= 0
            ? leaderboardIndex + 1
            : undefined;

        return {
          player,
          gross,
          net,
          toPar,
          rank,
          strokesReceived,
          courseHandicap,
          leaderboardRow,
          counted: Boolean(contribution?.counted),
          practiceSide: practiceSideByPlayerId.get(player.id),
        };
      }),
    [
      activeHoleResult?.contributions,
      currentHole,
      groupPlayers,
      holePar,
      leaderboard,
      practiceSideByPlayerId,
      scoresByHolePlayer,
      teeSet,
    ]
  );

  const handleSetScore = useCallback(
    async (playerId: string, gross: number | undefined) => {
      if (!match || !currentTrip) return;
      try {
        await upsertPracticeScore({
          matchId: match.id,
          playerId,
          holeNumber: currentHole,
          gross,
          tripId: currentTrip.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save score';
        showToast('error', message);
      }
    },
    [currentHole, currentTrip, match, showToast]
  );

  if (!match) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader title="Loading…" onBack={() => router.push('/score')} />
        <main className="container-editorial py-10" />
      </div>
    );
  }

  if (match.mode !== 'practice') {
    // Someone navigated here for a non-practice match. Bounce back to
    // the main scoring page rather than rendering a UI for the wrong
    // model.
    router.replace(`/score/${match.id}`);
    return null;
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title={`Practice · Group ${match.matchOrder}`}
        subtitle={match.teeTime ? `Tee time ${match.teeTime}` : undefined}
        onBack={() => router.push('/score')}
      />

      <main className="container-editorial space-y-[var(--space-4)] py-[var(--space-4)]">
        <section className="overflow-hidden rounded-[1.5rem] border border-[color:var(--rule)] bg-[var(--canvas-raised)] shadow-[0_14px_44px_rgba(26,24,21,0.07)]">
          <div className="h-1 bg-[linear-gradient(90deg,var(--masters)_0%,var(--gold)_46%,var(--masters-deep)_100%)]" />
          <div className="space-y-4 p-4 lg:p-5">
            <div className="flex flex-wrap items-center gap-[var(--space-2)]">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--masters-subtle)] px-[var(--space-3)] py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--masters)] ring-1 ring-[color:var(--masters)]/18">
                <CircleDot size={13} />
                Format scoring
              </span>
              <span className="rounded-full bg-[var(--surface)] px-[var(--space-3)] py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-secondary)] ring-1 ring-[color:var(--rule)]">
                Group {match.matchOrder}
              </span>
              <span className="rounded-full bg-[var(--canvas)] px-[var(--space-3)] py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-secondary)] ring-1 ring-[color:var(--rule)]">
                {hasPracticeSides ? 'Two practice sides' : 'Tee-time team'}
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
              <div className="min-w-0">
                <p className="type-overline text-[var(--ink-tertiary)]">
                  {sessionLeaderboard?.formatName ?? 'Practice format'}
                </p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="flex items-end gap-3">
                      <span className="font-serif text-[4.25rem] italic leading-[0.78] text-[var(--masters)] sm:text-[5.1rem]">
                        {currentHole}
                      </span>
                      <div className="pb-1">
                        <p className="text-[1.35rem] font-semibold leading-none text-[var(--ink)] sm:text-[1.55rem]">
                          Count best {ballsRequired} net {ballsRequired === 1 ? 'ball' : 'balls'}
                        </p>
                        <p className="mt-1.5 text-[0.82rem] font-semibold text-[var(--ink-secondary)]">
                          Hole {currentHole} · Par {holePar}
                          {holeYardage ? ` · ${holeYardage} yards` : ''}
                          {holeStrokeIndex ? ` · Stroke index ${holeStrokeIndex}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-[13rem] rounded-[1rem] border border-[color:var(--masters)]/20 bg-[var(--masters-subtle)] p-3">
                    <div className="flex items-center justify-between text-[0.82rem] font-semibold text-[var(--masters-deep)]">
                      <span>Hole entered</span>
                      <span>
                        {enteredOnCurrentHole}/{groupPlayers.length || 0}
                      </span>
                    </div>
                    <div className="mt-[var(--space-2)] h-2 overflow-hidden rounded-full bg-[color:var(--masters)]/14">
                      <div
                        className="h-full rounded-full bg-[var(--masters)] transition-[width] duration-300"
                        style={{ width: `${currentHoleProgress}%` }}
                      />
                    </div>
                    <p className="mt-2 truncate text-[11px] font-medium text-[var(--ink-secondary)]">
                      {currentHoleComplete
                        ? 'Complete'
                        : `${Math.max(groupPlayers.length - enteredOnCurrentHole, 0)} scores left on this hole.`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <HeroMetric
                    icon={<ListChecks size={16} />}
                    label="This hole"
                    value={currentGroupNet !== undefined ? `${currentGroupNet}` : '—'}
                    note={`Target ${groupParTarget}`}
                  />
                  <HeroMetric
                    icon={<Medal size={16} />}
                    label="Vs format par"
                    value={formatScoreToPar(currentGroupVsPar)}
                    note="Current hole"
                  />
                  <HeroMetric
                    icon={<Flag size={16} />}
                    label="Complete"
                    value={`${completedHoleCount}/18`}
                    note="Full group holes"
                  />
                  <HeroMetric
                    icon={<Sparkles size={16} />}
                    label="Session rank"
                    value={activeGroupRank ? `#${activeGroupRank}` : '—'}
                    note={
                      groupTotalVsPar !== undefined
                        ? `${formatScoreToPar(groupTotalVsPar)} format par`
                        : match.teeTime || 'Awaiting scores'
                    }
                  />
                </div>
              </div>

              <div className="rounded-[1.15rem] border border-[color:var(--gold)]/40 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--gold)_10%,var(--canvas-raised))_0%,var(--canvas-raised)_64%,var(--masters-subtle)_100%)] p-3.5 shadow-[0_12px_30px_rgba(26,24,21,0.06)]">
                <div className="flex items-start justify-between gap-[var(--space-3)]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gold-dark)]">
                      Counting now
                    </p>
                    <h2 className="mt-1 text-[1.12rem] font-semibold leading-tight text-[var(--ink)]">
                      {currentGroupNet !== undefined
                        ? `${currentGroupNet} net on this hole`
                        : `Need ${waitingForCountedBalls} more ${waitingForCountedBalls === 1 ? 'ball' : 'balls'}`}
                    </h2>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--masters-deep)] shadow-[0_8px_20px_rgba(26,24,21,0.12)]">
                    <CheckCircle2 size={19} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <LiveLeaderMetric
                    label="Group gross"
                    value={currentGroupGross !== undefined ? currentGroupGross : '—'}
                  />
                  <LiveLeaderMetric
                    label="Group net"
                    value={currentGroupNet !== undefined ? currentGroupNet : '—'}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {activeHoleResult && activeHoleResult.contributions.length > 0 ? (
                    activeHoleResult.contributions
                      .slice()
                      .sort((a, b) => Number(b.counted) - Number(a.counted))
                      .map((contribution) => (
                        <div
                          key={contribution.playerId}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-xl border px-3 py-2',
                            contribution.counted
                              ? 'border-[color:var(--gold)]/55 bg-[color:var(--gold)]/10'
                              : 'border-[color:var(--rule)] bg-[var(--canvas-raised)]'
                          )}
                        >
                          <span className="truncate text-sm font-semibold text-[var(--ink)]">
                            {contribution.playerName}
                          </span>
                          <span className="text-[1rem] font-semibold tabular-nums text-[var(--masters)]">
                            {contribution.net !== undefined ? contribution.net : '—'}
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="rounded-xl border border-[color:var(--rule)] bg-[var(--canvas-raised)] px-3 py-3 text-sm text-[var(--ink-secondary)]">
                      Awaiting gross scores.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-raised)] p-[var(--space-3)] shadow-[0_18px_55px_rgba(0,0,0,0.08)] sm:p-[var(--space-4)]">
          <div className="flex items-center justify-between gap-[var(--space-3)]">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setCurrentHole((h) => Math.max(1, h - 1))}
              disabled={currentHole === 1}
              aria-label="Previous hole"
            >
              <ArrowLeft size={16} />
            </Button>

            <div className="min-w-0 flex-1 overflow-x-auto px-[var(--space-1)]">
              <div className="grid min-w-[680px] grid-cols-[repeat(18,minmax(0,1fr))] gap-1">
                {Array.from({ length: 18 }, (_, index) => {
                  const hole = index + 1;
                  const entered = groupPlayers.filter((player) => {
                    const score = scoresByHolePlayer.get(`${hole}:${player.id}`);
                    return typeof score?.gross === 'number';
                  }).length;
                  const isActive = hole === currentHole;
                  const isComplete = groupPlayers.length > 0 && entered === groupPlayers.length;
                  const isPartial = entered > 0 && !isComplete;

                  return (
                    <button
                      key={hole}
                      type="button"
                      onClick={() => setCurrentHole(hole)}
                      className={cn(
                        'group flex h-12 min-w-9 flex-col items-center justify-center rounded-xl border text-center transition duration-200',
                        isActive
                          ? 'border-[var(--masters)] bg-[var(--masters)] text-white shadow-[0_10px_24px_rgba(0,77,64,0.24)]'
                          : 'border-[var(--rule)] bg-[var(--canvas)] text-[var(--ink-secondary)] hover:border-[var(--gold)] hover:bg-[var(--surface)]',
                        isComplete &&
                          !isActive &&
                          'border-[color:var(--masters)]/35 bg-[color:var(--masters)]/8',
                        isPartial &&
                          !isActive &&
                          'border-[color:var(--gold)]/45 bg-[color:var(--gold)]/10'
                      )}
                      aria-label={`Go to hole ${hole}`}
                    >
                      <span className="text-[0.72rem] font-semibold leading-none">{hole}</span>
                      <span
                        className={cn(
                          'mt-1 h-1.5 w-1.5 rounded-full',
                          isComplete
                            ? isActive
                              ? 'bg-white'
                              : 'bg-[var(--masters)]'
                            : isPartial
                              ? 'bg-[var(--gold)]'
                              : 'bg-[var(--ink-faint)]'
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="secondary"
              size="icon"
              onClick={() => setCurrentHole((h) => Math.min(18, h + 1))}
              disabled={currentHole === 18}
              aria-label="Next hole"
            >
              <ArrowRight size={16} />
            </Button>
          </div>
        </section>

        <section className="grid gap-[var(--space-4)] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-[1.35rem] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-raised)] p-3 shadow-[0_14px_38px_rgba(0,0,0,0.06)] sm:p-4">
            <div className="flex flex-col gap-[var(--space-2)] sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                  Score hole {currentHole}
                </p>
                <h2 className="mt-1 text-[1.2rem] font-semibold leading-tight text-[var(--ink)]">
                  Enter gross scores
                </h2>
              </div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">
                Best {ballsRequired} net {ballsRequired === 1 ? 'ball' : 'balls'}
              </p>
            </div>

            <div className="mt-3 grid gap-2.5">
              {groupPlayers.length === 0 ? (
                <p className="type-body-sm text-[var(--ink-tertiary)]">No players in this group.</p>
              ) : (
                playerSnapshots.map((snapshot) => {
                  const { player, gross } = snapshot;
                  return (
                    <PlayerScorePanel
                      key={player.id}
                      snapshot={snapshot}
                      holePar={holePar}
                      hasPracticeSides={hasPracticeSides}
                      value={gross}
                      onChange={(next) => handleSetScore(player.id, next)}
                    />
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-raised)] p-3 shadow-[0_14px_38px_rgba(0,0,0,0.06)] sm:p-4">
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                Live net board
              </p>
              <h2 className="mt-1 text-[1.2rem] font-semibold leading-tight text-[var(--ink)]">
                Tee-time teams
              </h2>
            </div>

            <div className="mt-3 space-y-2">
              {!sessionLeaderboard || sessionLeaderboard.groups.length === 0 ? (
                <p className="type-body-sm text-[var(--ink-tertiary)]">
                  No practice groups yet. Publish tee times and the board will build.
                </p>
              ) : (
                sessionLeaderboard.groups.map((group, index) => {
                  const isCurrentGroup = group.matchId === match.id;
                  const toPar = getGroupScoreToPar(group);
                  const rank = group.holesPlayed > 0 ? index + 1 : undefined;
                  const isLeader = index === 0 && group.holesPlayed > 0;
                  const playerLine = group.players
                    .map((player) => formatPlayerName(player.firstName, player.lastName, 'short'))
                    .join(', ');

                  return (
                    <div
                      key={group.matchId}
                      className={cn(
                        'rounded-[1rem] border px-3 py-2.5 transition-colors duration-200',
                        isCurrentGroup
                          ? 'border-[color:var(--masters)]/40 bg-[var(--masters-subtle)]'
                          : isLeader
                            ? 'border-[color:var(--gold)]/55 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--gold)_10%,var(--canvas))_0%,var(--canvas)_72%)]'
                            : 'border-[var(--rule)] bg-[var(--canvas)]'
                      )}
                    >
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5">
                        <LeaderboardRankPill
                          rank={rank}
                          leader={isLeader}
                          active={isCurrentGroup}
                        />
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-[0.92rem] font-semibold leading-tight text-[var(--ink)]">
                              Group {group.groupNumber}
                            </p>
                            {isLeader ? (
                              <span className="shrink-0 rounded-full border border-[color:var(--gold)]/55 bg-[color:var(--gold)]/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-[var(--masters-deep)]">
                                Leader
                              </span>
                            ) : null}
                            {isCurrentGroup ? (
                              <span className="shrink-0 rounded-full border border-[color:var(--masters)]/30 bg-[var(--canvas-raised)] px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-[var(--masters)]">
                                Now
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-[0.72rem] font-medium text-[var(--ink-tertiary)]">
                            {playerLine || 'No players'}
                          </p>
                        </div>
                        <ScoreToParValue
                          value={group.holesPlayed > 0 ? toPar : undefined}
                          label="To par"
                          size="md"
                        />
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <ScoreStatCell label="Thru" value={group.holesPlayed || '—'} muted />
                        <ScoreStatCell
                          label="Format net"
                          value={group.netTotal !== undefined ? group.netTotal : '—'}
                          muted
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-raised)] p-[var(--space-5)]">
          <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Side bets</p>
          <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
            Attach a skins, CTP, long drive, or nassau bet to this group to track payouts alongside
            the leaderboard.
          </p>
          <Button
            variant="primary"
            className="mt-[var(--space-4)]"
            onClick={() => router.push(`/bets?matchId=${encodeURIComponent(match.id)}`)}
          >
            New bet on this group
          </Button>
        </section>
      </main>
    </div>
  );
}

interface PlayerScoreSnapshot {
  player: Player;
  gross: number | undefined;
  net: number | undefined;
  toPar: number | undefined;
  rank: number | undefined;
  strokesReceived: number;
  courseHandicap: number | null;
  leaderboardRow: LeaderboardRow | undefined;
  counted: boolean;
  practiceSide: 'teamA' | 'teamB' | undefined;
}

interface PlayerScorePanelProps {
  snapshot: PlayerScoreSnapshot;
  holePar: number;
  hasPracticeSides: boolean;
  value: number | undefined;
  onChange: (next: number | undefined) => void;
}

function PlayerScorePanel({
  snapshot,
  holePar,
  hasPracticeSides,
  value,
  onChange,
}: PlayerScorePanelProps) {
  const {
    player,
    gross,
    net,
    toPar,
    rank,
    strokesReceived,
    courseHandicap,
    leaderboardRow,
    counted,
    practiceSide,
  } = snapshot;
  const options = getScoreOptions(holePar);
  const playerName = formatPlayerName(player.firstName, player.lastName);
  const hasScore = gross !== undefined;
  const isLeader = rank === 1 && Boolean(leaderboardRow?.holesPlayed);
  const handicapLabel = courseHandicap ?? player.handicapIndex ?? '—';
  const thruLabel = leaderboardRow?.holesPlayed ? `Thru ${leaderboardRow.holesPlayed}` : 'Thru —';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[1.1rem] border bg-[var(--canvas)] transition-colors duration-200',
        isLeader
          ? 'border-[color:var(--gold)]/55 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--gold)_10%,var(--canvas))_0%,var(--canvas)_58%)]'
          : hasScore
            ? 'border-[color:var(--masters)]/28'
            : 'border-[var(--rule)]'
      )}
    >
      <div className="p-3">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5">
          <LeaderboardRankPill rank={rank} leader={isLeader} />

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-[0.98rem] font-semibold leading-tight text-[var(--ink)]">
                {playerName}
              </h3>
              {isLeader ? (
                <span className="shrink-0 rounded-full border border-[color:var(--gold)]/55 bg-[color:var(--gold)]/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-[var(--masters-deep)]">
                  Leader
                </span>
              ) : null}
            </div>

            <p className="mt-1 truncate text-[0.72rem] font-medium text-[var(--ink-tertiary)]">
              {thruLabel} · HCP {handicapLabel}
              {strokesReceived > 0
                ? ` · ${strokesReceived} stroke${strokesReceived === 1 ? '' : 's'}`
                : ''}
              {hasPracticeSides && practiceSide
                ? ` · ${practiceSide === 'teamA' ? 'Side A' : 'Side B'}`
                : ''}
            </p>
          </div>

          <ScoreToParValue value={toPar} label="Hole" size="md" />
        </div>

        <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-stretch gap-2">
          <ScoreStatCell
            label="Gross"
            value={gross ?? '—'}
            tone={scoreToParToneClass(toPar)}
            className={cn(
              'border-[color:var(--masters)]/20 bg-[var(--canvas-raised)]',
              !hasScore && 'border-dashed'
            )}
          />
          <ScoreStatCell
            label="Net"
            value={net ?? '—'}
            tone={scoreToParToneClass(toPar)}
            className="bg-[color:var(--surface)]/72"
          />
          <StrokeStepper value={value} onChange={onChange} />
        </div>

        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {options.map((option) => {
            const selected = value === option.value;
            return (
              <button
                key={`${option.label}-${option.value}`}
                type="button"
                onClick={() => onChange(option.value)}
                aria-label={`Set ${playerName} to ${option.label.toLowerCase()} ${option.value}`}
                className={cn(
                  'min-h-11 rounded-lg border px-2 py-1.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.99]',
                  selected
                    ? 'border-[var(--masters)] bg-[var(--masters)] text-white'
                    : 'border-[var(--rule)] bg-[color:var(--canvas-raised)]/76 text-[var(--ink)] hover:border-[var(--gold)]'
                )}
                aria-pressed={selected}
              >
                <span className="block text-[0.82rem] font-semibold leading-none tabular-nums">
                  {option.value}
                </span>
                <span
                  className={cn(
                    'mt-1 block truncate text-[0.62rem]',
                    selected ? 'text-white/78' : option.tone
                  )}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-[color:var(--rule)]/70 pt-2">
          <div className="grid min-w-0 grid-cols-2 gap-1.5">
            <ScoreStatCell
              label="Total gross"
              value={leaderboardRow?.grossTotal || '—'}
              muted
              className="px-0 py-0"
            />
            <ScoreStatCell
              label="Total net"
              value={leaderboardRow?.netTotal !== null ? (leaderboardRow?.netTotal ?? '—') : '—'}
              muted
              className="px-0 py-0"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {counted ? (
              <span className="rounded-full border border-[color:var(--gold)]/45 bg-[color:var(--gold)]/12 px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-[var(--masters-deep)]">
                Counts
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroMetric({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--rule)] bg-[var(--canvas)] px-3 py-2.5">
      <div className="flex items-center gap-2 text-[var(--ink-tertiary)]">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-1 truncate text-[1.25rem] font-semibold leading-none tabular-nums text-[var(--ink)]">
        {value}
      </p>
      {note ? <p className="mt-1 type-micro text-[var(--ink-tertiary)]">{note}</p> : null}
    </div>
  );
}

function LiveLeaderMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[color:var(--rule)] bg-[var(--canvas-raised)] px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">
        {label}
      </p>
      <p className="mt-1 text-[1.35rem] font-semibold leading-none tabular-nums text-[var(--ink)]">
        {value}
      </p>
    </div>
  );
}

interface StrokeStepperProps {
  value: number | undefined;
  onChange: (next: number | undefined) => void;
}

function StrokeStepper({ value, onChange }: StrokeStepperProps) {
  const handleDec = () => {
    if (value === undefined) return;
    if (value <= 1) {
      onChange(undefined);
      return;
    }
    onChange(value - 1);
  };
  const handleInc = () => {
    if (value === undefined) {
      onChange(3);
      return;
    }
    if (value >= 20) return;
    onChange(value + 1);
  };

  return (
    <div className="grid min-h-11 grid-cols-[2.75rem_2.5rem_2.75rem] overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--canvas-raised)]">
      <button
        type="button"
        onClick={handleDec}
        disabled={value === undefined}
        aria-label="Decrease strokes"
        className="flex min-h-11 items-center justify-center border-r border-[var(--rule)] text-[var(--ink-secondary)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)] disabled:pointer-events-none disabled:text-[var(--ink-faint)]"
      >
        <Minus size={14} />
      </button>
      <span
        className={cn(
          'flex min-h-11 items-center justify-center text-center text-[1.15rem] font-semibold tabular-nums',
          value === undefined ? 'text-[var(--ink-tertiary)]' : 'text-[var(--ink)]'
        )}
      >
        {value ?? '—'}
      </span>
      <button
        type="button"
        onClick={handleInc}
        disabled={value !== undefined && value >= 20}
        aria-label="Increase strokes"
        className="flex min-h-11 items-center justify-center border-l border-[var(--rule)] text-[var(--ink-secondary)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)] disabled:pointer-events-none disabled:text-[var(--ink-faint)]"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function getScoreOptions(par: number) {
  return [
    { label: 'Birdie', value: Math.max(1, par - 1), tone: 'text-[var(--success)]' },
    { label: 'Par', value: par, tone: 'text-[var(--ink-tertiary)]' },
    { label: 'Bogey', value: par + 1, tone: 'text-[var(--warning)]' },
    { label: 'Double', value: par + 2, tone: 'text-[var(--error)]' },
  ].filter(
    (option, index, options) => options.findIndex((o) => o.value === option.value) === index
  );
}

export default PracticeScoringPage;
