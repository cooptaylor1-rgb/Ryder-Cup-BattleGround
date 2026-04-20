/**
 * Session Pause Service
 *
 * Captain-facing verbs for halting and resuming a session without closing
 * matches. Built for rain delays and mid-round interruptions: pause keeps
 * match state intact, resume restores the normal inProgress flow.
 *
 * Match-level state is untouched — a paused session's matches retain
 * their inProgress status and currentHole. This keeps handicap
 * allowances, scored holes, and undo history valid. Scoring UI can
 * check the session status if it wants to gate score entry during a
 * pause (not currently enforced here so individual captains can still
 * score holes already played if needed).
 */

import { db } from '@/lib/db';
import { queueSyncOperation } from '@/lib/services/tripSyncService';
import { captainLogger } from '@/lib/utils/logger';

export async function pauseSession(sessionId: string, reason?: string): Promise<void> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);
  if (session.status === 'paused') return;
  if (session.status === 'completed') {
    throw new Error('Completed sessions cannot be paused.');
  }

  const updated = { ...session, status: 'paused' as const };
  await db.sessions.update(sessionId, { status: 'paused' });
  queueSyncOperation('session', sessionId, 'update', session.tripId, updated);

  captainLogger.info('Session paused', { sessionId, reason });
}

export async function resumeSession(sessionId: string): Promise<void> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);
  if (session.status !== 'paused') return;

  // Restore to inProgress if any matches in the session have started,
  // otherwise back to scheduled. This avoids accidentally marking a
  // session "live" when nothing was ever scored.
  const matches = await db.matches.where('sessionId').equals(sessionId).toArray();
  const hasStarted = matches.some((m) => m.status === 'inProgress' || m.status === 'completed');
  const nextStatus: 'inProgress' | 'scheduled' = hasStarted ? 'inProgress' : 'scheduled';

  const updated = { ...session, status: nextStatus };
  await db.sessions.update(sessionId, { status: nextStatus });
  queueSyncOperation('session', sessionId, 'update', session.tripId, updated);

  captainLogger.info('Session resumed', { sessionId, nextStatus });
}
