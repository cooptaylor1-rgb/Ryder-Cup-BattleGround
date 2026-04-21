/**
 * Match Lineup Service
 *
 * Day-of roster changes — pulling a no-show from a match, swapping in a
 * replacement. Written as first-class operations instead of scattered
 * db.matches.update calls so handicap context, audit trail, and sync
 * queueing stay consistent across every caller.
 */

import { db } from '@/lib/db';
import { addAuditLogEntry } from '@/lib/db';
import { createAuditEntry, logPairingChange } from '@/lib/services/sessionLockService';
import { queueSyncOperation } from '@/lib/services/tripSyncService';
import { buildMatchHandicapContext } from '@/lib/services/matchHandicapService';
import { captainLogger } from '@/lib/utils/logger';
import type { Match, Player } from '@/lib/types/models';

export interface RemovePlayerResult {
  match: Match;
  /** Team the player was removed from, null if they were not in the match. */
  removedFrom: 'teamA' | 'teamB' | null;
  /** Whether the remaining lineup is now unbalanced (team sizes differ). */
  unbalanced: boolean;
}

/**
 * Pull a player out of a match's lineup. Recomputes handicap allowance
 * from the remaining players and audits the change so the captain can
 * explain the decision after the round.
 *
 * Returns the updated match plus metadata. Caller chooses how to
 * communicate any unbalanced state (1v2, 2v3, etc.) — this service does
 * not block on that because partial-team match play is still scoreable
 * and occasionally intentional.
 */
export async function removePlayerFromMatch({
  matchId,
  playerId,
  actorName,
  reason,
}: {
  matchId: string;
  playerId: string;
  actorName: string;
  reason?: string;
}): Promise<RemovePlayerResult> {
  const match = await db.matches.get(matchId);
  if (!match) throw new Error(`Match not found: ${matchId}`);

  const wasOnTeamA = match.teamAPlayerIds.includes(playerId);
  const wasOnTeamB = match.teamBPlayerIds.includes(playerId);
  if (!wasOnTeamA && !wasOnTeamB) {
    return { match, removedFrom: null, unbalanced: false };
  }

  const removedFrom: 'teamA' | 'teamB' = wasOnTeamA ? 'teamA' : 'teamB';
  const nextTeamAIds = match.teamAPlayerIds.filter((id) => id !== playerId);
  const nextTeamBIds = match.teamBPlayerIds.filter((id) => id !== playerId);

  const session = await db.sessions.get(match.sessionId);
  // Resolve effective tee set: match first, session default as
  // fallback. Skipping this would persist a raw-index allowance and
  // overwrite a previously-correct value.
  const effectiveTeeSetId = match.teeSetId ?? session?.defaultTeeSetId;
  const teeSet = effectiveTeeSetId
    ? (await db.teeSets.get(effectiveTeeSetId)) ?? undefined
    : undefined;
  const allIds = [...nextTeamAIds, ...nextTeamBIds];
  const loadedPlayers = (await db.players.bulkGet(allIds)).filter(Boolean) as Player[];
  const playerById = new Map(loadedPlayers.map((p) => [p.id, p]));
  const ctx = buildMatchHandicapContext({
    sessionType: session?.sessionType,
    teamAPlayers: nextTeamAIds
      .map((id) => playerById.get(id))
      .filter((p): p is Player => Boolean(p)),
    teamBPlayers: nextTeamBIds
      .map((id) => playerById.get(id))
      .filter((p): p is Player => Boolean(p)),
    teeSet,
  });

  const nextVersion = (match.version ?? 0) + 1;
  const now = new Date().toISOString();
  // Preserve the existing stored allowances when the tee set is
  // missing — otherwise a pull-player action would clobber a
  // correctly-computed value with the raw-index fallback.
  const teamAHandicapAllowance = ctx.hasCourseHandicapInfo
    ? ctx.teamAHandicapAllowance
    : match.teamAHandicapAllowance ?? 0;
  const teamBHandicapAllowance = ctx.hasCourseHandicapInfo
    ? ctx.teamBHandicapAllowance
    : match.teamBHandicapAllowance ?? 0;
  const updated: Match = {
    ...match,
    teamAPlayerIds: nextTeamAIds,
    teamBPlayerIds: nextTeamBIds,
    teamAHandicapAllowance,
    teamBHandicapAllowance,
    version: nextVersion,
    updatedAt: now,
  };

  await db.matches.update(matchId, {
    teamAPlayerIds: updated.teamAPlayerIds,
    teamBPlayerIds: updated.teamBPlayerIds,
    teamAHandicapAllowance: updated.teamAHandicapAllowance,
    teamBHandicapAllowance: updated.teamBHandicapAllowance,
    version: updated.version,
    updatedAt: updated.updatedAt,
  });

  if (session) {
    queueSyncOperation('match', matchId, 'update', session.tripId, updated);

    // Use the existing pairing audit action type rather than invent a new
    // one — the details payload carries enough context to distinguish a
    // removal from any other edit, and the /captain/audit UI already
    // renders 'pairingEdited' entries.
    const entry = logPairingChange(session.tripId, session.id, matchId, actorName, 'edited', {
      oldPlayers: [...match.teamAPlayerIds, ...match.teamBPlayerIds],
      newPlayers: allIds,
    });
    // Augment with the removal-specific context so the auditor sees why.
    const detail = {
      type: 'playerRemoved' as const,
      playerId,
      removedFrom,
      reason: reason ?? null,
      oldAllowance: {
        teamA: match.teamAHandicapAllowance,
        teamB: match.teamBHandicapAllowance,
      },
      newAllowance: {
        teamA: updated.teamAHandicapAllowance,
        teamB: updated.teamBHandicapAllowance,
      },
    };
    // AuditLogEntry.details is a JSON string, not a structured object.
    // Decode any existing details the helper stamped onto the entry and
    // re-encode the merged payload so the audit UI can inspect the diff.
    let baseDetails: Record<string, unknown> = {};
    if (typeof entry.details === 'string' && entry.details.length > 0) {
      try {
        const parsed = JSON.parse(entry.details);
        if (parsed && typeof parsed === 'object') {
          baseDetails = parsed as Record<string, unknown>;
        }
      } catch {
        // Unparseable details aren't worth failing the audit write over.
      }
    }
    await addAuditLogEntry({
      ...entry,
      summary: reason
        ? `Player removed from lineup: ${reason}`
        : 'Player removed from lineup',
      details: JSON.stringify({ ...baseDetails, ...detail }),
    });
  } else {
    captainLogger.warn('removePlayerFromMatch: session not found; audit skipped', {
      matchId,
      playerId,
    });
  }

  const unbalanced =
    session?.sessionType !== 'singles' &&
    nextTeamAIds.length !== nextTeamBIds.length;

  return { match: updated, removedFrom, unbalanced };
}

// Keep createAuditEntry re-export handy for callers that want to extend
// the audit trail with related entries (e.g., flagging a sub-in).
export { createAuditEntry };
