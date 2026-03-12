import type { BulkImportResult, ImportSource, ImportValidationResult } from '@/lib/types/captain';
import type { Player, Trip } from '@/lib/types/models';

export interface BulkImportExecutionOptions {
  skipDuplicates?: boolean;
  skipInvalid?: boolean;
}

export interface ParsedBulkImportInput {
  source: ImportSource;
  rows: import('@/lib/types/captain').PlayerImportRow[];
}

export interface BulkImportPlan {
  validationResults: ImportValidationResult[];
  importedPlayers: Player[];
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  totalRows: number;
}

export interface BulkImportDuplicateContext {
  duplicateExistingNames: Set<string>;
  duplicateExistingEmails: Set<string>;
  duplicateExistingGhins: Set<string>;
  duplicatePayloadNames: Set<number>;
  duplicatePayloadEmails: Set<number>;
  duplicatePayloadGhins: Set<number>;
}

export interface PersistBulkImportOptions extends BulkImportExecutionOptions {
  existingPlayers?: Player[];
}

export interface PersistBulkImportContext {
  trip: Trip;
  plan: BulkImportPlan;
  existingPlayers: Player[];
}

export type BulkImportFactory = (row: import('@/lib/types/captain').PlayerImportRow) => Player;

export type BulkImportResultStats = Pick<
  BulkImportResult,
  'success' | 'totalRows' | 'importedCount' | 'skippedCount' | 'errorCount' | 'validationResults' | 'importedPlayers'
>;
