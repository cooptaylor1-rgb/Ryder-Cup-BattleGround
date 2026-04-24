import { db } from '@/lib/db';
import { queueSyncOperation } from '@/lib/services/tripSyncService';
import type {
  Announcement,
  AttendanceRecord,
  AttendanceStatus,
  CartAssignment,
} from '@/lib/types/logistics';

const nowIso = () => new Date().toISOString();

type AnnouncementDraft = Pick<Announcement, 'tripId' | 'title' | 'message' | 'priority' | 'category'> &
  Partial<
    Pick<
      Announcement,
      | 'status'
      | 'author'
      | 'authorAuthUserId'
      | 'authorPlayerId'
      | 'readCount'
      | 'totalRecipients'
      | 'metadata'
      | 'sentAt'
    >
  >;

export async function createAnnouncement(draft: AnnouncementDraft): Promise<Announcement> {
  const timestamp = nowIso();
  const status = draft.status ?? 'sent';
  const announcement: Announcement = {
    id: crypto.randomUUID(),
    tripId: draft.tripId,
    title: draft.title.trim(),
    message: draft.message.trim(),
    priority: draft.priority,
    category: draft.category,
    status,
    author: draft.author ?? { name: 'Captain', role: 'captain' },
    authorAuthUserId: draft.authorAuthUserId,
    authorPlayerId: draft.authorPlayerId,
    readCount: draft.readCount ?? 0,
    totalRecipients: draft.totalRecipients,
    metadata: draft.metadata,
    sentAt: draft.sentAt ?? (status === 'sent' ? timestamp : undefined),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.announcements.add(announcement);
  queueSyncOperation('announcement', announcement.id, 'create', announcement.tripId, announcement);
  return announcement;
}

export async function archiveAnnouncement(id: string): Promise<void> {
  const existing = await db.announcements.get(id);
  if (!existing) return;

  const updated: Announcement = {
    ...existing,
    status: 'archived',
    updatedAt: nowIso(),
  };

  await db.announcements.put(updated);
  queueSyncOperation('announcement', updated.id, 'update', updated.tripId, updated);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const existing = await db.announcements.get(id);
  if (!existing) return;

  await db.announcements.delete(id);
  queueSyncOperation('announcement', id, 'delete', existing.tripId);
}

export async function upsertAttendanceRecord(input: {
  tripId: string;
  playerId: string;
  sessionId?: string;
  matchId?: string;
  status: AttendanceStatus;
  eta?: string;
  notes?: string;
  lastLocation?: string;
  updatedByAuthUserId?: string;
  updatedByPlayerId?: string;
}): Promise<AttendanceRecord> {
  const existing = (
    await db.attendanceRecords
      .where('[tripId+playerId]')
      .equals([input.tripId, input.playerId])
      .toArray()
  ).find((record) => (record.sessionId ?? '') === (input.sessionId ?? ''));
  const timestamp = nowIso();
  const record: AttendanceRecord = {
    id: existing?.id ?? crypto.randomUUID(),
    tripId: input.tripId,
    playerId: input.playerId,
    sessionId: input.sessionId,
    matchId: input.matchId,
    status: input.status,
    eta: input.eta,
    notes: input.notes,
    lastLocation: input.lastLocation,
    checkInTime: input.status === 'checked-in' ? (existing?.checkInTime ?? timestamp) : existing?.checkInTime,
    updatedByAuthUserId: input.updatedByAuthUserId,
    updatedByPlayerId: input.updatedByPlayerId,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  await db.attendanceRecords.put(record);
  queueSyncOperation(
    'attendanceRecord',
    record.id,
    existing ? 'update' : 'create',
    record.tripId,
    record
  );
  return record;
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  const existing = await db.attendanceRecords.get(id);
  if (!existing) return;

  await db.attendanceRecords.delete(id);
  queueSyncOperation('attendanceRecord', id, 'delete', existing.tripId);
}

export interface CartAssignmentInput {
  id?: string;
  cartNumber: string;
  playerIds: string[];
  maxCapacity: number;
  notes?: string;
}

function sameScope(
  assignment: CartAssignment,
  scope: { tripId: string; sessionId?: string; matchId?: string }
): boolean {
  return (
    assignment.tripId === scope.tripId &&
    (assignment.sessionId ?? '') === (scope.sessionId ?? '') &&
    (assignment.matchId ?? '') === (scope.matchId ?? '')
  );
}

export async function replaceCartAssignmentsForScope({
  tripId,
  sessionId,
  matchId,
  carts,
  createdByAuthUserId,
}: {
  tripId: string;
  sessionId?: string;
  matchId?: string;
  carts: CartAssignmentInput[];
  createdByAuthUserId?: string;
}): Promise<CartAssignment[]> {
  const existing = (await db.cartAssignments.where('tripId').equals(tripId).toArray()).filter(
    (assignment) => sameScope(assignment, { tripId, sessionId, matchId })
  );
  const existingById = new Map(existing.map((assignment) => [assignment.id, assignment]));
  const incomingIds = new Set(carts.map((cart) => cart.id).filter((id): id is string => Boolean(id)));
  const timestamp = nowIso();
  const deletedAssignments: CartAssignment[] = [];

  const nextAssignments: CartAssignment[] = carts.map((cart, index) => {
    const existingAssignment = cart.id ? existingById.get(cart.id) : undefined;
    return {
      id: existingAssignment?.id ?? cart.id ?? crypto.randomUUID(),
      tripId,
      sessionId,
      matchId,
      cartNumber: cart.cartNumber || `Cart ${index + 1}`,
      playerIds: cart.playerIds,
      maxCapacity: cart.maxCapacity,
      notes: cart.notes,
      createdByAuthUserId: existingAssignment?.createdByAuthUserId ?? createdByAuthUserId,
      createdAt: existingAssignment?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
  });

  await db.transaction('rw', db.cartAssignments, async () => {
    for (const assignment of existing) {
      if (incomingIds.has(assignment.id)) continue;
      await db.cartAssignments.delete(assignment.id);
      deletedAssignments.push(assignment);
    }

    for (const assignment of nextAssignments) {
      await db.cartAssignments.put(assignment);
    }
  });

  for (const assignment of deletedAssignments) {
    queueSyncOperation('cartAssignment', assignment.id, 'delete', assignment.tripId);
  }

  for (const assignment of nextAssignments) {
    const operation = existingById.has(assignment.id) ? 'update' : 'create';
    queueSyncOperation('cartAssignment', assignment.id, operation, tripId, assignment);
  }

  return nextAssignments;
}
