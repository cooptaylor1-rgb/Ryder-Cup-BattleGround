import { db } from '@/lib/db';
import { createLogger } from '@/lib/utils/logger';
import type { Player } from '@/lib/types/models';

const logger = createLogger('RSVPService');

export type RsvpStatus = 'confirmed' | 'tentative' | 'declined' | 'pending';

export interface RsvpSummary {
  confirmed: Player[];
  tentative: Player[];
  declined: Player[];
  pending: Player[];
  total: number;
  confirmedCount: number;
  responseRate: number; // 0-100 percentage
}

/** Update a player's RSVP status */
export async function updateRsvp(playerId: string, status: RsvpStatus): Promise<void> {
  await db.players.update(playerId, {
    rsvpStatus: status,
    rsvpAt: new Date().toISOString(),
  });
  logger.info('RSVP updated', { playerId, status });
}

/** Get RSVP summary for a trip */
export async function getRsvpSummary(tripId: string): Promise<RsvpSummary> {
  const players = await db.players.where('tripId').equals(tripId).toArray();

  const confirmed = players.filter(p => p.rsvpStatus === 'confirmed');
  const tentative = players.filter(p => p.rsvpStatus === 'tentative');
  const declined = players.filter(p => p.rsvpStatus === 'declined');
  const pending = players.filter(p => !p.rsvpStatus || p.rsvpStatus === 'pending');

  const responded = confirmed.length + tentative.length + declined.length;

  return {
    confirmed,
    tentative,
    declined,
    pending,
    total: players.length,
    confirmedCount: confirmed.length,
    responseRate: players.length > 0 ? Math.round((responded / players.length) * 100) : 0,
  };
}

/** Bulk set all unresponded players to 'pending' (useful after import) */
export async function initializeRsvpStatuses(tripId: string): Promise<number> {
  const players = await db.players.where('tripId').equals(tripId).toArray();
  let updated = 0;
  for (const player of players) {
    if (!player.rsvpStatus) {
      await db.players.update(player.id, { rsvpStatus: 'pending' });
      updated++;
    }
  }
  return updated;
}
