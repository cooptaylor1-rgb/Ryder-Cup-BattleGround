/**
 * Narrative Service — Editorial Trip Recaps
 *
 * Generates Fried Egg-style editorial narratives from tournament data.
 * Think golf writing with warmth, character, and storytelling —
 * not robotic stat dumps.
 */

import type { TeamStandings, PlayerLeaderboard, MagicNumber } from '@/lib/types/computed';

// ============================================
// TYPES
// ============================================

export interface TripNarrative {
  headline: string;
  subheadline: string;
  body: string;
  mood: 'dominant' | 'tight' | 'comeback' | 'tied' | 'clinched' | 'early';
}

export interface MatchNarrative {
  headline: string;
  summary: string;
}

export interface DayRecap {
  headline: string;
  subheadline: string;
  paragraphs: string[];
}

// ============================================
// TOURNAMENT NARRATIVE
// ============================================

/**
 * Generate an editorial headline and narrative for the current tournament state.
 */
export function generateTripNarrative(
  standings: TeamStandings,
  magicNumber: MagicNumber,
  leaderboard: PlayerLeaderboard[],
  teamAName = 'USA',
  teamBName = 'Europe',
): TripNarrative {
  const { teamAPoints, teamBPoints, matchesCompleted, totalMatches, leader, margin } = standings;

  // Clinched
  if (magicNumber.hasClinched) {
    const winner = magicNumber.clinchingTeam === 'A' ? teamAName : teamBName;
    const loser = magicNumber.clinchingTeam === 'A' ? teamBName : teamAName;
    const winnerPoints = magicNumber.clinchingTeam === 'A' ? teamAPoints : teamBPoints;
    return {
      headline: `${winner} Claims the Cup`,
      subheadline: `${winnerPoints} points seal the victory over ${loser}`,
      body: `The celebrations are underway. ${winner} has secured enough points to claim the cup, finishing with a ${teamAPoints}–${teamBPoints} lead after ${matchesCompleted} matches.`,
      mood: 'clinched',
    };
  }

  // Too early
  if (matchesCompleted === 0) {
    return {
      headline: 'The Stage Is Set',
      subheadline: `${totalMatches} matches await`,
      body: `The pairings are drawn, the tees are set, and the first shots are about to fly. ${totalMatches} matches stand between these teams and glory.`,
      mood: 'early',
    };
  }

  // Dead heat
  if (!leader || margin === 0) {
    return {
      headline: 'All Square',
      subheadline: `${teamAPoints}–${teamBPoints} through ${matchesCompleted} matches`,
      body: `Neither side can find separation. ${teamAName} and ${teamBName} are locked at ${teamAPoints} apiece with ${standings.remainingMatches} matches remaining. This is anyone's cup.`,
      mood: 'tied',
    };
  }

  const leaderName = leader === 'teamA' ? teamAName : teamBName;
  const trailerName = leader === 'teamA' ? teamBName : teamAName;
  const leaderPoints = leader === 'teamA' ? teamAPoints : teamBPoints;
  const trailerPoints = leader === 'teamA' ? teamBPoints : teamAPoints;
  const neededToClinch = leader === 'teamA' ? magicNumber.teamANeeded : magicNumber.teamBNeeded;

  // Dominant lead (4+ points ahead)
  if (margin >= 4) {
    return {
      headline: `${leaderName} in Command`,
      subheadline: `${leaderPoints}–${trailerPoints} lead after ${matchesCompleted} matches`,
      body: `${leaderName} holds a commanding ${margin}-point cushion over ${trailerName}. With ${neededToClinch.toFixed(1)} more points needed to clinch, the cup is theirs to lose.`,
      mood: 'dominant',
    };
  }

  // Close contest (1-3.5 points)
  if (margin <= 2) {
    return {
      headline: `${leaderName} Edges Ahead`,
      subheadline: `${leaderPoints}–${trailerPoints} — the thinnest of margins`,
      body: `Just ${margin} ${margin === 1 ? 'point separates' : 'points separate'} these teams. ${trailerName} is right there, needing only a strong session to flip the script. Every match matters now.`,
      mood: 'tight',
    };
  }

  return {
    headline: `${leaderName} Holds the Advantage`,
    subheadline: `Leading ${leaderPoints}–${trailerPoints} through ${matchesCompleted}`,
    body: `${leaderName} carries a ${margin}-point lead into the remaining ${standings.remainingMatches} matches. ${trailerName} needs ${(leader === 'teamA' ? magicNumber.teamBNeeded : magicNumber.teamANeeded).toFixed(1)} points to clinch — a tall order, but not impossible.`,
    mood: 'comeback',
  };
}

// ============================================
// SCORE NARRATIVE (for home page hero)
// ============================================

/**
 * One-line plain-English score summary for the home page.
 */
export function generateScoreOneLiner(
  standings: TeamStandings,
  teamAName = 'USA',
  teamBName = 'Europe',
): string {
  const { teamAPoints, teamBPoints, leader, margin, matchesCompleted } = standings;

  if (matchesCompleted === 0) return 'First matches coming up';

  if (!leader) return `All square at ${teamAPoints}`;

  const leaderName = leader === 'teamA' ? teamAName : teamBName;

  if (margin >= 5) return `${leaderName} cruising, up ${margin}`;
  if (margin >= 3) return `${leaderName} in control, leads by ${margin}`;
  if (margin >= 1.5) return `${leaderName} leads by ${margin}`;
  return `${leaderName} narrowly ahead`;
}

