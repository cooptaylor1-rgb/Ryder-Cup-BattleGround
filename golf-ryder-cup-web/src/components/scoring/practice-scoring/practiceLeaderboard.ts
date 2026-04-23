import type { Player, PracticeScore, TeeSet } from '@/lib/types/models';

export interface LeaderboardRow {
  player: Player;
  holesPlayed: number;
  grossTotal: number;
  /** Course handicap rounded from player.handicapIndex using tee slope. */
  courseHandicap: number | null;
  /** Net total — grossTotal minus the strokes allocated to holes played. */
  netTotal: number | null;
}

/**
 * Stroke-by-stroke net derivation for a practice leaderboard.
 *
 * - Net per hole = gross - strokesReceivedOnHole, where
 *   strokesReceivedOnHole is based on `teeSet.holeHandicaps` rank and
 *   the player's course handicap.
 * - If the course / tee set isn't available, `netTotal` is null so
 *   the UI can show "—" instead of an accidentally-identical gross
 *   number.
 *
 * Rounding follows the simple course-handicap formula:
 *   courseHandicap = round(handicapIndex * slope / 113)
 * (ignores course rating minus par — that correction matters for
 * tournament play but is overkill for a practice round leaderboard.)
 */
export function computePracticeLeaderboard(
  players: Player[],
  scores: PracticeScore[],
  teeSet: TeeSet | null
): LeaderboardRow[] {
  const scoresByPlayer = new Map<string, PracticeScore[]>();
  for (const score of scores) {
    const list = scoresByPlayer.get(score.playerId) ?? [];
    list.push(score);
    scoresByPlayer.set(score.playerId, list);
  }

  const rows: LeaderboardRow[] = players.map((player) => {
    const playerScores = (scoresByPlayer.get(player.id) ?? []).filter(
      (s) => typeof s.gross === 'number'
    );
    const grossTotal = playerScores.reduce((sum, s) => sum + (s.gross ?? 0), 0);

    const courseHandicap = teeSet && player.handicapIndex !== undefined
      ? Math.round(player.handicapIndex * (teeSet.slope || 113) / 113)
      : null;

    let netTotal: number | null = null;
    if (teeSet && courseHandicap !== null) {
      // Allocate the player's strokes against the stored hole handicaps
      // (1 = hardest). Strokes > 18 wrap around ("twos"); strokes <= 0
      // receive 0. This matches the USGA allocation used elsewhere in
      // the app for cup matches; keeps practice and cup consistent.
      const strokesPerHole = allocateStrokes(courseHandicap, teeSet.holeHandicaps || []);
      const playedHoles = new Set(playerScores.map((s) => s.holeNumber));
      let netStrokes = 0;
      for (const score of playerScores) {
        const allocated = strokesPerHole[score.holeNumber - 1] ?? 0;
        netStrokes += (score.gross ?? 0) - allocated;
      }
      if (playedHoles.size > 0) {
        netTotal = netStrokes;
      }
    }

    return {
      player,
      holesPlayed: playerScores.length,
      grossTotal,
      courseHandicap,
      netTotal,
    };
  });

  // Sort by net first (players who have net), then gross, then by
  // holesPlayed (fewer holes = later so leaders appear first). Ties
  // fall through to player id for determinism.
  return rows.sort((a, b) => {
    if (a.holesPlayed === 0 && b.holesPlayed > 0) return 1;
    if (b.holesPlayed === 0 && a.holesPlayed > 0) return -1;
    if (a.netTotal !== null && b.netTotal !== null && a.netTotal !== b.netTotal) {
      return a.netTotal - b.netTotal;
    }
    if (a.grossTotal !== b.grossTotal) return a.grossTotal - b.grossTotal;
    return a.player.id.localeCompare(b.player.id);
  });
}

/**
 * Given a player's course handicap and the hole-handicap ranks
 * (e.g. [3, 15, 1, 17, ...] where 1 = hardest), return an 18-element
 * array of how many strokes that player gets on each hole.
 *
 * Strokes > 18 wrap: a +20 handicap gets 2 extra strokes on the
 * hardest 2 holes; +22 gets 2 on top-4, etc. Negative handicaps
 * don't give strokes (treated as 0).
 */
export function allocateStrokes(
  courseHandicap: number,
  holeHandicaps: number[]
): number[] {
  const out = new Array(18).fill(0);
  if (courseHandicap <= 0 || holeHandicaps.length < 18) return out;

  const fullRounds = Math.floor(courseHandicap / 18);
  const remainder = courseHandicap % 18;

  for (let hole = 0; hole < 18; hole += 1) {
    const rank = holeHandicaps[hole];
    if (typeof rank !== 'number' || rank < 1 || rank > 18) continue;
    out[hole] = fullRounds + (rank <= remainder ? 1 : 0);
  }
  return out;
}
