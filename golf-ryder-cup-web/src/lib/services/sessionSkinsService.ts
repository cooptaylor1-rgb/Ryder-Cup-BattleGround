import { db } from '@/lib/db';
import { queueSyncOperation } from '@/lib/services/tripSyncService';
import type { Match, RyderCupSession, SideBet, UUID } from '@/lib/types/models';

/**
 * Create a session-wide skins bet bound to a practice session. The
 * bet pools every player across every group in the session — no
 * matchId, participantIds seeded from the session's published
 * groups. Results are NOT stored on the bet; the detail page and
 * SessionSkinsCard derive them live from practice scores via
 * computeSessionSkinsBoard.
 */
export async function createSessionSkinsBet({
  session,
  matches,
  perHole,
  name,
}: {
  session: RyderCupSession;
  matches: Match[];
  perHole: number;
  name?: string;
}): Promise<SideBet> {
  const now = new Date().toISOString();
  const sessionMatches = matches.filter(
    (m) => m.sessionId === session.id && m.mode === 'practice'
  );
  const participantIds = Array.from(
    new Set(sessionMatches.flatMap((m) => [...m.teamAPlayerIds, ...m.teamBPlayerIds]))
  );

  const bet: SideBet = {
    id: crypto.randomUUID(),
    tripId: session.tripId,
    sessionId: session.id,
    type: 'skins',
    name: name?.trim() || `${session.name} skins`,
    description: 'Session-wide skins pool — best net per hole across every group.',
    status: 'active',
    perHole,
    participantIds,
    createdAt: now,
  };

  await db.sideBets.add(bet);
  queueSyncOperation('sideBet', bet.id, 'create', session.tripId, bet);
  return bet;
}

/**
 * Fetch the existing session-scoped skins bet for a session, or
 * undefined if none exists. Used to gate the "Start session skins"
 * CTA and to seed render paths.
 */
export async function findSessionSkinsBet(
  tripId: UUID,
  sessionId: UUID
): Promise<SideBet | undefined> {
  const bets = await db.sideBets
    .where('tripId')
    .equals(tripId)
    .and((b) => b.sessionId === sessionId && !b.matchId && b.type === 'skins')
    .toArray();
  return bets[0];
}
