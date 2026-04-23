'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';

import { db } from '@/lib/db';
import { useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Match, PracticeScore, RyderCupSession, SideBet, TeeSet } from '@/lib/types/models';
import { Coins } from 'lucide-react';

import { computeSessionSkinsBoard } from './sessionSkins';

interface SessionSkinsCardProps {
  session: RyderCupSession;
  matches: Match[];
}

/**
 * Session-wide skins board: renders the live skins standings pulled
 * straight from practice scores. Shown on the session page when the
 * captain has a skins bet scoped to the session (sessionId set,
 * matchId unset). The per-hole lowest-net derivation handles
 * carries and pending (not-yet-played-by-all) holes — see
 * sessionSkins.ts for the rules.
 */
export function SessionSkinsCard({ session, matches }: SessionSkinsCardProps) {
  const { currentTrip, players } = useTripStore(
    useShallow((s) => ({ currentTrip: s.currentTrip, players: s.players }))
  );

  const sessionSkinsBet = useLiveQuery(
    async () => {
      if (!currentTrip) return undefined;
      const bets = await db.sideBets
        .where('tripId')
        .equals(currentTrip.id)
        .and((b) => b.sessionId === session.id && !b.matchId && b.type === 'skins')
        .toArray();
      return bets[0];
    },
    [currentTrip?.id, session.id],
    undefined as SideBet | undefined
  );

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

  const board = useMemo(() => {
    if (!sessionSkinsBet) return null;
    return computeSessionSkinsBoard({
      bet: sessionSkinsBet,
      session,
      matches,
      scores: scores ?? [],
      players,
      teeSet: teeSet ?? null,
    });
  }, [sessionSkinsBet, session, matches, scores, players, teeSet]);

  if (!sessionSkinsBet || !board) {
    return null;
  }

  return (
    <section className="rounded-[1.5rem] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-raised)] p-[var(--space-5)]">
      <div className="flex items-start justify-between gap-[var(--space-3)]">
        <div>
          <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
            Session-wide skins
          </p>
          <h2 className="mt-[var(--space-1)] type-title text-[var(--ink)]">
            <Coins size={16} className="mr-[var(--space-1)] inline-block" />
            {sessionSkinsBet.name}
          </h2>
          <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
            {board.paidOut > 0
              ? `${board.paidOut} paid out so far — skins derive from per-player net scores across every group.`
              : 'Live standings derive from per-player net scores; a hole settles only when every player has entered a score.'}
          </p>
        </div>
        <Link
          href={`/bets/${sessionSkinsBet.id}`}
          className="type-meta rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-3)] py-[5px] text-[var(--masters)]"
        >
          Bet details
        </Link>
      </div>

      {board.standings.every((s) => s.skins === 0) ? (
        <p className="mt-[var(--space-4)] type-body-sm text-[var(--ink-tertiary)]">
          No skins settled yet. The first hole with a single lowest net pays out; ties carry to the
          next.
        </p>
      ) : (
        <div className="mt-[var(--space-4)] space-y-[var(--space-2)]">
          {board.standings
            .filter((s) => s.skins > 0)
            .map((standing, index) => (
              <div
                key={standing.playerId}
                className="flex items-center justify-between gap-[var(--space-3)] rounded-[1rem] border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-3)] py-[var(--space-2)]"
              >
                <div className="flex items-center gap-[var(--space-3)]">
                  <span className="font-serif text-[1rem] italic text-[var(--ink-tertiary)] min-w-[1.5rem] text-center">
                    {index + 1}
                  </span>
                  <span className="type-body text-[var(--ink)]">{standing.playerName}</span>
                </div>
                <div className="flex items-center gap-[var(--space-4)] text-right">
                  <div>
                    <p className="type-micro text-[var(--ink-tertiary)]">Skins</p>
                    <p className="font-serif text-[1.05rem] italic text-[var(--ink)]">
                      {standing.skins}
                    </p>
                  </div>
                  <div>
                    <p className="type-micro text-[var(--ink-tertiary)]">Winnings</p>
                    <p className="font-serif text-[1.2rem] italic text-[var(--ink)]">
                      ${standing.winnings}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {board.carryingHoles.length > 0 ? (
        <p className="mt-[var(--space-3)] type-micro text-[var(--ink-tertiary)]">
          Holes carrying: {board.carryingHoles.join(', ')} · next clean win pays{' '}
          ${board.perHoleValue * (1 + board.carryingHoles.length)}
        </p>
      ) : null}
    </section>
  );
}

export default SessionSkinsCard;
