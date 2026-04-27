import type {
  Match,
  Player,
  PracticeScore,
  RyderCupSession,
  SessionType,
  TeeSet,
} from '@/lib/types/models';

import { allocateStrokes } from './practiceLeaderboard';

export interface PlayerHoleContribution {
  playerId: string;
  playerName: string;
  gross: number | undefined;
  net: number | undefined;
  strokesReceived: number;
  /** True when this player's net score counted toward the group total on this hole. */
  counted: boolean;
}

export interface GroupHoleResult {
  holeNumber: number;
  par: number | undefined;
  /** Count of balls that count on this hole under the session format. */
  ballsCounted: number;
  /** Total net strokes contributing to the group score on this hole. */
  groupNet: number | undefined;
  groupGross: number | undefined;
  contributions: PlayerHoleContribution[];
}

export interface GroupSessionTotals {
  groupNumber: number;
  matchId: string;
  players: Player[];
  /** Per-hole breakdown. 18 entries. */
  holes: GroupHoleResult[];
  /** Sum of `groupGross` across all 18 holes (undefined when none entered). */
  grossTotal: number | undefined;
  /** Sum of `groupNet` across all 18 holes. */
  netTotal: number | undefined;
  /** Holes with at least one scored stroke from this group. */
  holesPlayed: number;
}

export interface SessionPracticeLeaderboard {
  /** The session format that drove the math (verbatim from session.sessionType). */
  formatId: string;
  /** Human label for the format (e.g. "1-2-3 Progressive Best Ball"). */
  formatName: string;
  /** True when the session's sessionType has a dedicated scoring rule here. */
  formatSupported: boolean;
  /** Ranked groups, lowest net first. Ties broken by gross then groupNumber. */
  groups: GroupSessionTotals[];
  /** Session-wide best-ball per hole — useful as a baseline / skins input. */
  bestNetByHole: Array<number | undefined>;
}

interface ComputeOptions {
  session: RyderCupSession;
  matches: Match[];
  /** All practice scores for the trip (already filtered by session's matchIds is fine). */
  scores: PracticeScore[];
  players: Player[];
  teeSet: TeeSet | null;
}

/**
 * Build a session-level practice leaderboard: how each group ranks under
 * the session's format, plus a per-hole breakdown showing which balls
 * counted. Stays format-aware without cross-pollinating match-play
 * concerns from tournamentEngineStandings — practice scoring is
 * intentionally stroke-based, not match-play points.
 */
