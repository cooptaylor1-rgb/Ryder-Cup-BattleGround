import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';
import { useScoringStore } from '@/lib/stores/scoringStore';
import type { Match, RyderCupSession, Trip } from '@/lib/types/models';

vi.mock('@/lib/services/tripSyncService', () => ({
  queueSyncOperation: vi.fn(),
}));

vi.mock('@/lib/services/analyticsService', () => ({
  createCorrelationId: vi.fn(() => 'corr-id'),
  trackSyncFailure: vi.fn(),
}));

vi.mock('@/lib/services/realtimeSyncService', () => ({
  broadcastScoreUpdate: vi.fn(),
  broadcastMatchUpdate: vi.fn(),
  calculateCupScore: vi.fn(() => ({ usa: 0, europe: 0 })),
}));

vi.mock('@/lib/services/dramaNotificationService', () => ({
  checkForDrama: vi.fn(),
}));

vi.mock('@/lib/services/autoTrashTalkService', () => ({
  generateTrashTalk: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

function isoNow() {
  return '2026-03-17T12:00:00.000Z';
}

async function seedMatch() {
  const now = isoNow();
  const trip: Trip = {
    id: 'trip-1',
    name: 'Trip',
    startDate: now,
    endDate: now,
    isCaptainModeEnabled: true,
    createdAt: now,
    updatedAt: now,
  };

  const session: RyderCupSession = {
    id: 'session-1',
    tripId: trip.id,
    name: 'Opening Matches',
    sessionNumber: 1,
    sessionType: 'foursomes',
    status: 'scheduled',
    createdAt: now,
  };

  const match: Match = {
    id: 'match-1',
    sessionId: session.id,
    matchOrder: 1,
    status: 'scheduled',
    currentHole: 1,
    teamAPlayerIds: ['a1', 'a2'],
    teamBPlayerIds: ['b1', 'b2'],
    teamAHandicapAllowance: 0,
    teamBHandicapAllowance: 0,
    result: 'notFinished',
    margin: 0,
    holesRemaining: 18,
    createdAt: now,
    updatedAt: now,
  };

  await db.trips.put(trip);
  await db.sessions.put(session);
  await db.matches.put(match);

  return match;
}

function resetScoringStore() {
  useScoringStore.setState({
    activeMatch: null,
    activeMatchState: null,
    activeSession: null,
    currentHole: 1,
    sessionMatches: [],
    matchStates: new Map(),
    isLoading: false,
    isSaving: false,
    error: null,
    lastSavedAt: null,
    undoStack: [],
  });
}

describe('scoringStore scoreHole', () => {
  beforeEach(async () => {
    resetScoringStore();
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    resetScoringStore();
    await db.delete();
  });

  it('advances only one hole by default after a halved score', async () => {
    await seedMatch();

    await useScoringStore.getState().selectMatch('match-1');
    useScoringStore.getState().goToHole(7);

    await useScoringStore.getState().scoreHole('halved');

    expect(useScoringStore.getState().currentHole).toBe(8);
    expect(await db.holeResults.where({ matchId: 'match-1', holeNumber: 7 }).first()).toMatchObject({
      winner: 'halved',
    });
  });

  it('respects advanceHole false and stays on the scored hole', async () => {
    await seedMatch();

    await useScoringStore.getState().selectMatch('match-1');
    useScoringStore.getState().goToHole(7);

    await useScoringStore.getState().scoreHole(
      'halved',
      undefined,
      undefined,
      undefined,
      undefined,
      { advanceHole: false }
    );

    expect(useScoringStore.getState().currentHole).toBe(7);
    expect(await db.holeResults.where({ matchId: 'match-1', holeNumber: 7 }).first()).toMatchObject({
      winner: 'halved',
    });
  });

  it('undoes the last scored hole and restores the exact prior hole', async () => {
    await seedMatch();

    await useScoringStore.getState().selectMatch('match-1');
    useScoringStore.getState().goToHole(7);

    await useScoringStore.getState().scoreHole('teamA');
    expect(useScoringStore.getState().currentHole).toBe(8);

    await useScoringStore.getState().undoLastHole();

    expect(useScoringStore.getState().currentHole).toBe(7);
    expect(useScoringStore.getState().undoStack).toHaveLength(0);
    expect(await db.holeResults.where({ matchId: 'match-1', holeNumber: 7 }).first()).toBeUndefined();
  });

  it('refreshes all match states from persisted local data', async () => {
    await seedMatch();

    await useScoringStore.getState().loadSessionMatches('session-1');
    await useScoringStore.getState().selectMatch('match-1');

    await db.holeResults.put({
      id: 'hole-result-1',
      matchId: 'match-1',
      holeNumber: 1,
      winner: 'teamA',
      timestamp: isoNow(),
    });
    await db.matches.update('match-1', {
      currentHole: 2,
      status: 'inProgress',
      margin: 1,
      holesRemaining: 17,
      updatedAt: isoNow(),
    });

    await useScoringStore.getState().refreshAllMatchStates();

    expect(useScoringStore.getState().activeMatch?.currentHole).toBe(2);
    expect(useScoringStore.getState().activeMatchState?.currentScore).toBe(1);
    expect(useScoringStore.getState().matchStates.get('match-1')?.holesPlayed).toBe(1);
  });
});
