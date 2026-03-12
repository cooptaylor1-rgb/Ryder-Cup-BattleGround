import { EXPORT_SCHEMA_VERSION, type ImportResult } from '@/lib/types/export';

export const APP_VERSION = '1.2.0';
export const SCHEMA_VERSION = EXPORT_SCHEMA_VERSION;

export const EMPTY_IMPORT_STATS: ImportResult['stats'] = {
  players: 0,
  teams: 0,
  sessions: 0,
  matches: 0,
  holeResults: 0,
  courses: 0,
};

export function createImportFailure(errors: string[]): ImportResult {
  return {
    success: false,
    tripId: '',
    tripName: '',
    stats: { ...EMPTY_IMPORT_STATS },
    errors,
  };
}

export function formatImportError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

export async function fetchCollectionByIds<T>(
  ids: string[],
  loader: (ids: string[]) => Promise<T[]>
): Promise<T[]> {
  if (ids.length === 0) {
    return [];
  }

  return loader(ids);
}

export function uniqueStringIds(ids: Array<string | undefined | null>): string[] {
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}
