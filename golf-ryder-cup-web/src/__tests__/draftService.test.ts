/**
 * Draft Service Tests
 *
 * Comprehensive tests for the draft mode service.
 * Tests cover: draft config creation, pick ordering, state initialization,
 * current picker logic, draft picks, team randomization, handicap balancing,
 * validation, and summary generation.
 */

import { describe, it, expect } from 'vitest';
import {
  createDraftConfig,
  getPickOrderForRound,
  initializeDraftState,
  getCurrentPicker,
  makeDraftPick,
  randomizeTeams,
  balanceTeamsByHandicap,
  calculateTeamHandicapTotal,
  validateDraftReady,
  getDraftSummary,
} from '@/lib/services/draftService';
import type { DraftConfig, DraftState } from '@/lib/services/draftService';
import type { Player, UUID } from '@/lib/types/models';

// ============================================
// TEST HELPERS
// ============================================

let playerCounter = 0;

function createTestPlayer(overrides?: Partial<Player>): Player {
  playerCounter++;
  return {
    id: `player-${playerCounter}`,
    firstName: `First${playerCounter}`,
    lastName: `Last${playerCounter}`,
    handicapIndex: 10 + playerCounter,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function createTestConfig(overrides?: Partial<DraftConfig>): DraftConfig {
  return {
    id: 'draft-1',
    tripId: 'trip-1',
    type: 'snake',
    status: 'setup',
    roundCount: 3,
    pickTimeSeconds: 60,
    auctionBudget: 100,
    draftOrder: ['captain-a', 'captain-b'],
    snakeReverse: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function createTestState(overrides?: Partial<DraftState>): DraftState {
  return {
    config: createTestConfig(),
    picks: [],
    currentRound: 1,
    currentPick: 1,
    currentCaptainId: 'captain-a',
    availablePlayers: [
      createTestPlayer({ id: 'p1', firstName: 'Alice', lastName: 'A', handicapIndex: 5 }),
      createTestPlayer({ id: 'p2', firstName: 'Bob', lastName: 'B', handicapIndex: 10 }),
      createTestPlayer({ id: 'p3', firstName: 'Carol', lastName: 'C', handicapIndex: 15 }),
      createTestPlayer({ id: 'p4', firstName: 'Dave', lastName: 'D', handicapIndex: 20 }),
    ],
    teamARoster: [],
    teamBRoster: [],
    timeRemaining: 60,
    ...overrides,
  };
}

// ============================================
// createDraftConfig
// ============================================

describe('createDraftConfig', () => {
  it('creates a snake draft config with correct defaults', () => {
    const config = createDraftConfig('trip-1', 'snake', ['cap-a', 'cap-b'], 6);

    expect(config.tripId).toBe('trip-1');
    expect(config.type).toBe('snake');
    expect(config.status).toBe('setup');
    expect(config.snakeReverse).toBe(true);
    expect(config.pickTimeSeconds).toBe(60);
    expect(config.auctionBudget).toBe(100);
    expect(config.id).toBeDefined();
    expect(config.createdAt).toBeDefined();
  });

  it('creates an auction draft with 30s default pick time', () => {
    const config = createDraftConfig('trip-1', 'auction', ['cap-a', 'cap-b'], 6);

    expect(config.type).toBe('auction');
    expect(config.pickTimeSeconds).toBe(30);
  });

  it('uses custom pickTimeSeconds when provided', () => {
    const config = createDraftConfig('trip-1', 'snake', ['cap-a', 'cap-b'], 6, {
      pickTimeSeconds: 90,
    });

    expect(config.pickTimeSeconds).toBe(90);
  });

  it('uses custom auctionBudget when provided', () => {
    const config = createDraftConfig('trip-1', 'auction', ['cap-a', 'cap-b'], 6, {
      auctionBudget: 200,
    });

    expect(config.auctionBudget).toBe(200);
  });

  it('calculates correct roundCount from playerCount and captains', () => {
    // 6 players / 2 captains = 3 rounds
    const config2 = createDraftConfig('trip-1', 'snake', ['cap-a', 'cap-b'], 6);
    expect(config2.roundCount).toBe(3);

    // 7 players / 2 captains = ceil(3.5) = 4 rounds
    const config3 = createDraftConfig('trip-1', 'snake', ['cap-a', 'cap-b'], 7);
    expect(config3.roundCount).toBe(4);

    // 9 players / 3 captains = 3 rounds
    const config4 = createDraftConfig('trip-1', 'snake', ['cap-a', 'cap-b', 'cap-c'], 9);
    expect(config4.roundCount).toBe(3);
  });

  it('includes all captain IDs in draftOrder (shuffled)', () => {
    const captains = ['cap-a', 'cap-b', 'cap-c'];
    const config = createDraftConfig('trip-1', 'snake', captains, 9);

    expect(config.draftOrder).toHaveLength(3);
    expect(config.draftOrder).toEqual(expect.arrayContaining(captains));
  });
});

// ============================================
// getPickOrderForRound
// ============================================

describe('getPickOrderForRound', () => {
  it('returns normal order for odd rounds in snake draft', () => {
    const config = createTestConfig({ type: 'snake', snakeReverse: true });

    expect(getPickOrderForRound(config, 1)).toEqual(['captain-a', 'captain-b']);
    expect(getPickOrderForRound(config, 3)).toEqual(['captain-a', 'captain-b']);
  });

  it('reverses order for even rounds in snake draft', () => {
    const config = createTestConfig({ type: 'snake', snakeReverse: true });

    expect(getPickOrderForRound(config, 2)).toEqual(['captain-b', 'captain-a']);
    expect(getPickOrderForRound(config, 4)).toEqual(['captain-b', 'captain-a']);
  });

  it('returns normal order for all rounds when snakeReverse is false', () => {
    const config = createTestConfig({ type: 'snake', snakeReverse: false });

    expect(getPickOrderForRound(config, 1)).toEqual(['captain-a', 'captain-b']);
    expect(getPickOrderForRound(config, 2)).toEqual(['captain-a', 'captain-b']);
  });

  it('returns normal order for non-snake draft types', () => {
    const config = createTestConfig({ type: 'auction', snakeReverse: true });

    expect(getPickOrderForRound(config, 2)).toEqual(['captain-a', 'captain-b']);
  });
});

// ============================================
// initializeDraftState
// ============================================

describe('initializeDraftState', () => {
  it('initializes with correct defaults', () => {
    const config = createTestConfig();
    const players = [
      createTestPlayer({ id: 'init-p1' }),
      createTestPlayer({ id: 'init-p2' }),
    ];
    const teamIds = { teamA: 'team-a' as UUID, teamB: 'team-b' as UUID };

    const state = initializeDraftState(config, players, teamIds);

    expect(state.config).toBe(config);
    expect(state.picks).toEqual([]);
    expect(state.currentRound).toBe(1);
    expect(state.currentPick).toBe(1);
    expect(state.currentCaptainId).toBe(config.draftOrder[0]);
    expect(state.availablePlayers).toEqual(players);
    expect(state.teamARoster).toEqual([]);
    expect(state.teamBRoster).toEqual([]);
    expect(state.timeRemaining).toBe(config.pickTimeSeconds);
  });

  it('stores all available players', () => {
    const config = createTestConfig();
    const players = Array.from({ length: 6 }, (_, i) =>
      createTestPlayer({ id: `init-bulk-${i}` })
    );
    const teamIds = { teamA: 'team-a' as UUID, teamB: 'team-b' as UUID };

    const state = initializeDraftState(config, players, teamIds);

    expect(state.availablePlayers).toHaveLength(6);
  });
});

// ============================================
// getCurrentPicker
// ============================================

describe('getCurrentPicker', () => {
  it('returns first captain for first pick', () => {
    const state = createTestState();

    const picker = getCurrentPicker(state);

    expect(picker.captainId).toBe('captain-a');
    expect(picker.teamId).toBe('A');
    expect(picker.pickNumber).toBe(1);
    expect(picker.round).toBe(1);
  });

  it('returns second captain for second pick in round', () => {
    const state = createTestState({ currentPick: 2 });

    const picker = getCurrentPicker(state);

    expect(picker.captainId).toBe('captain-b');
    expect(picker.teamId).toBe('B');
    expect(picker.pickNumber).toBe(2);
    expect(picker.round).toBe(1);
  });

  it('alternates team assignment based on captain position in draftOrder', () => {
    const state1 = createTestState({ currentPick: 1 });
    expect(getCurrentPicker(state1).teamId).toBe('A');

    const state2 = createTestState({ currentPick: 2 });
    expect(getCurrentPicker(state2).teamId).toBe('B');
  });

  it('reverses captain order in even rounds for snake draft', () => {
    const state = createTestState({ currentRound: 2, currentPick: 3 });

    const picker = getCurrentPicker(state);

    // Round 2 reverses: [captain-b, captain-a]
    // Pick 3 => index (3-1)%2 = 0 => captain-b
    expect(picker.captainId).toBe('captain-b');
    // captain-b is at index 1 in original draftOrder -> Team B
    expect(picker.teamId).toBe('B');
  });
});

// ============================================
// makeDraftPick
// ============================================

describe('makeDraftPick', () => {
  it('makes a valid pick and updates state', () => {
    const state = createTestState();

    const { newState, pick } = makeDraftPick(state, 'p1');

    expect(pick.playerId).toBe('p1');
    expect(pick.round).toBe(1);
    expect(pick.pickNumber).toBe(1);
    expect(pick.captainId).toBe('captain-a');

    expect(newState.teamARoster).toHaveLength(1);
    expect(newState.teamARoster[0].id).toBe('p1');
    expect(newState.availablePlayers).toHaveLength(3);
    expect(newState.picks).toHaveLength(1);
    expect(newState.currentPick).toBe(2);
  });

  it('throws when player is not available', () => {
    const state = createTestState();

    expect(() => makeDraftPick(state, 'nonexistent')).toThrow('Player not available');
  });

  it('advances to next round after all captains pick', () => {
    let state = createTestState();

    // Pick 1: captain-a picks p1
    const result1 = makeDraftPick(state, 'p1');
    state = result1.newState;
    expect(state.currentRound).toBe(1);

    // Pick 2: captain-b picks p2 (last pick in round 1)
    const result2 = makeDraftPick(state, 'p2');
    state = result2.newState;
    expect(state.currentRound).toBe(2);
  });

  it('assigns players to correct teams', () => {
    let state = createTestState();

    // captain-a (Team A) picks p1
    const r1 = makeDraftPick(state, 'p1');
    state = r1.newState;
    expect(state.teamARoster).toHaveLength(1);
    expect(state.teamBRoster).toHaveLength(0);

    // captain-b (Team B) picks p2
    const r2 = makeDraftPick(state, 'p2');
    state = r2.newState;
    expect(state.teamARoster).toHaveLength(1);
    expect(state.teamBRoster).toHaveLength(1);
  });

  it('marks draft as completed when all players are picked', () => {
    const players = [
      createTestPlayer({ id: 'p1', firstName: 'A', lastName: 'A' }),
      createTestPlayer({ id: 'p2', firstName: 'B', lastName: 'B' }),
    ];
    const config = createTestConfig({ roundCount: 1 });
    let state = createTestState({
      config,
      availablePlayers: players,
    });

    // Pick both players
    state = makeDraftPick(state, 'p1').newState;
    state = makeDraftPick(state, 'p2').newState;

    expect(state.config.status).toBe('completed');
    expect(state.availablePlayers).toHaveLength(0);
  });

  it('resets time remaining after each pick', () => {
    const state = createTestState();
    state.timeRemaining = 5; // Simulate almost expired timer

    const { newState } = makeDraftPick(state, 'p1');

    expect(newState.timeRemaining).toBe(60);
  });

  it('stores auction price when provided', () => {
    const state = createTestState({
      config: createTestConfig({ type: 'auction' }),
    });

    const { pick } = makeDraftPick(state, 'p1', 25);

    expect(pick.auctionPrice).toBe(25);
  });
});

// ============================================
// randomizeTeams
// ============================================

describe('randomizeTeams', () => {
  it('splits players roughly in half', () => {
    const players = Array.from({ length: 8 }, (_, i) =>
      createTestPlayer({ id: `rp-${i}` })
    );

    const { teamA, teamB } = randomizeTeams(players);

    expect(teamA.length).toBe(4);
    expect(teamB.length).toBe(4);
  });

  it('handles odd number of players', () => {
    const players = Array.from({ length: 7 }, (_, i) =>
      createTestPlayer({ id: `rp-odd-${i}` })
    );

    const { teamA, teamB } = randomizeTeams(players);

    // ceil(7/2) = 4 for teamA, 3 for teamB
    expect(teamA.length).toBe(4);
    expect(teamB.length).toBe(3);
  });

  it('accounts for all players', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      createTestPlayer({ id: `rp-all-${i}` })
    );

    const { teamA, teamB } = randomizeTeams(players);
    const allIds = [...teamA, ...teamB].map(p => p.id).sort();
    const originalIds = players.map(p => p.id).sort();

    expect(allIds).toEqual(originalIds);
  });
});

// ============================================
// balanceTeamsByHandicap
// ============================================

describe('balanceTeamsByHandicap', () => {
  it('distributes handicaps evenly across teams', () => {
    const players = [
      createTestPlayer({ id: 'bh1', handicapIndex: 2 }),
      createTestPlayer({ id: 'bh2', handicapIndex: 5 }),
      createTestPlayer({ id: 'bh3', handicapIndex: 8 }),
      createTestPlayer({ id: 'bh4', handicapIndex: 12 }),
      createTestPlayer({ id: 'bh5', handicapIndex: 15 }),
      createTestPlayer({ id: 'bh6', handicapIndex: 20 }),
      createTestPlayer({ id: 'bh7', handicapIndex: 25 }),
      createTestPlayer({ id: 'bh8', handicapIndex: 30 }),
    ];

    const { teamA, teamB } = balanceTeamsByHandicap(players);

    expect(teamA).toHaveLength(4);
    expect(teamB).toHaveLength(4);

    const totalA = calculateTeamHandicapTotal(teamA);
    const totalB = calculateTeamHandicapTotal(teamB);

    // Teams should be reasonably balanced
    expect(Math.abs(totalA - totalB)).toBeLessThanOrEqual(10);
  });

  it('accounts for all players', () => {
    const players = Array.from({ length: 6 }, (_, i) =>
      createTestPlayer({ id: `bh-all-${i}`, handicapIndex: (i + 1) * 3 })
    );

    const { teamA, teamB } = balanceTeamsByHandicap(players);
    const allIds = [...teamA, ...teamB].map(p => p.id).sort();
    const originalIds = players.map(p => p.id).sort();

    expect(allIds).toEqual(originalIds);
  });

  it('uses 4-pick snake pattern (0,3 to A; 1,2 to B)', () => {
    // Players sorted by handicap: 2, 5, 10, 15
    const players = [
      createTestPlayer({ id: 'x1', handicapIndex: 10 }),
      createTestPlayer({ id: 'x2', handicapIndex: 2 }),
      createTestPlayer({ id: 'x3', handicapIndex: 15 }),
      createTestPlayer({ id: 'x4', handicapIndex: 5 }),
    ];

    const { teamA, teamB } = balanceTeamsByHandicap(players);

    // Sorted: x2(2), x4(5), x1(10), x3(15)
    // Index 0 (cycle 0) -> A: x2
    // Index 1 (cycle 1) -> B: x4
    // Index 2 (cycle 2) -> B: x1
    // Index 3 (cycle 3) -> A: x3
    expect(teamA.map(p => p.id)).toEqual(['x2', 'x3']);
    expect(teamB.map(p => p.id)).toEqual(['x4', 'x1']);
  });
});

// ============================================
// calculateTeamHandicapTotal
// ============================================

describe('calculateTeamHandicapTotal', () => {
  it('sums handicap indices', () => {
    const players = [
      createTestPlayer({ handicapIndex: 5 }),
      createTestPlayer({ handicapIndex: 10 }),
      createTestPlayer({ handicapIndex: 15 }),
    ];

    expect(calculateTeamHandicapTotal(players)).toBe(30);
  });

  it('uses default 18 for null/undefined handicap', () => {
    const players = [
      createTestPlayer({ handicapIndex: undefined }),
      createTestPlayer({ handicapIndex: 10 }),
    ];

    expect(calculateTeamHandicapTotal(players)).toBe(28);
  });

  it('returns 0 for empty array', () => {
    expect(calculateTeamHandicapTotal([])).toBe(0);
  });
});

// ============================================
// validateDraftReady
// ============================================

describe('validateDraftReady', () => {
  it('returns ready when config is valid', () => {
    const config = createTestConfig();
    const players = Array.from({ length: 6 }, () => createTestPlayer());

    const result = validateDraftReady(config, players);

    expect(result.ready).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports error when too few captains', () => {
    const config = createTestConfig({ draftOrder: ['only-one'] });
    const players = Array.from({ length: 6 }, () => createTestPlayer());

    const result = validateDraftReady(config, players);

    expect(result.ready).toBe(false);
    expect(result.errors).toContain('Need at least 2 captains for draft');
  });

  it('reports error when too few players', () => {
    const config = createTestConfig();
    const players = [createTestPlayer(), createTestPlayer()];

    const result = validateDraftReady(config, players);

    expect(result.ready).toBe(false);
    expect(result.errors).toContain('Need at least 4 players for draft');
  });

  it('reports error when auction budget is not set', () => {
    const config = createTestConfig({ type: 'auction', auctionBudget: 0 });
    const players = Array.from({ length: 6 }, () => createTestPlayer());

    const result = validateDraftReady(config, players);

    expect(result.ready).toBe(false);
    expect(result.errors).toContain('Auction budget not set');
  });

  it('can report multiple errors at once', () => {
    const config = createTestConfig({
      draftOrder: ['only-one'],
      type: 'auction',
      auctionBudget: 0,
    });
    const players = [createTestPlayer()];

    const result = validateDraftReady(config, players);

    expect(result.ready).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================
// getDraftSummary
// ============================================

describe('getDraftSummary', () => {
  it('returns correct counts for initial state', () => {
    const state = createTestState();

    const summary = getDraftSummary(state);

    expect(summary.status).toBe('setup');
    expect(summary.totalPicks).toBe(0);
    expect(summary.teamACount).toBe(0);
    expect(summary.teamBCount).toBe(0);
    expect(summary.remainingPlayers).toBe(4);
    expect(summary.pickHistory).toHaveLength(0);
  });

  it('returns correct totals after picks', () => {
    let state = createTestState();

    // Make two picks
    state = makeDraftPick(state, 'p1').newState;
    state = makeDraftPick(state, 'p2').newState;

    const summary = getDraftSummary(state);

    expect(summary.totalPicks).toBe(2);
    expect(summary.teamACount).toBe(1);
    expect(summary.teamBCount).toBe(1);
    expect(summary.remainingPlayers).toBe(2);
    expect(summary.teamAHandicap).toBe(5);  // p1 handicap
    expect(summary.teamBHandicap).toBe(10); // p2 handicap
  });

  it('includes pick history with player names', () => {
    let state = createTestState();
    state = makeDraftPick(state, 'p1').newState;

    const summary = getDraftSummary(state);

    expect(summary.pickHistory).toHaveLength(1);
    expect(summary.pickHistory[0].playerName).toBe('Alice A');
    expect(summary.pickHistory[0].round).toBe(1);
    expect(summary.pickHistory[0].pick).toBe(1);
    expect(summary.pickHistory[0].team).toBe('Team A');
  });
});
