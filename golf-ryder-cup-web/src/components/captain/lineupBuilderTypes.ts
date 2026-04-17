export type BuilderTeam = 'A' | 'B';

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  handicapIndex: number;
  team: BuilderTeam;
  avatarUrl?: string;
  matchesPlayed?: number;
}

export interface MatchSlot {
  id: string;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  courseHoles?: string;
  teeTime?: string;
}

export interface SessionConfig {
  id: string;
  name: string;
  /** Any SessionType from models.ts — the lineup builder is format-agnostic;
   *  it just needs the name and per-team player count. */
  type: import('@/lib/types/models').SessionType;
  playersPerTeam: number;
  matchCount: number;
  pointsPerMatch: number;
}

export interface FairnessScore {
  overall: number;
  handicapBalance: number;
  experienceBalance: number;
  warnings: string[];
}
