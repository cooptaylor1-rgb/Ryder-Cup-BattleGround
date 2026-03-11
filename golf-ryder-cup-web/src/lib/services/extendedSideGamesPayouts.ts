import type { Player } from '@/lib/types/models';
import type { HammerGame, NassauEnhanced, VegasGame, WolfGame } from '@/lib/types/sideGames';

export function calculateWolfPayouts(
  game: WolfGame,
  players: Player[]
): { playerId: string; playerName: string; netPoints: number; netAmount: number }[] {
  return game.standings
    .map((standing) => {
      const player = players.find((candidate) => candidate.id === standing.playerId);
      return {
        playerId: standing.playerId,
        playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
        netPoints: standing.points,
        netAmount: standing.points * game.buyIn,
      };
    })
    .sort((left, right) => right.netAmount - left.netAmount);
}

export function calculateVegasPayouts(
  game: VegasGame,
  _players: Player[]
): {
  team1Owes: number;
  team2Owes: number;
  settlementAmount: number;
  winningTeam: 'team1' | 'team2' | 'push';
  breakdown: { holeNumber: number; diff: number; flip: string }[];
} {
  const totalDiff = game.runningScore;
  const settlementAmount = Math.abs(totalDiff) * game.pointValue;

  let winningTeam: 'team1' | 'team2' | 'push';
  if (totalDiff > 0) {
    winningTeam = 'team1';
  } else if (totalDiff < 0) {
    winningTeam = 'team2';
  } else {
    winningTeam = 'push';
  }

  const breakdown = game.holeResults.map((result) => ({
    holeNumber: result.holeNumber,
    diff: result.pointDiff,
    flip: [result.team1Flipped ? 'T1' : '', result.team2Flipped ? 'T2' : '']
      .filter(Boolean)
      .join(',') || '-',
  }));

  return {
    team1Owes: totalDiff < 0 ? settlementAmount : 0,
    team2Owes: totalDiff > 0 ? settlementAmount : 0,
    settlementAmount,
    winningTeam,
    breakdown,
  };
}

export function calculateHammerPayouts(
  game: HammerGame,
  _players: Player[]
): {
  team1Total: number;
  team2Total: number;
  netSettlement: number;
  winningTeam: 'team1' | 'team2' | 'push';
  holeBreakdown: { hole: number; value: number; winner: string }[];
} {
  const holeBreakdown = game.holeResults.map((result) => ({
    hole: result.holeNumber,
    value: result.pointsWon,
    winner: result.winner,
  }));

  const team1Total = game.holeResults
    .filter((result) => result.winner === 'team1')
    .reduce((sum, result) => sum + result.pointsWon, 0);
  const team2Total = game.holeResults
    .filter((result) => result.winner === 'team2')
    .reduce((sum, result) => sum + result.pointsWon, 0);

  const netSettlement = team1Total - team2Total;

  let winningTeam: 'team1' | 'team2' | 'push';
  if (netSettlement > 0) {
    winningTeam = 'team1';
  } else if (netSettlement < 0) {
    winningTeam = 'team2';
  } else {
    winningTeam = 'push';
  }

  return {
    team1Total,
    team2Total,
    netSettlement: Math.abs(netSettlement),
    winningTeam,
    holeBreakdown,
  };
}

export function calculateNassauPayouts(
  game: NassauEnhanced,
  _players: Player[]
): {
  frontNineResult: { winner: string; amount: number };
  backNineResult: { winner: string; amount: number };
  overallResult: { winner: string; amount: number };
  pressResults: { nine: string; winner: string; amount: number; isAuto: boolean }[];
  totalTeam1: number;
  totalTeam2: number;
  netSettlement: number;
} {
  let totalTeam1 = 0;
  let totalTeam2 = 0;

  const frontNineResult = {
    winner: game.frontNine.winner || 'push',
    amount: game.baseValue,
  };
  if (game.frontNine.winner === 'team1') totalTeam1 += game.baseValue;
  if (game.frontNine.winner === 'team2') totalTeam2 += game.baseValue;

  const backNineResult = {
    winner: game.backNine.winner || 'push',
    amount: game.baseValue,
  };
  if (game.backNine.winner === 'team1') totalTeam1 += game.baseValue;
  if (game.backNine.winner === 'team2') totalTeam2 += game.baseValue;

  const overallResult = {
    winner: game.overall.winner || 'push',
    amount: game.baseValue,
  };
  if (game.overall.winner === 'team1') totalTeam1 += game.baseValue;
  if (game.overall.winner === 'team2') totalTeam2 += game.baseValue;

  const pressResults = game.presses.map((press) => {
    const nineResult = press.nine === 'front' ? game.frontNine : game.backNine;
    const pressWinner = nineResult.winner || 'push';

    if (pressWinner === 'team1') totalTeam1 += press.value;
    if (pressWinner === 'team2') totalTeam2 += press.value;

    return {
      nine: press.nine,
      winner: pressWinner,
      amount: press.value,
      isAuto: press.isAuto,
    };
  });

  return {
    frontNineResult,
    backNineResult,
    overallResult,
    pressResults,
    totalTeam1,
    totalTeam2,
    netSettlement: Math.abs(totalTeam1 - totalTeam2),
  };
}
