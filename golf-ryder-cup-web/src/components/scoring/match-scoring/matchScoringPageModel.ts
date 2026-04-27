import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import type { UserProfile } from '@/lib/stores/authStore';
import { db } from '@/lib/db';
import { TEAM_COLORS } from '@/lib/constants/teamColors';
import type { MatchState } from '@/lib/types/computed';
import type {
  Course,
  Match,
  Player,
  RyderCupSession,
  SideBet,
  Team,
  TeeSet,
  Trip,
} from '@/lib/types/models';
import type { SessionType } from '@/lib/types';
import type { ScoringPreferences } from '@/lib/types/scoringPreferences';
import { formatPlayerName } from '@/lib/utils';
import {
  resolveCurrentTripPlayer,
  type CurrentTripPlayerIdentity,
} from '@/lib/utils/tripPlayerIdentity';
import { buildMatchHandicapContext } from '@/lib/services/matchHandicapService';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import type { SideBet as ReminderSideBet } from '@/components/live-play/SideBetReminder';

import { buildMatchSummaryText, findNextIncompleteMatch } from './matchScoringReport';
import { getScoringModeMeta, type ScoringMode, type ScoringModeMeta } from './matchScoringShared';
import { toReminderBet } from './matchScoringUtils';

export const DEFAULT_HOLE_HANDICAPS = [
  7, 11, 3, 13, 9, 1, 15, 5, 17, 8, 16, 10, 4, 12, 6, 18, 2, 14,
];

export interface MatchScoringPageModel {
  activeSideBets: ReminderSideBet[];
  activeMatchSideBets: SideBet[];
  actorName: string;
  currentCourse?: Course;
  currentUserPlayerId?: string;
  currentSession?: RyderCupSession;
  currentTeeSet?: TeeSet;
  currentHoleResult?: MatchState['holeResults'][number];
  currentPar: number;
  currentStrokeIndex: number;
  currentYardage?: number;
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
  sessionLeaderboard: Array<{
    matchId: string;
    matchOrder: number;
    displayScore: string;
    currentScore: number;
    holesPlayed: number;
    holesRemaining: number;
    status: MatchState['status'];
    teamALineup: string;
    teamBLineup: string;
  }>;
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
  courses: Course[];
  players: Player[];
  teams: Team[];
  teeSets: TeeSet[];
  sessions: RyderCupSession[];
  activeMatch: Match | null;
  matchState?: MatchState | null;
  currentHole: number;
  sessionMatches: Match[];
  currentUser: UserProfile | null;
  currentIdentity: CurrentTripPlayerIdentity | null;
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
    courses,
    players,
    teams,
    teeSets,
    sessions,
    activeMatch,
    matchState,
    currentHole,
    sessionMatches,
    currentUser,
    currentIdentity,
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

  const sessionMatchIds = useMemo(
    () => sessionMatches.map((match) => match.id).join('|'),
    [sessionMatches]
  );
  const sessionHoleResults = useLiveQuery(
    async () => {
      if (sessionMatches.length === 0) return [];
      return db.holeResults
        .where('matchId')
        .anyOf(sessionMatches.map((match) => match.id))
        .toArray();
    },
    [sessionMatchIds],
    []
  );

  const currentUserPlayer = useMemo(
    () => resolveCurrentTripPlayer(players, currentIdentity, Boolean(currentIdentity)) ?? undefined,
    [currentIdentity, players]
  );

  const activeMatchParticipantIds = useMemo(
    () =>
      activeMatch
        ? new Set([...activeMatch.teamAPlayerIds, ...activeMatch.teamBPlayerIds])
        : new Set<string>(),
    [activeMatch]
  );

  const activeMatchSideBets = useMemo(
    () =>
      (dbSideBets ?? [])
        .filter((bet) => {
          if (!activeMatch) return false;
          return bet.matchId === activeMatch.id;
        })
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [activeMatch, dbSideBets]
  );

  const activeSideBets = useMemo(
    () =>
      (dbSideBets ?? [])
        .filter((bet) => {
          if (!activeMatch) return false;
          if (bet.status !== 'active') return false;
          if (bet.matchId === activeMatch.id) return true;
          return (
            !bet.matchId &&
            bet.participantIds.some((participantId) => activeMatchParticipantIds.has(participantId))
          );
        })
        .map(toReminderBet),
    [activeMatch, activeMatchParticipantIds, dbSideBets]
  );

  const currentTeeSet = activeMatch?.teeSetId
    ? teeSets.find((teeSet) => teeSet.id === activeMatch.teeSetId)
    : undefined;
  const resolvedCourseId = activeMatch?.courseId ?? currentTeeSet?.courseId;
  const currentCourse = resolvedCourseId
    ? courses.find((course) => course.id === resolvedCourseId)
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
  const currentStrokeIndex = holeHandicaps[currentHole - 1] || currentHole;
  const currentYardage = currentTeeSet?.yardages?.[currentHole - 1];
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

  const sessionLeaderboard = useMemo(() => {
    const resultsByMatchId = new Map<string, MatchState['holeResults']>();

    for (const result of sessionHoleResults ?? []) {
      const existing = resultsByMatchId.get(result.matchId) ?? [];
      existing.push(result);
      resultsByMatchId.set(result.matchId, existing);
    }

    return sessionMatches
      .map((match) => {
        const state =
          match.id === activeMatch?.id && matchState
            ? matchState
            : calculateMatchState(match, resultsByMatchId.get(match.id) ?? []);

        return {
          matchId: match.id,
          matchOrder: match.matchOrder,
          displayScore: state.displayScore,
          currentScore: state.currentScore,
          holesPlayed: state.holesPlayed,
          holesRemaining: state.holesRemaining,
          status: state.status,
          teamALineup: buildLineup(resolveMatchPlayers(match.teamAPlayerIds, players)),
          teamBLineup: buildLineup(resolveMatchPlayers(match.teamBPlayerIds, players)),
        };
      })
      .sort((left, right) => {
        const statusRank = (status: MatchState['status']) =>
          status === 'inProgress' ? 0 : status === 'scheduled' ? 1 : 2;
        const rankDelta = statusRank(left.status) - statusRank(right.status);
        if (rankDelta !== 0) return rankDelta;
        if (left.status === 'inProgress' && right.status === 'inProgress') {
          return right.holesPlayed - left.holesPlayed;
        }
        return left.matchOrder - right.matchOrder;
      });
  }, [activeMatch?.id, matchState, players, sessionHoleResults, sessionMatches]);

  return {
    activeSideBets,
    activeMatchSideBets,
    actorName,
    currentCourse,
    currentUserPlayerId: currentUserPlayer?.id,
    currentSession,
    currentTeeSet,
    currentHoleResult,
    currentPar,
    currentStrokeIndex,
    currentYardage,
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
    sessionLeaderboard,
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
