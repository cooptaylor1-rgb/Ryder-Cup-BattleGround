import type { HoleResult } from '@/lib/types/models';

export type ScoreAuditAction = 'scoreEntered' | 'scoreEdited';

export function deriveScoreAuditAction(currentHoleResult?: HoleResult): ScoreAuditAction {
  const wasUnscored = !currentHoleResult || currentHoleResult.winner === 'none';
  return wasUnscored ? 'scoreEntered' : 'scoreEdited';
}
