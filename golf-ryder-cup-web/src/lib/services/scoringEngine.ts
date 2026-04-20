/**
 * Scoring Engine Service
 *
 * Public facade for match scoring operations. Internal responsibilities are
 * split into dedicated scoring-engine modules to keep this surface stable and
 * readable.
 */

export type { MatchStateSnapshot } from './scoring-engine/scoringEngineTypes';

export {
  calculateMatchState,
  calculateMatchStateSnapshot,
  formatMatchScore,
  getCurrentHole,
} from './scoring-engine/scoringEngineAggregation';
export {
  calculateMatchPoints,
  calculateMatchResult,
  calculateStoredMatchResult,
  checkDormie,
  formatFinalResult,
  wouldCloseOut,
} from './scoring-engine/scoringEngineResults';
export { recordHoleResult, type ScoreConflict } from './scoring-engine/scoringEngineCommands';
export { undoLastScore, type UndoResult } from './scoring-engine/scoringEngineHistory';
export { createMatch, finalizeMatch, reopenMatch } from './scoring-engine/scoringEngineMatch';
export {
  MatchNotReadyForScoringError,
  validateMatchReadyForScoring,
} from './scoring-engine/scoringEngineValidation';

