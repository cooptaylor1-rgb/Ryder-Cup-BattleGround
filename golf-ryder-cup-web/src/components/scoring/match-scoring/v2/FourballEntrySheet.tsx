/**
 * FourballEntrySheet — Sheet wrapper around FourballScoreEntry.
 */

'use client';

import { FourballScoreEntry } from '@/components/scoring';
import type { HoleWinner, PlayerHoleScore } from '@/lib/types/models';
import { Sheet } from './Sheet';

interface PlayerInfo {
  id: string;
  name: string;
  courseHandicap: number;
  strokeAllowance: number;
}

interface FourballEntrySheetProps {
  open: boolean;
  onClose: () => void;
  holeNumber: number;
  par: number;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  teamAPlayers: PlayerInfo[];
  teamBPlayers: PlayerInfo[];
  holeHandicaps: number[];
  initialTeamAScores?: PlayerHoleScore[];
  initialTeamBScores?: PlayerHoleScore[];
  isSubmitting?: boolean;
  onSubmit: (
    winner: HoleWinner,
    teamABestScore: number,
    teamBBestScore: number,
    teamAPlayerScores: PlayerHoleScore[],
    teamBPlayerScores: PlayerHoleScore[]
  ) => void;
}

export function FourballEntrySheet({
  open,
  onClose,
  holeNumber,
  par,
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  teamAPlayers,
  teamBPlayers,
  holeHandicaps,
  initialTeamAScores,
  initialTeamBScores,
  isSubmitting,
  onSubmit,
}: FourballEntrySheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Hole ${holeNumber} — Best ball entry`}
      description={`Par ${par} · enter every player's gross score. Best net per team takes the hole.`}
    >
      <FourballScoreEntry
        holeNumber={holeNumber}
        par={par}
        teamAName={teamAName}
        teamBName={teamBName}
        teamAColor={teamAColor}
        teamBColor={teamBColor}
        teamAPlayers={teamAPlayers}
        teamBPlayers={teamBPlayers}
        holeHandicaps={holeHandicaps}
        initialTeamAScores={initialTeamAScores}
        initialTeamBScores={initialTeamBScores}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
      />
    </Sheet>
  );
}
