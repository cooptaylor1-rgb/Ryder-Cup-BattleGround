'use client';

import { db } from '@/lib/db';

export interface TripSummary {
    id: string;
    name: string;
    startDate: string;
    playerCount: number;
    sessionCount: number;
    matchCount: number;
}

export async function loadTripSummaries(currentTripId?: string | null): Promise<{
    trips: TripSummary[];
    selectedTripId: string | null;
}> {
    const allTrips = await db.trips.toArray();
    const summaries: TripSummary[] = [];

    for (const trip of allTrips) {
        const sessionsForTrip = await db.sessions.where('tripId').equals(trip.id).toArray();
        const sessionIds = sessionsForTrip.map((session) => session.id);
        const matches =
            sessionIds.length > 0
                ? await db.matches.where('sessionId').anyOf(sessionIds).count()
                : 0;
        const teams = await db.teams.where('tripId').equals(trip.id).toArray();
        const teamIds = teams.map((team) => team.id);
        const playerCount =
            teamIds.length > 0 ? await db.teamMembers.where('teamId').anyOf(teamIds).count() : 0;

        summaries.push({
            id: trip.id,
            name: trip.name,
            startDate: trip.startDate,
            playerCount,
            sessionCount: sessionsForTrip.length,
            matchCount: matches,
        });
    }

    summaries.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    if (currentTripId && summaries.some((trip) => trip.id === currentTripId)) {
        return {
            trips: summaries,
            selectedTripId: currentTripId,
        };
    }

    return {
        trips: summaries,
        selectedTripId: summaries[0]?.id ?? null,
    };
}
