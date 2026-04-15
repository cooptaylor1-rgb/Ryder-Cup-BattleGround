import { db } from '../db';
import type { TripSetupData } from '@/components/trip-setup';
import { DEFAULT_HOLE_HANDICAPS, DEFAULT_HOLE_PARS } from '@/lib/types/courseProfile';
import type {
  Course,
  Match,
  Player,
  RyderCupSession,
  Team,
  TeamMember,
  TeeSet,
  Trip,
} from '@/lib/types/models';
import { queueSyncOperation } from '@/lib/services/tripSyncService';

export interface TripSetupCreationResult {
  trip: Trip;
  teams: Team[];
  players: Player[];
  teamMembers: TeamMember[];
  sessions: RyderCupSession[];
  matches: Match[];
  courses: Course[];
  teeSets: TeeSet[];
}

interface PersistedCourseBundle {
  course: Course;
  teeSets: TeeSet[];
}

const SESSION_TYPE_MAP: Record<
  TripSetupData['sessions'][number]['sessionType'],
  RyderCupSession['sessionType']
> = {
  fourball: 'fourball',
  foursomes: 'foursomes',
  singles: 'singles',
  mixed: 'fourball',
};

function splitPlayerName(name: string) {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return { firstName: 'Player', lastName: '' };
  }

  const parts = cleaned.split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0] || 'Player', lastName: '' };
  }

  return {
    firstName: parts[0] || 'Player',
    lastName: parts.slice(1).join(' '),
  };
}

function addDays(dateString: string, dayOffset: number) {
  const base = new Date(`${dateString}T00:00:00`);
  base.setDate(base.getDate() + dayOffset);
  return base;
}

