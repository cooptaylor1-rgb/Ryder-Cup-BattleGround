import type { FairnessScore, MatchSlot } from './lineupBuilderTypes';

export interface LineupBuilderValidationResult {
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

export function validateLineupBuilder(
  matches: MatchSlot[],
  playersPerTeam: number,
  fairness: FairnessScore | null
): LineupBuilderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  matches.forEach((match, index) => {
    if (match.teamAPlayers.length !== playersPerTeam) {
      errors.push(`Match ${index + 1}: Team A needs ${playersPerTeam} player(s)`);
    }
    if (match.teamBPlayers.length !== playersPerTeam) {
      errors.push(`Match ${index + 1}: Team B needs ${playersPerTeam} player(s)`);
    }
  });

  if (fairness && fairness.warnings.length > 0) {
    warnings.push(...fairness.warnings);
  }

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}
