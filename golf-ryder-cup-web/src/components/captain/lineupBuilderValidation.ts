import type { FairnessScore, MatchSlot } from './lineupBuilderTypes';

export interface LineupBuilderValidationResult {
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

/**
 * Validates a set of match slots before a captain can publish a session.
 *
 * Rules (hard failures — publish is blocked):
 *   - At least one match must exist
 *   - Each match must have exactly `playersPerTeam` players on each side
 *   - No player may appear in more than one match in the same session
 *
 * Warnings (informational — publish still allowed):
 *   - Handicap imbalance surfaced from fairness scoring
 */
export function validateLineupBuilder(
  matches: MatchSlot[],
  playersPerTeam: number,
  fairness: FairnessScore | null
): LineupBuilderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // A session with zero matches is never valid. Previously the loop below
  // would no-op on an empty list and the publish button would light up,
  // letting a captain publish a blank session.
  if (matches.length === 0) {
    errors.push('Add at least one match before publishing');
  }

  // Per-match player count check.
  matches.forEach((match, index) => {
    if (match.teamAPlayers.length !== playersPerTeam) {
      errors.push(`Match ${index + 1}: Team A needs ${playersPerTeam} player(s)`);
    }
    if (match.teamBPlayers.length !== playersPerTeam) {
      errors.push(`Match ${index + 1}: Team B needs ${playersPerTeam} player(s)`);
    }
  });

  // Cross-match duplicate detection. The builder UI filters the available
  // rosters by assigned players, so duplicates should normally be impossible,
  // but if persisted state gets out of sync (e.g. after an offline edit on
  // a second device) we need to fail loudly rather than publish a session
  // with a player scheduled in two matches at once.
  const playerMatchMap = new Map<string, number[]>();
  matches.forEach((match, index) => {
    const addPlayer = (playerId: string) => {
      const matchNumbers = playerMatchMap.get(playerId) ?? [];
      matchNumbers.push(index + 1);
      playerMatchMap.set(playerId, matchNumbers);
    };
    match.teamAPlayers.forEach((p) => addPlayer(p.id));
    match.teamBPlayers.forEach((p) => addPlayer(p.id));
  });

  for (const [playerId, matchNumbers] of playerMatchMap.entries()) {
    if (matchNumbers.length > 1) {
      // Try to resolve a readable name from the first match the player appears in.
      const firstMatch = matches[matchNumbers[0] - 1];
      const player =
        firstMatch?.teamAPlayers.find((p) => p.id === playerId) ??
        firstMatch?.teamBPlayers.find((p) => p.id === playerId);
      const playerName = player
        ? `${player.firstName}${player.lastName ? ` ${player.lastName}` : ''}`.trim() ||
          'A player'
        : 'A player';
      errors.push(
        `${playerName} is in Match ${matchNumbers.join(' and Match ')} — each player can only play one match per session`,
      );
    }
  }

  if (fairness && fairness.warnings.length > 0) {
    warnings.push(...fairness.warnings);
  }

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}
