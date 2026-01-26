/**
 * Trip Export Service
 *
 * Comprehensive backup and export functionality for trip data.
 * Exports all trip data to JSON format for backup/migration.
 *
 * Features:
 * - Full trip data export (players, matches, scores, bets)
 * - Portable JSON format
 * - File download trigger
 * - Import validation
 */

import { db } from '@/lib/db';
import type { Trip, Player, Match, RyderCupSession, Course, SideBet } from '@/lib/types/models';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('TripExportService');

// ============================================
// EXPORT TYPES
// ============================================

export interface TripExportData {
  version: string;
  exportedAt: string;
  app: {
    name: string;
    version: string;
  };
  trip: Trip;
  players: Player[];
  matches: Match[];
  sessions: RyderCupSession[];
  courses: Course[];
  sideBets: SideBet[];
  metadata: {
    totalMatches: number;
    totalSessions: number;
    totalPlayers: number;
    completedMatches: number;
    dateRange: {
      start: string | null;
      end: string | null;
    };
  };
}

export interface ExportOptions {
  /** Include match details */
  includeMatches?: boolean;
  /** Include side bets */
  includeSideBets?: boolean;
  /** Include course data */
  includeCourses?: boolean;
  /** Pretty print JSON */
  prettyPrint?: boolean;
}

const DEFAULT_OPTIONS: ExportOptions = {
  includeMatches: true,
  includeSideBets: true,
  includeCourses: true,
  prettyPrint: true,
};

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export a complete trip to JSON format
 */
export async function exportTrip(
  tripId: string,
  options: ExportOptions = {}
): Promise<TripExportData> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  logger.info(`Exporting trip ${tripId}`);

  // Fetch trip
  const trip = await db.trips.get(tripId);
  if (!trip) {
    throw new Error(`Trip not found: ${tripId}`);
  }

  // Fetch related data
  const players = await db.players.where('tripId').equals(tripId).toArray();
  const sessions = await db.sessions.where('tripId').equals(tripId).toArray();

  let matches: Match[] = [];
  let courses: Course[] = [];
  let sideBets: SideBet[] = [];

  if (opts.includeMatches) {
    matches = await db.matches.where('tripId').equals(tripId).toArray();
  }

  if (opts.includeCourses) {
    // Get all courses - they're global resources not tied to trips
    courses = await db.courses.toArray();
  }

  if (opts.includeSideBets) {
    sideBets = await db.sideBets.where('tripId').equals(tripId).toArray();
  }

  // Calculate metadata
  const completedMatches = matches.filter(m => m.status === 'completed').length;
  const sessionDates = sessions
    .map((s: RyderCupSession) => s.scheduledDate)
    .filter(Boolean)
    .sort();

  const exportData: TripExportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    app: {
      name: 'Golf Ryder Cup',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    },
    trip,
    players,
    matches,
    sessions,
    courses,
    sideBets,
    metadata: {
      totalMatches: matches.length,
      totalSessions: sessions.length,
      totalPlayers: players.length,
      completedMatches,
      dateRange: {
        start: sessionDates[0] || null,
        end: sessionDates[sessionDates.length - 1] || null,
      },
    },
  };

  logger.info(`Export complete: ${players.length} players, ${matches.length} matches`);
  return exportData;
}

/**
 * Download trip export as JSON file
 */
export async function downloadTripExport(
  tripId: string,
  options: ExportOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const exportData = await exportTrip(tripId, options);

  // Format filename
  const tripName = exportData.trip.name
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  const filename = `${tripName}-backup-${date}.json`;

  // Create blob and download
  const json = opts.prettyPrint
    ? JSON.stringify(exportData, null, 2)
    : JSON.stringify(exportData);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
  logger.info(`Downloaded backup: ${filename}`);
}

// ============================================
// IMPORT FUNCTIONS
// ============================================

export interface ImportResult {
  success: boolean;
  tripId: string | null;
  imported: {
    players: number;
    matches: number;
    sessions: number;
    courses: number;
    sideBets: number;
  };
  errors: string[];
}

/**
 * Validate import data structure
 */
