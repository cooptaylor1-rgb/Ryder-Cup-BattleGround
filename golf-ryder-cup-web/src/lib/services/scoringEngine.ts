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
export { recordHoleResult } from './scoring-engine/scoringEngineCommands';
export { undoLastScore } from './scoring-engine/scoringEngineHistory';
export { createMatch, finalizeMatch } from './scoring-engine/scoringEngineMatch';

import {
  calculateMatchState,
  calculateMatchStateSnapshot,
  formatMatchScore,
  getCurrentHole,
} from './scoring-engine/scoringEngineAggregation';
import {
  calculateMatchPoints,
  calculateMatchResult,
  calculateStoredMatchResult,
  checkDormie,
  formatFinalResult,
  wouldCloseOut,
} from './scoring-engine/scoringEngineResults';
import { recordHoleResult } from './scoring-engine/scoringEngineCommands';
import { undoLastScore } from './scoring-engine/scoringEngineHistory';
import { createMatch, finalizeMatch } from './scoring-engine/scoringEngineMatch';

export const ScoringEngine = {
  calculateMatchState,
  calculateMatchStateSnapshot,
  formatMatchScore,
  recordHoleResult,
  undoLastScore,
  getCurrentHole,
  calculateMatchResult,
  calculateStoredMatchResult,
  formatFinalResult,
  calculateMatchPoints,
  checkDormie,
  wouldCloseOut,
  createMatch,
  finalizeMatch,
};

export default ScoringEngine;
