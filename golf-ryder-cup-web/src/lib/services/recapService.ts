/**
 * Trip Recap Service
 *
 * Aggregates data from awards, stats, photos, banter, and narratives
 * into a single shareable trip recap object.
 *
 * This is the "year in review" for your buddies golf trip.
 */

import { db } from '../db';
import type { UUID, Player, Match, RyderCupSession } from '../types/models';
import type { TripRecords, PlayerStats } from '../types/awards';
import { computeTripRecords } from './awardsService';

// ============================================
// TYPES
// ============================================

export interface TripRecapData {
  /** Trip metadata */
  tripId: UUID;
  tripName: string;
  generatedAt: string;

  /** Final cup score */
  finalScore: { usa: number; europe: number };
  winner: 'usa' | 'europe' | 'halved';

  /** Editorial headline + body */
  narrative: {
    headline: string;
    body: string;
  };

  /** Day-by-day recaps */
  dayRecaps: Array<{
    sessionName: string;
    sessionType: string;
    recap: string;
  }>;

  /** Awards (MVP, best record, etc.) */
  awards: TripRecords['awards'];

  /** Player leaderboard sorted by points */
  playerLeaderboard: PlayerStats[];

  /** Fun stats highlights */
  funStats: FunStatHighlight[];

  /** Top banter posts by reaction count */
  topTrashTalk: Array<{
    content: string;
    authorName: string;
    reactionCount: number;
    emoji?: string;
  }>;

  /** Key dramatic moments */
  highlights: TripHighlight[];

  /** Match results summary */
  matchResults: Array<{
    teamANames: string;
    teamBNames: string;
    result: string;
    sessionName: string;
  }>;
}

export interface FunStatHighlight {
  label: string;
  value: string | number;
  emoji: string;
  playerName?: string;
}

