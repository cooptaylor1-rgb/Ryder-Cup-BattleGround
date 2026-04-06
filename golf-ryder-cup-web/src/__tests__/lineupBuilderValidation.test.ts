/**
 * Tests for strengthened lineup validation.
 *
 * These cover the session-publish guard rails that prevent captains from
 * publishing broken sessions during the live event.
 */

import { describe, it, expect } from 'vitest';
import { validateLineupBuilder } from '@/components/captain/lineupBuilderValidation';
import type { MatchSlot, Player } from '@/components/captain/lineupBuilderTypes';

function makePlayer(id: string, team: 'A' | 'B', firstName = id): Player {
  return {
    id,
    firstName,
    lastName: 'Doe',
    handicapIndex: 10,
    team,
  };
}

function makeMatch(id: string, a: Player[], b: Player[]): MatchSlot {
  return { id, teamAPlayers: a, teamBPlayers: b };
}

describe('validateLineupBuilder', () => {
  describe('empty lineup guard', () => {
    it('blocks publish when there are no matches at all', () => {
      const result = validateLineupBuilder([], 1, null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Add at least one match before publishing');
    });
  });

  describe('per-match player count', () => {
    it('passes a complete singles match', () => {
      const match = makeMatch('m1', [makePlayer('a1', 'A')], [makePlayer('b1', 'B')]);
      const result = validateLineupBuilder([match], 1, null);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('flags a match missing a Team A player', () => {
      const match = makeMatch('m1', [], [makePlayer('b1', 'B')]);
      const result = validateLineupBuilder([match], 1, null);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Team A'))).toBe(true);
    });

    it('flags a match missing a Team B player', () => {
      const match = makeMatch('m1', [makePlayer('a1', 'A')], []);
      const result = validateLineupBuilder([match], 1, null);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Team B'))).toBe(true);
    });

    it('enforces playersPerTeam=2 for fourball/foursomes', () => {
      const match = makeMatch(
        'm1',
        [makePlayer('a1', 'A')],
        [makePlayer('b1', 'B'), makePlayer('b2', 'B')],
      );
      const result = validateLineupBuilder([match], 2, null);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Team A needs 2'))).toBe(true);
    });

    it('passes a complete foursomes match', () => {
      const match = makeMatch(
        'm1',
        [makePlayer('a1', 'A'), makePlayer('a2', 'A')],
        [makePlayer('b1', 'B'), makePlayer('b2', 'B')],
      );
      const result = validateLineupBuilder([match], 2, null);
      expect(result.isValid).toBe(true);
    });
  });

  describe('duplicate player guard', () => {
    it('flags a player who appears in two matches on the same team', () => {
      const a1 = makePlayer('a1', 'A', 'Alice');
      const match1 = makeMatch('m1', [a1], [makePlayer('b1', 'B')]);
      const match2 = makeMatch('m2', [a1], [makePlayer('b2', 'B')]);
      const result = validateLineupBuilder([match1, match2], 1, null);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Match 1') && e.includes('Match 2'))).toBe(
        true,
      );
    });

    it('flags a player who swapped teams between matches', () => {
      const a1 = makePlayer('a1', 'A', 'Alice');
      const match1 = makeMatch('m1', [a1], [makePlayer('b1', 'B')]);
      // Same id, different team assignment — treat it as a duplicate.
      const match2 = makeMatch('m2', [makePlayer('a2', 'A')], [a1]);
      const result = validateLineupBuilder([match1, match2], 1, null);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('can only play one match'))).toBe(true);
    });

    it('does NOT flag duplicates when a different player has the same name', () => {
      const match1 = makeMatch(
        'm1',
        [makePlayer('a1', 'A', 'Alice')],
        [makePlayer('b1', 'B')],
      );
      const match2 = makeMatch(
        'm2',
        [makePlayer('a2', 'A', 'Alice')],
        [makePlayer('b2', 'B')],
      );
      const result = validateLineupBuilder([match1, match2], 1, null);
      expect(result.isValid).toBe(true);
    });
  });

  describe('fairness warnings', () => {
    it('propagates fairness warnings without blocking publish', () => {
      const match = makeMatch('m1', [makePlayer('a1', 'A')], [makePlayer('b1', 'B')]);
      const result = validateLineupBuilder([match], 1, {
        overall: 70,
        handicapBalance: 60,
        experienceBalance: 80,
        warnings: ['Team A has a 5-stroke handicap advantage'],
      });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Team A has a 5-stroke handicap advantage');
    });
  });
});
