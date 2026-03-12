import type {
  BulkImportResult,
  GHINLookupResult,
  ImportSource,
  ImportValidationResult,
  PlayerImportRow,
} from '@/lib/types/captain';
import type { Player } from '@/lib/types/models';

import { parseImportData } from './bulkImportParse';
import { createImportedPlayer } from './bulkImportShared';
import { buildRejectedBulkImportResult, buildBulkImportResult } from './bulkImportSummary';
import type { BulkImportExecutionOptions, BulkImportPlan } from './bulkImportTypes';
import {
  annotateValidationResultsForDuplicates,
  detectDuplicateRows,
  validateImportRows,
} from './bulkImportValidation';

function isDuplicateWarning(warning: string): boolean {
  return warning.includes('already exists') || warning.includes('Duplicate player');
}

function shouldSkipRow(result: ImportValidationResult, skipDuplicates: boolean): boolean {
  if (!skipDuplicates) {
    return false;
  }

  return result.warnings.some(isDuplicateWarning);
}

export function createPlayersFromImport(
  validatedRows: ImportValidationResult[],
  skipInvalid: boolean = false
): Player[] {
  return validatedRows.flatMap((result) => {
    if (!result.isValid) {
      return skipInvalid ? [] : [];
    }

    return [
      createImportedPlayer(result.row),
    ];
  });
}

export function buildBulkImportPlan(
  rows: PlayerImportRow[],
  existingPlayers: Player[] = [],
  options: BulkImportExecutionOptions = {}
): BulkImportPlan {
  const { skipDuplicates = true } = options;
  const validatedRows = validateImportRows(rows);
  const duplicates = detectDuplicateRows(rows, existingPlayers);
  const annotatedResults = annotateValidationResultsForDuplicates(validatedRows, duplicates);

  const importedPlayers: Player[] = [];
  let skippedCount = 0;
  let errorCount = 0;

  annotatedResults.forEach((result) => {
    if (!result.isValid) {
      errorCount += 1;
      return;
    }

    if (shouldSkipRow(result, skipDuplicates)) {
      skippedCount += 1;
      return;
    }

    importedPlayers.push(createImportedPlayer(result.row));
  });

  return {
    validationResults: annotatedResults,
    importedPlayers,
    importedCount: importedPlayers.length,
    skippedCount,
    errorCount,
    totalRows: rows.length,
  };
}

export function executeBulkImport(
  source: ImportSource,
  data: string,
  existingPlayers: Player[] = [],
  options: BulkImportExecutionOptions = {}
): BulkImportResult {
  const parsed = parseImportData(source, data);
  const plan = buildBulkImportPlan(parsed.rows, existingPlayers, options);
  return buildBulkImportResult(plan);
}

export async function lookupGHIN(ghinNumber: string): Promise<GHINLookupResult> {
  if (!ghinNumber || !/^\d{5,8}$/.test(ghinNumber)) {
    return {
      found: false,
      ghinNumber,
      error: 'Invalid GHIN number format',
    };
  }

  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });

  return {
    found: false,
    ghinNumber,
    error: 'GHIN API integration not yet available',
  };
}

export function rejectBulkImportPlan(plan: BulkImportPlan): BulkImportResult {
  return buildRejectedBulkImportResult(plan);
}
