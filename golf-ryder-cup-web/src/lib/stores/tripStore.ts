/**
 * Trip Store
 *
 * Global state for the current trip context.
 * Manages active trip, teams, players, and sessions.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
    Trip,
    Team,
    TeamMember,
    Player,
    RyderCupSession,
    Match,
    Course,
    TeeSet,
} from '../types/models';
import { db } from '../db';

// ============================================
// TYPES
// ============================================

interface TripState {
    // Core data
    currentTrip: Trip | null;
    teams: Team[];
    teamMembers: TeamMember[];
    players: Player[];
    sessions: RyderCupSession[];
    courses: Course[];
    teeSets: TeeSet[];

    // Loading states
    isLoading: boolean;
    error: string | null;

    // Actions
    loadTrip: (tripId: string) => Promise<void>;
    clearTrip: () => void;

    // Trip CRUD
    createTrip: (trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Trip>;
    updateTrip: (tripId: string, updates: Partial<Trip>) => Promise<void>;
    deleteTrip: (tripId: string) => Promise<void>;

    // Player management
    addPlayer: (player: Omit<Player, 'id'>) => Promise<Player>;
    updatePlayer: (playerId: string, updates: Partial<Player>) => Promise<void>;
    removePlayer: (playerId: string) => Promise<void>;

    // Team management
    assignPlayerToTeam: (playerId: string, teamId: string) => Promise<void>;
    removePlayerFromTeam: (playerId: string, teamId: string) => Promise<void>;

    // Session management
    addSession: (session: Omit<RyderCupSession, 'id' | 'createdAt' | 'updatedAt'>) => Promise<RyderCupSession>;
    updateSession: (sessionId: string, updates: Partial<RyderCupSession>) => Promise<void>;

    // Selectors (computed)
    getTeamPlayers: (teamId: string) => Player[];
    getTeamByColor: (color: 'usa' | 'europe') => Team | null;
    getActiveSession: () => RyderCupSession | null;
    getSessionMatches: (sessionId: string) => Promise<Match[]>;
}

// ============================================
// STORE
// ============================================

export const useTripStore = create<TripState>()(
    persist(
        (set, get) => ({
            // Initial state
            currentTrip: null,
            teams: [],
            teamMembers: [],
            players: [],
            sessions: [],
            courses: [],
            teeSets: [],
            isLoading: false,
            error: null,

            // Load a trip with all related data
            loadTrip: async (tripId: string) => {
                set({ isLoading: true, error: null });

                try {
                    const trip = await db.trips.get(tripId);
                    if (!trip) {
                        throw new Error('Trip not found');
                    }

                    // Load related data in parallel
                    const [teams, sessions, courses] = await Promise.all([
                        db.teams.where('tripId').equals(tripId).toArray(),
                        db.sessions.where('tripId').equals(tripId).toArray(),
                        db.courses.toArray(), // All courses for now
                    ]);

                    // Load team members and players
                    const teamIds = teams.map(t => t.id);
                    const teamMembers = await db.teamMembers
                        .where('teamId')
                        .anyOf(teamIds)
                        .toArray();

                    const playerIds = teamMembers.map(tm => tm.playerId);
                    const players = await db.players
                        .where('id')
                        .anyOf(playerIds)
                        .toArray();

                    // Load tee sets for courses
                    const courseIds = courses.map(c => c.id);
                    const teeSets = await db.teeSets
                        .where('courseId')
                        .anyOf(courseIds)
                        .toArray();

                    set({
                        currentTrip: trip,
                        teams,
                        teamMembers,
                        players,
                        sessions: sessions.sort((a, b) => a.sessionNumber - b.sessionNumber),
                        courses,
                        teeSets,
                        isLoading: false,
                    });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load trip',
                        isLoading: false,
                    });
                }
            },

            clearTrip: () => {
                set({
                    currentTrip: null,
                    teams: [],
                    teamMembers: [],
                    players: [],
                    sessions: [],
                    error: null,
                });
            },

            // Trip CRUD
            createTrip: async (tripData) => {
                const trip: Trip = {
                    ...tripData,
                    id: crypto.randomUUID(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                await db.trips.add(trip);

                // Create default teams
                const teamA: Team = {
                    id: crypto.randomUUID(),
                    tripId: trip.id,
                    name: 'Team USA',
                    color: 'usa',
                    createdAt: new Date(),
                };

                const teamB: Team = {
                    id: crypto.randomUUID(),
                    tripId: trip.id,
                    name: 'Team Europe',
                    color: 'europe',
                    createdAt: new Date(),
                };

                await db.teams.bulkAdd([teamA, teamB]);

                set({
                    currentTrip: trip,
                    teams: [teamA, teamB],
                    teamMembers: [],
                    players: [],
                    sessions: [],
                });

                return trip;
            },

            updateTrip: async (tripId, updates) => {
                await db.trips.update(tripId, {
                    ...updates,
                    updatedAt: new Date(),
                });

                const { currentTrip } = get();
                if (currentTrip?.id === tripId) {
                    set({
                        currentTrip: { ...currentTrip, ...updates, updatedAt: new Date() },
                    });
                }
            },

            deleteTrip: async (tripId) => {
                // Delete all related data
                const teams = await db.teams.where('tripId').equals(tripId).toArray();
                const teamIds = teams.map(t => t.id);

                const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
                const sessionIds = sessions.map(s => s.id);

                // Delete in order
                await db.teamMembers.where('teamId').anyOf(teamIds).delete();
                await db.matches.where('sessionId').anyOf(sessionIds).delete();
                await db.sessions.where('tripId').equals(tripId).delete();
                await db.teams.where('tripId').equals(tripId).delete();
                await db.trips.delete(tripId);

                const { currentTrip } = get();
                if (currentTrip?.id === tripId) {
                    get().clearTrip();
                }
            },

            // Player management
            addPlayer: async (playerData) => {
                const player: Player = {
                    ...playerData,
                    id: crypto.randomUUID(),
                };

                await db.players.add(player);

                set(state => ({
                    players: [...state.players, player],
                }));

                return player;
            },

            updatePlayer: async (playerId, updates) => {
                await db.players.update(playerId, updates);

                set(state => ({
                    players: state.players.map(p =>
                        p.id === playerId ? { ...p, ...updates } : p
                    ),
                }));
            },

            removePlayer: async (playerId) => {
                // Remove from team first
                await db.teamMembers.where('playerId').equals(playerId).delete();
                await db.players.delete(playerId);

                set(state => ({
                    players: state.players.filter(p => p.id !== playerId),
                    teamMembers: state.teamMembers.filter(tm => tm.playerId !== playerId),
                }));
            },

            // Team management
            assignPlayerToTeam: async (playerId, teamId) => {
                // Remove from any existing team first
                await db.teamMembers.where('playerId').equals(playerId).delete();

                const teamMember: TeamMember = {
                    id: crypto.randomUUID(),
                    teamId,
                    playerId,
                    role: 'player',
                    joinedAt: new Date(),
                };

                await db.teamMembers.add(teamMember);

                set(state => ({
                    teamMembers: [
                        ...state.teamMembers.filter(tm => tm.playerId !== playerId),
                        teamMember,
                    ],
                }));
            },

            removePlayerFromTeam: async (playerId, teamId) => {
                await db.teamMembers
                    .where({ playerId, teamId })
                    .delete();

                set(state => ({
                    teamMembers: state.teamMembers.filter(
                        tm => !(tm.playerId === playerId && tm.teamId === teamId)
                    ),
                }));
            },

            // Session management
            addSession: async (sessionData) => {
                const session: RyderCupSession = {
                    ...sessionData,
                    id: crypto.randomUUID(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                await db.sessions.add(session);

                set(state => ({
                    sessions: [...state.sessions, session].sort(
                        (a, b) => a.sessionNumber - b.sessionNumber
                    ),
                }));

                return session;
            },

            updateSession: async (sessionId, updates) => {
                await db.sessions.update(sessionId, {
                    ...updates,
                    updatedAt: new Date(),
                });

                set(state => ({
                    sessions: state.sessions.map(s =>
                        s.id === sessionId ? { ...s, ...updates, updatedAt: new Date() } : s
                    ),
                }));
            },

            // Selectors
            getTeamPlayers: (teamId) => {
                const { teamMembers, players } = get();
                const memberPlayerIds = teamMembers
                    .filter(tm => tm.teamId === teamId)
                    .map(tm => tm.playerId);
                return players.filter(p => memberPlayerIds.includes(p.id));
            },

            getTeamByColor: (color) => {
                const { teams } = get();
                return teams.find(t => t.color === color) || null;
            },

            getActiveSession: () => {
                const { sessions } = get();
                // Return first in-progress or next scheduled session
                const inProgress = sessions.find(s => s.status === 'inProgress');
                if (inProgress) return inProgress;

                return sessions.find(s => s.status === 'scheduled') || null;
            },

            getSessionMatches: async (sessionId) => {
                return db.matches
                    .where('sessionId')
                    .equals(sessionId)
                    .toArray();
            },
        }),
        {
            name: 'golf-trip-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Only persist the current trip ID, reload data on mount
                currentTripId: state.currentTrip?.id,
            }),
        }
    )
);

export default useTripStore;
