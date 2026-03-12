import type { UUID } from '@/lib/types/models';

export interface LineupPlayer {
  id: UUID;
  name: string;
  firstName: string;
  lastName: string;
  handicap: number | null;
  teamColor: 'usa' | 'europe';
  teamId: UUID;
}

export interface LineupMatch {
  matchNumber: number;
  teamAPlayers: LineupPlayer[];
  teamBPlayers: LineupPlayer[];
  locked: boolean;
}

export interface LineupState {
  sessionId: UUID;
  sessionType: string;
  playersPerMatch: number;
  matches: LineupMatch[];
  availableTeamA: LineupPlayer[];
  availableTeamB: LineupPlayer[];
}

export interface FairnessIssue {
  severity: 'low' | 'medium' | 'high';
  message: string;
  matchNumber?: number;
}

export interface FairnessScore {
  overall: number;
  handicapBalance: number;
  pairingVariety: number;
  matchupBalance: number;
  issues: FairnessIssue[];
  favoredTeam: 'usa' | 'europe' | 'balanced';
  advantageStrokes: number;
}

export interface PairingHistory {
  playerId: UUID;
  partnerIds: UUID[];
  opponentIds: UUID[];
  partnerCounts: Map<UUID, number>;
  opponentCounts: Map<UUID, number>;
}

export interface AutoFillOptions {
  optimizeForHandicap: boolean;
  minimizeRepeatPartners: boolean;
  minimizeRepeatOpponents: boolean;
  respectLockedMatches: boolean;
}

export const DEFAULT_AUTO_FILL_OPTIONS: AutoFillOptions = {
  optimizeForHandicap: true,
  minimizeRepeatPartners: true,
  minimizeRepeatOpponents: true,
  respectLockedMatches: true,
};
