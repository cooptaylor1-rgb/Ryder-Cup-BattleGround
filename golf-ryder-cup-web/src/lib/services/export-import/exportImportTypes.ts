import type { ImportResult } from '@/lib/types/export';
import type {
  Course,
  HoleResult,
  Match,
  Player,
  RyderCupSession,
  TeeSet,
  Team,
  TeamMember,
  Trip,
} from '@/lib/types/models';

export interface ExportValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ImportIdMaps {
  player: Map<string, string>;
  team: Map<string, string>;
  session: Map<string, string>;
  match: Map<string, string>;
  course: Map<string, string>;
  teeSet: Map<string, string>;
}

export interface ImportedTripEntities {
  trip: Trip;
  players: Player[];
  teams: Team[];
  teamMembers: TeamMember[];
  sessions: RyderCupSession[];
  matches: Match[];
  holeResults: HoleResult[];
  courses: Course[];
  teeSets: TeeSet[];
}

export interface PreparedImportPayload {
  tripId: string;
  tripName: string;
  stats: ImportResult['stats'];
  entities: ImportedTripEntities;
}
