import { describe, expect, it } from 'vitest';
import { deriveScoreAuditAction } from '@/lib/utils/scoringAudit';

describe('deriveScoreAuditAction', () => {
  it('returns scoreEntered when hole has no prior result', () => {
    expect(deriveScoreAuditAction(undefined)).toBe('scoreEntered');
  });

  it('returns scoreEntered when prior result is none', () => {
    expect(
      deriveScoreAuditAction({
        id: 'h1',
        matchId: 'm1',
        holeNumber: 1,
        winner: 'none',
        timestamp: new Date().toISOString(),
      })
    ).toBe('scoreEntered');
  });

  it('returns scoreEdited when prior scored winner exists', () => {
    expect(
      deriveScoreAuditAction({
        id: 'h1',
        matchId: 'm1',
        holeNumber: 1,
        winner: 'teamA',
        timestamp: new Date().toISOString(),
      })
    ).toBe('scoreEdited');
  });
});