function atTime(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date(date);
  next.setHours(hours || 0, minutes || 0, 0, 0);
  return next;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function calculatePointsToWin(totalPoints: number, requested?: number) {
  if (typeof requested === 'number' && Number.isFinite(requested) && requested > 0) {
    return requested;
  }

  return Math.floor(totalPoints / 2) + 0.5;
}

function normalisePlayers(setupData: TripSetupData) {
  const preferredPerTeam = Math.max(setupData.playersPerTeam, 1);
  const teamACurrent = setupData.players.filter((player) => player.team === 'A');
  const teamBCurrent = setupData.players.filter((player) => player.team === 'B');
  const unassigned = setupData.players.filter((player) => player.team === null);

  const assigned = [...teamACurrent.map((player) => ({ ...player, team: 'A' as const })), ...teamBCurrent.map((player) => ({ ...player, team: 'B' as const }))];
  const balanced = [...assigned];
  let teamACount = teamACurrent.length;
  let teamBCount = teamBCurrent.length;

  for (const player of unassigned) {
    const shouldFillTeamA =
      teamACount < preferredPerTeam && (teamACount <= teamBCount || teamBCount >= preferredPerTeam);
    const team = shouldFillTeamA ? 'A' : 'B';
    balanced.push({ ...player, team });
    if (team === 'A') {
      teamACount += 1;
    } else {
      teamBCount += 1;
    }
  }

  return balanced;
}

function buildTripNotes(setupData: TripSetupData) {
  const notes: string[] = [];

  notes.push(`Created from the World-Class Setup wizard on ${new Date().toLocaleDateString()}.`);
  notes.push(`Scoring format: ${setupData.scoringSettings.defaultFormat}.`);
  notes.push(
    setupData.handicapSettings.useNetScoring
      ? `Handicap allowance: ${setupData.handicapSettings.allowancePercent}% net.`
      : 'Handicap mode: gross scoring.'
  );
  notes.push(
    `Tee sheet: ${setupData.teeTimeSettings.firstTeeTime} start, ${setupData.teeTimeSettings.interval} minute interval, ${setupData.teeTimeSettings.format}.`
  );

  if (setupData.sideBets.length > 0) {
    notes.push(
      `Side bets: ${setupData.sideBets
        .filter((bet) => bet.isEnabled)
        .map((bet) => `${bet.name} ($${bet.amount})`)
        .join(', ')}.`
    );
  }

  return notes.join(' ');
}

function buildCourseBundles(setupData: TripSetupData, timestamp: string): PersistedCourseBundle[] {
  return setupData.courses.map((courseInfo) => {
    const courseId = crypto.randomUUID();
    const location = [courseInfo.city, courseInfo.state, courseInfo.country]
      .filter(Boolean)
      .join(', ');

    const course: Course = {
      id: courseId,
      name: courseInfo.name,
      location: location || courseInfo.address || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const teeSets: TeeSet[] = (courseInfo.teeBoxes || []).map((teeBox) => ({
      id: crypto.randomUUID(),
      courseId,
      name: teeBox.name,
      color: teeBox.color,
      rating: teeBox.rating,
      slope: teeBox.slope,
      par: courseInfo.par || DEFAULT_HOLE_PARS.reduce((sum, value) => sum + value, 0),
      holePars: DEFAULT_HOLE_PARS,
      holeHandicaps: DEFAULT_HOLE_HANDICAPS,
      yardages: undefined,
      totalYardage: teeBox.yardage,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    if (teeSets.length === 0 && courseInfo.rating && courseInfo.slope) {
      teeSets.push({
        id: crypto.randomUUID(),
        courseId,
        name: 'Default',
        color: undefined,
        rating: courseInfo.rating,
        slope: courseInfo.slope,
        par: courseInfo.par || DEFAULT_HOLE_PARS.reduce((sum, value) => sum + value, 0),
        holePars: DEFAULT_HOLE_PARS,
        holeHandicaps: DEFAULT_HOLE_HANDICAPS,
        yardages: undefined,
        totalYardage: courseInfo.yardage,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    return { course, teeSets };
  });
}

export async function createTripFromSetupWizard(
  setupData: TripSetupData
): Promise<TripSetupCreationResult> {
  const now = new Date().toISOString();
  const balancedPlayers = normalisePlayers(setupData);
  const courseBundles = buildCourseBundles(setupData, now);
  const totalMatches = setupData.sessions.reduce((sum, session) => sum + session.matchCount, 0);
  const totalPoints = setupData.sessions.reduce(
    (sum, session) => sum + session.matchCount * session.pointsPerMatch,
    0
  );

  const tripId = crypto.randomUUID();
  const trip: Trip = {
    id: tripId,
    name: setupData.tripName.trim(),
    startDate: `${setupData.startDate}T00:00:00.000Z`,
    endDate: `${(setupData.endDate || setupData.startDate)}T23:59:59.000Z`,
    location: setupData.location.trim() || undefined,
    notes: buildTripNotes(setupData),
    isCaptainModeEnabled: true,
    captainName: setupData.captainName.trim() || undefined,
    settings: {
      pointsToWin: calculatePointsToWin(totalPoints, setupData.scoringSettings.pointsToWin),
      totalMatches,
      allowSpectators: true,
      isPublic: false,
    },
    createdAt: now,
    updatedAt: now,
  };

  const teams: Team[] = [
    {
      id: crypto.randomUUID(),
      tripId,
      name: setupData.teamColors.teamA.name.trim() || 'Team USA',
      color: 'usa',
      colorHex: setupData.teamColors.teamA.primary,
      mode: 'ryderCup',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      tripId,
      name: setupData.teamColors.teamB.name.trim() || 'Team Europe',
      color: 'europe',
      colorHex: setupData.teamColors.teamB.primary,
      mode: 'ryderCup',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const players: Player[] = balancedPlayers.map((playerInfo) => {
    const { firstName, lastName } = splitPlayerName(playerInfo.name);
    return {
      id: crypto.randomUUID(),
      tripId,
      firstName,
      lastName,
      email: playerInfo.email || undefined,
      handicapIndex:
        typeof playerInfo.handicap === 'number' && Number.isFinite(playerInfo.handicap)
          ? playerInfo.handicap
          : undefined,
      team: playerInfo.team === 'A' ? 'usa' : playerInfo.team === 'B' ? 'europe' : undefined,
      createdAt: now,
      updatedAt: now,
    };
  });

  const teamMembers: TeamMember[] = players
    .filter((player) => player.team)
    .map((player, index) => ({
      id: crypto.randomUUID(),
      teamId: player.team === 'usa' ? teams[0]!.id : teams[1]!.id,
      playerId: player.id,
      sortOrder: index,
      isCaptain: false,
      createdAt: now,
    }));

  const courseByDay = new Map<number, PersistedCourseBundle>();
  courseBundles.forEach((bundle, index) => {
    courseByDay.set(index, bundle);
  });

  const sessions: RyderCupSession[] = [];
  const matches: Match[] = [];
  const slotCountsByDay = new Map<string, number>();

  setupData.sessions
    .slice()
    .sort((a, b) => {
      if (a.dayOffset !== b.dayOffset) return a.dayOffset - b.dayOffset;
      const order = { AM: 0, PM: 1, twilight: 2 };
      return order[a.timeSlot] - order[b.timeSlot];
    })
    .forEach((sessionConfig, sessionIndex) => {
      const sessionId = crypto.randomUUID();
      const sessionDate = addDays(setupData.startDate, sessionConfig.dayOffset);
      const slotKey = `${sessionConfig.dayOffset}-${sessionConfig.timeSlot}`;
      const slotCount = slotCountsByDay.get(slotKey) || 0;
      slotCountsByDay.set(slotKey, slotCount + 1);

      const slotOffsetBase =
        sessionConfig.timeSlot === 'AM'
          ? 0
          : sessionConfig.timeSlot === 'PM'
            ? setupData.teeTimeSettings.estimatedRoundTime +
              setupData.teeTimeSettings.breakBetweenSessions
            : (setupData.teeTimeSettings.estimatedRoundTime +
                setupData.teeTimeSettings.breakBetweenSessions) * 2;

      const sessionStart = addMinutes(
        atTime(sessionDate, setupData.teeTimeSettings.firstTeeTime),
        slotOffsetBase +
          slotCount *
            (setupData.teeTimeSettings.estimatedRoundTime +
              setupData.teeTimeSettings.breakBetweenSessions)
      );

      const assignedCourseBundle =
        courseByDay.get(sessionConfig.dayOffset) ||
        (courseBundles.length > 0 ? courseBundles[Math.min(sessionConfig.dayOffset, courseBundles.length - 1)] : undefined);
      const assignedTeeSet = assignedCourseBundle?.teeSets[0];

      const session: RyderCupSession = {
        id: sessionId,
        tripId,
        name: sessionConfig.name.trim() || `Session ${sessionIndex + 1}`,
        sessionNumber: sessionIndex + 1,
        sessionType: SESSION_TYPE_MAP[sessionConfig.sessionType],
        scheduledDate: sessionStart.toISOString(),
        timeSlot: sessionConfig.timeSlot === 'twilight' ? 'PM' : sessionConfig.timeSlot,
        pointsPerMatch: sessionConfig.pointsPerMatch,
        notes:
          sessionConfig.sessionType === 'mixed'
            ? 'Created from a mixed-format setup. Defaulted to four-ball for live match play.'
            : undefined,
        status: 'scheduled',
        isLocked: false,
        createdAt: now,
        updatedAt: now,
      };
      sessions.push(session);

      for (let matchIndex = 0; matchIndex < sessionConfig.matchCount; matchIndex += 1) {
        const teeTime =
          setupData.teeTimeSettings.format === 'shotgun'
            ? sessionStart
            : addMinutes(sessionStart, matchIndex * setupData.teeTimeSettings.interval);

        matches.push({
          id: crypto.randomUUID(),
          sessionId,
          courseId: assignedCourseBundle?.course.id,
          teeSetId: assignedTeeSet?.id,
          matchOrder: matchIndex + 1,
          status: 'scheduled',
          teeTime: teeTime.toISOString(),
          currentHole: 0,
          teamAPlayerIds: [],
          teamBPlayerIds: [],
          teamAHandicapAllowance: 0,
          teamBHandicapAllowance: 0,
          result: 'notFinished',
          margin: 0,
          holesRemaining: 18,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

  const courses = courseBundles.map((bundle) => bundle.course);
  const teeSets = courseBundles.flatMap((bundle) => bundle.teeSets);

  await db.trips.add(trip);
  await db.teams.bulkAdd(teams);
  if (players.length > 0) {
    await db.players.bulkAdd(players);
  }
  if (teamMembers.length > 0) {
    await db.teamMembers.bulkAdd(teamMembers);
  }
  if (courses.length > 0) {
    await db.courses.bulkAdd(courses);
  }
  if (teeSets.length > 0) {
    await db.teeSets.bulkAdd(teeSets);
  }
  if (sessions.length > 0) {
    await db.sessions.bulkAdd(sessions);
  }
  if (matches.length > 0) {
    await db.matches.bulkAdd(matches);
  }

  queueSyncOperation('trip', trip.id, 'create', trip.id, trip);
  teams.forEach((team) => queueSyncOperation('team', team.id, 'create', trip.id, team));
  players.forEach((player) => queueSyncOperation('player', player.id, 'create', trip.id, player));
  teamMembers.forEach((member) =>
    queueSyncOperation('teamMember', member.id, 'create', trip.id, member)
  );
  courses.forEach((course) => queueSyncOperation('course', course.id, 'create', trip.id, course));
  teeSets.forEach((teeSet) => queueSyncOperation('teeSet', teeSet.id, 'create', trip.id, teeSet));
  sessions.forEach((session) =>
    queueSyncOperation('session', session.id, 'create', trip.id, session)
  );
  matches.forEach((match) => queueSyncOperation('match', match.id, 'create', trip.id, match));

  return {
    trip,
    teams,
    players,
    teamMembers,
    sessions,
    matches,
    courses,
    teeSets,
  };
}
