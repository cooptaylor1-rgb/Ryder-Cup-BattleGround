import type { Player, UUID } from '@/lib/types/models';
import type {
  HammerGame,
  NassauEnhanced,
  PlayerSettlementBalance,
  SettlementGameItem,
  SettlementTransaction,
  TripSettlementSummary,
  VegasGame,
  WolfGame,
} from '@/lib/types/sideGames';
import {
  calculateHammerPayouts,
  calculateNassauPayouts,
  calculateVegasPayouts,
} from './extendedSideGamesPayouts';

type PlayerBreakdown = PlayerSettlementBalance['breakdown'];
type SettlementBalanceMap = Map<UUID, number>;
type SettlementBreakdownMap = Map<UUID, PlayerBreakdown>;
type SkinsSettlementResult = { playerId: UUID; amount: number };

function createEmptyBreakdown(): PlayerBreakdown {
  return {
    skins: 0,
    nassau: 0,
    wolf: 0,
    vegas: 0,
    hammer: 0,
    sideBets: 0,
    other: 0,
  };
}

function addBalance(
  balances: SettlementBalanceMap,
  breakdowns: SettlementBreakdownMap,
  playerId: UUID,
  category: keyof PlayerBreakdown,
  amount: number
) {
  balances.set(playerId, (balances.get(playerId) || 0) + amount);
  const breakdown = breakdowns.get(playerId);
  if (breakdown) {
    breakdown[category] += amount;
  }
}

function applyTeamSettlement(
  balances: SettlementBalanceMap,
  breakdowns: SettlementBreakdownMap,
  winners: UUID[],
  losers: UUID[],
  amountPerPlayer: number,
  category: keyof PlayerBreakdown
) {
  for (const winnerId of winners) {
    addBalance(balances, breakdowns, winnerId, category, amountPerPlayer);
  }
  for (const loserId of losers) {
    addBalance(balances, breakdowns, loserId, category, -amountPerPlayer);
  }
}

function buildGameBreakdown(breakdown: PlayerBreakdown): SettlementGameItem[] {
  const items: SettlementGameItem[] = [];

  if (breakdown.wolf !== 0) {
    items.push({
      gameName: 'Wolf',
      gameType: 'wolf',
      amount: Math.abs(breakdown.wolf),
      description: 'Wolf game net',
    });
  }
  if (breakdown.vegas !== 0) {
    items.push({
      gameName: 'Vegas',
      gameType: 'vegas',
      amount: Math.abs(breakdown.vegas),
      description: 'Vegas game net',
    });
  }
  if (breakdown.hammer !== 0) {
    items.push({
      gameName: 'Hammer',
      gameType: 'hammer',
      amount: Math.abs(breakdown.hammer),
      description: 'Hammer game net',
    });
  }
  if (breakdown.nassau !== 0) {
    items.push({
      gameName: 'Nassau',
      gameType: 'nassau',
      amount: Math.abs(breakdown.nassau),
      description: 'Nassau net',
    });
  }
  if (breakdown.skins !== 0) {
    items.push({
      gameName: 'Skins',
      gameType: 'skins',
      amount: Math.abs(breakdown.skins),
      description: 'Skins net',
    });
  }

  return items;
}

function buildTransactions(
  tripId: UUID,
  balances: SettlementBalanceMap,
  breakdowns: SettlementBreakdownMap,
  players: Player[]
): SettlementTransaction[] {
  const creditors = Array.from(balances.entries())
    .filter(([, balance]) => balance > 0.01)
    .map(([id, balance]) => ({ id, balance }))
    .sort((left, right) => right.balance - left.balance);
  const debtors = Array.from(balances.entries())
    .filter(([, balance]) => balance < -0.01)
    .map(([id, balance]) => ({ id, balance: Math.abs(balance) }))
    .sort((left, right) => right.balance - left.balance);

  const transactions: SettlementTransaction[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = Math.min(creditor.balance, debtor.balance);

    if (amount > 0.01) {
      const fromPlayer = players.find((player) => player.id === debtor.id);
      const toPlayer = players.find((player) => player.id === creditor.id);
      const fromBreakdown = breakdowns.get(debtor.id) || createEmptyBreakdown();

      transactions.push({
        id: crypto.randomUUID(),
        tripId,
        fromPlayerId: debtor.id,
        fromPlayerName: fromPlayer ? `${fromPlayer.firstName} ${fromPlayer.lastName}` : 'Unknown',
        toPlayerId: creditor.id,
        toPlayerName: toPlayer ? `${toPlayer.firstName} ${toPlayer.lastName}` : 'Unknown',
        amount: Math.round(amount * 100) / 100,
        gameBreakdown: buildGameBreakdown(fromBreakdown),
        status: 'pending',
        venmoLink: toPlayer?.venmoUsername
          ? `venmo://paycharge?txn=pay&recipients=${toPlayer.venmoUsername}&amount=${amount.toFixed(2)}&note=Golf%20Trip%20Settlement`
          : undefined,
        paypalLink: toPlayer?.paypalUsername
          ? `https://www.paypal.com/paypalme/${toPlayer.paypalUsername}/${amount.toFixed(2)}`
          : undefined,
        zelleInfo:
          toPlayer?.zelleEmail || toPlayer?.zellePhone
            ? `Send via Zelle to ${toPlayer.zelleEmail || toPlayer.zellePhone}`
            : undefined,
        createdAt: new Date().toISOString(),
      });
    }

    creditor.balance -= amount;
    debtor.balance -= amount;

    if (creditor.balance < 0.01) creditorIndex++;
    if (debtor.balance < 0.01) debtorIndex++;
  }

  return transactions;
}