export function computeSessionPracticeLeaderboard({
  session,
  matches,
  scores,
  players,
  teeSet,
}: ComputeOptions): SessionPracticeLeaderboard {
  const sessionMatches = matches
    .filter((m) => m.sessionId === session.id && m.mode === 'practice')
    .sort((a, b) => a.matchOrder - b.matchOrder);

  const scoresByMatch = new Map<string, PracticeScore[]>();
  for (const score of scores) {
    const list = scoresByMatch.get(score.matchId) ?? [];
    list.push(score);
    scoresByMatch.set(score.matchId, list);
  }

  const playerById = new Map(players.map((p) => [p.id, p]));
  const holeHandicaps = teeSet?.holeHandicaps ?? [];
  const holePars = teeSet?.holePars ?? Array(18).fill(undefined);

  const groups: GroupSessionTotals[] = sessionMatches.map((match) => {
    const groupPlayers = [...match.teamAPlayerIds, ...match.teamBPlayerIds]
      .map((id) => playerById.get(id))
      .filter((p): p is Player => Boolean(p));
    const groupScores = scoresByMatch.get(match.id) ?? [];

    // Per-player stroke allocation against the hole handicaps.
    const strokesByPlayer = new Map<string, number[]>();
    for (const player of groupPlayers) {
      const courseHandicap =
        teeSet && player.handicapIndex !== undefined
          ? Math.round((player.handicapIndex * (teeSet.slope || 113)) / 113)
          : 0;
      strokesByPlayer.set(player.id, allocateStrokes(courseHandicap, holeHandicaps));
    }

    const holes: GroupHoleResult[] = [];
    let holesPlayed = 0;

    for (let hole = 1; hole <= 18; hole += 1) {
      const ballsCounted = ballsCountedForHole(session.sessionType, hole);
      const par = typeof holePars[hole - 1] === 'number' ? holePars[hole - 1] : undefined;

      const contributions: PlayerHoleContribution[] = groupPlayers.map((player) => {
        const score = groupScores.find(
          (s) => s.playerId === player.id && s.holeNumber === hole && typeof s.gross === 'number'
        );
        const strokesReceived = strokesByPlayer.get(player.id)?.[hole - 1] ?? 0;
        const gross = score?.gross;
        const net = gross !== undefined ? gross - strokesReceived : undefined;
        return {
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`.trim(),
          gross,
          net,
          strokesReceived,
          counted: false,
        };
      });

      // Sort by net ascending (undefined last) to pick the best N that count.
      const sortedByNet = [...contributions].sort((a, b) => {
        if (a.net === undefined && b.net === undefined) return 0;
        if (a.net === undefined) return 1;
        if (b.net === undefined) return -1;
        return a.net - b.net;
      });

      let counted = 0;
      for (const contrib of sortedByNet) {
        if (counted >= ballsCounted) break;
        if (contrib.net === undefined) break;
        contrib.counted = true;
        counted += 1;
      }

      const countedNets = contributions
        .filter((c) => c.counted && typeof c.net === 'number')
        .map((c) => c.net as number);
      const countedGrosses = contributions
        .filter((c) => c.counted && typeof c.gross === 'number')
        .map((c) => c.gross as number);

      const groupNet =
        countedNets.length === ballsCounted
          ? countedNets.reduce((sum, v) => sum + v, 0)
          : undefined;
      const groupGross =
        countedGrosses.length === ballsCounted
          ? countedGrosses.reduce((sum, v) => sum + v, 0)
          : undefined;

      if (contributions.some((c) => c.gross !== undefined)) {
        holesPlayed += 1;
      }

      holes.push({
        holeNumber: hole,
        par,
        ballsCounted,
        groupNet,
        groupGross,
        contributions,
      });
    }

    const grossTotal = sumDefined(holes.map((h) => h.groupGross));
    const netTotal = sumDefined(holes.map((h) => h.groupNet));

    return {
      groupNumber: match.matchOrder,
      matchId: match.id,
      players: groupPlayers,
      holes,
      grossTotal,
      netTotal,
      holesPlayed,
    };
  });

  // Rank groups by net total asc, then gross, then group number.
  const rankedGroups = [...groups].sort((a, b) => {
    if (a.netTotal === undefined && b.netTotal !== undefined) return 1;
    if (b.netTotal === undefined && a.netTotal !== undefined) return -1;
    if (a.netTotal !== undefined && b.netTotal !== undefined && a.netTotal !== b.netTotal) {
      return a.netTotal - b.netTotal;
    }
    if (a.grossTotal !== undefined && b.grossTotal !== undefined && a.grossTotal !== b.grossTotal) {
      return a.grossTotal - b.grossTotal;
    }
    return a.groupNumber - b.groupNumber;
  });

  // Session-wide best net per hole (across every player in every group).
  // This is what a cross-group skins pool settles on.
  const bestNetByHole: Array<number | undefined> = [];
  for (let hole = 1; hole <= 18; hole += 1) {
    let best: number | undefined;
    for (const group of groups) {
      for (const contrib of group.holes[hole - 1]?.contributions ?? []) {
        if (contrib.net === undefined) continue;
        if (best === undefined || contrib.net < best) {
          best = contrib.net;
        }
      }
    }
    bestNetByHole.push(best);
  }

  return {
    formatId: String(session.sessionType ?? 'strokePlay'),
    formatName: formatLabel(session.sessionType),
    formatSupported: isFormatSupported(session.sessionType),
    groups: rankedGroups,
    bestNetByHole,
  };
}

/**
 * How many balls count toward the group total on this hole under the
 * session's format. Defaults to 1 (stroke play / best ball) for
 * formats we haven't modeled yet; that keeps the math safe rather
 * than undefined behavior.
 */
export function ballsCountedForHole(
  sessionType: SessionType | string | undefined,
  hole: number
): number {
  switch (sessionType) {
    case 'one-two-three':
      // Block progression: 1 ball holes 1-6, 2 on 7-12, 3 on 13-18.
      if (hole <= 6) return 1;
      if (hole <= 12) return 2;
      return 3;
    case 'scramble':
    case 'scramble-2':
    case 'scramble-3':
    case 'scramble-4':
      // Everyone plays one ball; one net counts per hole.
      return 1;
    case 'bestBall':
    case 'fourBall':
    case 'bestBallNet':
      return 1;
    default:
      return 1;
  }
}

export function getGroupScoreToPar(group: GroupSessionTotals): number | undefined {
  let hasScoredHole = false;
  const total = group.holes.reduce((sum, hole) => {
    if (typeof hole.groupNet !== 'number' || typeof hole.par !== 'number') return sum;
    hasScoredHole = true;
    return sum + (hole.groupNet - hole.par * hole.ballsCounted);
  }, 0);

  return hasScoredHole ? total : undefined;
}

function formatLabel(sessionType: SessionType | string | undefined): string {
  switch (sessionType) {
    case 'one-two-three':
      return '1-2-3 Progressive Best Ball';
    case 'scramble':
    case 'scramble-2':
    case 'scramble-3':
    case 'scramble-4':
      return 'Scramble';
    case 'fourBall':
    case 'bestBall':
      return 'Best Ball';
    case 'stableford':
      return 'Stableford';
    default:
      return 'Stroke Play (best ball)';
  }
}

function isFormatSupported(sessionType: SessionType | string | undefined): boolean {
  return [
    'one-two-three',
    'scramble',
    'scramble-2',
    'scramble-3',
    'scramble-4',
    'fourBall',
    'bestBall',
    'bestBallNet',
  ].includes(String(sessionType));
}

function sumDefined(values: Array<number | undefined>): number | undefined {
  const present = values.filter((v): v is number => typeof v === 'number');
  if (present.length === 0) return undefined;
  return present.reduce((sum, v) => sum + v, 0);
}
