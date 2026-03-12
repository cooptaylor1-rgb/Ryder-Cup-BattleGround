/**
 * Lineup Builder Service
 *
 * Public facade for lineup-building operations. Internal responsibilities are
 * split into dedicated lineup-builder modules to keep this surface stable and
 * readable.
 */

export type {
  AutoFillOptions,
  FairnessIssue,
  FairnessScore,
  LineupMatch,
  LineupPlayer,
  LineupState,
  PairingHistory,
} from './lineup-builder/lineupBuilderTypes';

export {
  clearLineup,
  initializeLineupState,
  movePlayerToMatch,
  removePlayerFromMatch,
} from './lineup-builder/lineupBuilderState';
export { autoFillLineup } from './lineup-builder/lineupBuilderGeneration';
export { calculateFairnessScore, getPairingHistory } from './lineup-builder/lineupBuilderFairness';
export { saveLineup } from './lineup-builder/lineupBuilderPersistence';