function buildPlayerBalances(
  balances: SettlementBalanceMap,
  breakdowns: SettlementBreakdownMap,
  transactions: SettlementTransaction[],
  players: Player[]
): PlayerSettlementBalance[] {
  return players.map((player) => {
    const breakdown = breakdowns.get(player.id) || createEmptyBreakdown();

    return {
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      netAmount: balances.get(player.id) || 0,
      breakdown,
      owesTo: transactions
        .filter((transaction) => transaction.fromPlayerId === player.id)
        .map((transaction) => ({
          playerId: transaction.toPlayerId,
          playerName: transaction.toPlayerName,
          amount: transaction.amount,
        })),
      owedBy: transactions
        .filter((transaction) => transaction.toPlayerId === player.id)
        .map((transaction) => ({
          playerId: transaction.fromPlayerId,
          playerName: transaction.fromPlayerName,
          amount: transaction.amount,
        })),
    };
  });
}

export function generateTripSettlement(
  tripId: UUID,
  wolfGames: WolfGame[],
  vegasGames: VegasGame[],
  hammerGames: HammerGame[],
  nassauGames: NassauEnhanced[],
  skinsResults: SkinsSettlementResult[],
  players: Player[]
): TripSettlementSummary {
  const balances: SettlementBalanceMap = new Map();
  const breakdowns: SettlementBreakdownMap = new Map();

  for (const player of players) {
    balances.set(player.id, 0);
    breakdowns.set(player.id, createEmptyBreakdown());
  }

  for (const game of wolfGames) {
    if (game.status !== 'completed') continue;
    for (const standing of game.standings) {
      addBalance(balances, breakdowns, standing.playerId, 'wolf', standing.points * game.buyIn);
    }
  }

  for (const game of vegasGames) {
    if (game.status !== 'completed') continue;
    const payout = calculateVegasPayouts(game, players);
    const amountPerPlayer = payout.settlementAmount / 2;

    if (payout.winningTeam === 'team1') {
      applyTeamSettlement(
        balances,
        breakdowns,
        game.team1PlayerIds,
        game.team2PlayerIds,
        amountPerPlayer,
        'vegas'
      );
    } else if (payout.winningTeam === 'team2') {
      applyTeamSettlement(
        balances,
        breakdowns,
        game.team2PlayerIds,
        game.team1PlayerIds,
        amountPerPlayer,
        'vegas'
      );
    }
  }

  for (const game of hammerGames) {
    if (game.status !== 'completed') continue;
    const payout = calculateHammerPayouts(game, players);
    const amountPerPlayer = payout.netSettlement / 2;

    if (payout.winningTeam === 'team1') {
      applyTeamSettlement(
        balances,
        breakdowns,
        game.team1PlayerIds,
        game.team2PlayerIds,
        amountPerPlayer,
        'hammer'
      );
    } else if (payout.winningTeam === 'team2') {
      applyTeamSettlement(
        balances,
        breakdowns,
        game.team2PlayerIds,
        game.team1PlayerIds,
        amountPerPlayer,
        'hammer'
      );
    }
  }

  for (const game of nassauGames) {
    if (game.status !== 'completed') continue;
    const payout = calculateNassauPayouts(game, players);
    const team1Net = payout.totalTeam1 - payout.totalTeam2;
    const amountPerPlayer = Math.abs(team1Net) / 2;

    if (team1Net > 0) {
      applyTeamSettlement(
        balances,
        breakdowns,
        game.team1PlayerIds,
        game.team2PlayerIds,
        amountPerPlayer,
        'nassau'
      );
    } else if (team1Net < 0) {
      applyTeamSettlement(
        balances,
        breakdowns,
        game.team2PlayerIds,
        game.team1PlayerIds,
        amountPerPlayer,
        'nassau'
      );
    }
  }

  for (const result of skinsResults) {
    addBalance(balances, breakdowns, result.playerId, 'skins', result.amount);
  }

  const transactions = buildTransactions(tripId, balances, breakdowns, players);
  const playerBalances = buildPlayerBalances(balances, breakdowns, transactions, players);
  const totalPot = Math.abs(
    Array.from(balances.values())
      .filter((balance) => balance > 0)
      .reduce((sum, balance) => sum + balance, 0)
  );

  return {
    tripId,
    totalPot,
    transactions,
    playerBalances,
    isFullySettled: transactions.every((transaction) => transaction.status === 'completed'),
    generatedAt: new Date().toISOString(),
  };
}

export function generateVenmoLink(recipientUsername: string, amount: number, note: string): string {
  const encodedNote = encodeURIComponent(note);
  return `venmo://paycharge?txn=pay&recipients=${recipientUsername}&amount=${amount.toFixed(2)}&note=${encodedNote}`;
}

export function generatePayPalLink(recipientPayPalMe: string, amount: number): string {
  return `https://www.paypal.me/${recipientPayPalMe}/${amount.toFixed(2)}`;
}

export function generateZelleInfo(
  recipientEmail: string,
  recipientPhone: string | undefined,
  amount: number
): string {
  const contact = recipientPhone || recipientEmail;
  return `Send $${amount.toFixed(2)} via Zelle to ${contact}`;
}
