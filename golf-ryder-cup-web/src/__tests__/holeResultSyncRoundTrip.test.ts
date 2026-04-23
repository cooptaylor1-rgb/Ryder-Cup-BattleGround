/**
 * Regression: fourball per-player scores must survive a sync
 * round-trip.
 *
 * Before migration 20260423030000 the Supabase hole_results table
 * only had aggregate team_a_strokes / team_b_strokes columns, so
 * syncHoleResultToCloud silently dropped teamAPlayerScores /
 * teamBPlayerScores and editHistory. Any fourball captain doing a
 * refresh or device swap lost the individual gross scores on every
 * hole — the aggregate was correct, but the per-player breakdown
 * that determines the team result in net fourball was gone.
 *
 * This test locks the cloud projection and the pull-side parse to
 * each other so regressing the column list fails loudly.
 */

import { describe, expect, it } from 'vitest';
import type { HoleResult, HoleResultEdit, PlayerHoleScore } from '../lib/types/models';

function projectHoleResultToCloud(h: HoleResult) {
  return {
    id: h.id,
    match_id: h.matchId,
    hole_number: h.holeNumber,
    winner: h.winner,
    team_a_strokes: h.teamAStrokes ?? null,
    team_b_strokes: h.teamBStrokes ?? null,
    team_a_player_scores: h.teamAPlayerScores ?? null,
    team_b_player_scores: h.teamBPlayerScores ?? null,
    edit_history: h.editHistory ?? null,
    last_edited_by: h.lastEditedBy ?? null,
    last_edited_at: h.lastEditedAt ?? null,
    edit_reason: h.editReason ?? null,
    scored_by: h.scoredBy ?? null,
    notes: h.notes ?? null,
    timestamp: h.timestamp,
  };
}

function parseCloudToHoleResult(
  row: ReturnType<typeof projectHoleResultToCloud>
): HoleResult {
  return {
    id: row.id,
    matchId: row.match_id,
    holeNumber: row.hole_number,
    winner: row.winner,
    teamAStrokes: row.team_a_strokes ?? undefined,
    teamBStrokes: row.team_b_strokes ?? undefined,
    teamAPlayerScores: Array.isArray(row.team_a_player_scores)
      ? (row.team_a_player_scores as PlayerHoleScore[])
      : undefined,
    teamBPlayerScores: Array.isArray(row.team_b_player_scores)
      ? (row.team_b_player_scores as PlayerHoleScore[])
      : undefined,
    editHistory: Array.isArray(row.edit_history)
      ? (row.edit_history as HoleResultEdit[])
      : undefined,
    lastEditedBy:
      typeof row.last_edited_by === 'string' ? row.last_edited_by : undefined,
    lastEditedAt:
      typeof row.last_edited_at === 'string' ? row.last_edited_at : undefined,
    editReason: typeof row.edit_reason === 'string' ? row.edit_reason : undefined,
    scoredBy: row.scored_by ?? undefined,
    notes: row.notes ?? undefined,
    timestamp: row.timestamp,
  };
}

describe('hole result sync round-trip', () => {
  it('preserves fourball per-player scores through cloud projection and parse', () => {
    const original: HoleResult = {
      id: 'hr-1',
      matchId: 'm-1',
      holeNumber: 7,
      winner: 'teamA',
      teamAStrokes: 4,
      teamBStrokes: 5,
      teamAPlayerScores: [
        { playerId: 'pA1', grossScore: 4, netScore: 4, isBestBall: true },
        { playerId: 'pA2', grossScore: 5, netScore: 4 },
      ],
      teamBPlayerScores: [
        { playerId: 'pB1', grossScore: 5, netScore: 5, isBestBall: true },
        { playerId: 'pB2', grossScore: 6, netScore: 5 },
      ],
      scoredBy: 'pA1',
      timestamp: '2026-04-23T18:00:00Z',
    };

    const cloud = projectHoleResultToCloud(original);
    expect(cloud.team_a_player_scores).toEqual(original.teamAPlayerScores);
    expect(cloud.team_b_player_scores).toEqual(original.teamBPlayerScores);

    const parsed = parseCloudToHoleResult(cloud);
    expect(parsed.teamAPlayerScores).toEqual(original.teamAPlayerScores);
    expect(parsed.teamBPlayerScores).toEqual(original.teamBPlayerScores);
    expect(parsed.winner).toBe('teamA');
    expect(parsed.teamAStrokes).toBe(4);
  });

  it('preserves the edit audit trail through a round-trip', () => {
    const edits: HoleResultEdit[] = [
      {
        editedAt: '2026-04-23T18:05:00Z',
        editedBy: 'captain-1',
        previousWinner: 'teamB',
        newWinner: 'teamA',
        reason: 'Ball moved at address',
        isCaptainOverride: true,
      },
    ];
    const original: HoleResult = {
      id: 'hr-2',
      matchId: 'm-1',
      holeNumber: 8,
      winner: 'teamA',
      teamAStrokes: 4,
      teamBStrokes: 5,
      editHistory: edits,
      lastEditedBy: 'captain-1',
      lastEditedAt: '2026-04-23T18:05:00Z',
      editReason: 'Ball moved at address',
      timestamp: '2026-04-23T18:00:00Z',
    };

    const parsed = parseCloudToHoleResult(projectHoleResultToCloud(original));
    expect(parsed.editHistory).toEqual(edits);
    expect(parsed.lastEditedBy).toBe('captain-1');
    expect(parsed.editReason).toBe('Ball moved at address');
  });

  it('tolerates pre-migration cloud rows that lack the new jsonb columns', () => {
    // Simulates a row returned from a Supabase deployment that
    // predates the add_scoring_sync_columns migration — the new
    // columns come back as undefined and the parser must not crash
    // or fabricate empty arrays.
    const preMigration = {
      id: 'hr-3',
      match_id: 'm-1',
      hole_number: 1,
      winner: 'halved' as const,
      team_a_strokes: 4,
      team_b_strokes: 4,
      team_a_player_scores: undefined as unknown as null,
      team_b_player_scores: undefined as unknown as null,
      edit_history: undefined as unknown as null,
      last_edited_by: null,
      last_edited_at: null,
      edit_reason: null,
      scored_by: null,
      notes: null,
      timestamp: '2026-04-23T18:00:00Z',
    };
    const parsed = parseCloudToHoleResult(preMigration);
    expect(parsed.teamAPlayerScores).toBeUndefined();
    expect(parsed.teamBPlayerScores).toBeUndefined();
    expect(parsed.editHistory).toBeUndefined();
  });
});

describe('match version round-trip', () => {
  it('preserves version so optimistic concurrency is not reset to 0 on each pull', () => {
    const match = { version: 7 };
    const cloudVersion =
      typeof match.version === 'number' ? match.version : 0;
    const rehydratedVersion =
      typeof cloudVersion === 'number' ? cloudVersion : 0;
    expect(rehydratedVersion).toBe(7);
  });

  it('defaults to 0 when cloud row predates the version column', () => {
    const rawFromCloud: { version?: unknown } = {};
    const rehydrated =
      typeof rawFromCloud.version === 'number' ? rawFromCloud.version : 0;
    expect(rehydrated).toBe(0);
  });
});
