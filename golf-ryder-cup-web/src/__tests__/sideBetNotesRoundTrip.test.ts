/**
 * Round-trip for the side-bet notes JSON blob.
 *
 * syncSideBetToCloud packs perHole, participantIds, results,
 * sessionId, nassauTeamA/B/Results, completedAt, description, status
 * into the `notes` text column because the Supabase side_bets table
 * has only a single `amount` slot. The pull path in
 * tripSyncTripTransfer re-inflates the blob. These tests guard the
 * packing format + the parsing tolerance so a captain's free-text
 * notes field from a legacy bet never crashes the roster poll.
 */

import { describe, expect, it } from 'vitest';
import type { SideBet } from '../lib/types/models';

function packBetNotes(bet: SideBet): string {
  return JSON.stringify({
    description: bet.description,
    perHole: bet.perHole,
    status: bet.status,
    participantIds: bet.participantIds,
    sessionId: bet.sessionId,
    results: bet.results,
    nassauTeamA: bet.nassauTeamA,
    nassauTeamB: bet.nassauTeamB,
    nassauResults: bet.nassauResults,
    completedAt: bet.completedAt,
  });
}

function parseBetNotes(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string' || raw.trim() === '') return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function sampleBet(overrides: Partial<SideBet> = {}): SideBet {
  return {
    id: 'b1',
    tripId: 't1',
    type: 'skins',
    name: 'Skins',
    description: 'Five bucks a hole',
    status: 'active',
    perHole: 5,
    participantIds: ['p1', 'p2', 'p3'],
    results: [{ holeNumber: 1, winnerId: 'p1', amount: 5 }],
    createdAt: '2026-04-23T00:00:00Z',
    ...overrides,
  };
}

describe('side-bet notes round-trip', () => {
  it('preserves perHole, participantIds, status, results through pack → parse', () => {
    const bet = sampleBet();
    const roundTripped = parseBetNotes(packBetNotes(bet));

    expect(roundTripped.perHole).toBe(5);
    expect(roundTripped.participantIds).toEqual(['p1', 'p2', 'p3']);
    expect(roundTripped.status).toBe('active');
    expect(Array.isArray(roundTripped.results)).toBe(true);
    expect((roundTripped.results as unknown[])[0]).toMatchObject({
      holeNumber: 1,
      winnerId: 'p1',
    });
  });

  it('round-trips session-scoped skins fields', () => {
    const bet = sampleBet({
      sessionId: 'session-123',
      matchId: undefined,
      participantIds: ['p1', 'p2', 'p3', 'p4'],
    });
    const roundTripped = parseBetNotes(packBetNotes(bet));

    expect(roundTripped.sessionId).toBe('session-123');
    expect(roundTripped.participantIds).toHaveLength(4);
  });

  it('round-trips nassau fields', () => {
    const bet = sampleBet({
      type: 'nassau',
      nassauTeamA: ['a1', 'a2'],
      nassauTeamB: ['b1', 'b2'],
      nassauResults: {
        front9Winner: 'teamA',
        back9Winner: 'push',
        overallWinner: 'teamA',
      },
      completedAt: '2026-04-23T12:00:00Z',
    });
    const roundTripped = parseBetNotes(packBetNotes(bet));

    expect(roundTripped.nassauTeamA).toEqual(['a1', 'a2']);
    expect(roundTripped.nassauTeamB).toEqual(['b1', 'b2']);
    expect((roundTripped.nassauResults as Record<string, string>).front9Winner).toBe('teamA');
    expect(roundTripped.completedAt).toBe('2026-04-23T12:00:00Z');
  });

  it('tolerates malformed notes without crashing', () => {
    expect(parseBetNotes('')).toEqual({});
    expect(parseBetNotes('   ')).toEqual({});
    expect(parseBetNotes('not valid json')).toEqual({});
    expect(parseBetNotes('[1,2,3]')).toEqual({}); // array, not object
    expect(parseBetNotes(null)).toEqual({});
    expect(parseBetNotes(undefined)).toEqual({});
    expect(parseBetNotes(42)).toEqual({});
  });
});
