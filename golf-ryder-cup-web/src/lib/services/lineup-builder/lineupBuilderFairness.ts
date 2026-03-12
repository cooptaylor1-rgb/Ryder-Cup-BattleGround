import { db } from '@/lib/db';
import type { UUID } from '@/lib/types/models';

import type { FairnessIssue, FairnessScore, LineupState, PairingHistory } from './lineupBuilderTypes';

export async function calculateFairnessScore(
  state: LineupState,
  tripId: UUID
): Promise<FairnessScore> {
  const history = await getPairingHistory(tripId, state.sessionId);
  const issues: FairnessIssue[] = [];

  let totalTeamAHandicap = 0;
  let totalTeamBHandicap = 0;

  for (const match of state.matches) {
    const teamAHcp = match.teamAPlayers.reduce((sum, player) => sum + (player.handicap ?? 18), 0);
    const teamBHcp = match.teamBPlayers.reduce((sum, player) => sum + (player.handicap ?? 18), 0);
    totalTeamAHandicap += teamAHcp;
    totalTeamBHandicap += teamBHcp;

    const matchDiff = Math.abs(teamAHcp - teamBHcp);
    if (matchDiff > 10) {
      issues.push({
        severity: 'high',
        message: `Match ${match.matchNumber} has ${matchDiff} stroke handicap difference`,
        matchNumber: match.matchNumber,
      });
    } else if (matchDiff > 6) {
      issues.push({
        severity: 'medium',
        message: `Match ${match.matchNumber} has ${matchDiff} stroke difference`,
        matchNumber: match.matchNumber,
      });
    }
  }

  const totalDiff = Math.abs(totalTeamAHandicap - totalTeamBHandicap);
  const maxPossibleDiff = state.matches.length * state.playersPerMatch * 36;
  const handicapBalance = Math.max(0, 100 - (totalDiff / maxPossibleDiff) * 100 * 10);

  let repeatPartners = 0;
  let totalPairings = 0;

  for (const match of state.matches) {
    if (state.playersPerMatch !== 2) {
      continue;
    }

    if (match.teamAPlayers.length === 2) {
      totalPairings++;
      const [playerOne, playerTwo] = match.teamAPlayers;
      const playerHistory = history.get(playerOne.id);
      if (playerHistory && playerHistory.partnerCounts.get(playerTwo.id)) {
        repeatPartners++;
      }
    }

    if (match.teamBPlayers.length === 2) {
      totalPairings++;
      const [playerOne, playerTwo] = match.teamBPlayers;
      const playerHistory = history.get(playerOne.id);
      if (playerHistory && playerHistory.partnerCounts.get(playerTwo.id)) {
        repeatPartners++;
      }
    }
  }

  const pairingVariety = totalPairings > 0 ? 100 - (repeatPartners / totalPairings) * 100 : 100;
  if (repeatPartners > 0) {
    issues.push({
      severity: 'low',
      message: `${repeatPartners} repeat partner pairing${repeatPartners > 1 ? 's' : ''}`,
    });
  }

  let repeatMatchups = 0;
  let totalMatchups = 0;

  for (const match of state.matches) {
    for (const teamAPlayer of match.teamAPlayers) {
      for (const teamBPlayer of match.teamBPlayers) {
        totalMatchups++;
        const playerHistory = history.get(teamAPlayer.id);
        if (playerHistory && playerHistory.opponentCounts.get(teamBPlayer.id)) {
          repeatMatchups++;
        }
      }
    }
  }

  const matchupBalance = totalMatchups > 0 ? 100 - (repeatMatchups / totalMatchups) * 50 : 100;
  if (repeatMatchups > 2) {
    issues.push({
      severity: 'medium',
      message: `${repeatMatchups} repeat opponent matchup${repeatMatchups > 1 ? 's' : ''}`,
    });
  }

  const overall = Math.round(handicapBalance * 0.5 + pairingVariety * 0.25 + matchupBalance * 0.25);
  const advantageStrokes = (totalTeamAHandicap - totalTeamBHandicap) / state.matches.length;
  const favoredTeam: 'usa' | 'europe' | 'balanced' =
    advantageStrokes > 1 ? 'europe' : advantageStrokes < -1 ? 'usa' : 'balanced';

  return {
    overall,
    handicapBalance: Math.round(handicapBalance),
    pairingVariety: Math.round(pairingVariety),
    matchupBalance: Math.round(matchupBalance),
    issues,
    favoredTeam,
    advantageStrokes: Math.abs(Math.round(advantageStrokes * 10) / 10),
  };
}

export async function getPairingHistory(
  tripId: UUID,
  excludeSessionId?: UUID
): Promise<Map<UUID, PairingHistory>> {
  const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
  const sessionIds = sessions.filter((session) => session.id !== excludeSessionId).map((session) => session.id);

  if (sessionIds.length === 0) {
    return new Map();
  }

  const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
  const historyMap = new Map<UUID, PairingHistory>();

  const getOrCreate = (playerId: UUID): PairingHistory => {
    let history = historyMap.get(playerId);
    if (!history) {
      history = {
        playerId,
        partnerIds: [],
        opponentIds: [],
        partnerCounts: new Map(),
        opponentCounts: new Map(),
      };
      historyMap.set(playerId, history);
    }
    return history;
  };

  for (const match of matches) {
    for (const playerId of match.teamAPlayerIds) {
      const playerHistory = getOrCreate(playerId);
      for (const partnerId of match.teamAPlayerIds) {
        if (playerId !== partnerId) {
          playerHistory.partnerIds.push(partnerId);
          playerHistory.partnerCounts.set(partnerId, (playerHistory.partnerCounts.get(partnerId) || 0) + 1);
        }
      }

      for (const opponentId of match.teamBPlayerIds) {
        playerHistory.opponentIds.push(opponentId);
        playerHistory.opponentCounts.set(opponentId, (playerHistory.opponentCounts.get(opponentId) || 0) + 1);
      }
    }

    for (const playerId of match.teamBPlayerIds) {
      const playerHistory = getOrCreate(playerId);
      for (const partnerId of match.teamBPlayerIds) {
        if (playerId !== partnerId) {
          playerHistory.partnerIds.push(partnerId);
          playerHistory.partnerCounts.set(partnerId, (playerHistory.partnerCounts.get(partnerId) || 0) + 1);
        }
      }

      for (const opponentId of match.teamAPlayerIds) {
        playerHistory.opponentIds.push(opponentId);
        playerHistory.opponentCounts.set(opponentId, (playerHistory.opponentCounts.get(opponentId) || 0) + 1);
      }
    }
  }

  return historyMap;
}
