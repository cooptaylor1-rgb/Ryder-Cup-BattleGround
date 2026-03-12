import { db } from '@/lib/db';
import type { BulkImportResult, ImportSource } from '@/lib/types/captain';
import type { Player } from '@/lib/types/models';

import { parseImportData } from './bulkImportParse';
import { buildBulkImportPlan, rejectBulkImportPlan } from './bulkImportPlan';
import type { PersistBulkImportOptions } from './bulkImportTypes';

function mergeExistingPlayers(existingPlayers: Player[], tripPlayers: Player[]): Player[] {
  const merged = new Map<string, Player>();

  [...tripPlayers, ...existingPlayers].forEach((player) => {
    merged.set(player.id, player);
  });

  return [...merged.values()];
}

export async function importPlayersToTrip(
  tripId: string,
  source: ImportSource,
  data: string,
  options: PersistBulkImportOptions = {}
): Promise<BulkImportResult> {
  const { skipInvalid = false, existingPlayers = [], ...planOptions } = options;
  const parsed = parseImportData(source, data);
  const trip = await db.trips.get(tripId);

  if (!trip) {
    const plan = buildBulkImportPlan(parsed.rows, existingPlayers, planOptions);
    const rejection = rejectBulkImportPlan(plan);
    rejection.validationResults = [
      ...rejection.validationResults,
      {
        isValid: false,
        row: { firstName: '', lastName: '' },
        rowNumber: 0,
        errors: [`Trip not found: ${tripId}`],
        warnings: [],
      },
    ];
    rejection.errorCount += 1;
    return rejection;
  }

  const currentTripPlayers = await db.players.where('tripId').equals(tripId).toArray();
  const plan = buildBulkImportPlan(
    parsed.rows,
    mergeExistingPlayers(existingPlayers, currentTripPlayers),
    planOptions
  );

  if (!skipInvalid && plan.errorCount > 0) {
    return rejectBulkImportPlan(plan);
  }

  const persistedPlayers = plan.importedPlayers.map((player) => ({
    ...player,
    tripId,
  }));

  if (new Set(persistedPlayers.map((player) => player.id)).size !== persistedPlayers.length) {
    const rejection = rejectBulkImportPlan(plan);
    rejection.validationResults = [
      ...rejection.validationResults,
      {
        isValid: false,
        row: { firstName: '', lastName: '' },
        rowNumber: 0,
        errors: ['Generated duplicate player IDs during bulk import'],
        warnings: [],
      },
    ];
    rejection.errorCount += 1;
    return rejection;
  }

  try {
    await db.transaction('rw', [db.players], async () => {
      if (persistedPlayers.length > 0) {
        await db.players.bulkAdd(persistedPlayers);
      }
    });
  } catch (error) {
    const rejection = rejectBulkImportPlan(plan);
    rejection.validationResults = [
      ...rejection.validationResults,
      {
        isValid: false,
        row: { firstName: '', lastName: '' },
        rowNumber: 0,
        errors: [`Bulk import transaction failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: [],
      },
    ];
    rejection.errorCount += 1;
    return rejection;
  }

  return {
    success: persistedPlayers.length > 0,
    totalRows: plan.totalRows,
    importedCount: persistedPlayers.length,
    skippedCount: plan.skippedCount,
    errorCount: plan.errorCount,
    validationResults: plan.validationResults,
    importedPlayers: persistedPlayers,
  };
}
