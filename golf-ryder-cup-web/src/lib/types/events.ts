/**
 * Scoring Event Types for Event Sourcing
 *
 * These events form an append-only log that enables:
 * 1. Undo: Reverse any scoring action
 * 2. Audit: Complete history of who scored what when
 * 3. Sync (Phase 2): Conflict-free merge across devices
 */

import { UUID, ISODateString, HoleWinner, MatchResultType } from './models';

// ============================================
// EVENT TYPES
// ============================================

export enum ScoringEventType {
    HoleScored = 'hole_scored',
    HoleEdited = 'hole_edited',
    HoleUndone = 'hole_undone',
    MatchStarted = 'match_started',
    MatchFinalized = 'match_finalized',
    MatchCancelled = 'match_cancelled',
}

// ============================================
// EVENT PAYLOADS
// ============================================

export interface HoleScoredPayload {
    type: 'hole_scored';
    holeNumber: number;
    winner: HoleWinner;
    teamAStrokes?: number;
    teamBStrokes?: number;
}

export interface HoleEditedPayload {
    type: 'hole_edited';
    holeNumber: number;
    previousWinner: HoleWinner;
    newWinner: HoleWinner;
    previousTeamAStrokes?: number;
    previousTeamBStrokes?: number;
    newTeamAStrokes?: number;
    newTeamBStrokes?: number;
}

export interface HoleUndonePayload {
    type: 'hole_undone';
    holeNumber: number;
    previousWinner: HoleWinner;
    previousTeamAStrokes?: number;
    previousTeamBStrokes?: number;
}

export interface MatchStartedPayload {
    type: 'match_started';
    startTime: ISODateString;
}

export interface MatchFinalizedPayload {
    type: 'match_finalized';
    result: MatchResultType;
    margin: number;
    holesRemaining: number;
}

export interface MatchCancelledPayload {
    type: 'match_cancelled';
    reason?: string;
}

export type ScoringEventPayload =
    | HoleScoredPayload
    | HoleEditedPayload
    | HoleUndonePayload
    | MatchStartedPayload
    | MatchFinalizedPayload
    | MatchCancelledPayload;

// ============================================
// SCORING EVENT
// ============================================

/**
 * A single scoring event in the append-only event log.
 */
export interface ScoringEvent {
    /** Auto-increment ID for local ordering (Dexie) */
    localId?: number;

    /** Global UUID for sync */
    id: UUID;

    /** The match this event belongs to */
    matchId: UUID;

    /** Type of scoring event */
    eventType: ScoringEventType;

    /** When this event occurred (ISO string) */
    timestamp: ISODateString;

    /** Who made this change */
    actorName: string;

    /** Event-specific payload */
    payload: ScoringEventPayload;

    /** Whether this event has been synced to server (Phase 2) */
    synced: boolean;

    /** Server timestamp after sync (Phase 2) */
    serverTimestamp?: ISODateString;
}

// ============================================
// UNDO ACTION
// ============================================

/**
 * Undo action for match scoring
 */
export interface UndoAction {
    eventId: UUID;
    holeNumber: number;
    previousWinner: HoleWinner | null; // null if hole wasn't scored
    timestamp: ISODateString;
}

// ============================================
// EVENT HELPERS
// ============================================

/**
 * Create a hole scored event
 */
export function createHoleScoredEvent(
    matchId: UUID,
    holeNumber: number,
    winner: HoleWinner,
    actorName: string,
    teamAStrokes?: number,
    teamBStrokes?: number
): ScoringEvent {
    return {
        id: crypto.randomUUID(),
        matchId,
        eventType: ScoringEventType.HoleScored,
        timestamp: new Date().toISOString(),
        actorName,
        payload: {
            type: 'hole_scored',
            holeNumber,
            winner,
            teamAStrokes,
            teamBStrokes,
        },
        synced: false,
    };
}

/**
 * Create a hole edited event
 */
export function createHoleEditedEvent(
    matchId: UUID,
    holeNumber: number,
    previousWinner: HoleWinner,
    newWinner: HoleWinner,
    actorName: string,
    options?: {
        previousTeamAStrokes?: number;
        previousTeamBStrokes?: number;
        newTeamAStrokes?: number;
        newTeamBStrokes?: number;
    }
): ScoringEvent {
    return {
        id: crypto.randomUUID(),
        matchId,
        eventType: ScoringEventType.HoleEdited,
        timestamp: new Date().toISOString(),
        actorName,
        payload: {
            type: 'hole_edited',
            holeNumber,
            previousWinner,
            newWinner,
            ...options,
        },
        synced: false,
    };
}

/**
 * Create a hole undone event
 */
export function createHoleUndoneEvent(
    matchId: UUID,
    holeNumber: number,
    previousWinner: HoleWinner,
    actorName: string,
    previousTeamAStrokes?: number,
    previousTeamBStrokes?: number
): ScoringEvent {
    return {
        id: crypto.randomUUID(),
        matchId,
        eventType: ScoringEventType.HoleUndone,
        timestamp: new Date().toISOString(),
        actorName,
        payload: {
            type: 'hole_undone',
            holeNumber,
            previousWinner,
            previousTeamAStrokes,
            previousTeamBStrokes,
        },
        synced: false,
    };
}

/**
 * Create a match started event
 */
export function createMatchStartedEvent(
    matchId: UUID,
    actorName: string
): ScoringEvent {
    return {
        id: crypto.randomUUID(),
        matchId,
        eventType: ScoringEventType.MatchStarted,
        timestamp: new Date().toISOString(),
        actorName,
        payload: {
            type: 'match_started',
            startTime: new Date().toISOString(),
        },
        synced: false,
    };
}

/**
 * Create a match finalized event
 */
export function createMatchFinalizedEvent(
    matchId: UUID,
    result: MatchResultType,
    margin: number,
    holesRemaining: number,
    actorName: string
): ScoringEvent {
    return {
        id: crypto.randomUUID(),
        matchId,
        eventType: ScoringEventType.MatchFinalized,
        timestamp: new Date().toISOString(),
        actorName,
        payload: {
            type: 'match_finalized',
            result,
            margin,
            holesRemaining,
        },
        synced: false,
    };
}

/**
 * Check if an event is undoable
 */
export function isUndoableEvent(event: ScoringEvent): boolean {
    return (
        event.eventType === ScoringEventType.HoleScored ||
        event.eventType === ScoringEventType.HoleEdited
    );
}

/**
 * Get the hole number from an event payload (if applicable)
 */
export function getHoleNumberFromEvent(event: ScoringEvent): number | null {
    const payload = event.payload;
    if ('holeNumber' in payload) {
        return payload.holeNumber;
    }
    return null;
}
