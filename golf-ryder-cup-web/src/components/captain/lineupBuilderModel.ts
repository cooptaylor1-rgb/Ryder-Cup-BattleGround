import { useMemo } from 'react';

import { validateLineupBuilder, type LineupBuilderValidationResult } from './lineupBuilderValidation';
import type { FairnessScore, MatchSlot, Player } from './lineupBuilderTypes';

export interface LineupBuilderModel {
  availableTeamA: Player[];
  availableTeamB: Player[];
  totalAssigned: number;
  totalPlayers: number;
  fairness: FairnessScore | null;
  validation: LineupBuilderValidationResult;
}

interface UseLineupBuilderModelOptions {
  matches: MatchSlot[];
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  playersPerTeam: number;
  calculateFairness?: (matches: MatchSlot[]) => FairnessScore;
}

export function useLineupBuilderModel({
  matches,
  teamAPlayers,
  teamBPlayers,
  playersPerTeam,
  calculateFairness,
}: UseLineupBuilderModelOptions): LineupBuilderModel {
  const assignedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    matches.forEach((match) => {
      match.teamAPlayers.forEach((player) => ids.add(player.id));
      match.teamBPlayers.forEach((player) => ids.add(player.id));
    });
    return ids;
  }, [matches]);

  const availableTeamA = useMemo(
    () => teamAPlayers.filter((player) => !assignedPlayerIds.has(player.id)),
    [teamAPlayers, assignedPlayerIds]
  );
  const availableTeamB = useMemo(
    () => teamBPlayers.filter((player) => !assignedPlayerIds.has(player.id)),
    [teamBPlayers, assignedPlayerIds]
  );

  const fairness = useMemo(() => {
    if (!calculateFairness) return null;
    return calculateFairness(matches);
  }, [matches, calculateFairness]);

  const validation = useMemo(
    () => validateLineupBuilder(matches, playersPerTeam, fairness),
    [matches, playersPerTeam, fairness]
  );

  return {
    availableTeamA,
    availableTeamB,
    totalAssigned: assignedPlayerIds.size,
    totalPlayers: teamAPlayers.length + teamBPlayers.length,
    fairness,
    validation,
  };
}
