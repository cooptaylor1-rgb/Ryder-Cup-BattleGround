import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import type { UserProfile } from '@/lib/stores/authStore';
import { db } from '@/lib/db';
import { TEAM_COLORS } from '@/lib/constants/teamColors';
import type { MatchState } from '@/lib/types/computed';
import type {
  Match,
  Player,
  RyderCupSession,
  Team,
  TeeSet,
  Trip,
} from '@/lib/types/models';
import type { SessionType } from '@/lib/types';
import type { ScoringPreferences } from '@/lib/types/scoringPreferences';
import { formatPlayerName } from '@/lib/utils';
import { buildMatchHandicapContext } from '@/lib/services/matchHandicapService';
import type { SideBet as ReminderSideBet } from '@/components/live-play/SideBetReminder';

import {
  buildMatchSummaryText,
  findNextIncompleteMatch,
} from './matchScoringReport';
import {
  getScoringModeMeta,
  type ScoringMode,
  type ScoringModeMeta,
} from './matchScoringShared';
import { toReminderBet } from './matchScoringUtils';

export const DEFAULT_HOLE_HANDICAPS = [
  7, 11, 3, 13, 9, 1, 15, 5, 17, 8, 16, 10, 4, 12, 6, 18, 2, 14,
];

export interface MatchScoringPageModel {
  activeSideBets: ReminderSideBet[];
  actorName: string;
  currentSession?: RyderCupSession;
  currentTeeSet?: TeeSet;
  currentHoleResult?: MatchState['holeResults'][number];
  currentPar: number;
  effectiveScoringMode: ScoringMode;
  holeHandicaps: number[];
  isFourball: boolean;
  isMatchComplete: boolean;
  matchHandicapContext: ReturnType<typeof buildMatchHandicapContext>;
  matchStatusLabel: string;
  nextIncompleteMatch?: Match;
  preferredScoringMode: ScoringMode;
  scoringModeMeta: ScoringModeMeta;
  scoringModeSessionKey: string;
  summaryText: string;
  teamAColor: string;
  teamAFourballPlayers: Array<{
    id: string;
    name: string;
    courseHandicap: number;
    strokeAllowance: number;
  }>;
  teamALineup: string;
  teamAName: string;
  teamAPlayers: Player[];
  teamBColor: string;
  teamBFourballPlayers: Array<{
    id: string;
    name: string;
    courseHandicap: number;
    strokeAllowance: number;
  }>;
  teamBLineup: string;
  teamBName: string;
  teamBPlayers: Player[];
}

interface UseMatchScoringPageModelOptions {
  currentTrip: Trip | null;
  players: Player[];
  teams: Team[];
  teeSets: TeeSet[];
  sessions: RyderCupSession[];
  activeMatch: Match | null;
  matchState?: MatchState | null;
  currentHole: number;
  sessionMatches: Match[];
  currentUser: UserProfile | null;
  scoringPreferences: ScoringPreferences;
  scoringModeByFormat: Record<string, ScoringMode>;
  getScoringModeForFormat: (format: SessionType) => ScoringMode;
  setScoringModeForFormat: (format: SessionType, mode: ScoringMode) => void;
  scoringModeOverrides: Record<string, ScoringMode>;
  isEditingScores: boolean;
}

function resolveMatchPlayers(playerIds: string[], players: Player[]): Player[] {
  return playerIds
    .map((id) => players.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player));
}

function buildLineup(players: Player[]): string {
  return players
    .map((player) => formatPlayerName(player.firstName, player.lastName, 'short'))
    .join(' & ');
}

export function normalizeScoringMode(mode: ScoringMode, isFourball: boolean): ScoringMode {
  if (isFourball) {
    return mode === 'strokes' ? 'fourball' : mode;
  }

  return mode === 'fourball' ? 'buttons' : mode;
}

