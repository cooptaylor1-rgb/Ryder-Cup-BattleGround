import { describe, expect, it } from 'vitest';
import { buildTripAchievements } from '@/lib/services/achievementService';
import type { PlayerStats } from '@/lib/types/awards';

function makePlayerStats(overrides: Partial<PlayerStats>): PlayerStats {
  return {
    playerId: 'player-1',
    playerName: 'Test Player',
    teamColor: 'usa',
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    halves: 0,
    points: 0,
    winPercentage: 0,
    biggestWin: 0,
    holesWon: 0,
    holesLost: 0,
    holesHalved: 0,
    currentStreak: 0,
    longestWinStreak: 0,
    ...overrides,
  };
}

describe('achievementService', () => {
  it('uses total match wins for Hat Trick and streaks for On Fire', () => {
    const achievements = buildTripAchievements([
      makePlayerStats({
        playerId: 'player-1',
        playerName: 'Casey Matchplay',
        wins: 3,
        longestWinStreak: 2,
      }),
    ]);

    expect(achievements.find((achievement) => achievement.id === 'hat-trick')).toMatchObject({
      unlocked: true,
      progress: 3,
      leaderName: 'Casey Matchplay',
    });
    expect(achievements.find((achievement) => achievement.id === 'on-fire')).toMatchObject({
      unlocked: false,
      progress: 2,
      leaderName: 'Casey Matchplay',
    });
  });

  it('only awards Perfect Record to players without losses', () => {
    const achievements = buildTripAchievements([
      makePlayerStats({
        playerId: 'player-1',
        playerName: 'Steady Eddie',
        wins: 6,
        losses: 1,
      }),
      makePlayerStats({
        playerId: 'player-2',
        playerName: 'Clean Card',
        wins: 5,
        losses: 0,
      }),
    ]);

    expect(achievements.find((achievement) => achievement.id === 'perfect-record')).toMatchObject({
      unlocked: true,
      leaderName: 'Clean Card',
      progress: 5,
    });
  });
});