// ============================================
// PLAYER SPOTLIGHT
// ============================================

/**
 * Generate an editorial spotlight for the tournament's top performer.
 */
export function generatePlayerSpotlight(
  leaderboard: PlayerLeaderboard[],
): { name: string; line: string } | null {
  if (leaderboard.length === 0) return null;

  const top = leaderboard[0];
  const matchWord = top.matchesPlayed === 1 ? 'match' : 'matches';

  if (top.wins >= 3 && top.losses === 0) {
    return {
      name: top.playerName,
      line: `Unbeaten in ${top.matchesPlayed} ${matchWord} — ${top.record}`,
    };
  }

  if (top.wins >= 2) {
    return {
      name: top.playerName,
      line: `Leading all players with ${top.points} points (${top.record})`,
    };
  }

  return {
    name: top.playerName,
    line: `${top.points} points through ${top.matchesPlayed} ${matchWord}`,
  };
}

// ============================================
// DAY RECAP
// ============================================

/**
 * Generate an editorial-style recap for a day of play.
 */
export function generateDayRecap(
  sessionName: string,
  standings: TeamStandings,
  magicNumber: MagicNumber,
  sessionResults: { teamAWins: number; teamBWins: number; halves: number },
  teamAName = 'USA',
  teamBName = 'Europe',
): DayRecap {
  const { teamAWins, teamBWins, halves } = sessionResults;
  const totalSessionMatches = teamAWins + teamBWins + halves;

  const sessionWinner =
    teamAWins > teamBWins ? teamAName : teamBWins > teamAWins ? teamBName : null;

  const headline = sessionWinner
    ? `${sessionWinner} Takes the ${sessionName}`
    : `${sessionName} Ends All Square`;

  const subheadline = `${standings.teamAPoints}–${standings.teamBPoints} overall after ${standings.matchesCompleted} matches`;

  const paragraphs: string[] = [];

  // Session summary
  if (sessionWinner) {
    const wins = Math.max(teamAWins, teamBWins);
    paragraphs.push(
      `${sessionWinner} won ${wins} of ${totalSessionMatches} matches in ${sessionName.toLowerCase()}, ${halves > 0 ? `with ${halves} halved` : 'taking every point on offer'}.`
    );
  } else {
    paragraphs.push(
      `The ${sessionName.toLowerCase()} session finished in a dead heat, ${teamAWins}–${teamBWins}${halves > 0 ? ` with ${halves} halved` : ''}.`
    );
  }

  // Overall context
  if (standings.leader) {
    const leaderName = standings.leader === 'teamA' ? teamAName : teamBName;
    paragraphs.push(
      `${leaderName} leads ${standings.teamAPoints}–${standings.teamBPoints} overall, with ${standings.remainingMatches} matches left to play.`
    );
  } else {
    paragraphs.push(
      `The tournament remains locked at ${standings.teamAPoints} apiece with ${standings.remainingMatches} matches remaining.`
    );
  }

  // Clinch context
  if (!magicNumber.hasClinched && standings.remainingMatches <= 6) {
    const closerTeam = standings.leader === 'teamA' ? teamAName : teamBName;
    const needed = standings.leader === 'teamA' ? magicNumber.teamANeeded : magicNumber.teamBNeeded;
    paragraphs.push(
      `${closerTeam} needs just ${needed.toFixed(1)} more points to seal the cup.`
    );
  }

  return { headline, subheadline, paragraphs };
}

// ============================================
// MATCH RESULT NARRATIVE
// ============================================

/**
 * Generate editorial text for a completed match result.
 */
export function generateMatchNarrative(
  teamANames: string[],
  teamBNames: string[],
  displayScore: string,
  winningTeam: 'teamA' | 'teamB' | 'halved' | null,
  holesPlayed: number,
): MatchNarrative {
  const teamAStr = teamANames.join(' & ');
  const teamBStr = teamBNames.join(' & ');

  if (winningTeam === 'halved' || !winningTeam) {
    return {
      headline: 'Match Halved',
      summary: `${teamAStr} and ${teamBStr} shared the spoils through ${holesPlayed} holes — a half-point apiece.`,
    };
  }

  const winners = winningTeam === 'teamA' ? teamAStr : teamBStr;
  const losers = winningTeam === 'teamA' ? teamBStr : teamAStr;

  // Parse display score for narrative color
  if (displayScore.includes('&')) {
    return {
      headline: `${winners} Win ${displayScore}`,
      summary: `${winners} closed out ${losers} with a convincing ${displayScore} victory.`,
    };
  }

  if (displayScore === '1 UP') {
    return {
      headline: `${winners} Edge It`,
      summary: `${winners} held on for a 1 UP win over ${losers} — as close as it gets.`,
    };
  }

  return {
    headline: `${winners} Win ${displayScore}`,
    summary: `${winners} defeated ${losers}, finishing ${displayScore}.`,
  };
}
