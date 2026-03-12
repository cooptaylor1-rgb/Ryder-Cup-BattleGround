import type { HoleResult, HoleWinner } from '@/lib/types/models';

export const TOTAL_HOLES = 18;

const VALID_WINNERS = new Set<HoleWinner>(['teamA', 'teamB', 'halved', 'none']);

export function isValidHoleNumber(holeNumber: number): boolean {
  return Number.isInteger(holeNumber) && holeNumber >= 1 && holeNumber <= TOTAL_HOLES;
}

export function isValidWinner(winner: HoleWinner | string): winner is HoleWinner {
  return VALID_WINNERS.has(winner as HoleWinner);
}

function getTimestampValue(value: string | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function normalizeHoleResults(holeResults: HoleResult[]): HoleResult[] {
  const byHole = new Map<number, HoleResult>();

  for (const result of holeResults) {
    if (!isValidHoleNumber(result.holeNumber)) {
      continue;
    }

    const existing = byHole.get(result.holeNumber);
    if (!existing) {
      byHole.set(result.holeNumber, result);
      continue;
    }

    const existingTimestamp = getTimestampValue(existing.timestamp);
    const incomingTimestamp = getTimestampValue(result.timestamp);

    if (incomingTimestamp >= existingTimestamp) {
      byHole.set(result.holeNumber, result);
    }
  }

  return [...byHole.values()].sort((left, right) => left.holeNumber - right.holeNumber);
}
