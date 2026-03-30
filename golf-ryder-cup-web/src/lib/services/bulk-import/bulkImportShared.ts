
import type { PlayerImportRow } from '@/lib/types/captain';
import type { Player } from '@/lib/types/models';

export function normalizeCell(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function buildNameKey(firstName: string, lastName: string): string {
  return `${normalizeCell(firstName)} ${normalizeCell(lastName)}`.trim().toLowerCase();
}

export function buildEmailKey(email: string | undefined): string | null {
  const normalized = normalizeCell(email).toLowerCase();
  return normalized || null;
}

export function buildGhinKey(ghin: string | undefined): string | null {
  const normalized = normalizeCell(ghin);
  return normalized || null;
}

export function createImportedPlayer(row: PlayerImportRow): Player {
  const now = new Date().toISOString();

  return {
    id: generatePlayerId(),
    firstName: normalizeCell(row.firstName),
    lastName: normalizeCell(row.lastName),
    email: normalizeCell(row.email) || undefined,
    handicapIndex: row.handicapIndex,
    ghin: normalizeCell(row.ghin) || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function generatePlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomUUID();
}
