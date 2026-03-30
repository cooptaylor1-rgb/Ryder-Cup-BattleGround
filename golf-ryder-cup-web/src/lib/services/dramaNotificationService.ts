/**
 * Drama Notification Service
 *
 * Detects dramatic moments during scoring and fires push notifications.
 * Hooks into the scoring store's scoreHole flow.
 *
 * Uses shared detection logic from dramaMomentDetection.ts.
 */

import type { AnyDramaMoment } from './dramaMomentDetection';
import { detectDramaMoments } from './dramaMomentDetection';
import { sendNotification, canSendNotifications } from './notificationService';
import { notifyLogger } from '@/lib/utils/logger';

// ============================================
// TYPES
// ============================================

export interface DramaContext {
  /** Match state BEFORE the hole was scored */
  previousState: import('../types/computed').MatchState;
  /** Match state AFTER the hole was scored */
  newState: import('../types/computed').MatchState;
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
// DRAMA DETECTION → NOTIFICATIONS
// ============================================

/**
 * Check for dramatic moments and send notifications.
 * Call this after every hole is scored.
 */
export function checkForDrama(ctx: DramaContext): void {
  if (!canSendNotifications()) return;

  const now = Date.now();
  if (now - lastNotificationTime < THROTTLE_MS) return;

  const { teamANames, teamBNames, tripName, holeNumber } = ctx;
  const matchLabel = `${teamANames} vs ${teamBNames}`;

  const moments = detectDramaMoments(ctx);
  if (moments.length === 0) return;

  // Act on the first (highest-priority) moment
  const moment = moments[0];
  lastNotificationTime = now;
  const { title, body } = formatNotification(moment, matchLabel, holeNumber);
  sendDramaNotification(title, body, tripName);
}

// ============================================
// FORMATTING
// ============================================

function formatNotification(
  moment: AnyDramaMoment,
  matchLabel: string,
  holeNumber: number,
): { title: string; body: string } {
  switch (moment.type) {
    case 'match-halved':
      return {
        title: 'Match Halved!',
        body: `${matchLabel} — All square after ${holeNumber} holes`,
      };
    case 'match-won':
      return {
        title: 'Match Won!',
        body: `${moment.winnerNames} wins ${moment.displayScore} — ${matchLabel}`,
      };
    case 'lead-change':
      return {
        title: 'Lead Change!',
        body: `${moment.newLeaderNames} takes the lead on hole ${holeNumber} — ${matchLabel}`,
      };
    case 'all-square-late':
      return {
        title: 'All Square!',
        body: `${matchLabel} tied up on hole ${holeNumber} — this one's going down to the wire`,
      };
    case 'dormie':
      return {
        title: 'Dormie!',
        body: `${moment.leaderNames} is dormie (${moment.lead} up with ${moment.holesRemaining} to play) — ${matchLabel}`,
      };
    case 'cup-lead-change':
      return {
        title: 'Cup Lead Change!',
        body: `The overall lead has flipped! ${moment.newCupScoreA} - ${moment.newCupScoreB}`,
      };
    case 'dominant':
      return {
        title: 'Dominant Performance!',
        body: `${moment.dominantNames} goes ${moment.lead} up — ${matchLabel}`,
      };
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
