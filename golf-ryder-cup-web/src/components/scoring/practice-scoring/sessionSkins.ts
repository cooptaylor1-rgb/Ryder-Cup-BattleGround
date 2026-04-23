import type {
  Match,
  Player,
  PracticeScore,
  RyderCupSession,
  SideBet,
  TeeSet,
} from '@/lib/types/models';

import { allocateStrokes } from './practiceLeaderboard';

export interface SessionSkinsHole {
  holeNumber: number;
  lowestNet: number | undefined;
  /** Player ids who all tied for low net on this hole. 1 winner = clean win. */
  leaderIds: string[];
  /** How many skins this hole is worth at the moment of resolution. */
  skinsOnHole: number;
  /** Pay-out amount at the moment of resolution. Zero until carry resolves. */
  amount: number;
  /** When exactly one leader exists, the winner; undefined on ties/carries. */
  winnerId: string | undefined;
}

export interface SessionSkinsStanding {
  playerId: string;
  playerName: string;
  skins: number;
  winnings: number;
  holesWon: number[];
}

export interface SessionSkinsBoard {
  /** Per-hole resolution (18 entries). */
  holes: SessionSkinsHole[];
  /** Ranked standings, highest winnings first. */
  standings: SessionSkinsStanding[];
  /** Total pot that has already been paid out. */
  paidOut: number;
  /** Holes that are waiting on a subsequent clean win to settle the carry. */
  carryingHoles: number[];
  /** Per-hole value of a cleanly won skin under the bet. */
  perHoleValue: number;
}

/**
 * Derive a session-wide skins board from per-player practice scores.
 *
 * Scoring rule:
 * - For each hole, compute the lowest NET score across every player
 *   in every group in the session.
 * - If exactly one player has that low net, they win a skin worth
 *   `perHole × (1 + carry-count)`.
 * - If 2+ players tie, the skin carries to the next hole.
 * - A holes-played filter keeps a skin "pending" (zero paid) until
 *   the carry resolves on a later hole.
 *
 * Pure function; called from both the bet detail page renderer and
 * any future settlement report without React in the middle.
 */
export function computeSessionSkinsBoard({
  bet,
  session,
  matches,
  scores,
  players,
  teeSet,
}: {
  bet: SideBet;
  session: RyderCupSession;
  matches: Match[];
  scores: PracticeScore[];
  players: Player[];
  teeSet: TeeSet | null;
}): SessionSkinsBoard {
  const perHoleValue = bet.perHole || 5;
  const sessionMatches = matches.filter(
    (m) => m.sessionId === session.id && m.mode === 'practice'
  );
  const participantIds = new Set<string>(
    sessionMatches.flatMap((m) => [...m.teamAPlayerIds, ...m.teamBPlayerIds])
  );

  const playerById = new Map(players.map((p) => [p.id, p]));
  const holeHandicaps = teeSet?.holeHandicaps ?? [];

  // Precompute each player's per-hole stroke allocation.
  const strokesByPlayer = new Map<string, number[]>();
  for (const pid of participantIds) {
    const player = playerById.get(pid);
    const courseHandicap =
      teeSet && player?.handicapIndex !== undefined
        ? Math.round(player.handicapIndex * (teeSet.slope || 113) / 113)
        : 0;
    strokesByPlayer.set(pid, allocateStrokes(courseHandicap, holeHandicaps));
  }

  // Collect scores keyed by hole then player.
  const matchIdSet = new Set(sessionMatches.map((m) => m.id));
  const netByHolePlayer = new Map<number, Map<string, number>>();
  for (const score of scores) {
    if (!matchIdSet.has(score.matchId)) continue;
    if (typeof score.gross !== 'number') continue;
    if (!participantIds.has(score.playerId)) continue;
    const allocated = strokesByPlayer.get(score.playerId)?.[score.holeNumber - 1] ?? 0;
    const net = score.gross - allocated;
    const bucket = netByHolePlayer.get(score.holeNumber) ?? new Map<string, number>();
    bucket.set(score.playerId, net);
    netByHolePlayer.set(score.holeNumber, bucket);
  }

  const holes: SessionSkinsHole[] = [];
  let carry = 0;
  const carryingHoles: number[] = [];

  for (let hole = 1; hole <= 18; hole += 1) {
    const bucket = netByHolePlayer.get(hole);
    // A hole "settles" only once every participant has a net score on
    // it. Missing entries leave the hole pending — neither a clean
    // win nor a carry — so a player who hasn't teed off yet can't
    // accidentally lose the skin.
    const holeComplete = bucket && bucket.size === participantIds.size;
    if (!bucket || !holeComplete) {
      holes.push({
        holeNumber: hole,
        lowestNet: bucket ? Math.min(...bucket.values()) : undefined,
        leaderIds: [],
        skinsOnHole: 1 + carry,
        amount: 0,
        winnerId: undefined,
      });
      continue;
    }

    let lowest = Infinity;
    for (const v of bucket.values()) {
      if (v < lowest) lowest = v;
    }
    const leaders: string[] = [];
    for (const [pid, net] of bucket) {
      if (net === lowest) leaders.push(pid);
    }

    if (leaders.length === 1) {
      const amount = perHoleValue * (1 + carry);
      holes.push({
        holeNumber: hole,
        lowestNet: lowest,
        leaderIds: leaders,
        skinsOnHole: 1 + carry,
        amount,
        winnerId: leaders[0],
      });
      carry = 0;
    } else {
      // Tie — skin carries.
      carry += 1;
      carryingHoles.push(hole);
      holes.push({
        holeNumber: hole,
        lowestNet: lowest,
        leaderIds: leaders,
        skinsOnHole: 1,
        amount: 0,
        winnerId: undefined,
      });
    }
  }

  // Aggregate standings.
  const perPlayer = new Map<string, SessionSkinsStanding>();
  for (const pid of participantIds) {
    const player = playerById.get(pid);
    perPlayer.set(pid, {
      playerId: pid,
      playerName: player
        ? `${player.firstName} ${player.lastName}`.trim() || 'Unknown'
        : 'Unknown',
      skins: 0,
      winnings: 0,
      holesWon: [],
    });
  }
  let paidOut = 0;
  for (const hole of holes) {
    if (!hole.winnerId) continue;
    const row = perPlayer.get(hole.winnerId);
    if (!row) continue;
    row.skins += hole.skinsOnHole;
    row.winnings += hole.amount;
    row.holesWon.push(hole.holeNumber);
    paidOut += hole.amount;
  }

  const standings = Array.from(perPlayer.values()).sort(
    (a, b) => b.winnings - a.winnings || b.skins - a.skins
  );

  return {
    holes,
    standings,
    paidOut,
    carryingHoles,
    perHoleValue,
  };
}
