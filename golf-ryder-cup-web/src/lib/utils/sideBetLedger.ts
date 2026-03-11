import type { NassauResults, Player, SideBet, SideBetResult } from '@/lib/types/models';

export interface SkinsStanding {
  playerId: string;
  playerName: string;
  skins: number;
  winnings: number;
}

export interface NassauSummary {
  teamAWins: number;
  teamBWins: number;
  pushes: number;
  segmentValue: number;
}

export function upsertHoleResult(results: SideBetResult[], holeNumber: number, winnerId?: string) {
  const next = results.filter((entry) => entry.holeNumber !== holeNumber);
  next.push({
    holeNumber,
    winnerId,
    amount: 0,
  });
  return next.sort((left, right) => left.holeNumber - right.holeNumber);
}

export function normalizeSkinsResults(results: SideBetResult[], perHole: number) {
  let carry = 0;

  return results
    .sort((left, right) => left.holeNumber - right.holeNumber)
    .map((result) => {
      if (!result.winnerId) {
        carry += perHole;
        return { ...result, amount: perHole };
      }

      const amount = perHole + carry;
      carry = 0;
      return { ...result, amount };
    });
}

export function calculateNextSkinValue(bet: SideBet) {
  const perHole = bet.perHole || 5;
  const results = (bet.results || []).sort((left, right) => left.holeNumber - right.holeNumber);
  let carry = 0;

  for (const result of results) {
    if (!result.winnerId) {
      carry += perHole;
    } else {
      carry = 0;
    }
  }

  return perHole + carry;
}

export function calculateSkinsStandings(bet: SideBet, participants: Player[]) {
  const standings = new Map<string, { skins: number; winnings: number }>();
  const participantNameById = new Map(
    participants.map((player) => [player.id, player.lastName || player.firstName || 'Unknown'])
  );

  for (const player of participants) {
    standings.set(player.id, { skins: 0, winnings: 0 });
  }

  for (const result of normalizeSkinsResults(bet.results || [], bet.perHole || 5)) {
    if (!result.winnerId) continue;

    const current = standings.get(result.winnerId);
    if (!current) continue;

    standings.set(result.winnerId, {
      skins: current.skins + 1,
      winnings: current.winnings + result.amount,
    });
  }

  return Array.from(standings.entries())
    .map(([playerId, data]) => ({
      playerId,
      playerName: participantNameById.get(playerId) || 'Unknown',
      ...data,
    }))
    .filter((standing) => standing.skins > 0)
    .sort((left, right) => right.winnings - left.winnings);
}

export function getNassauSummary(bet: SideBet): NassauSummary {
  const results: NassauResults = bet.nassauResults || {};
  let teamAWins = 0;
  let teamBWins = 0;
  let pushes = 0;

  for (const value of [results.front9Winner, results.back9Winner, results.overallWinner]) {
    if (value === 'teamA') teamAWins += 1;
    if (value === 'teamB') teamBWins += 1;
    if (value === 'push') pushes += 1;
  }

  return {
    teamAWins,
    teamBWins,
    pushes,
    segmentValue: Math.round((bet.pot || 20) / 3),
  };
}
