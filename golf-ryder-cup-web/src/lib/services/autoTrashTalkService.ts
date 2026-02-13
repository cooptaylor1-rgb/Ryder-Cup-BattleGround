/**
 * Auto Trash Talk Service
 *
 * Auto-generates banter posts when dramatic scoring events happen.
 * Posts appear in the social feed alongside player-written messages.
 *
 * Dramatic triggers:
 * - Match won / halved
 * - Lead change
 * - All square late (hole 16+)
 * - Dormie
 * - Streak (3+ holes won in a row)
 * - Cup lead change
 */

import { db } from '../db';
import type { MatchState } from '../types/computed';
import type { BanterPost, UUID } from '../types/models';

// ============================================
// TYPES
// ============================================

export interface TrashTalkContext {
  previousState: MatchState;
  newState: MatchState;
  holeNumber: number;
  teamANames: string;
  teamBNames: string;
  tripId: UUID;
}

// Throttle: max 1 auto-post per 30 seconds to avoid spam
let lastPostTime = 0;
const THROTTLE_MS = 30_000;

// ============================================
// TRASH TALK GENERATION
// ============================================

/**
 * Check for dramatic moments and auto-post to banter feed.
 * Call this after every hole is scored.
 */
export async function generateTrashTalk(ctx: TrashTalkContext): Promise<void> {
  const now = Date.now();
  if (now - lastPostTime < THROTTLE_MS) return;

  const message = pickTrashTalkMessage(ctx);
  if (!message) return;

  lastPostTime = now;

  const post: BanterPost = {
    id: crypto.randomUUID(),
    tripId: ctx.tripId,
    content: message,
    authorName: 'Ryder Cup HQ',
    postType: 'result',
    emoji: pickEmoji(ctx),
    relatedMatchId: ctx.newState.match.id,
    timestamp: new Date().toISOString(),
  };

  try {
    await db.banterPosts.add(post);
  } catch {
    // Best-effort — don't block scoring
  }
}

// ============================================
// MESSAGE SELECTION
// ============================================

function pickTrashTalkMessage(ctx: TrashTalkContext): string | null {
  const { previousState, newState, holeNumber, teamANames, teamBNames } = ctx;

  // 1. Match completed
  if (previousState.status !== 'completed' && newState.status === 'completed') {
    if (newState.winningTeam === 'halved') {
      return pickRandom(halvedMessages(teamANames, teamBNames));
    }
    const winner = newState.winningTeam === 'teamA' ? teamANames : teamBNames;
    const loser = newState.winningTeam === 'teamA' ? teamBNames : teamANames;
    return pickRandom(matchWonMessages(winner, loser, newState.displayScore));
  }

  // 2. Lead change
  const prevLeading = previousState.currentScore > 0 ? 'teamA' : previousState.currentScore < 0 ? 'teamB' : null;
  const newLeading = newState.currentScore > 0 ? 'teamA' : newState.currentScore < 0 ? 'teamB' : null;
  if (prevLeading && newLeading && prevLeading !== newLeading) {
    const newLeader = newLeading === 'teamA' ? teamANames : teamBNames;
    const prevLeader = prevLeading === 'teamA' ? teamANames : teamBNames;
    return pickRandom(leadChangeMessages(newLeader, prevLeader, holeNumber));
  }

  // 3. All square late (16+)
  if (newState.currentScore === 0 && holeNumber >= 16 && previousState.currentScore !== 0) {
    return pickRandom(allSquareLateMessages(teamANames, teamBNames, holeNumber));
  }

  // 4. Dormie
  if (newState.isDormie && !previousState.isDormie) {
    const leader = newState.winningTeam === 'teamA' ? teamANames : teamBNames;
    const trailer = newState.winningTeam === 'teamA' ? teamBNames : teamANames;
    return pickRandom(dormieMessages(leader, trailer, newState.holesRemaining));
  }

  // 5. 3+ up (dominant performance)
  if (Math.abs(newState.currentScore) >= 3 && Math.abs(previousState.currentScore) < 3) {
    const dominant = newState.currentScore > 0 ? teamANames : teamBNames;
    return pickRandom(dominantMessages(dominant, Math.abs(newState.currentScore)));
  }

  return null;
}

// ============================================
// MESSAGE TEMPLATES
// ============================================

function matchWonMessages(winner: string, loser: string, score: string): string[] {
  return [
    `${winner} closes it out ${score}. ${loser} will need some time to recover from that one.`,
    `That's the match! ${winner} wins ${score}. Pack it up, ${loser}.`,
    `${winner} puts it away ${score}. Somebody buy ${loser} a drink.`,
    `And that's a wrap. ${winner} takes it ${score}. Brutal.`,
    `${winner} earns the point, ${score}. ${loser} — better luck tomorrow.`,
  ];
}

function halvedMessages(teamA: string, teamB: string): string[] {
  return [
    `${teamA} and ${teamB} split the point. Neither side could close.`,
    `All square at the finish! ${teamA} vs ${teamB} ends halved. What a battle.`,
    `A gentlemen's half — ${teamA} and ${teamB} couldn't be separated.`,
  ];
}

function leadChangeMessages(newLeader: string, prevLeader: string, hole: number): string[] {
  return [
    `${newLeader} takes the lead on ${hole}! ${prevLeader} just lost their grip.`,
    `Momentum shift! ${newLeader} goes 1 up after ${prevLeader} was leading.`,
    `The turn has turned. ${newLeader} snatches the lead on hole ${hole}.`,
  ];
}

function allSquareLateMessages(teamA: string, teamB: string, hole: number): string[] {
  return [
    `All square on ${hole}! ${teamA} vs ${teamB} — this one's going down to the wire.`,
    `Clutch! It's all tied up heading into the final stretch.`,
    `Nobody's blinking. ${teamA} and ${teamB} are dead level on ${hole}.`,
  ];
}

function dormieMessages(leader: string, trailer: string, holesLeft: number): string[] {
  return [
    `Dormie! ${leader} is ${holesLeft} up with ${holesLeft} to play. ${trailer} needs to win every remaining hole.`,
    `${leader} reaches dormie. ${trailer} is staring down the barrel.`,
    `Can ${trailer} pull off a miracle? They need to win the last ${holesLeft} to halve.`,
  ];
}

function dominantMessages(dominant: string, lead: number): string[] {
  return [
    `${dominant} goes ${lead} up. This one's getting away from the opposition.`,
    `${lead} up! ${dominant} is running riot out there.`,
    `${dominant} is in cruise control, ${lead} up with plenty of holes left.`,
  ];
}

// ============================================
// HELPERS
// ============================================

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickEmoji(ctx: TrashTalkContext): string {
  const { previousState, newState } = ctx;
  if (previousState.status !== 'completed' && newState.status === 'completed') {
    return newState.winningTeam === 'halved' ? '🤝' : '🏆';
  }
  if (newState.isDormie && !previousState.isDormie) return '😬';
  if (newState.currentScore === 0) return '⚡';
  if (Math.abs(newState.currentScore) >= 3) return '🔥';
  return '⛳';
}
