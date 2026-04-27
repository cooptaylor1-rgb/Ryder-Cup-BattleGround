/**
 * StrokeEntrySheet — Sheet wrapper around StrokeScoreEntry.
 *
 * v2 design: detailed gross/net entry is a peer surface, not a separate
 * "mode" on the cockpit. Captains and stroke-play groups open this from
 * the cockpit's "Enter strokes" link; everyone else stays on winner-pick.
 */

'use client';

import { StrokeScoreEntry } from '@/components/scoring';
import type { HoleWinner } from '@/lib/types/models';
import { Sheet } from './Sheet';

interface StrokeEntrySheetProps {
  open: boolean;
  onClose: () => void;
  holeNumber: number;
  par: number;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  teamAHandicapStrokes: number;
  teamBHandicapStrokes: number;
  holeHandicaps: number[];
  initialTeamAScore?: number | null;
  initialTeamBScore?: number | null;
  isSubmitting?: boolean;
  onSubmit: (winner: HoleWinner, teamAScore: number, teamBScore: number) => void;
}

export function StrokeEntrySheet({
  open,
  onClose,
  holeNumber,
  par,
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  teamAHandicapStrokes,
  teamBHandicapStrokes,
  holeHandicaps,
  initialTeamAScore,
  initialTeamBScore,
  isSubmitting,
  onSubmit,
}: StrokeEntrySheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Hole ${holeNumber} — Stroke entry`}
      description={`Par ${par} · enter gross scores. Net and the winner are derived.`}
    >
      <StrokeScoreEntry
        holeNumber={holeNumber}
        par={par}
        teamAName={teamAName}
        teamBName={teamBName}
        teamAColor={teamAColor}
        teamBColor={teamBColor}
        teamAHandicapStrokes={teamAHandicapStrokes}
        teamBHandicapStrokes={teamBHandicapStrokes}
        holeHandicaps={holeHandicaps}
        initialTeamAScore={initialTeamAScore}
        initialTeamBScore={initialTeamBScore}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
      />
    </Sheet>
  );
}
