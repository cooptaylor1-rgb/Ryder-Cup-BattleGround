import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/lib/db';
import {
  createAnnouncement,
  createTripInvitation,
  replaceCartAssignmentsForScope,
  resendTripInvitation,
  revokeTripInvitation,
  upsertAttendanceRecord,
} from '@/lib/services/tripLogisticsService';
import { clearQueue, getPendingSyncIdsForTrip } from '@/lib/services/tripSyncService';

const TRIP_ID = 'trip-1';

describe('tripLogisticsService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await clearQueue();
  });

  afterEach(async () => {
    await clearQueue();
    await db.delete();
  });

  it('persists personal invitations and queues send/resend/revoke state', async () => {
    const invitation = await createTripInvitation({
      tripId: TRIP_ID,
      recipientName: 'Jordan',
      recipientEmail: 'jordan@example.com',
      assignedTeam: 'A',
      inviteCode: 'ABCD1234',
      inviteUrl: 'https://example.com/join?code=ABCD1234',
    });

    expect(invitation.inviteUrl).toContain(`invite=${invitation.id}`);
    expect(getPendingSyncIdsForTrip(TRIP_ID, 'tripInvitation').has(invitation.id)).toBe(true);

    const resent = await resendTripInvitation(invitation.id);
    expect(resent).toMatchObject({
      id: invitation.id,
      status: 'sent',
      recipientEmail: 'jordan@example.com',
    });

    const revoked = await revokeTripInvitation(invitation.id);
    expect(revoked).toMatchObject({
      id: invitation.id,
      status: 'revoked',
    });
    expect(revoked?.revokedAt).toBeDefined();
    expect(await db.tripInvitations.where('tripId').equals(TRIP_ID).count()).toBe(1);
  });

  it('persists announcements and queues them for trip sync', async () => {
    const announcement = await createAnnouncement({
      tripId: TRIP_ID,
      title: 'Lineups Posted',
      message: 'Open the app before breakfast.',
      priority: 'urgent',
      category: 'lineup',
      totalRecipients: 12,
      author: { name: 'Captain Coop', role: 'captain' },
    });

    const stored = await db.announcements.get(announcement.id);
    expect(stored).toMatchObject({
      tripId: TRIP_ID,
      title: 'Lineups Posted',
      status: 'sent',
      totalRecipients: 12,
      author: { name: 'Captain Coop', role: 'captain' },
    });
    expect(getPendingSyncIdsForTrip(TRIP_ID, 'announcement').has(announcement.id)).toBe(true);
  });

  it('upserts one attendance record per trip, player, and session', async () => {
    const first = await upsertAttendanceRecord({
      tripId: TRIP_ID,
      playerId: 'player-1',
      sessionId: 'session-1',
      status: 'en-route',
      eta: '10 min',
    });
    const second = await upsertAttendanceRecord({
      tripId: TRIP_ID,
      playerId: 'player-1',
      sessionId: 'session-1',
      status: 'checked-in',
    });

    expect(second.id).toBe(first.id);
    expect(second.status).toBe('checked-in');
    expect(second.checkInTime).toBeDefined();
    expect(await db.attendanceRecords.where('tripId').equals(TRIP_ID).count()).toBe(1);
    expect(getPendingSyncIdsForTrip(TRIP_ID, 'attendanceRecord').has(second.id)).toBe(true);
  });

  it('replaces cart assignments for the current scope and queues deletes for removed carts', async () => {
    const initial = await replaceCartAssignmentsForScope({
      tripId: TRIP_ID,
      sessionId: 'session-1',
      carts: [
        { cartNumber: 'Cart 1', playerIds: ['player-1', 'player-2'], maxCapacity: 2 },
        { cartNumber: 'Cart 2', playerIds: ['player-3'], maxCapacity: 2 },
      ],
    });

    const next = await replaceCartAssignmentsForScope({
      tripId: TRIP_ID,
      sessionId: 'session-1',
      carts: [
        {
          id: initial[0].id,
          cartNumber: 'Cart 1',
          playerIds: ['player-1'],
          maxCapacity: 2,
          notes: 'Starter shack',
        },
      ],
    });

    const stored = await db.cartAssignments.where('tripId').equals(TRIP_ID).toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: initial[0].id,
      cartNumber: 'Cart 1',
      playerIds: ['player-1'],
      notes: 'Starter shack',
    });
    expect(next).toHaveLength(1);
    expect(getPendingSyncIdsForTrip(TRIP_ID, 'cartAssignment')).toEqual(new Set([initial[0].id]));
  });
});
