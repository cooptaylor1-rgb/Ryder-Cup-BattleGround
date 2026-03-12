import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';
import {
  detectImportFormat,
  executeBulkImport,
  formatImportSummary,
  importPlayersToTrip,
} from '@/lib/services/bulkImportService';
import type { Player, Trip } from '@/lib/types/models';

function isoNow() {
  return '2026-03-12T12:00:00.000Z';
}

function createTrip(id = 'trip-1'): Trip {
  const now = isoNow();
  return {
    id,
    name: 'Founders Cup',
    startDate: now,
    endDate: now,
    isCaptainModeEnabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

function createExistingPlayer(id: string, tripId: string, firstName: string, lastName: string): Player {
  return {
    id,
    tripId,
    firstName,
    lastName,
    createdAt: isoNow(),
    updatedAt: isoNow(),
  };
}

describe('bulkImportService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await db.delete();
  });

  it('executeBulkImport skips duplicates when skipDuplicates is enabled and reports them accurately', () => {
    const existingPlayers = [createExistingPlayer('player-1', 'trip-1', 'John', 'Smith')];
    const csv = ['First Name,Last Name,Email', 'John,Smith,john@example.com', 'Jane,Doe,jane@example.com'].join(
      '\n'
    );

    const result = executeBulkImport('csv', csv, existingPlayers, { skipDuplicates: true });

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.errorCount).toBe(0);
    expect(result.importedPlayers[0].firstName).toBe('Jane');
    expect(result.validationResults[0].warnings).toContain('Player with this name already exists');
    expect(formatImportSummary(result)).toContain('Skipped 1 duplicate');
  });

  it('detects csv import format from header rows', () => {
    expect(detectImportFormat('First Name,Last Name,Handicap\nJane,Doe,12.4')).toBe('csv');
    expect(detectImportFormat('Jane Doe - 12.4')).toBe('clipboard');
  });

  it('rejects malformed rows before any trip write begins', async () => {
    const trip = createTrip();
    await db.trips.put(trip);

    const csv = ['First Name,Last Name,Email', 'Jane,Doe,not-an-email'].join('\n');
    const result = await importPlayersToTrip(trip.id, 'csv', csv);

    expect(result.success).toBe(false);
    expect(result.importedCount).toBe(0);
    expect(result.errorCount).toBe(1);
    expect(result.validationResults[0].errors).toContain('Invalid email format');
    expect(await db.players.where('tripId').equals(trip.id).count()).toBe(0);
  });

  it('rejects duplicate generated player IDs before any write begins', async () => {
    const trip = createTrip();
    await db.trips.put(trip);

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('duplicate-id');

    const csv = ['First Name,Last Name', 'Jane,Doe', 'John,Smith'].join('\n');
    const result = await importPlayersToTrip(trip.id, 'csv', csv, { skipDuplicates: false });

    expect(result.success).toBe(false);
    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.validationResults.some((item) => item.errors.includes('Generated duplicate player IDs during bulk import'))).toBe(true);
    expect(await db.players.where('tripId').equals(trip.id).count()).toBe(0);
  });

  it('rolls back the entire apply if player persistence fails mid-transaction', async () => {
    const trip = createTrip();
    await db.trips.put(trip);

    vi.spyOn(db.players, 'bulkAdd').mockRejectedValueOnce(new Error('players bulk add failed'));

    const csv = ['First Name,Last Name', 'Jane,Doe', 'John,Smith'].join('\n');
    const result = await importPlayersToTrip(trip.id, 'csv', csv);

    expect(result.success).toBe(false);
    expect(result.validationResults.some((item) => item.errors.some((error) => error.includes('players bulk add failed')))).toBe(true);
    expect(await db.players.where('tripId').equals(trip.id).count()).toBe(0);
  });

  it('persists imported players with trip ownership and stable ordering when the import succeeds', async () => {
    const trip = createTrip();
    await db.trips.put(trip);

    const csv = ['First Name,Last Name,Handicap', 'Jane,Doe,11.2', 'John,Smith,7.4'].join('\n');
    const result = await importPlayersToTrip(trip.id, 'csv', csv);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(2);

    const players = await db.players.where('tripId').equals(trip.id).sortBy('firstName');
    expect(players).toHaveLength(2);
    expect(players.every((player) => player.tripId === trip.id)).toBe(true);
    expect(players.map((player) => player.firstName)).toEqual(['Jane', 'John']);
  });
});
