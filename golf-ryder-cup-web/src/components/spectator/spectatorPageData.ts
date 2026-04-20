import { db } from '@/lib/db';
import { buildSpectatorView } from '@/lib/services/spectatorService';
import type { SpectatorView } from '@/lib/types/captain';

export const SPECTATOR_POLL_INTERVAL_MS = 15000;

/**
 * Thrown when a spectator URL is accessed for a trip whose captain has
 * not opted into public spectating. Previously any URL with a valid
 * tripId rendered the live scoreboard, which leaked real-time scores
 * to anyone the link reached. The captain can still enable public
 * spectating via trip settings (`allowSpectators`).
 */
export class SpectatorAccessDeniedError extends Error {
    constructor() {
        super(
            'This trip is not open to public spectating. Ask the captain ' +
                'to enable the public scoreboard in trip settings.',
        );
        this.name = 'SpectatorAccessDeniedError';
    }
}

export async function loadSpectatorViewData(tripId: string): Promise<SpectatorView | null> {
    const trip = await db.trips.get(tripId);
    if (!trip) {
        return null;
    }

    // Gate behind the captain's explicit opt-in. Default (undefined settings
    // or false) = no public access. The SpectatorPageClient maps this error
    // to the unavailable state so a stray URL doesn't leak live scores.
    if (!trip.settings?.allowSpectators) {
        throw new SpectatorAccessDeniedError();
    }

    const teams = await db.teams.where('tripId').equals(tripId).toArray();
    const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
    const sessionIds = sessions.map((session) => session.id);
    const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
    const matchIds = matches.map((match) => match.id);
    const holeResults = await db.holeResults.where('matchId').anyOf(matchIds).toArray();
    const teamIds = teams.map((team) => team.id);
    const teamMembers = await db.teamMembers.where('teamId').anyOf(teamIds).toArray();
    const playerIds = [...new Set(teamMembers.map((teamMember) => teamMember.playerId))];
    const playersData = await db.players.bulkGet(playerIds);
    const players = playersData.filter((player): player is NonNullable<typeof player> => player !== undefined);

    return buildSpectatorView(
        trip,
        teams,
        sessions,
        matches,
        holeResults,
        players,
        trip.settings?.pointsToWin ?? 14.5
    );
}
