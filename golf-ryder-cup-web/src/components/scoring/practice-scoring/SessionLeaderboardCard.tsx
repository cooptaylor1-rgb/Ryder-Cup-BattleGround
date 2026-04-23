'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/lib/db';
import { useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Match, PracticeScore, RyderCupSession, TeeSet } from '@/lib/types/models';
import { cn, formatPlayerName } from '@/lib/utils';

import { computeSessionPracticeLeaderboard } from './sessionLeaderboard';

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

  const teeSet = useLiveQuery<TeeSet | null>(
    async () => {
      if (!session.defaultTeeSetId) return null;
      return (await db.teeSets.get(session.defaultTeeSetId)) ?? null;
    },
    [session.defaultTeeSetId],
    null
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
      <section className="rounded-[1.5rem] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-raised)] p-[var(--space-5)]">
        <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
          Session leaderboard
        </p>
        <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
          Publish practice groups above to start tracking a session leaderboard.
        </p>
      </section>
    );
  }

  const anyScored = leaderboard.groups.some((g) => g.holesPlayed > 0);

  return (
    <section className="rounded-[1.5rem] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-raised)] p-[var(--space-5)]">
      <div className="flex items-start justify-between gap-[var(--space-3)]">
        <div>
          <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
            Session leaderboard · {leaderboard.formatName}
          </p>
          <h2 className="mt-[var(--space-1)] type-title text-[var(--ink)]">
            {session.name} — all groups
          </h2>
        </div>
        {leaderboard.formatSupported ? null : (
          <span className="rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-2)] py-[5px] type-micro font-semibold text-[var(--ink-tertiary)]">
            Default scoring
          </span>
        )}
      </div>

      <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">
        {anyScored
          ? 'Ranked by net total under the session format. Ties break on gross, then group number.'
          : 'No scores entered yet — the board updates live as each group enters strokes.'}
      </p>

      <div className="mt-[var(--space-4)] space-y-[var(--space-2)]">
        {leaderboard.groups.map((group, index) => {
          const rank = anyScored && group.holesPlayed > 0 ? index + 1 : undefined;
          const captainLine = group.players
            .map((p) => formatPlayerName(p.firstName, p.lastName, 'short'))
            .join(', ');

          return (
            <div
              key={group.matchId}
              className={cn(
                'rounded-[1rem] border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-3)] py-[var(--space-3)]'
              )}
            >
              <div className="flex items-center justify-between gap-[var(--space-3)]">
                <div className="flex items-center gap-[var(--space-3)] min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--canvas-raised)] font-serif text-[1.05rem] italic text-[var(--ink)]">
                    {rank ?? '—'}
                  </div>
                  <div className="min-w-0">
                    <p className="type-title-sm text-[var(--ink)]">Group {group.groupNumber}</p>
                    <p className="type-meta text-[var(--ink-tertiary)] truncate">
                      {captainLine || 'No players yet'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-[var(--space-4)] text-right">
                  <div>
                    <p className="type-micro text-[var(--ink-tertiary)]">Holes</p>
                    <p className="font-serif text-[1.05rem] italic text-[var(--ink)]">
                      {group.holesPlayed}
                    </p>
                  </div>
                  <div>
                    <p className="type-micro text-[var(--ink-tertiary)]">Gross</p>
                    <p className="font-serif text-[1.05rem] italic text-[var(--ink)]">
                      {group.grossTotal ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="type-micro text-[var(--ink-tertiary)]">Net</p>
                    <p className="font-serif text-[1.2rem] italic text-[var(--ink)]">
                      {group.netTotal ?? '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default SessionLeaderboardCard;
