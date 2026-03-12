/**
 * Bulk Player Import Service
 *
 * Public facade for player import operations. Internal responsibilities are
 * split into dedicated bulk-import modules to keep this surface stable and
 * readable while hardening duplicate handling and transactional trip imports.
 */

export type {
  BulkImportResult,
  GHINLookupResult,
  ImportSource,
  ImportValidationResult,
  PlayerImportRow,
} from '@/lib/types/captain';

export { detectImportFormat, generateCSVTemplate, parseClipboardText, parseCSV } from './bulk-import/bulkImportParse';
export {
  createPlayersFromImport,
  executeBulkImport,
  lookupGHIN,
} from './bulk-import/bulkImportPlan';
export { formatImportSummary } from './bulk-import/bulkImportSummary';
export { importPlayersToTrip } from './bulk-import/bulkImportTransactions';
export { validateImportRows } from './bulk-import/bulkImportValidation';
