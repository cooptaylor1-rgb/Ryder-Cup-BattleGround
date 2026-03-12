import { db } from '@/lib/db';

import { fetchCollectionByIds } from './exportImportShared';

export async function generateTripSummary(tripId: string): Promise<string> {
  const trip = await db.trips.get(tripId);
  if (!trip) {
    throw new Error('Trip not found');
  }

  const teams = await db.teams.where('tripId').equals(tripId).toArray();
  const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
  const sessionIds = sessions.map((session) => session.id);
  const matches = await fetchCollectionByIds(sessionIds, (ids) =>
    db.matches.where('sessionId').anyOf(ids).toArray()
  );
  const matchIds = matches.map((match) => match.id);
  const holeResults = await fetchCollectionByIds(matchIds, (ids) =>
    db.holeResults.where('matchId').anyOf(ids).toArray()
  );

  let teamAPoints = 0;
  let teamBPoints = 0;
  let completedMatches = 0;

  for (const match of matches) {
    if (match.status !== 'completed') {
      continue;
    }

    completedMatches++;

    const matchResults = holeResults.filter((holeResult) => holeResult.matchId === match.id);
    let teamAWins = 0;
    let teamBWins = 0;

    matchResults.forEach((holeResult) => {
      if (holeResult.winner === 'teamA') teamAWins++;
      else if (holeResult.winner === 'teamB') teamBWins++;
    });

    if (teamAWins > teamBWins) teamAPoints += 1;
    else if (teamBWins > teamAWins) teamBPoints += 1;
    else {
      teamAPoints += 0.5;
      teamBPoints += 0.5;
    }
  }

  const teamA = teams.find((team) => team.color === 'usa');
  const teamB = teams.find((team) => team.color === 'europe');

  return [
    `🏆 ${trip.name}`,
    `📅 ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`,
    trip.location ? `📍 ${trip.location}` : '',
    '',
    '📊 STANDINGS',
    `${teamA?.name || 'Team USA'}: ${teamAPoints}`,
    `${teamB?.name || 'Team Europe'}: ${teamBPoints}`,
    '',
    `✅ ${completedMatches} of ${matches.length} matches complete`,
    '',
    '#RyderCup #GolfTrip',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function shareTripSummary(tripId: string): Promise<void> {
  const summary = await generateTripSummary(tripId);
  await navigator.clipboard.writeText(summary);
}
