/**
 * Lazy Service Loaders
 *
 * Dynamic import wrappers for heavy services that are only needed on
 * specific pages. This prevents the initial bundle from including large
 * modules (PDF generation, extended side games, course sync, etc.) that
 * most users won't need on first load.
 *
 * Usage:
 *   const { generatePDFScorecard } = await loadPDFExportService();
 *   await generatePDFScorecard(matchId);
 *
 * Benefits:
 * - Reduces initial JS bundle by deferring ~8000+ LOC of service code
 * - Heavy dependencies (html2canvas, etc.) only loaded when needed
 * - Cached after first load so subsequent calls are instant
 */

// Module-level caches for loaded services
let _pdfExportService: typeof import('./pdfExportService') | null = null;
let _extendedSideGamesService: typeof import('./extendedSideGamesService') | null = null;
let _courseLibrarySyncService: typeof import('./courseLibrarySyncService') | null = null;
let _statisticsService: typeof import('./statisticsService') | null = null;
let _lineupBuilderService: typeof import('./lineupBuilderService') | null = null;
let _narrativeService: typeof import('./narrativeService') | null = null;
let _shareCardService: typeof import('./shareCardService') | null = null;
let _handicapCalculator: typeof import('./handicapCalculator') | null = null;
let _tournamentEngine: typeof import('./tournamentEngine') | null = null;
let _smartPairingService: typeof import('./smartPairingService') | null = null;
let _weatherService: typeof import('./weatherService') | null = null;
let _recapService: typeof import('./recapService') | null = null;
let _nemesisService: typeof import('./nemesisService') | null = null;
let _bulkImportService: typeof import('./bulkImportService') | null = null;
let _exportImportService: typeof import('./exportImportService') | null = null;

/**
 * PDF export service (~752 LOC, depends on html2canvas)
 * Only needed when user exports a scorecard.
 */
export async function loadPDFExportService() {
  if (!_pdfExportService) {
    _pdfExportService = await import('./pdfExportService');
  }
  return _pdfExportService;
}

/**
 * Extended side games service (~1187 LOC)
 * Only needed on Wolf/Vegas/Nassau/Hammer game pages.
 */
export async function loadExtendedSideGamesService() {
  if (!_extendedSideGamesService) {
    _extendedSideGamesService = await import('./extendedSideGamesService');
  }
  return _extendedSideGamesService;
}

/**
 * Course library sync service (~958 LOC)
 * Only needed when syncing course library data.
 */
export async function loadCourseLibrarySyncService() {
  if (!_courseLibrarySyncService) {
    _courseLibrarySyncService = await import('./courseLibrarySyncService');
  }
  return _courseLibrarySyncService;
}

/**
 * Statistics service (~563 LOC)
 * Only needed on stats/analytics pages.
 */
export async function loadStatisticsService() {
  if (!_statisticsService) {
    _statisticsService = await import('./statisticsService');
  }
  return _statisticsService;
}

/**
 * Lineup builder service (~769 LOC)
 * Only needed on the lineup builder page.
 */
export async function loadLineupBuilderService() {
  if (!_lineupBuilderService) {
    _lineupBuilderService = await import('./lineupBuilderService');
  }
  return _lineupBuilderService;
}

/**
 * Narrative/editorial service
 * Only needed when generating recaps.
 */
export async function loadNarrativeService() {
  if (!_narrativeService) {
    _narrativeService = await import('./narrativeService');
  }
  return _narrativeService;
}

/**
 * Share card generation service
 * Only needed when sharing cards/images.
 */
export async function loadShareCardService() {
  if (!_shareCardService) {
    _shareCardService = await import('./shareCardService');
  }
  return _shareCardService;
}

/**
 * Handicap calculator (~650 LOC)
 * Only needed on player profile and scoring pages.
 */
export async function loadHandicapCalculator() {
  if (!_handicapCalculator) {
    _handicapCalculator = await import('./handicapCalculator');
  }
  return _handicapCalculator;
}

/**
 * Tournament engine (~750 LOC)
 * Only needed when creating/managing tournaments.
 */
export async function loadTournamentEngine() {
  if (!_tournamentEngine) {
    _tournamentEngine = await import('./tournamentEngine');
  }
  return _tournamentEngine;
}

/**
 * Smart pairing service (~600 LOC)
 * Only needed on the pairing/lineup pages.
 */
export async function loadSmartPairingService() {
  if (!_smartPairingService) {
    _smartPairingService = await import('./smartPairingService');
  }
  return _smartPairingService;
}

/**
 * Weather service (~650 LOC)
 * Only needed on weather-aware pages.
 */
export async function loadWeatherService() {
  if (!_weatherService) {
    _weatherService = await import('./weatherService');
  }
  return _weatherService;
}

/**
 * Recap service (~440 LOC)
 * Only needed on the recap/summary page.
 */
export async function loadRecapService() {
  if (!_recapService) {
    _recapService = await import('./recapService');
  }
  return _recapService;
}

/**
 * Nemesis service (~500 LOC)
 * Only needed on stats/rivalry pages.
 */
export async function loadNemesisService() {
  if (!_nemesisService) {
    _nemesisService = await import('./nemesisService');
  }
  return _nemesisService;
}

/**
 * Bulk import service (~400 LOC)
 * Only needed when importing data.
 */
export async function loadBulkImportService() {
  if (!_bulkImportService) {
    _bulkImportService = await import('./bulkImportService');
  }
  return _bulkImportService;
}

/**
 * Export/import service (~470 LOC)
 * Only needed when exporting/importing trip data.
 */
export async function loadExportImportService() {
  if (!_exportImportService) {
    _exportImportService = await import('./exportImportService');
  }
  return _exportImportService;
}
