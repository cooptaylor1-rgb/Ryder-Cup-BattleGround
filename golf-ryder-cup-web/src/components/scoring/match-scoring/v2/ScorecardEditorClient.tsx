/**
 * ScorecardEditorClient — The /score/[matchId]/scorecard view.
 *
 * Phase 3 surface: a full 18-hole grid for the active match. Each cell
 * shows the hole result, gross strokes if entered, and a small chevron.
 * Tap a cell → bottom-sheet inline editor (winner pick + optional
 * stroke entry). Includes a provenance footer showing the most recent
 * audit-log activity for this match.
 *
 * Captains can edit any hole. Non-captains can only edit unscored or
 * very recently scored (under 60s) holes.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { useShallow } from 'zustand/shallow';
import { ChevronRight, Clock, Eye, Pencil, Shield, Target } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { db } from '@/lib/db';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { TEAM_COLORS } from '@/lib/constants/teamColors';
import { useAccessStore, useAuthStore, useScoringStore, useToastStore, useTripStore } from '@/lib/stores';
import { useMatchState } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { ScoreInputPanel } from './ScoreInputPanel';
import { Sheet } from './Sheet';
import { StrokeEntrySheet } from './StrokeEntrySheet';
import { FourballEntrySheet } from './FourballEntrySheet';
import type { HoleResult, HoleWinner, PlayerHoleScore } from '@/lib/types/models';
import { DEFAULT_HOLE_HANDICAPS } from '../matchScoringPageModel';
import { buildMatchHandicapContext } from '@/lib/services/matchHandicapService';
import { formatPlayerName } from '@/lib/utils';

export default function ScorecardEditorClient() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const { currentTrip, players, sessions, teeSets } = useTripStore(
    useShallow((s) => ({
      currentTrip: s.currentTrip,
      players: s.players,
      sessions: s.sessions,
      teeSets: s.teeSets,
    }))
  );
  const { currentUser } = useAuthStore();
  const { isCaptainMode } = useAccessStore(useShallow((s) => ({ isCaptainMode: s.isCaptainMode })));
  const { selectMatch, scoreHole } = useScoringStore();
  const { showToast } = useToastStore(useShallow((s) => ({ showToast: s.showToast })));

  const matchState = useMatchState(matchId);
  const [editingHole, setEditingHole] = useState<number | null>(null);
  const [strokeOpen, setStrokeOpen] = useState(false);
  const [fourballOpen, setFourballOpen] = useState(false);

  useEffect(() => {
    void selectMatch(matchId);
  }, [matchId, selectMatch]);

  // Latest audit-log entries for this match (provenance footer). Dexie's
  // chained .reverse().sortBy() is brittle in some adapter versions, so
  // we toArray() and sort in JS — the trip-scoped slice is small enough
  // that this stays cheap.
  const auditEntries = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      const all = await db.auditLog.where('tripId').equals(currentTrip.id).toArray();
      return all
        .filter((e) => e.relatedEntityId === matchId && e.actionType.startsWith('score'))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 8);
    },
    [currentTrip?.id, matchId],
    []
  );

  if (!matchState) {
    return (
      <div className="min-h-screen bg-[var(--canvas)]">
        <PageHeader
          title="Scorecard"
          icon={<Target size={16} className="text-[var(--masters)]" />}
          onBack={() => router.back()}
        />
        <main className="container-editorial py-12 text-center text-sm text-[var(--ink-secondary)]">
          Loading scorecard…
        </main>
      </div>
    );
  }

  const match = matchState.match;
  const session = sessions.find((s) => s.id === match.sessionId);
  const isFourball = session?.sessionType === 'fourball';
  const teeSet = match.teeSetId ? teeSets.find((t) => t.id === match.teeSetId) : undefined;
  const holeHandicaps = teeSet?.holeHandicaps ?? DEFAULT_HOLE_HANDICAPS;
  const holePars = teeSet?.holePars ?? Array.from({ length: 18 }, () => 4);

  const teamAName = 'USA';
  const teamBName = 'Europe';
  const teamAColor = TEAM_COLORS.teamA;
  const teamBColor = TEAM_COLORS.teamB;

  const teamAPlayers = match.teamAPlayerIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const teamBPlayers = match.teamBPlayerIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const handicapContext = buildMatchHandicapContext({
    sessionType: session?.sessionType,
    teamAPlayers,
    teamBPlayers,
    teeSet,
  });

  const teamAFourballPlayers = teamAPlayers.map((player, index) => ({
    id: player.id,
    name: formatPlayerName(player.firstName, player.lastName),
    courseHandicap: handicapContext.teamAPlayers[index]?.courseHandicap ?? 0,
    strokeAllowance: handicapContext.teamAPlayers[index]?.strokeAllowance ?? 0,
  }));
  const teamBFourballPlayers = teamBPlayers.map((player, index) => ({
    id: player.id,
    name: formatPlayerName(player.firstName, player.lastName),
    courseHandicap: handicapContext.teamBPlayers[index]?.courseHandicap ?? 0,
    strokeAllowance: handicapContext.teamBPlayers[index]?.strokeAllowance ?? 0,
  }));

  const resultByHole = new Map<number, HoleResult>();
  for (const r of matchState.holeResults) resultByHole.set(r.holeNumber, r);

  const userIsParticipant = currentUser
    ? match.teamAPlayerIds.includes(currentUser.id) ||
      match.teamBPlayerIds.includes(currentUser.id)
    : false;

  const canEditHole = (hole: number): boolean => {
    if (isCaptainMode) return true;
    const result = resultByHole.get(hole);
    if (!result || result.winner === 'none') return userIsParticipant;
    // Within 60s of last write, anyone can quick-correct.
    const last = new Date(result.timestamp ?? 0).getTime();
    return userIsParticipant && Date.now() - last < 60_000;
  };

  const editingResult = editingHole != null ? resultByHole.get(editingHole) : undefined;
  const editingPar = editingHole != null ? holePars[editingHole - 1] ?? 4 : 4;

  const submitWinner = async (winner: HoleWinner) => {
    if (editingHole == null) return;
    // Reuse existing scoring engine via a one-shot navigation to the hole
    // and a writeHoleResult. We don't go through the cockpit's auto-
    // advance flow here — this is a deliberate edit.
    await scoreHole(winner, undefined, undefined, undefined, undefined, { advanceHole: false });
    showToast('success', `Hole ${editingHole} updated`);
    setEditingHole(null);
  };

  const submitStrokes = async (winner: HoleWinner, a: number, b: number) => {
    if (editingHole == null) return;
    await scoreHole(winner, a, b, undefined, undefined, { advanceHole: false });
    setStrokeOpen(false);
    setEditingHole(null);
    showToast('success', `Hole ${editingHole} updated`);
  };

  const submitFourball = async (
    winner: HoleWinner,
    aBest: number,
    bBest: number,
    aPlayer: PlayerHoleScore[],
    bPlayer: PlayerHoleScore[]
  ) => {
    if (editingHole == null) return;
    await scoreHole(winner, aBest, bBest, aPlayer, bPlayer, { advanceHole: false });
    setFourballOpen(false);
    setEditingHole(null);
    showToast('success', `Hole ${editingHole} updated`);
  };

  const handleOpenEdit = async (hole: number) => {
    if (!canEditHole(hole)) {
      showToast('info', 'Captain mode required to edit this hole');
      return;
    }
    // Route the active store cursor to this hole so scoreHole writes the
    // right row. The store reads currentHole directly.
    await selectMatch(matchId);
    useScoringStore.getState().goToHole(hole);
    setEditingHole(hole);
  };

  const front9 = Array.from({ length: 9 }, (_, i) => i + 1);
  const back9 = Array.from({ length: 9 }, (_, i) => i + 10);

  return (
    <div className="min-h-screen bg-[var(--canvas)] page-premium-enter">
      <PageHeader
        title="Scorecard"
        subtitle={`Match ${match.matchOrder} · ${session?.name ?? session?.sessionType ?? ''}`}
        icon={<Target size={16} className="text-[var(--masters)]" />}
        onBack={() => router.push(`/score/${matchId}`)}
      />

      <main className="container-editorial space-y-5 py-5">
        <ScoreSummary
          teamAName={teamAName}
          teamBName={teamBName}
          teamAColor={teamAColor}
          teamBColor={teamBColor}
          matchState={matchState}
        />

        {!isCaptainMode && !userIsParticipant && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-sunken)] px-3 py-2.5 text-xs text-[var(--ink-secondary)]"
          >
            <Eye size={14} className="mt-0.5 text-[var(--ink-tertiary)]" />
            <span>
              Read-only view. Match participants and the captain can record or correct scores.
            </span>
          </div>
        )}

        <Nine
          label="Front 9"
          holes={front9}
          holePars={holePars}
          holeHandicaps={holeHandicaps}
          resultByHole={resultByHole}
          teamAName={teamAName}
          teamBName={teamBName}
          teamAColor={teamAColor}
          teamBColor={teamBColor}
          canEdit={canEditHole}
          onEdit={handleOpenEdit}
        />
        <Nine
          label="Back 9"
          holes={back9}
          holePars={holePars}
          holeHandicaps={holeHandicaps}
          resultByHole={resultByHole}
          teamAName={teamAName}
          teamBName={teamBName}
          teamAColor={teamAColor}
          teamBColor={teamBColor}
          canEdit={canEditHole}
          onEdit={handleOpenEdit}
        />

        <ProvenanceFooter entries={auditEntries} />
      </main>

      <Sheet
        open={editingHole != null && !strokeOpen && !fourballOpen}
        onClose={() => setEditingHole(null)}
        title={editingHole ? `Hole ${editingHole} — Edit` : 'Edit'}
        description={
          editingHole
            ? `Par ${holePars[editingHole - 1]} · SI ${holeHandicaps[editingHole - 1]}`
            : undefined
        }
      >
        {editingHole != null && (
          <div className="space-y-4">
            <ScoreInputPanel
              teamAName={teamAName}
              teamBName={teamBName}
              teamAColor={teamAColor}
              teamBColor={teamBColor}
              existingResult={editingResult?.winner}
              gestureEnabled={false}
              onScore={submitWinner}
              onOpenStrokeEntry={() => {
                if (isFourball) setFourballOpen(true);
                else setStrokeOpen(true);
              }}
              helperLine={
                editingResult && editingResult.winner !== 'none'
                  ? `Currently recorded: ${
                      editingResult.winner === 'teamA'
                        ? teamAName
                        : editingResult.winner === 'teamB'
                          ? teamBName
                          : 'Halved'
                    }`
                  : 'Pick a winner — gestures are disabled in edit mode for safety.'
              }
              strokesAvailable
            />

            {!isCaptainMode && (
              <p className="flex items-start gap-2 rounded-xl border border-[color:var(--rule)] bg-[var(--canvas-sunken)] px-3 py-2 text-xs text-[var(--ink-secondary)]">
                <Shield size={12} className="mt-0.5 text-[var(--ink-tertiary)]" />
                Edits to past holes are captured in the audit log. Captains
                can review provenance from the recap page.
              </p>
            )}
          </div>
        )}
      </Sheet>

      {!isFourball && editingHole != null && (
        <StrokeEntrySheet
          open={strokeOpen}
          onClose={() => setStrokeOpen(false)}
          holeNumber={editingHole}
          par={editingPar}
          teamAName={teamAName}
          teamBName={teamBName}
          teamAColor={teamAColor}
          teamBColor={teamBColor}
          teamAHandicapStrokes={handicapContext.teamAHandicapAllowance}
          teamBHandicapStrokes={handicapContext.teamBHandicapAllowance}
          holeHandicaps={holeHandicaps}
          initialTeamAScore={editingResult?.teamAStrokes ?? null}
          initialTeamBScore={editingResult?.teamBStrokes ?? null}
          onSubmit={submitStrokes}
        />
      )}

      {isFourball && editingHole != null && (
        <FourballEntrySheet
          open={fourballOpen}
          onClose={() => setFourballOpen(false)}
          holeNumber={editingHole}
          par={editingPar}
          teamAName={teamAName}
          teamBName={teamBName}
          teamAColor={teamAColor}
          teamBColor={teamBColor}
          teamAPlayers={teamAFourballPlayers}
          teamBPlayers={teamBFourballPlayers}
          holeHandicaps={holeHandicaps}
          initialTeamAScores={editingResult?.teamAPlayerScores}
          initialTeamBScores={editingResult?.teamBPlayerScores}
          onSubmit={submitFourball}
        />
      )}
    </div>
  );
}

function ScoreSummary({
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  matchState,
}: {
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  matchState: ReturnType<typeof calculateMatchState>;
}) {
  return (
    <header className="rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-raised)] px-4 py-4">
      <p className="type-overline text-[var(--masters)]">Scorecard</p>
      <div className="mt-2 grid grid-cols-3 items-end gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: teamAColor }}>
            {teamAName}
          </p>
          <p className="font-serif text-3xl tabular-nums leading-none text-[var(--ink)]">
            {matchState.teamAHolesWon}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            holes won
          </p>
        </div>
        <div className="text-center">
          <p className="font-serif text-2xl text-[var(--ink)]">{matchState.displayScore}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            {matchState.holesPlayed > 0 ? `Through ${matchState.holesPlayed}` : 'Opening tee'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: teamBColor }}>
            {teamBName}
          </p>
          <p className="font-serif text-3xl tabular-nums leading-none text-[var(--ink)]">
            {matchState.teamBHolesWon}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            holes won
          </p>
        </div>
      </div>
    </header>
  );
}

function Nine({
  label,
  holes,
  holePars,
  holeHandicaps,
  resultByHole,
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  canEdit,
  onEdit,
}: {
  label: string;
  holes: number[];
  holePars: number[];
  holeHandicaps: number[];
  resultByHole: Map<number, HoleResult>;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  canEdit: (hole: number) => boolean;
  onEdit: (hole: number) => void;
}) {
  const totals = useMemo(() => {
    let aWon = 0;
    let bWon = 0;
    let halved = 0;
    for (const h of holes) {
      const r = resultByHole.get(h);
      if (r?.winner === 'teamA') aWon += 1;
      else if (r?.winner === 'teamB') bWon += 1;
      else if (r?.winner === 'halved') halved += 1;
    }
    return { aWon, bWon, halved };
  }, [holes, resultByHole]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-raised)]">
      <header className="flex items-center justify-between border-b border-[color:var(--rule)] bg-[var(--canvas-sunken)] px-4 py-2.5">
        <p className="type-overline text-[var(--ink-secondary)]">{label}</p>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
          <span style={{ color: teamAColor }}>{teamAName} {totals.aWon}</span>
          <span className="px-1.5 text-[var(--ink-tertiary)]">·</span>
          <span>½ {totals.halved}</span>
          <span className="px-1.5 text-[var(--ink-tertiary)]">·</span>
          <span style={{ color: teamBColor }}>{teamBName} {totals.bWon}</span>
        </p>
      </header>

      <ol className="divide-y divide-[color:var(--rule)]/70">
        {holes.map((hole) => {
          const result = resultByHole.get(hole);
          const winner = result?.winner;
          const winnerLabel =
            winner === 'teamA'
              ? teamAName
              : winner === 'teamB'
                ? teamBName
                : winner === 'halved'
                  ? 'Halved'
                  : 'Unscored';
          const winnerColor =
            winner === 'teamA'
              ? teamAColor
              : winner === 'teamB'
                ? teamBColor
                : winner === 'halved'
                  ? 'var(--ink-tertiary)'
                  : 'var(--ink-tertiary)';
          const editable = canEdit(hole);
          const strokes =
            result?.teamAStrokes != null && result?.teamBStrokes != null
              ? `${result.teamAStrokes}–${result.teamBStrokes}`
              : null;

          return (
            <li key={hole}>
              <button
                type="button"
                onClick={() => onEdit(hole)}
                aria-disabled={!editable}
                aria-label={
                  editable
                    ? `Edit hole ${hole}, currently ${winnerLabel}`
                    : `Hole ${hole}, currently ${winnerLabel}, locked`
                }
                className={cn(
                  'grid w-full grid-cols-[3rem_minmax(0,1fr)_5rem_5rem_1.25rem] items-center gap-2 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]',
                  editable ? 'hover:bg-[var(--canvas-sunken)]' : 'cursor-not-allowed opacity-70'
                )}
              >
                <div>
                  <p className="font-serif text-base tabular-nums text-[var(--ink)]">{hole}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                    Par {holePars[hole - 1]} · SI {holeHandicaps[hole - 1] ?? hole}
                  </p>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      'h-2.5 w-2.5 shrink-0 rounded-full',
                      winner && winner !== 'none' ? '' : 'border border-[color:var(--rule-strong)]'
                    )}
                    style={{
                      background: winner && winner !== 'none' ? winnerColor : 'transparent',
                    }}
                  />
                  <span
                    className="truncate text-sm font-semibold"
                    style={{
                      color: winner && winner !== 'none' && winner !== 'halved' ? winnerColor : 'var(--ink)',
                    }}
                  >
                    {winnerLabel}
                  </span>
                </div>
                <span className="text-right font-mono text-xs text-[var(--ink-secondary)]">
                  {strokes ?? '—'}
                </span>
                <span className="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                  {editable ? 'edit' : 'view'}
                </span>
                {editable ? (
                  <Pencil size={12} className="justify-self-end text-[var(--ink-tertiary)]" />
                ) : (
                  <ChevronRight size={12} className="justify-self-end text-[var(--ink-tertiary)]" />
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function formatRelativeTimestamp(timestamp: string, now: number): string {
  const t = new Date(timestamp).getTime();
  const dt = now - t;
  if (dt < 60_000) return 'Just now';
  if (dt < 3_600_000) return `${Math.round(dt / 60_000)}m ago`;
  if (dt < 86_400_000) return `${Math.round(dt / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ProvenanceFooter({
  entries,
}: {
  entries: Array<{
    timestamp: string;
    actorName: string;
    actionType: string;
    summary: string;
    details?: string;
  }>;
}) {
  if (entries.length === 0) return null;

  // Snapshot "now" once per render. Relative time displays inherently
  // depend on the wall clock and are intentionally recomputed on every
  // render; the React 19 purity lint flags Date.now() on the principle
  // that render should be deterministic — this is the canonical
  // exception. We refresh on each useLiveQuery update anyway.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <section className="overflow-hidden rounded-2xl border border-[color:var(--rule)] bg-[var(--canvas-raised)]">
      <header className="flex items-center gap-2 border-b border-[color:var(--rule)] bg-[var(--canvas-sunken)] px-4 py-2.5">
        <Clock size={14} className="text-[var(--ink-tertiary)]" />
        <p className="type-overline text-[var(--ink-secondary)]">Provenance</p>
        <p className="ml-auto text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
          {entries.length} recent {entries.length === 1 ? 'event' : 'events'}
        </p>
      </header>
      <ol className="divide-y divide-[color:var(--rule)]/70 text-sm">
        {entries.map((entry, idx) => (
          <li key={idx} className="px-4 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--ink)]">{entry.summary}</p>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                {formatRelativeTimestamp(entry.timestamp, now)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--ink-tertiary)]">
              {entry.actorName} · {labelForAction(entry.actionType)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function labelForAction(action: string): string {
  switch (action) {
    case 'scoreEntered':
      return 'recorded a score';
    case 'scoreEdited':
      return 'edited a score';
    case 'scoreUndone':
      return 'undid a score';
    default:
      return action;
  }
}
