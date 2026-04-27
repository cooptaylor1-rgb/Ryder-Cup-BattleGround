'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/lib/db';
import { useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Match, PracticeScore, RyderCupSession, TeeSet } from '@/lib/types/models';
import { cn, formatPlayerName } from '@/lib/utils';
import { LeaderboardRankPill, ScoreStatCell, ScoreToParValue } from '../scoreDisplayPrimitives';

import { computeSessionPracticeLeaderboard, getGroupScoreToPar } from './sessionLeaderboard';

interface SessionLeaderboardCardProps {
  session: RyderCupSession;
  /** Matches for this session (already loaded upstream). */
  matches: Match[];
}

/**
 * Session-wide practice leaderboard: rolls every group in the
 * session up into one ranked board under the session's format.
 * Supports 1-2-3 progressive, scramble, best-ball; unknown formats
 * fall through to a single-best-ball default so the board always
 * renders something useful rather than blank.
 *
 * Intentionally live against Dexie via useLiveQuery — scores entered
 * on any group's PracticeScoringPage re-render this board without
 * any explicit refresh wiring.
 */
export function SessionLeaderboardCard({ session, matches }: SessionLeaderboardCardProps) {
  const { players } = useTripStore(useShallow((s) => ({ players: s.players })));

  const matchIds = useMemo(() => matches.map((m) => m.id), [matches]);

  const scores = useLiveQuery(
    async () => {
      if (matchIds.length === 0) return [] as PracticeScore[];
      return db.practiceScores.where('matchId').anyOf(matchIds).toArray();
    },
    [matchIds.join(',')],
    [] as PracticeScore[]
  );

  const teeSet = useLiveQuery(
    async () => {
      if (!session.defaultTeeSetId) return null;
      return (await db.teeSets.get(session.defaultTeeSetId)) ?? null;
    },
    [session.defaultTeeSetId],
    null as TeeSet | null
  );

  const leaderboard = useMemo(
    () =>
      computeSessionPracticeLeaderboard({
        session,
        matches,
        scores: scores ?? [],
        players,
        teeSet: teeSet ?? null,
      }),
    [session, matches, scores, players, teeSet]
  );

  if (leaderboard.groups.length === 0) {
    return (
      <section className="rounded-[1.35rem] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-raised)] p-4">
        <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
          Session leaderboard
        </p>
        <p className="mt-2 text-sm text-[var(--ink-secondary)]">Awaiting practice groups.</p>
      </section>
    );
  }

  const anyScored = leaderboard.groups.some((g) => g.holesPlayed > 0);

  return (
    <section className="rounded-[1.35rem] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-raised)] p-4 shadow-[0_14px_38px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-[var(--space-3)]">
        <div>
          <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
            Live net board · {leaderboard.formatName}
          </p>
          <h2 className="mt-1 text-[1.2rem] font-semibold leading-tight text-[var(--ink)]">
            {session.name} · all groups
          </h2>
        </div>
        {leaderboard.formatSupported ? null : (
          <span className="rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-2)] py-[5px] type-micro font-semibold text-[var(--ink-tertiary)]">
            Default scoring
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-[var(--ink-secondary)]">
        {anyScored ? 'Net total · gross tiebreak' : 'Awaiting scores'}
      </p>

      <div className="mt-3 space-y-2">
        {leaderboard.groups.map((group, index) => {
          const rank = anyScored && group.holesPlayed > 0 ? index + 1 : undefined;
          const isLeader = index === 0 && group.holesPlayed > 0;
          const toPar = getGroupScoreToPar(group);
          const captainLine = group.players
            .map((p) => formatPlayerName(p.firstName, p.lastName, 'short'))
            .join(', ');

          return (
            <div
              key={group.matchId}
              className={cn(
                'rounded-[1rem] border px-3 py-2.5 transition-colors duration-200',
                isLeader
                  ? 'border-[color:var(--gold)]/55 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--gold)_10%,var(--canvas))_0%,var(--canvas)_72%)]'
                  : 'border-[var(--rule)] bg-[var(--canvas)]'
              )}
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5">
                <LeaderboardRankPill rank={rank} leader={isLeader} />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-[0.95rem] font-semibold leading-tight text-[var(--ink)]">
                      Group {group.groupNumber}
                    </p>
                    {isLeader ? (
                      <span className="shrink-0 rounded-full border border-[color:var(--gold)]/55 bg-[color:var(--gold)]/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-[var(--masters-deep)]">
                        Leader
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-[0.72rem] font-medium text-[var(--ink-tertiary)]">
                    {captainLine || 'No players yet'}
                  </p>
                </div>
                <ScoreToParValue
                  value={group.holesPlayed > 0 ? toPar : undefined}
                  label="To par"
                  size="md"
                />
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <ScoreStatCell label="Thru" value={group.holesPlayed || '—'} muted />
                <ScoreStatCell
                  label="Gross"
                  value={group.grossTotal !== undefined ? group.grossTotal : '—'}
                  muted
                />
                <ScoreStatCell
                  label="Net"
                  value={group.netTotal !== undefined ? group.netTotal : '—'}
                  muted
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default SessionLeaderboardCard;
