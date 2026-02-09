/**
 * Multi-Round Stats Service
 *
 * Tracks player performance across multiple rounds/sessions
 * to surface trends, streaks, and head-to-head records.
 */

import type { UUID, HoleResult, Player } from '@/lib/types/models';
import { db } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export interface PlayerMatchRecord {
  matchId: UUID;
  sessionId: UUID;
  sessionName: string;
  opponentNames: string;
  result: 'won' | 'lost' | 'halved';
  margin: number;
  holesPlayed: number;
  date?: string;
}

export interface PlayerStats {
  playerId: UUID;
  playerName: string;
  totalMatches: number;
  wins: number;
  losses: number;
  halved: number;
  winPercentage: number;
  pointsEarned: number;
  /** Current streak: positive = wins, negative = losses */
  currentStreak: number;
  /** Longest winning streak */
  longestWinStreak: number;
  /** Match history (most recent first) */
  matchHistory: PlayerMatchRecord[];
}

export interface HeadToHeadRecord {
  playerAId: UUID;
  playerAName: string;
  playerBId: UUID;
  playerBName: string;
  playerAWins: number;
  playerBWins: number;
  halved: number;
  totalMatches: number;
  matches: PlayerMatchRecord[];
}

export interface TeamStats {
  team: 'usa' | 'europe';
  totalPoints: number;
  matchesWon: number;
  matchesLost: number;
  matchesHalved: number;
  /** Points by session type */
  pointsByFormat: Record<string, number>;
  /** Best performer */
  mvp?: { playerId: UUID; playerName: string; points: number };
}

export interface TripStatsOverview {
  tripId: UUID;
  playerStats: PlayerStats[];
  teamStats: { usa: TeamStats; europe: TeamStats };
  headToHead: HeadToHeadRecord[];
  /** Most decisive victory */
  biggestWin?: { matchId: UUID; description: string; margin: number };
  /** Closest match */
  closestMatch?: { matchId: UUID; description: string };
  /** Total holes played across all matches */
  totalHolesPlayed: number;
}

// ============================================
// SERVICE
// ============================================

/**
 * Calculate comprehensive stats for all players in a trip
 */
