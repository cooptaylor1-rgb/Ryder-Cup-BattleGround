/**
 * Sync Queue Types
 *
 * Shared types for trip-level sync queue persistence.
 */

import type {
  BanterPost,
  Course,
  HoleResult,
  Match,
  Player,
  PracticeScore,
  RyderCupSession,
  SideBet,
  Team,
  TeamMember,
  TeeSet,
  Trip,
} from './models';
import type { DuesLineItem, PaymentRecord } from './finances';

export type SyncOperation = 'create' | 'update' | 'delete';

export type SyncEntity =
  | 'trip'
  | 'player'
  | 'team'
  | 'teamMember'
  | 'session'
  | 'match'
  | 'holeResult'
  | 'course'
  | 'teeSet'
  | 'sideBet'
  | 'practiceScore'
  | 'banterPost'
  | 'duesLineItem'
  | 'paymentRecord';

/**
 * Map of SyncEntity tag → the model type whose instance is carried
 * on the queue item's `data` payload. Writers use this to recover
 * the model type at the dispatcher boundary without casting through
 * `unknown`. When a new entity is added to SyncEntity above, the
 * compiler forces us to extend this map or the writer dispatcher
 * stops type-checking — which is the whole point.
 */
export interface SyncEntityPayloadMap {
  trip: Trip;
  player: Player;
  team: Team;
  teamMember: TeamMember;
  session: RyderCupSession;
  match: Match;
  holeResult: HoleResult;
  course: Course;
  teeSet: TeeSet;
  sideBet: SideBet;
  practiceScore: PracticeScore;
  banterPost: BanterPost;
  duesLineItem: DuesLineItem;
  paymentRecord: PaymentRecord;
}

export type SyncEntityPayload<E extends SyncEntity = SyncEntity> =
  SyncEntityPayloadMap[E];

/**
 * A SyncQueueItem is a discriminated union over SyncEntity: the
 * tag decides what shape `data` has. Delete ops don't carry a
 * payload (the entityId alone is enough), which is why `data` is
 * optional. Callers that need the typed payload should narrow on
 * `item.entity` first, then `item.data` is inferred to the right
 * model — no `as` cast required.
 */
export type SyncQueueItem = {
  [E in SyncEntity]: {
    id: string;
    entity: E;
    entityId: string;
    operation: SyncOperation;
    data?: SyncEntityPayloadMap[E];
    tripId: string;
    status: 'pending' | 'syncing' | 'failed' | 'completed';
    retryCount: number;
    createdAt: string;
    lastAttemptAt?: string;
    error?: string;
    idempotencyKey?: string;
  };
}[SyncEntity];