export interface TripHighlight {
  type: 'match_won' | 'lead_change' | 'dormie' | 'halved' | 'biggest_win';
  title: string;
  description: string;
  emoji: string;
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Generate a complete trip recap by aggregating all data sources.
 */
export async function generateTripRecap(tripId: UUID): Promise<TripRecapData | null> {
  const trip = await db.trips.get(tripId);
  if (!trip) return null;

  // 1. Load the trip schedule and matches first so recap generation only happens
  // once the trip has enough completed competition to tell a real story.
  const sessions = await db.sessions.where('tripId').equals(tripId).sortBy('sessionNumber');
  const matches = await loadTripMatches(tripId);
  const completedMatches = matches.filter((match: Match) => match.status === 'completed');
  if (completedMatches.length === 0) return null;

  // 2. Compute trip records (awards, player stats, final score)
  const records = await computeTripRecords(tripId);
  const players = await db.players.where('tripId').equals(tripId).toArray();
  const playerMap = new Map<UUID, Player>(players.map((player) => [player.id, player]));

  // 3. Generate editorial narrative for the completed trip
  const narrative = buildTripNarrative(trip.name, records);

  // 4. Generate day-by-day recaps
  const dayRecaps = sessions.map((session: RyderCupSession) => {
    const sessionMatches = matches.filter((m: Match) => m.sessionId === session.id);
    return {
      sessionName: session.name,
      sessionType: session.sessionType,
      recap: buildDayRecap(session, sessionMatches, playerMap),
    };
  });

  // 5. Load fun stats highlights
  const funStats = await loadFunStatHighlights(tripId, playerMap);

  // 6. Load top banter posts (most reactions)
  const topTrashTalk = await loadTopBanterPosts(tripId);

  // 7. Generate highlights from match results
  const highlights = generateHighlights(completedMatches, records, playerMap);

  // 9. Build match results summary
  const matchResults = completedMatches.map((m: Match) => {
      const teamANames = m.teamAPlayerIds
        .map((id: string) => playerMap.get(id))
        .filter((p): p is Player => Boolean(p))
        .map((p: Player) => p.lastName)
        .join(' / ');
      const teamBNames = m.teamBPlayerIds
        .map((id: string) => playerMap.get(id))
        .filter((p): p is Player => Boolean(p))
        .map((p: Player) => p.lastName)
        .join(' / ');
      const session = sessions.find((s: RyderCupSession) => s.id === m.sessionId);
      return {
        teamANames,
        teamBNames,
        result: formatMatchResult(m),
        sessionName: session?.name ?? '',
      };
    });

  return {
    tripId,
    tripName: trip.name,
    generatedAt: new Date().toISOString(),
    finalScore: records.finalScore,
    winner: records.winner,
    narrative,
    dayRecaps,
    awards: records.awards,
    playerLeaderboard: [...records.playerStats].sort((a, b) => b.points - a.points),
    funStats,
    topTrashTalk,
    highlights,
    matchResults,
  };
}

// ============================================
// DATA LOADERS
// ============================================

async function loadTripMatches(tripId: UUID): Promise<Match[]> {
  const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
  if (sessions.length === 0) return [];
  const sessionIds = sessions.map((s: RyderCupSession) => s.id);
  return db.matches.where('sessionId').anyOf(sessionIds).toArray();
}

const STAT_META: Record<string, { label: string; emoji: string }> = {
  beers: { label: 'Beers Consumed', emoji: '🍺' },
  cocktails: { label: 'Cocktails', emoji: '🍹' },
  balls_lost: { label: 'Balls Lost', emoji: '⚾' },
  birdies: { label: 'Birdies', emoji: '🐦' },
  eagles: { label: 'Eagles', emoji: '🦅' },
  sand_traps: { label: 'Sand Traps Visited', emoji: '🏖️' },
  water_hazards: { label: 'Water Hazards', emoji: '💧' },
  chip_ins: { label: 'Chip-Ins', emoji: '🎯' },
  mulligans: { label: 'Mulligans Used', emoji: '🔄' },
  club_throws: { label: 'Club Throws', emoji: '💢' },
  late_to_tee: { label: 'Late to Tee', emoji: '⏰' },
};

async function loadFunStatHighlights(
  tripId: UUID,
  playerMap: Map<UUID, Player>
): Promise<FunStatHighlight[]> {
  const highlights: FunStatHighlight[] = [];

  try {
    const stats = await db.tripStats.where('tripId').equals(tripId).toArray();
    if (stats.length === 0) return highlights;

    // Aggregate by stat type: total value + leader
    const totals = new Map<string, { value: number; topPlayer: string; topValue: number }>();

    for (const stat of stats) {
      const playerName = playerMap.get(stat.playerId)?.lastName ?? 'Unknown';
      const existing = totals.get(stat.statType) ?? { value: 0, topPlayer: '', topValue: 0 };
      existing.value += stat.value;
      if (stat.value > existing.topValue) {
        existing.topValue = stat.value;
        existing.topPlayer = playerName;
      }
      totals.set(stat.statType, existing);
    }

    for (const [statType, data] of totals) {
      if (data.value === 0) continue;
      const meta = STAT_META[statType];
      if (meta) {
        highlights.push({
          label: meta.label,
          value: data.value,
          emoji: meta.emoji,
          playerName: data.topPlayer ? `${data.topPlayer} (${data.topValue})` : undefined,
        });
      }
    }
  } catch {
    // Fun stats are optional
  }

  return highlights;
}

async function loadTopBanterPosts(tripId: UUID): Promise<TripRecapData['topTrashTalk']> {
  try {
    const posts = await db.banterPosts
      .where('tripId')
      .equals(tripId)
      .toArray();

    // Score by reaction count
    const scored = posts
      .filter(p => p.postType === 'message' || p.postType === 'result')
      .map(p => {
        const reactionCount = p.reactions
          ? (Object.values(p.reactions) as string[][]).reduce((sum, arr) => sum + arr.length, 0)
          : 0;
        return { ...p, reactionCount };
      })
      .sort((a, b) => b.reactionCount - a.reactionCount)
      .slice(0, 5);

    return scored.map(p => ({
      content: p.content,
      authorName: p.authorName,
      reactionCount: p.reactionCount,
      emoji: p.emoji,
    }));
  } catch {
    return [];
  }
}


// ============================================
// HIGHLIGHTS GENERATOR
// ============================================

function generateHighlights(
  matches: Match[],
  records: TripRecords,
  playerMap: Map<UUID, Player>,
): TripHighlight[] {
  const highlights: TripHighlight[] = [];

  // Biggest win
  const completedMatches = matches.filter(m => m.status === 'completed' && m.margin > 0);
  if (completedMatches.length > 0) {
    const biggest = completedMatches.reduce((max, m) => m.margin > max.margin ? m : max);
    const winnerNames = (biggest.result === 'teamAWin' ? biggest.teamAPlayerIds : biggest.teamBPlayerIds)
      .map(id => playerMap.get(id)?.lastName ?? '?')
      .join(' / ');
    highlights.push({
      type: 'biggest_win',
      title: 'Biggest Win',
      description: `${winnerNames} won ${biggest.margin}&${biggest.holesRemaining}`,
      emoji: '💪',
    });
  }

  // Closest match (halved or 1-up)
  const closestMatch = completedMatches
    .filter(m => m.margin <= 1)
    .sort((a, b) => a.margin - b.margin)[0];
  if (closestMatch) {
    const teamANames = closestMatch.teamAPlayerIds.map(id => playerMap.get(id)?.lastName ?? '?').join(' / ');
    const teamBNames = closestMatch.teamBPlayerIds.map(id => playerMap.get(id)?.lastName ?? '?').join(' / ');
    highlights.push({
      type: 'halved',
      title: 'Closest Match',
      description: `${teamANames} vs ${teamBNames} — ${closestMatch.margin === 0 ? 'Halved' : '1 up on 18'}`,
      emoji: '😮‍💨',
    });
  }

  // MVP
  const mvpAward = records.awards.find(a => a.type === 'mvp');
  if (mvpAward?.winner) {
    highlights.push({
      type: 'match_won',
      title: 'MVP',
      description: `${mvpAward.winner.playerName} — ${mvpAward.description}`,
      emoji: '🏆',
    });
  }

  return highlights;
}

export function buildRecapShareText(recap: TripRecapData): string {
  return `${recap.narrative.headline}\n\nFinal Score: USA ${recap.finalScore.usa} - ${recap.finalScore.europe} Europe\n\n${recap.narrative.body}`;
}

// ============================================
// HELPERS
// ============================================

function buildTripNarrative(
  tripName: string,
  records: TripRecords,
): { headline: string; body: string } {
  const { usa, europe } = records.finalScore;
  const mvp = records.awards.find(a => a.type === 'mvp')?.winner;

  if (records.winner === 'halved') {
    return {
      headline: `${tripName} Ends All Square`,
      body: `Neither side could find separation. The cup finished ${usa}–${europe}, a fitting end to a fiercely contested trip.${mvp ? ` ${mvp.playerName} led all players as MVP.` : ''}`,
    };
  }

  const winnerName = records.winner === 'usa' ? 'USA' : 'Europe';
  const winnerScore = records.winner === 'usa' ? usa : europe;
  const loserScore = records.winner === 'usa' ? europe : usa;
  const margin = winnerScore - loserScore;

  const dominance = margin >= 5 ? 'dominant' : margin >= 3 ? 'comfortable' : 'hard-fought';

  return {
    headline: `${winnerName} Claims the Cup, ${winnerScore}–${loserScore}`,
    body: `A ${dominance} victory for Team ${winnerName} at the ${tripName}. The final score of ${winnerScore}–${loserScore} tells the story of a ${
      dominance === 'dominant' ? 'one-sided affair' : dominance === 'comfortable' ? 'solid performance' : 'battle that went down to the wire'
    }.${mvp ? ` ${mvp.playerName} earned MVP honors for the tournament.` : ''}`,
  };
}

function buildDayRecap(
  session: RyderCupSession,
  sessionMatches: Match[],
  playerMap: Map<UUID, Player>,
): string {
  const completed = sessionMatches.filter(m => m.status === 'completed');
  if (completed.length === 0) return `${session.name}: No completed matches.`;

  let usaWins = 0;
  let europeWins = 0;
  let halves = 0;

  for (const m of completed) {
    if (m.result === 'teamAWin') usaWins++;
    else if (m.result === 'teamBWin') europeWins++;
    else halves++;
  }

  const parts: string[] = [];
  parts.push(`${completed.length} matches played.`);

  if (usaWins > europeWins) {
    parts.push(`USA won ${usaWins}, Europe ${europeWins}${halves > 0 ? `, ${halves} halved` : ''}.`);
  } else if (europeWins > usaWins) {
    parts.push(`Europe won ${europeWins}, USA ${usaWins}${halves > 0 ? `, ${halves} halved` : ''}.`);
  } else {
    parts.push(`Split session: ${usaWins}–${europeWins}${halves > 0 ? ` with ${halves} halved` : ''}.`);
  }

  // Highlight biggest win of the session
  const withMargin = completed.filter(m => m.margin > 0);
  if (withMargin.length > 0) {
    const biggest = withMargin.reduce((max, m) => m.margin > max.margin ? m : max);
    const winnerIds = biggest.result === 'teamAWin' ? biggest.teamAPlayerIds : biggest.teamBPlayerIds;
    const names = winnerIds.map(id => playerMap.get(id)?.lastName ?? '?').join(' / ');
    parts.push(`Biggest win: ${names} (${biggest.margin}&${biggest.holesRemaining}).`);
  }

  return parts.join(' ');
}

function formatMatchResult(match: Match): string {
  if (match.result === 'halved') return 'Halved';
  if (match.result === 'teamAWin') {
    return match.holesRemaining > 0
      ? `${match.margin}&${match.holesRemaining}`
      : `${match.margin} up`;
  }
  if (match.result === 'teamBWin') {
    return match.holesRemaining > 0
      ? `${match.margin}&${match.holesRemaining}`
      : `${match.margin} up`;
  }
  return 'In Progress';
}
