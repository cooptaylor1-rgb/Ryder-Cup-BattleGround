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
 * - Heavy dependencies only loaded when needed
 * - Cached after first load so subsequent calls are instant
 */

/**
 * Creates a memoized lazy loader for a dynamic import.
 * The module is fetched on first call and cached for all subsequent calls.
 */
function createLazyLoader<T>(importFn: () => Promise<T>): () => Promise<T> {
  let cached: T | null = null;
  return async () => {
    if (!cached) {
      cached = await importFn();
    }
    return cached;
  };
}

/** PDF export service (~752 LOC, depends on html2canvas). Only needed when user exports a scorecard. */
export const loadPDFExportService = createLazyLoader(() => import('./pdfExportService'));

/** Extended side games service (~1187 LOC). Only needed on Wolf/Vegas/Nassau/Hammer game pages. */
export const loadExtendedSideGamesService = createLazyLoader(
  () => import('./extendedSideGamesService'),
);

/** Course library sync service (~958 LOC). Only needed when syncing course library data. */
export const loadCourseLibrarySyncService = createLazyLoader(
  () => import('./courseLibrarySyncService'),
);

/** Statistics service (~563 LOC). Only needed on stats/analytics pages. */
export const loadStatisticsService = createLazyLoader(() => import('./statisticsService'));

/** Lineup builder service (~769 LOC). Only needed on the lineup builder page. */
export const loadLineupBuilderService = createLazyLoader(() => import('./lineupBuilderService'));

/** Narrative/editorial service. Only needed when generating recaps. */
export const loadNarrativeService = createLazyLoader(() => import('./narrativeService'));

/** Share card generation service. Only needed when sharing cards/images. */
export const loadShareCardService = createLazyLoader(() => import('./shareCardService'));

/** Handicap calculator (~650 LOC). Only needed on player profile and scoring pages. */
export const loadHandicapCalculator = createLazyLoader(() => import('./handicapCalculator'));

/** Tournament engine (~750 LOC). Only needed when creating/managing tournaments. */
export const loadTournamentEngine = createLazyLoader(() => import('./tournamentEngine'));

/** Smart pairing service (~600 LOC). Only needed on the pairing/lineup pages. */
export const loadSmartPairingService = createLazyLoader(() => import('./smartPairingService'));

/** Weather service (~650 LOC). Only needed on weather-aware pages. */
export const loadWeatherService = createLazyLoader(() => import('./weatherService'));

/** Recap service (~440 LOC). Only needed on the recap/summary page. */
export const loadRecapService = createLazyLoader(() => import('./recapService'));

/** Nemesis service (~500 LOC). Only needed on stats/rivalry pages. */
export const loadNemesisService = createLazyLoader(() => import('./nemesisService'));

/** Bulk import service (~400 LOC). Only needed when importing data. */
export const loadBulkImportService = createLazyLoader(() => import('./bulkImportService'));

/** Export/import service (~470 LOC). Only needed when exporting/importing trip data. */
export const loadExportImportService = createLazyLoader(() => import('./exportImportService'));
