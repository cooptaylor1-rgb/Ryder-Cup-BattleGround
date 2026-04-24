import { db } from '@/lib/db';
import { queueSyncOperation } from '@/lib/services/tripSyncService';
import type {
  Announcement,
  AttendanceRecord,
  AttendanceStatus,
  CartAssignment,
  TripInvitation,
  TripInvitationRole,
} from '@/lib/types/logistics';

const nowIso = () => new Date().toISOString();

function withInviteId(url: string, invitationId: string): string {
  const [base, hash = ''] = url.split('#');
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}invite=${encodeURIComponent(invitationId)}${hash ? `#${hash}` : ''}`;
}

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

type TripInvitationDraft = Pick<TripInvitation, 'tripId' | 'inviteCode' | 'inviteUrl'> &
  Partial<
    Pick<
      TripInvitation,
      | 'id'
      | 'recipientName'
      | 'recipientEmail'
      | 'recipientPhone'
      | 'assignedTeam'
      | 'role'
      | 'status'
      | 'createdByAuthUserId'
      | 'expiresAt'
    >
  >;

export async function createTripInvitation(draft: TripInvitationDraft): Promise<TripInvitation> {
  const timestamp = nowIso();
  const id = draft.id ?? crypto.randomUUID();
  const status = draft.status ?? 'sent';
  const invitation: TripInvitation = {
    id,
    tripId: draft.tripId,
    recipientName: draft.recipientName?.trim() || undefined,
    recipientEmail: draft.recipientEmail?.trim() || undefined,
    recipientPhone: draft.recipientPhone?.trim() || undefined,
    inviteCode: draft.inviteCode,
    inviteUrl: withInviteId(draft.inviteUrl, id),
    assignedTeam: draft.assignedTeam,
    role: draft.role ?? 'player',
    status,
    createdByAuthUserId: draft.createdByAuthUserId,
    sentAt: status === 'sent' ? timestamp : undefined,
    expiresAt: draft.expiresAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.tripInvitations.add(invitation);
  queueSyncOperation('tripInvitation', invitation.id, 'create', invitation.tripId, invitation);
  return invitation;
}

export async function resendTripInvitation(id: string): Promise<TripInvitation | null> {
  const existing = await db.tripInvitations.get(id);
  if (!existing) return null;

  const timestamp = nowIso();
  const updated: TripInvitation = {
    ...existing,
    status: 'sent',
    sentAt: timestamp,
    revokedAt: undefined,
    updatedAt: timestamp,
  };

  await db.tripInvitations.put(updated);
  queueSyncOperation('tripInvitation', updated.id, 'update', updated.tripId, updated);
  return updated;
}

export async function revokeTripInvitation(id: string): Promise<TripInvitation | null> {
  const existing = await db.tripInvitations.get(id);
  if (!existing) return null;

  const timestamp = nowIso();
  const updated: TripInvitation = {
    ...existing,
    status: 'revoked',
    revokedAt: timestamp,
    updatedAt: timestamp,
  };

  await db.tripInvitations.put(updated);
  queueSyncOperation('tripInvitation', updated.id, 'update', updated.tripId, updated);
  return updated;
}

export async function setTripInvitationStatus(input: {
  id: string;
  status: TripInvitation['status'];
  acceptedByAuthUserId?: string;
  acceptedPlayerId?: string;
  role?: TripInvitationRole;
}): Promise<TripInvitation | null> {
  const existing = await db.tripInvitations.get(input.id);
  if (!existing) return null;

  const timestamp = nowIso();
  const updated: TripInvitation = {
    ...existing,
    status: input.status,
    role: input.role ?? existing.role,
    acceptedByAuthUserId: input.acceptedByAuthUserId ?? existing.acceptedByAuthUserId,
    acceptedPlayerId: input.acceptedPlayerId ?? existing.acceptedPlayerId,
    openedAt: input.status === 'opened' ? (existing.openedAt ?? timestamp) : existing.openedAt,
    acceptedAt: input.status === 'accepted' ? (existing.acceptedAt ?? timestamp) : existing.acceptedAt,
    revokedAt: input.status === 'revoked' ? (existing.revokedAt ?? timestamp) : existing.revokedAt,
    updatedAt: timestamp,
  };

  await db.tripInvitations.put(updated);
  queueSyncOperation('tripInvitation', updated.id, 'update', updated.tripId, updated);
  return updated;
}

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
