/**
 * Trip logistics models that are persisted locally and synced to Supabase.
 */

import type { ISODateString, UUID } from './models';

export type AnnouncementPriority = 'normal' | 'urgent';
export type AnnouncementCategory = 'general' | 'schedule' | 'lineup' | 'weather' | 'results';
export type AnnouncementStatus = 'draft' | 'sent' | 'archived';
export type TripInvitationStatus =
  | 'pending'
  | 'sent'
  | 'opened'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'revoked';
export type TripInvitationRole = 'captain' | 'scorer' | 'player' | 'spectator';

export interface Announcement {
  id: UUID;
  tripId: UUID;
  title: string;
  message: string;
  priority: AnnouncementPriority;
  category: AnnouncementCategory;
  status: AnnouncementStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  sentAt?: ISODateString;
  readCount?: number;
  totalRecipients?: number;
  authorAuthUserId?: UUID;
  authorPlayerId?: UUID;
  author: {
    name: string;
    role: 'captain';
  };
  metadata?: Record<string, unknown>;
}

export interface TripInvitation {
  id: UUID;
  tripId: UUID;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  inviteCode: string;
  inviteUrl: string;
  assignedTeam?: 'A' | 'B';
  role: TripInvitationRole;
  status: TripInvitationStatus;
  createdByAuthUserId?: UUID;
  acceptedByAuthUserId?: UUID;
  acceptedPlayerId?: UUID;
  sentAt?: ISODateString;
  openedAt?: ISODateString;
  acceptedAt?: ISODateString;
  revokedAt?: ISODateString;
  expiresAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type AttendanceStatus = 'checked-in' | 'en-route' | 'not-arrived' | 'no-show';

export interface AttendanceRecord {
  id: UUID;
  tripId: UUID;
  playerId: UUID;
  sessionId?: UUID;
  matchId?: UUID;
  status: AttendanceStatus;
  eta?: string;
  notes?: string;
  lastLocation?: string;
  checkInTime?: ISODateString;
  updatedByAuthUserId?: UUID;
  updatedByPlayerId?: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CartAssignment {
  id: UUID;
  tripId: UUID;
  sessionId?: UUID;
  matchId?: UUID;
  cartNumber: string;
  playerIds: UUID[];
  maxCapacity: number;
  notes?: string;
  createdByAuthUserId?: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