export function useMatchScoringPageModel(
  options: UseMatchScoringPageModelOptions
): MatchScoringPageModel {
  const {
    currentTrip,
    players,
    teams,
    teeSets,
    sessions,
    activeMatch,
    matchState,
    currentHole,
    sessionMatches,
    currentUser,
    scoringPreferences,
    scoringModeByFormat,
    getScoringModeForFormat,
    setScoringModeForFormat,
    scoringModeOverrides,
    isEditingScores,
  } = options;

  const dbSideBets = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.sideBets.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    []
  );

  const activeSideBets = useMemo(
    () => (dbSideBets ?? []).filter((bet) => bet.status === 'active').map(toReminderBet),
    [dbSideBets]
  );

  const currentTeeSet = activeMatch?.teeSetId
    ? teeSets.find((teeSet) => teeSet.id === activeMatch.teeSetId)
    : undefined;

  const holeHandicaps = currentTeeSet?.holeHandicaps || DEFAULT_HOLE_HANDICAPS;

  const teamA = teams.find((team) => team.color === 'usa');
  const teamB = teams.find((team) => team.color === 'europe');
  const teamAName = teamA?.name || 'USA';
  const teamBName = teamB?.name || 'Europe';
  const teamAColor = TEAM_COLORS.teamA;
  const teamBColor = TEAM_COLORS.teamB;

  const actorName = useMemo(() => {
    if (!currentUser) return 'Unknown';
    const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
    return currentUser.nickname?.trim() || fullName || currentUser.email || 'User';
  }, [currentUser]);

  const currentSession = useMemo(() => {
    if (!activeMatch) return undefined;
    return sessions.find((session) => session.id === activeMatch.sessionId);
  }, [activeMatch, sessions]);

  const isFourball = currentSession?.sessionType === 'fourball';
  const scoringModeSessionKey = currentSession?.id ?? 'default';

  const preferredScoringMode = useMemo(() => {
    if (!currentSession) {
      return scoringPreferences.oneHandedMode ? 'oneHanded' : 'swipe';
    }

    return normalizeScoringMode(getScoringModeForFormat(currentSession.sessionType), isFourball);
  }, [currentSession, getScoringModeForFormat, isFourball, scoringPreferences.oneHandedMode]);

  const effectiveScoringMode = scoringPreferences.oneHandedMode
    ? 'oneHanded'
    : normalizeScoringMode(
        scoringModeOverrides[scoringModeSessionKey] ?? preferredScoringMode,
        isFourball
      );

  useEffect(() => {
    if (!currentSession?.sessionType) return;

    const storedMode = scoringModeByFormat[currentSession.sessionType];
    if (!storedMode) return;

    const normalizedMode = normalizeScoringMode(storedMode, isFourball);
    if (normalizedMode !== storedMode) {
      setScoringModeForFormat(currentSession.sessionType, normalizedMode);
    }
  }, [currentSession?.sessionType, isFourball, scoringModeByFormat, setScoringModeForFormat]);

  const teamAPlayers = useMemo(
    () => (activeMatch ? resolveMatchPlayers(activeMatch.teamAPlayerIds, players) : []),
    [activeMatch, players]
  );
  const teamBPlayers = useMemo(
    () => (activeMatch ? resolveMatchPlayers(activeMatch.teamBPlayerIds, players) : []),
    [activeMatch, players]
  );

  const matchHandicapContext = useMemo(
    () =>
      buildMatchHandicapContext({
        sessionType: currentSession?.sessionType,
        teamAPlayers,
        teamBPlayers,
        teeSet: currentTeeSet,
      }),
    [currentSession?.sessionType, teamAPlayers, teamBPlayers, currentTeeSet]
  );

  const teamAFourballPlayers = useMemo(
    () =>
      teamAPlayers.map((player, index) => ({
        id: player.id,
        name: formatPlayerName(player.firstName, player.lastName),
        courseHandicap: matchHandicapContext.teamAPlayers[index]?.courseHandicap ?? 0,
        strokeAllowance: matchHandicapContext.teamAPlayers[index]?.strokeAllowance ?? 0,
      })),
    [teamAPlayers, matchHandicapContext.teamAPlayers]
  );

  const teamBFourballPlayers = useMemo(
    () =>
      teamBPlayers.map((player, index) => ({
        id: player.id,
        name: formatPlayerName(player.firstName, player.lastName),
        courseHandicap: matchHandicapContext.teamBPlayers[index]?.courseHandicap ?? 0,
        strokeAllowance: matchHandicapContext.teamBPlayers[index]?.strokeAllowance ?? 0,
      })),
    [teamBPlayers, matchHandicapContext.teamBPlayers]
  );

  const currentHoleResult = useMemo(() => {
    if (!matchState) return undefined;
    return matchState.holeResults.find((result) => result.holeNumber === currentHole);
  }, [matchState, currentHole]);

  const nextIncompleteMatch = useMemo(() => {
    if (!activeMatch || !sessionMatches.length) return undefined;
    return findNextIncompleteMatch(activeMatch.id, sessionMatches);
  }, [activeMatch, sessionMatches]);

  const teamALineup = useMemo(() => buildLineup(teamAPlayers), [teamAPlayers]);
  const teamBLineup = useMemo(() => buildLineup(teamBPlayers), [teamBPlayers]);
  const currentPar = currentTeeSet?.holePars?.[currentHole - 1] || 4;
  const scoringModeMeta = getScoringModeMeta(effectiveScoringMode, isFourball);
  const isMatchComplete = Boolean(
    matchState && (matchState.isClosedOut || matchState.holesRemaining === 0)
  );
  const matchStatusLabel = isMatchComplete
    ? 'Final card'
    : isEditingScores
      ? 'Captain editing'
      : 'Live scoring';

  const summaryText = useMemo(() => {
    if (!matchState) return '';

    return buildMatchSummaryText({
      matchState,
      teamAName,
      teamBName,
      teamAPlayers,
      teamBPlayers,
    });
  }, [matchState, teamAName, teamBName, teamAPlayers, teamBPlayers]);

  return {
    activeSideBets,
    actorName,
    currentSession,
    currentTeeSet,
    currentHoleResult,
    currentPar,
    effectiveScoringMode,
    holeHandicaps,
    isFourball,
    isMatchComplete,
    matchHandicapContext,
    matchStatusLabel,
    nextIncompleteMatch,
    preferredScoringMode,
    scoringModeMeta,
    scoringModeSessionKey,
    summaryText,
    teamAColor,
    teamAFourballPlayers,
    teamALineup,
    teamAName,
    teamAPlayers,
    teamBColor,
    teamBFourballPlayers,
    teamBLineup,
    teamBName,
    teamBPlayers,
  };
}
