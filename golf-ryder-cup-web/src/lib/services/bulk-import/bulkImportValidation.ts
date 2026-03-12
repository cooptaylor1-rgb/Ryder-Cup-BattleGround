import type { ImportValidationResult, PlayerImportRow } from '@/lib/types/captain';
import type { Player } from '@/lib/types/models';

import {
  buildEmailKey,
  buildGhinKey,
  buildNameKey,
} from './bulkImportShared';
import type { BulkImportDuplicateContext } from './bulkImportTypes';

export function validateImportRows(rows: PlayerImportRow[]): ImportValidationResult[] {
  return rows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!row.firstName || row.firstName.length < 1) {
      errors.push('First name is required');
    }

    if (!row.lastName || row.lastName.length < 1) {
      warnings.push('Last name is missing');
    }

    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push('Invalid email format');
    }

    if (row.handicapIndex !== undefined && (row.handicapIndex < -10 || row.handicapIndex > 54)) {
      errors.push('Handicap must be between -10 and 54');
    } else if (row.handicapIndex === undefined) {
      warnings.push('Handicap not provided');
    }

    if (row.ghin && !/^\d{5,8}$/.test(row.ghin)) {
      warnings.push('GHIN number format may be invalid');
    }

    return {
      isValid: errors.length === 0,
      row,
      rowNumber: index + 1,
      errors,
      warnings,
    };
  });
}

export function detectDuplicateRows(
  rows: PlayerImportRow[],
  existingPlayers: Player[]
): BulkImportDuplicateContext {
  const duplicateExistingNames = new Set<string>();
  const duplicateExistingEmails = new Set<string>();
  const duplicateExistingGhins = new Set<string>();
  const duplicatePayloadNames = new Set<number>();
  const duplicatePayloadEmails = new Set<number>();
  const duplicatePayloadGhins = new Set<number>();

  const existingNameKeys = new Set(existingPlayers.map((player) => buildNameKey(player.firstName, player.lastName)));
  const existingEmailKeys = new Set(
    existingPlayers
      .map((player) => buildEmailKey(player.email))
      .filter((value): value is string => Boolean(value))
  );
  const existingGhinKeys = new Set(
    existingPlayers
      .map((player) => buildGhinKey(player.ghin))
      .filter((value): value is string => Boolean(value))
  );

  const seenNameKeys = new Set<string>();
  const seenEmailKeys = new Set<string>();
  const seenGhinKeys = new Set<string>();

  rows.forEach((row, index) => {
    const nameKey = buildNameKey(row.firstName, row.lastName);
    const emailKey = buildEmailKey(row.email);
    const ghinKey = buildGhinKey(row.ghin);

    if (nameKey) {
      if (existingNameKeys.has(nameKey)) {
        duplicateExistingNames.add(nameKey);
      }
      if (seenNameKeys.has(nameKey)) {
        duplicatePayloadNames.add(index);
      }
      seenNameKeys.add(nameKey);
    }

    if (emailKey) {
      if (existingEmailKeys.has(emailKey)) {
        duplicateExistingEmails.add(emailKey);
      }
      if (seenEmailKeys.has(emailKey)) {
        duplicatePayloadEmails.add(index);
      }
      seenEmailKeys.add(emailKey);
    }

    if (ghinKey) {
      if (existingGhinKeys.has(ghinKey)) {
        duplicateExistingGhins.add(ghinKey);
      }
      if (seenGhinKeys.has(ghinKey)) {
        duplicatePayloadGhins.add(index);
      }
      seenGhinKeys.add(ghinKey);
    }
  });

  return {
    duplicateExistingNames,
    duplicateExistingEmails,
    duplicateExistingGhins,
    duplicatePayloadNames,
    duplicatePayloadEmails,
    duplicatePayloadGhins,
  };
}

export function annotateValidationResultsForDuplicates(
  results: ImportValidationResult[],
  duplicates: BulkImportDuplicateContext
): ImportValidationResult[] {
  return results.map((result, index) => {
    const warnings = [...result.warnings];
    const nameKey = buildNameKey(result.row.firstName, result.row.lastName);
    const emailKey = buildEmailKey(result.row.email);
    const ghinKey = buildGhinKey(result.row.ghin);

    if (nameKey && duplicates.duplicateExistingNames.has(nameKey)) {
      warnings.push('Player with this name already exists');
    }
    if (emailKey && duplicates.duplicateExistingEmails.has(emailKey)) {
      warnings.push('Player with this email already exists');
    }
    if (ghinKey && duplicates.duplicateExistingGhins.has(ghinKey)) {
      warnings.push('Player with this GHIN already exists');
    }
    if (duplicates.duplicatePayloadNames.has(index)) {
      warnings.push('Duplicate player name in this import');
    }
    if (emailKey && duplicates.duplicatePayloadEmails.has(index)) {
      warnings.push('Duplicate player email in this import');
    }
    if (ghinKey && duplicates.duplicatePayloadGhins.has(index)) {
      warnings.push('Duplicate player GHIN in this import');
    }

    return {
      ...result,
      warnings,
    };
  });
}
