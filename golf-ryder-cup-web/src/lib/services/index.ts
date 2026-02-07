/**
 * Services barrel export
 */

// Core scoring & tournament services
export * from './handicapCalculator';
export * from './scoringEngine';
export * from './tournamentEngine';
export * from './weatherService';
export * from './golfCourseAPIService';

// Captain toolkit services
export * from './preFlightValidationService';
export * from './bulkImportService';
export * from './smartPairingService';
export * from './teeTimeService';
export * from './draftService';
export * from './communicationService';
export * from './sideBetsService';
export * from './statisticsService';
export * from './spectatorService';
export * from './archiveService';
export * from './sessionLockService';

// Data services
export * from './awardsService';
export * from './courseLibraryService';
export * from './courseLibrarySyncService';
export * from './exportImportService';

// Social & communication services
export * from './socialService';
export * from './pollService';
export * from './photoService';

// Sharing & export services
export * from './shareService';
export * from './pdfExportService';
// shareCardService has duplicate exports with shareService - export selectively
export {
  generateStandingsCard,
  generateSessionCard,
  generateAwardCard,
  generateLeaderboardCard,
  shareCard,
  downloadBlob,
  copyCardToClipboard,
  // shareStandings is already exported from shareService
  shareSession,
  shareAward,
  shareLeaderboard,
} from './shareCardService';

// Analytics & tracking
export * from './analyticsService';

// Extended games
export * from './extendedSideGamesService';

// Sync services
export * from './baseSyncService';
export * from './backgroundSyncService';
export * from './realtimeSyncService';

// Push notifications
export * from './pushNotificationService';

// Nemesis & rivalries
export * from './nemesisService';

// Path to victory
export * from './pathToVictoryService';

// Lineup builder - has duplicate calculateFairnessScore with tournamentEngine
export {
  initializeLineupState,
  autoFillLineup,
  getPairingHistory,
  saveLineup,
  movePlayerToMatch,
  removePlayerFromMatch,
  clearLineup,
  // calculateFairnessScore is already in tournamentEngine
} from './lineupBuilderService';

// Trip stats
export * from './tripStatsService';

// Narrative / editorial recaps
export * from './narrativeService';

export { default as HandicapCalculator } from './handicapCalculator';
export { default as ScoringEngine } from './scoringEngine';
export { default as TournamentEngine } from './tournamentEngine';
