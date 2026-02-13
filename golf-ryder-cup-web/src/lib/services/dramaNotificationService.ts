/**
 * Drama Notification Service
 *
 * Detects dramatic moments during scoring and fires push notifications.
 * Hooks into the scoring store's scoreHole flow.
 *
 * Drama moments:
 * - Match completed (win or halve)
 * - Lead change in a match (team that was down takes the lead)
 * - All square on 16+ (tense finish)
 * - Dormie (up by exactly the holes remaining)
 * - Cup lead change (overall team score flips)
 */

import type { MatchState } from '../types/computed';
import type { Player } from '../types/models';
import { sendNotification, canSendNotifications } from './notificationService';
import { notifyLogger } from '@/lib/utils/logger';

// ============================================
// TYPES
// ============================================

export interface DramaContext {
  /** Match state BEFORE the hole was scored */
  previousState: MatchState;
  /** Match state AFTER the hole was scored */
  newState: MatchState;
  /** Hole number just scored */
  holeNumber: number;
  /** Team A player names */
  teamANames: string;
  /** Team B player names */
  teamBNames: string;
  /** Trip name for notification body */
  tripName: string;
  /** Cup scores before this hole: { teamA, teamB } */
  cupScoreBefore?: { teamA: number; teamB: number };
  /** Cup scores after this hole: { teamA, teamB } */
  cupScoreAfter?: { teamA: number; teamB: number };
}

// Throttle: don't spam notifications (1 per 10 seconds max)
let lastNotificationTime = 0;
const THROTTLE_MS = 10_000;

// ============================================
// DRAMA DETECTION
// ============================================

/**
 * Check for dramatic moments and send notifications.
 * Call this after every hole is scored.
 */
export function checkForDrama(ctx: DramaContext): void {
  if (!canSendNotifications()) return;

  const now = Date.now();
  if (now - lastNotificationTime < THROTTLE_MS) return;

  const { previousState, newState, holeNumber, teamANames, teamBNames, tripName } = ctx;
  const matchLabel = `${teamANames} vs ${teamBNames}`;

  // 1. Match completed
  if (previousState.status !== 'completed' && newState.status === 'completed') {
    lastNotificationTime = now;
    if (newState.winningTeam === 'halved') {
      sendDramaNotification(
        'Match Halved!',
        `${matchLabel} — All square after ${holeNumber} holes`,
        tripName,
      );
    } else {
      const winner = newState.winningTeam === 'teamA' ? teamANames : teamBNames;
      sendDramaNotification(
        'Match Won!',
        `${winner} wins ${newState.displayScore} — ${matchLabel}`,
        tripName,
      );
    }
    return; // Don't stack notifications
  }

  // 2. Lead change (team that was trailing now leads)
  const prevLeading = previousState.currentScore > 0 ? 'teamA' : previousState.currentScore < 0 ? 'teamB' : null;
  const newLeading = newState.currentScore > 0 ? 'teamA' : newState.currentScore < 0 ? 'teamB' : null;
  if (prevLeading && newLeading && prevLeading !== newLeading) {
    lastNotificationTime = now;
    const newLeader = newLeading === 'teamA' ? teamANames : teamBNames;
    sendDramaNotification(
      'Lead Change!',
      `${newLeader} takes the lead on hole ${holeNumber} — ${matchLabel}`,
      tripName,
    );
    return;
  }

  // 3. All square on hole 16, 17, or 18 (tense finish)
  if (newState.currentScore === 0 && holeNumber >= 16 && previousState.currentScore !== 0) {
    lastNotificationTime = now;
    sendDramaNotification(
      'All Square!',
      `${matchLabel} tied up on hole ${holeNumber} — this one's going down to the wire`,
      tripName,
    );
    return;
  }

  // 4. Dormie situation
  if (newState.isDormie && !previousState.isDormie) {
    lastNotificationTime = now;
    const leader = newState.winningTeam === 'teamA' ? teamANames : teamBNames;
    sendDramaNotification(
      'Dormie!',
      `${leader} is dormie (${Math.abs(newState.currentScore)} up with ${newState.holesRemaining} to play) — ${matchLabel}`,
      tripName,
    );
    return;
  }

  // 5. Cup lead change (overall team score)
  if (ctx.cupScoreBefore && ctx.cupScoreAfter) {
    const prevCupLeader = ctx.cupScoreBefore.teamA > ctx.cupScoreBefore.teamB ? 'A'
      : ctx.cupScoreBefore.teamA < ctx.cupScoreBefore.teamB ? 'B' : null;
    const newCupLeader = ctx.cupScoreAfter.teamA > ctx.cupScoreAfter.teamB ? 'A'
      : ctx.cupScoreAfter.teamA < ctx.cupScoreAfter.teamB ? 'B' : null;

    if (prevCupLeader && newCupLeader && prevCupLeader !== newCupLeader) {
      lastNotificationTime = now;
      sendDramaNotification(
        'Cup Lead Change!',
        `The overall lead has flipped! ${ctx.cupScoreAfter.teamA} - ${ctx.cupScoreAfter.teamB}`,
        tripName,
      );
    }
  }
}

// ============================================
// HELPERS
// ============================================

function sendDramaNotification(title: string, body: string, tripName: string): void {
  notifyLogger.log(`Drama: ${title} — ${body}`);
  sendNotification(`⚡ ${title}`, {
    body,
    type: 'score-update',
    tag: `drama-${Date.now()}`,
    data: { tripName },
  });
}
