import { calculatePlayerStats } from '@/lib/services/awardsService';
import type { PlayerStats } from '@/lib/types/awards';

export type TripAchievementId =
  | 'on-the-board'
  | 'closer'
  | 'hat-trick'
  | 'on-fire'
  | 'dominant-force'
  | 'iron-man'
  | 'match-machine'
  | 'team-player'
  | 'mvp'
  | 'perfect-record';

export type TripAchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type TripAchievementIcon =
  | 'award'
  | 'crown'
  | 'flame'
  | 'medal'
  | 'star'
  | 'trending-up'
  | 'users'
  | 'zap';

export interface TripAchievement {
  id: TripAchievementId;
  name: string;
  description: string;
  icon: TripAchievementIcon;
  rarity: TripAchievementRarity;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  leaderName?: string;
  leaderValue?: number;
}

export interface TripAchievementSummary {
  achievements: TripAchievement[];
  unlockedCount: number;
  totalCount: number;
}

interface MetricLeader {
  name?: string;
  value: number;
}

function getMetricLeader(
  playerStats: PlayerStats[],
  valueForPlayer: (player: PlayerStats) => number,
  qualifies: (player: PlayerStats) => boolean = () => true
): MetricLeader {
  let leader: PlayerStats | undefined;
  let leaderValue = 0;

  for (const player of playerStats) {
    if (!qualifies(player)) {
      continue;
    }

    const value = valueForPlayer(player);
    if (value > leaderValue) {
      leader = player;
      leaderValue = value;
    }
  }

  return {
    name: leader?.playerName,
    value: leaderValue,
  };
}

function buildAchievementSummary(achievements: TripAchievement[]): TripAchievementSummary {
  return {
    achievements,
    unlockedCount: achievements.filter((achievement) => achievement.unlocked).length,
    totalCount: achievements.length,
  };
}

export function buildTripAchievements(playerStats: PlayerStats[]): TripAchievement[] {
  const holesWonLeader = getMetricLeader(playerStats, (player) => player.holesWon);
  const winsLeader = getMetricLeader(playerStats, (player) => player.wins);
  const streakLeader = getMetricLeader(playerStats, (player) => player.longestWinStreak);
  const biggestWinLeader = getMetricLeader(playerStats, (player) => player.biggestWin);
  const matchesLeader = getMetricLeader(playerStats, (player) => player.matchesPlayed);
  const pointsLeader = getMetricLeader(playerStats, (player) => player.points);
  const perfectRecordLeader = getMetricLeader(
    playerStats,
    (player) => player.wins,
    (player) => player.losses === 0
  );

  return [
    {
      id: 'on-the-board',
      name: 'On the Board',
      description: 'Win a hole during the trip.',
      icon: 'zap',
      rarity: 'common',
      unlocked: holesWonLeader.value >= 1,
      progress: Math.min(holesWonLeader.value, 1),
      maxProgress: 1,
      leaderName: holesWonLeader.name,
      leaderValue: holesWonLeader.value,
    },
    {
      id: 'closer',
      name: 'Closer',
      description: 'Win a match.',
      icon: 'award',
      rarity: 'common',
      unlocked: winsLeader.value >= 1,
      progress: Math.min(winsLeader.value, 1),
      maxProgress: 1,
      leaderName: winsLeader.name,
      leaderValue: winsLeader.value,
    },
    {
      id: 'hat-trick',
      name: 'Hat Trick',
      description: 'Win 3 matches during the trip.',
      icon: 'medal',
      rarity: 'rare',
      unlocked: winsLeader.value >= 3,
      progress: Math.min(winsLeader.value, 3),
      maxProgress: 3,
      leaderName: winsLeader.name,
      leaderValue: winsLeader.value,
    },
    {
      id: 'on-fire',
      name: 'On Fire',
      description: 'Win 3 matches in a row.',
      icon: 'flame',
      rarity: 'epic',
      unlocked: streakLeader.value >= 3,
      progress: Math.min(streakLeader.value, 3),
      maxProgress: 3,
      leaderName: streakLeader.name,
      leaderValue: streakLeader.value,
    },
    {
      id: 'dominant-force',
      name: 'Dominant Force',
      description: 'Win a match by 5 or more holes.',
      icon: 'star',
      rarity: 'epic',
      unlocked: biggestWinLeader.value >= 5,
      progress: Math.min(biggestWinLeader.value, 5),
      maxProgress: 5,
      leaderName: biggestWinLeader.name,
      leaderValue: biggestWinLeader.value,
    },
    {
      id: 'iron-man',
      name: 'Iron Man',
      description: 'Play in 5 matches.',
      icon: 'medal',
      rarity: 'rare',
      unlocked: matchesLeader.value >= 5,
      progress: Math.min(matchesLeader.value, 5),
      maxProgress: 5,
      leaderName: matchesLeader.name,
      leaderValue: matchesLeader.value,
    },
    {
      id: 'match-machine',
      name: 'Match Machine',
      description: 'Play in 10 matches.',
      icon: 'zap',
      rarity: 'epic',
      unlocked: matchesLeader.value >= 10,
      progress: Math.min(matchesLeader.value, 10),
      maxProgress: 10,
      leaderName: matchesLeader.name,
      leaderValue: matchesLeader.value,
    },
    {
      id: 'team-player',
      name: 'Team Player',
      description: 'Contribute 3 points to your side.',
      icon: 'users',
      rarity: 'common',
      unlocked: pointsLeader.value >= 3,
      progress: Math.min(pointsLeader.value, 3),
      maxProgress: 3,
      leaderName: pointsLeader.name,
      leaderValue: pointsLeader.value,
    },
    {
      id: 'mvp',
      name: 'MVP',
      description: 'Reach 5 points in a single trip.',
      icon: 'award',
      rarity: 'legendary',
      unlocked: pointsLeader.value >= 5,
      progress: Math.min(pointsLeader.value, 5),
      maxProgress: 5,
      leaderName: pointsLeader.name,
      leaderValue: pointsLeader.value,
    },
    {
      id: 'perfect-record',
      name: 'Perfect Record',
      description: 'Win 5 matches without taking a loss.',
      icon: 'crown',
      rarity: 'legendary',
      unlocked: perfectRecordLeader.value >= 5,
      progress: Math.min(perfectRecordLeader.value, 5),
      maxProgress: 5,
      leaderName: perfectRecordLeader.name,
      leaderValue: perfectRecordLeader.value,
    },
  ];
}

export async function loadTripAchievementSummary(tripId: string): Promise<TripAchievementSummary> {
  const playerStats = await calculatePlayerStats(tripId);
  return buildAchievementSummary(buildTripAchievements(playerStats));
}

