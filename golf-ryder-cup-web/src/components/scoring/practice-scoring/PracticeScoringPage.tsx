'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ArrowRight, Minus, Plus } from 'lucide-react';

import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import {
  upsertPracticeScore,
} from '@/lib/services/practiceScoreService';
import { useToastStore, useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Match, Player, PracticeScore, TeeSet } from '@/lib/types/models';
import { cn, formatPlayerName } from '@/lib/utils';
import { computePracticeLeaderboard, type LeaderboardRow } from './practiceLeaderboard';

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

  const match = useLiveQuery(() => db.matches.get(matchId), [matchId], null as Match | null | undefined);
  const scores = useLiveQuery(
    () => db.practiceScores.where('matchId').equals(matchId).toArray(),
    [matchId],
    [] as PracticeScore[]
  );
  const teeSet = useLiveQuery(
    async () => (match?.teeSetId ? (await db.teeSets.get(match.teeSetId)) ?? null : null),
    [match?.teeSetId],
    null as TeeSet | null
  );

  const [currentHole, setCurrentHole] = useState(1);

  // When the underlying match loads, jump to the first hole without
  // a full set of scores entered so the captain lands where they
  // left off rather than always at hole 1.
  useEffect(() => {
    if (!match || scores.length === 0) return;
    for (let hole = 1; hole <= 18; hole += 1) {
      const entered = scores.filter((s) => s.holeNumber === hole);
      if (entered.length < (match.teamAPlayerIds.length + match.teamBPlayerIds.length)) {
        setCurrentHole(hole);
        return;
      }
    }
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

  // TeeSet exposes per-hole pars as a parallel `holePars` array
  // (index 0 = hole 1). Fall back to the overall tee-set par/18 when
  // per-hole pars aren't set so the captain still sees a reference
  // number on the hole screen.
  const holePar =
    teeSet?.holePars?.[currentHole - 1] ??
    (teeSet ? Math.round(teeSet.par / 18) : undefined);

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title={`Practice · Group ${match.matchOrder}`}
        subtitle={match.teeTime ? `Tee time ${match.teeTime}` : undefined}
        onBack={() => router.push('/score')}
      />

      <main className="container-editorial py-[var(--space-6)] space-y-[var(--space-5)]">
        <section className="rounded-[1.5rem] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-raised)] p-[var(--space-5)]">
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
            <div className="text-center">
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Hole</p>
              <p className="mt-[var(--space-1)] font-serif text-[2.4rem] italic leading-none text-[var(--ink)]">
                {currentHole}
              </p>
              {holePar !== undefined ? (
                <p className="mt-[var(--space-1)] type-meta text-[var(--ink-tertiary)]">
                  Par {holePar}
                </p>
              ) : null}
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

          <div className="mt-[var(--space-5)] space-y-[var(--space-2)]">
            {groupPlayers.length === 0 ? (
              <p className="type-body-sm text-[var(--ink-tertiary)]">
                No players in this group.
              </p>
            ) : (
              groupPlayers.map((player) => {
                const entry = scoresByHolePlayer.get(`${currentHole}:${player.id}`);
                const gross = entry?.gross;
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-[var(--space-3)] rounded-[1rem] border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-3)] py-[var(--space-2)]"
                  >
                    <span className="type-body text-[var(--ink)]">
                      {formatPlayerName(player.firstName, player.lastName)}
                      {player.handicapIndex !== undefined ? (
                        <span className="ml-[var(--space-2)] type-micro text-[var(--ink-tertiary)]">
                          HCP {player.handicapIndex}
                        </span>
                      ) : null}
                    </span>
                    <StrokeStepper
                      value={gross}
                      onChange={(next) => handleSetScore(player.id, next)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-raised)] p-[var(--space-5)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                Group leaderboard
              </p>
              <h2 className="mt-[var(--space-1)] type-title text-[var(--ink)]">Gross &amp; net</h2>
            </div>
          </div>

          <div className="mt-[var(--space-4)] space-y-[var(--space-2)]">
            {leaderboard.length === 0 ? (
              <p className="type-body-sm text-[var(--ink-tertiary)]">
                No scores yet — enter strokes above to see the leaderboard build.
              </p>
            ) : (
              leaderboard.map((row, index) => (
                <div
                  key={row.player.id}
                  className="flex items-center justify-between gap-[var(--space-3)] rounded-[1rem] border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-3)] py-[var(--space-2)]"
                >
                  <div className="flex items-center gap-[var(--space-3)]">
                    <span className="type-overline font-semibold text-[var(--ink-tertiary)] min-w-[1.5rem] text-center">
                      {index + 1}
                    </span>
                    <span className="type-body text-[var(--ink)]">
                      {formatPlayerName(row.player.firstName, row.player.lastName)}
                      <span className="ml-[var(--space-2)] type-micro text-[var(--ink-tertiary)]">
                        {row.holesPlayed} holes
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-[var(--space-4)] text-right">
                    <div>
                      <p className="type-micro text-[var(--ink-tertiary)]">Gross</p>
                      <p className="font-serif text-[1.2rem] italic text-[var(--ink)]">
                        {row.grossTotal}
                      </p>
                    </div>
                    <div>
                      <p className="type-micro text-[var(--ink-tertiary)]">Net</p>
                      <p className="font-serif text-[1.2rem] italic text-[var(--ink)]">
                        {row.netTotal !== null ? row.netTotal : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-[color:var(--rule)]/75 bg-[color:var(--canvas-raised)] p-[var(--space-5)]">
          <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
            Side bets
          </p>
          <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
            Attach a skins, CTP, long drive, or nassau bet to this group to track payouts
            alongside the leaderboard.
          </p>
          <Button
            variant="primary"
            className="mt-[var(--space-4)]"
            onClick={() =>
              router.push(`/bets?matchId=${encodeURIComponent(match.id)}`)
            }
          >
            New bet on this group
          </Button>
        </section>
      </main>
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
    <div className="flex items-center gap-[var(--space-2)]">
      <Button
        variant="secondary"
        size="icon"
        onClick={handleDec}
        disabled={value === undefined}
        aria-label="Decrease strokes"
      >
        <Minus size={14} />
      </Button>
      <span
        className={cn(
          'w-10 text-center font-serif text-[1.3rem] italic',
          value === undefined ? 'text-[var(--ink-tertiary)]' : 'text-[var(--ink)]'
        )}
      >
        {value ?? '—'}
      </span>
      <Button
        variant="secondary"
        size="icon"
        onClick={handleInc}
        aria-label="Increase strokes"
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}

export default PracticeScoringPage;