export function validateImportData(data: unknown): data is TripExportData {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  // Check required fields
  if (!d.version || typeof d.version !== 'string') return false;
  if (!d.trip || typeof d.trip !== 'object') return false;
  if (!Array.isArray(d.players)) return false;
  if (!Array.isArray(d.matches)) return false;
  if (!Array.isArray(d.sessions)) return false;

  // Check trip has required fields
  const trip = d.trip as Record<string, unknown>;
  if (!trip.id || !trip.name) return false;

  return true;
}

/**
 * Import a trip from JSON export
 */
export async function importTrip(
  data: TripExportData,
  options: { generateNewIds?: boolean } = {}
): Promise<ImportResult> {
  const { generateNewIds = true } = options;
  const errors: string[] = [];

  logger.info(`Importing trip: ${data.trip.name}`);

  try {
    // Generate ID mapping if needed
    const idMap = new Map<string, string>();

    const mapId = (oldId: string, prefix: string): string => {
      if (!generateNewIds) return oldId;
      if (!idMap.has(oldId)) {
        idMap.set(oldId, `${prefix}-${crypto.randomUUID()}`);
      }
      return idMap.get(oldId)!;
    };

    // Map trip ID
    const newTripId = mapId(data.trip.id, 'trip');

    // Import trip
    const importedTrip = {
      ...data.trip,
      id: newTripId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.trips.add(importedTrip);

    // Import players
    let playersImported = 0;
    for (const player of data.players) {
      try {
        const newPlayerId = mapId(player.id, 'player');
        await db.players.add({
          ...player,
          id: newPlayerId,
          tripId: newTripId,
        });
        playersImported++;
      } catch (e) {
        const playerName = `${player.firstName} ${player.lastName}`;
        errors.push(`Failed to import player ${playerName}: ${e}`);
      }
    }

    // Import courses
    let coursesImported = 0;
    for (const course of data.courses || []) {
      try {
        const newCourseId = mapId(course.id, 'course');
        await db.courses.add({
          ...course,
          id: newCourseId,
        });
        coursesImported++;
      } catch (e) {
        errors.push(`Failed to import course ${course.name}: ${e}`);
      }
    }

    // Import sessions
    let sessionsImported = 0;
    for (const session of data.sessions) {
      try {
        const newSessionId = mapId(session.id, 'session');
        await db.sessions.add({
          ...session,
          id: newSessionId,
          tripId: newTripId,
        });
        sessionsImported++;
      } catch (e) {
        errors.push(`Failed to import session: ${e}`);
      }
    }

    // Import matches
    let matchesImported = 0;
    for (const match of data.matches) {
      try {
        const newMatchId = mapId(match.id, 'match');
        await db.matches.add({
          ...match,
          id: newMatchId,
          sessionId: mapId(match.sessionId, 'session'),
        });
        matchesImported++;
      } catch (e) {
        errors.push(`Failed to import match: ${e}`);
      }
    }

    // Import side bets
    let sideBetsImported = 0;
    for (const bet of data.sideBets || []) {
      try {
        const newBetId = mapId(bet.id, 'bet');
        await db.sideBets.add({
          ...bet,
          id: newBetId,
          tripId: newTripId,
        });
        sideBetsImported++;
      } catch (e) {
        errors.push(`Failed to import side bet: ${e}`);
      }
    }

    logger.info(`Import complete: trip ${newTripId}`);

    return {
      success: true,
      tripId: newTripId,
      imported: {
        players: playersImported,
        matches: matchesImported,
        sessions: sessionsImported,
        courses: coursesImported,
        sideBets: sideBetsImported,
      },
      errors,
    };
  } catch (e) {
    logger.error('Import failed:', e);
    return {
      success: false,
      tripId: null,
      imported: {
        players: 0,
        matches: 0,
        sessions: 0,
        courses: 0,
        sideBets: 0,
      },
      errors: [`Import failed: ${e}`],
    };
  }
}

/**
 * Parse and import from JSON file
 */
export async function importFromFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (!validateImportData(data)) {
          resolve({
            success: false,
            tripId: null,
            imported: { players: 0, matches: 0, sessions: 0, courses: 0, sideBets: 0 },
            errors: ['Invalid backup file format'],
          });
          return;
        }

        const result = await importTrip(data);
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse backup file: ${e}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

const tripExportService = {
  exportTrip,
  downloadTripExport,
  importTrip,
  importFromFile,
  validateImportData,
};

export default tripExportService;