export async function getTripStatsOverview(tripId: UUID): Promise<TripStatsOverview> {
  // Load all trip data
  const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
  const sessionIds = sessions.map((s) => s.id);
  const matches =
    sessionIds.length > 0
      ? await db.matches.where('sessionId').anyOf(sessionIds).toArray()
      : [];
  const matchIds = matches.map((m) => m.id);
  const holeResults =
    matchIds.length > 0
      ? await db.holeResults.where('matchId').anyOf(matchIds).toArray()
      : [];
  const players = await db.players.where('tripId').equals(tripId).toArray();

  const playerStatsMap = new Map<UUID, PlayerStats>();
  const h2hMap = new Map<string, HeadToHeadRecord>();

  // Initialize player stats
  for (const player of players) {
    playerStatsMap.set(player.id, {
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      totalMatches: 0,
      wins: 0,
      losses: 0,
      halved: 0,
      winPercentage: 0,
      pointsEarned: 0,
      currentStreak: 0,
      longestWinStreak: 0,
      matchHistory: [],
    });
  }

  // Team stats
  const teamStatsInit = (team: 'usa' | 'europe'): TeamStats => ({
    team,
    totalPoints: 0,
    matchesWon: 0,
    matchesLost: 0,
    matchesHalved: 0,
    pointsByFormat: {},
  });

  const usaStats = teamStatsInit('usa');
  const europeStats = teamStatsInit('europe');

  let biggestWin: TripStatsOverview['biggestWin'] = undefined;
  let closestMatch: TripStatsOverview['closestMatch'] = undefined;
  let totalHolesPlayed = 0;

  // Process each completed match
  const completedMatches = matches
    .filter((m) => m.status === 'completed')
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

  for (const match of completedMatches) {
    const session = sessions.find((s) => s.id === match.sessionId);
    const matchHoles = holeResults.filter((hr) => hr.matchId === match.id);
    totalHolesPlayed += matchHoles.length;

    // Determine winner
    const { teamAWins, teamBWins } = countHoleWins(matchHoles);
    const margin = Math.abs(teamAWins - teamBWins);
    const isHalved = teamAWins === teamBWins;
    const teamAWon = teamAWins > teamBWins;

    // Get player names for descriptions
    const teamANames = match.teamAPlayerIds
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => p!.firstName)
      .join(' & ');
    const teamBNames = match.teamBPlayerIds
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => p!.firstName)
      .join(' & ');

    // Track biggest win and closest match
    if (!isHalved && margin > 0) {
      if (!biggestWin || margin > biggestWin.margin) {
        const winnerNames = teamAWon ? teamANames : teamBNames;
        const holesRemaining = Math.max(0, 18 - matchHoles.length);
        biggestWin = {
          matchId: match.id,
          description: `${winnerNames} won ${margin}${holesRemaining > 0 ? `&${holesRemaining}` : ' UP'}`,
          margin,
        };
      }
    }

    if (isHalved || margin <= 1) {
      if (!closestMatch) {
        closestMatch = {
          matchId: match.id,
          description: isHalved
            ? `${teamANames} vs ${teamBNames} — Halved`
            : `${teamAWon ? teamANames : teamBNames} won 1 UP`,
        };
      }
    }

    // Update per-player stats
    const allTeamAIds = match.teamAPlayerIds;
    const allTeamBIds = match.teamBPlayerIds;

    const updatePlayerStats = (
      playerIds: UUID[],
      won: boolean,
      halved: boolean,
      opponentNames: string
    ) => {
      for (const pid of playerIds) {
        const stats = playerStatsMap.get(pid);
        if (!stats) continue;

        stats.totalMatches++;
        const record: PlayerMatchRecord = {
          matchId: match.id,
          sessionId: match.sessionId,
          sessionName: session?.name || 'Match',
          opponentNames,
          result: halved ? 'halved' : won ? 'won' : 'lost',
          margin,
          holesPlayed: matchHoles.length,
          date: session?.scheduledDate,
        };
        stats.matchHistory.push(record);

        if (halved) {
          stats.halved++;
          stats.pointsEarned += 0.5;
          stats.currentStreak = 0;
        } else if (won) {
          stats.wins++;
          stats.pointsEarned += 1;
          stats.currentStreak = stats.currentStreak >= 0 ? stats.currentStreak + 1 : 1;
          stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentStreak);
        } else {
          stats.losses++;
          stats.currentStreak = stats.currentStreak <= 0 ? stats.currentStreak - 1 : -1;
        }

        stats.winPercentage =
          stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0;
      }
    };

    updatePlayerStats(allTeamAIds, teamAWon, isHalved, teamBNames);
    updatePlayerStats(allTeamBIds, !teamAWon, isHalved, teamANames);

    // Update team stats
    const sessionType = session?.sessionType || 'singles';
    if (isHalved) {
      usaStats.matchesHalved++;
      europeStats.matchesHalved++;
      usaStats.totalPoints += 0.5;
      europeStats.totalPoints += 0.5;
      usaStats.pointsByFormat[sessionType] = (usaStats.pointsByFormat[sessionType] || 0) + 0.5;
      europeStats.pointsByFormat[sessionType] = (europeStats.pointsByFormat[sessionType] || 0) + 0.5;
    } else if (teamAWon) {
      usaStats.matchesWon++;
      europeStats.matchesLost++;
      usaStats.totalPoints += 1;
      usaStats.pointsByFormat[sessionType] = (usaStats.pointsByFormat[sessionType] || 0) + 1;
    } else {
      europeStats.matchesWon++;
      usaStats.matchesLost++;
      europeStats.totalPoints += 1;
      europeStats.pointsByFormat[sessionType] = (europeStats.pointsByFormat[sessionType] || 0) + 1;
    }

    // Build head-to-head records for singles
    if (allTeamAIds.length === 1 && allTeamBIds.length === 1) {
      const pA = allTeamAIds[0];
      const pB = allTeamBIds[0];
      const key = [pA, pB].sort().join('-');

      if (!h2hMap.has(key)) {
        const playerA = players.find((p) => p.id === pA);
        const playerB = players.find((p) => p.id === pB);
        h2hMap.set(key, {
          playerAId: pA,
          playerAName: playerA ? `${playerA.firstName} ${playerA.lastName}` : 'Unknown',
          playerBId: pB,
          playerBName: playerB ? `${playerB.firstName} ${playerB.lastName}` : 'Unknown',
          playerAWins: 0,
          playerBWins: 0,
          halved: 0,
          totalMatches: 0,
          matches: [],
        });
      }

      const h2h = h2hMap.get(key)!;
      h2h.totalMatches++;
      if (isHalved) {
        h2h.halved++;
      } else if (teamAWon) {
        if (h2h.playerAId === pA) h2h.playerAWins++;
        else h2h.playerBWins++;
      } else {
        if (h2h.playerAId === pB) h2h.playerAWins++;
        else h2h.playerBWins++;
      }
    }
  }

  // Calculate MVPs
  const usaPlayers = players.filter((p) => p.team === 'usa');
  const europePlayers = players.filter((p) => p.team === 'europe');

  const findMvp = (teamPlayers: Player[]): TeamStats['mvp'] => {
    let best: TeamStats['mvp'] = undefined;
    for (const p of teamPlayers) {
      const stats = playerStatsMap.get(p.id);
      if (stats && (!best || stats.pointsEarned > best.points)) {
        best = { playerId: p.id, playerName: stats.playerName, points: stats.pointsEarned };
      }
    }
    return best;
  };

  usaStats.mvp = findMvp(usaPlayers);
  europeStats.mvp = findMvp(europePlayers);

  // Reverse match history so most recent is first
  for (const stats of playerStatsMap.values()) {
    stats.matchHistory.reverse();
  }

  return {
    tripId,
    playerStats: Array.from(playerStatsMap.values()).sort(
      (a, b) => b.pointsEarned - a.pointsEarned
    ),
    teamStats: { usa: usaStats, europe: europeStats },
    headToHead: Array.from(h2hMap.values()).filter((h) => h.totalMatches > 0),
    biggestWin,
    closestMatch,
    totalHolesPlayed,
  };
}

/**
 * Get stats for a single player
 */
export async function getPlayerMatchStats(
  tripId: UUID,
  playerId: UUID
): Promise<PlayerStats | null> {
  const overview = await getTripStatsOverview(tripId);
  return overview.playerStats.find((s) => s.playerId === playerId) || null;
}

/**
 * Get head-to-head record between two players
 */
export async function getHeadToHead(
  tripId: UUID,
  playerAId: UUID,
  playerBId: UUID
): Promise<HeadToHeadRecord | null> {
  const overview = await getTripStatsOverview(tripId);
  const key = [playerAId, playerBId].sort().join('-');
  return overview.headToHead.find(
    (h) => [h.playerAId, h.playerBId].sort().join('-') === key
  ) || null;
}

// ============================================
// HELPERS
// ============================================

function countHoleWins(holeResults: HoleResult[]): {
  teamAWins: number;
  teamBWins: number;
} {
  let teamAWins = 0;
  let teamBWins = 0;
  for (const hr of holeResults) {
    if (hr.winner === 'teamA') teamAWins++;
    else if (hr.winner === 'teamB') teamBWins++;
  }
  return { teamAWins, teamBWins };
}
