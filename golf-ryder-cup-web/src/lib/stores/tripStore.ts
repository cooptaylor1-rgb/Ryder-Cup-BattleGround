/**
 * Trip Store
 *
 * Global state for the current trip context.
 * Manages active trip, teams, players, and sessions.
 *
 * Integrates with cloud sync for offline-first persistence.
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
import {
  queueSyncOperation,
  purgeQueueForTrip,
  syncTripToCloudFull,
  getTripSyncStatus,
  type SyncStatus,
} from '../services/tripSyncService';
import { createLogger } from '../utils/logger';
import { useUIStore } from './uiStore';

const logger = createLogger('TripStore');

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
  syncStatus: SyncStatus;

  // Actions
  loadTrip: (tripId: string) => Promise<void>;
  clearTrip: () => void;
  syncToCloud: () => Promise<void>;
  getSyncStatus: () => SyncStatus;

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
  addSession: (
    session: Omit<RyderCupSession, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<RyderCupSession>;
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
      syncStatus: 'unknown' as SyncStatus,

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
          const teamIds = teams.map((t) => t.id);
          const teamMembers = await db.teamMembers.where('teamId').anyOf(teamIds).toArray();

          const playerIds = teamMembers.map((tm) => tm.playerId);
          const players = await db.players.where('id').anyOf(playerIds).toArray();

          // Load tee sets for courses
          const courseIds = courses.map((c) => c.id);
          const teeSets = await db.teeSets.where('courseId').anyOf(courseIds).toArray();

          set({
            currentTrip: trip,
            teams,
            teamMembers,
            players,
            sessions: sessions.sort((a, b) => a.sessionNumber - b.sessionNumber),
            courses,
            teeSets,
            isLoading: false,
            syncStatus: getTripSyncStatus(tripId),
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
          syncStatus: 'unknown',
        });
      },

      // Sync current trip to cloud
      syncToCloud: async () => {
        const { currentTrip } = get();
        if (!currentTrip) return;

        set({ syncStatus: 'syncing' });

        try {
          const result = await syncTripToCloudFull(currentTrip.id);
          set({ syncStatus: result.success ? 'synced' : 'failed' });
        } catch (error) {
          logger.error('Sync failed:', error);
          set({ syncStatus: 'failed' });
        }
      },

      getSyncStatus: () => {
        const { currentTrip } = get();
        if (!currentTrip) return 'unknown';
        return getTripSyncStatus(currentTrip.id);
      },

      // Trip CRUD
      createTrip: async (tripData) => {
        const now = new Date().toISOString();
        const trip: Trip = {
          ...tripData,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };

        await db.trips.add(trip);

        // Create default teams
        const teamA: Team = {
          id: crypto.randomUUID(),
          tripId: trip.id,
          name: 'Team USA',
          color: 'usa',
          mode: 'ryderCup',
          createdAt: now,
        };

        const teamB: Team = {
          id: crypto.randomUUID(),
          tripId: trip.id,
          name: 'Team Europe',
          color: 'europe',
          mode: 'ryderCup',
          createdAt: now,
        };

        await db.teams.bulkAdd([teamA, teamB]);

        // Queue sync operations
        queueSyncOperation('trip', trip.id, 'create', trip.id, trip);
        queueSyncOperation('team', teamA.id, 'create', trip.id, teamA);
        queueSyncOperation('team', teamB.id, 'create', trip.id, teamB);

        set({
          currentTrip: trip,
          teams: [teamA, teamB],
          teamMembers: [],
          players: [],
          sessions: [],
          syncStatus: 'pending',
        });

        // After creating the trip, auto-enable captain mode for the creator
        const uiStore = useUIStore.getState();
        if (!uiStore.isCaptainMode) {
          // Set captain mode without requiring PIN for trip creator
          uiStore.enableCaptainModeForCreator();
        }

        return trip;
      },

      updateTrip: async (tripId, updates) => {
        const now = new Date().toISOString();
        await db.trips.update(tripId, {
          ...updates,
          updatedAt: now,
        });

        const { currentTrip } = get();
        if (currentTrip?.id === tripId) {
          const updatedTrip = { ...currentTrip, ...updates, updatedAt: now };
          queueSyncOperation('trip', tripId, 'update', tripId, updatedTrip);
          set({
            currentTrip: updatedTrip,
            syncStatus: 'pending',
          });
        }
      },

      deleteTrip: async (tripId) => {
        // Delete all related data with proper cascade
        const teams = await db.teams.where('tripId').equals(tripId).toArray();
        const teamIds = teams.map((t) => t.id);

        const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
        const sessionIds = sessions.map((s) => s.id);

        const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
        const matchIds = matches.map((m) => m.id);

        // Get photo albums for cascade
        const photoAlbums = await db.photoAlbums.where('tripId').equals(tripId).toArray();
        const albumIds = photoAlbums.map((a) => a.id);

        // Get chat threads for cascade
        const chatThreads = await db.chatThreads.where('tripId').equals(tripId).toArray();
        const threadIds = chatThreads.map((t) => t.id);

        // Delete in dependency order (leaves → roots)
        // Scoring data
        await db.holeResults.where('matchId').anyOf(matchIds).delete();
        await db.scoringEvents.where('matchId').anyOf(matchIds).delete();

        // Side games (extended)
        await db.wolfGames.where('tripId').equals(tripId).delete();
        await db.vegasGames.where('tripId').equals(tripId).delete();
        await db.hammerGames.where('tripId').equals(tripId).delete();
        await db.nassauGames.where('tripId').equals(tripId).delete();
        await db.settlements.where('tripId').equals(tripId).delete();

        // Social features
        await db.photos.where('albumId').anyOf(albumIds).delete();
        await db.photoAlbums.where('tripId').equals(tripId).delete();
        await db.chatMessages.where('threadId').anyOf(threadIds).delete();
        await db.chatThreads.where('tripId').equals(tripId).delete();
        await db.trashTalks.where('tripId').equals(tripId).delete();
        await db.polls.where('tripId').equals(tripId).delete();
        await db.headToHeadRecords.where('tripId').equals(tripId).delete();

        // Social & bets (legacy)
        await db.sideBets.where('tripId').equals(tripId).delete();
        await db.banterPosts.where('tripId').equals(tripId).delete();

        // Audit & stats
        await db.auditLog.where('tripId').equals(tripId).delete();
        await db.tripStats.where('tripId').equals(tripId).delete();
        await db.tripAwards.where('tripId').equals(tripId).delete();

        // Archive
        await db.tripArchives.where('tripId').equals(tripId).delete();

        // Schedule
        await db.scheduleDays.where('tripId').equals(tripId).delete();
        await db.scheduleItems.where('tripId').equals(tripId).delete();

        // Core entities (original order)
        await db.teamMembers.where('teamId').anyOf(teamIds).delete();
        await db.matches.where('sessionId').anyOf(sessionIds).delete();
        await db.sessions.where('tripId').equals(tripId).delete();
        await db.teams.where('tripId').equals(tripId).delete();
        await db.trips.delete(tripId);

        // Purge stale pending operations for this trip; we only want to sync the trip delete.
        await purgeQueueForTrip(tripId);

        // Queue cloud delete
        queueSyncOperation('trip', tripId, 'delete', tripId);

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

        // Queue sync
        const { currentTrip } = get();
        if (currentTrip) {
          queueSyncOperation('player', player.id, 'create', currentTrip.id, player);
        }

        set((state) => ({
          players: [...state.players, player],
          syncStatus: 'pending',
        }));

        return player;
      },

      updatePlayer: async (playerId, updates) => {
        await db.players.update(playerId, updates);

        const { currentTrip, players } = get();
        const updatedPlayer = players.find((p) => p.id === playerId);
        if (updatedPlayer && currentTrip) {
          queueSyncOperation('player', playerId, 'update', currentTrip.id, {
            ...updatedPlayer,
            ...updates,
          });
        }

        set((state) => ({
          players: state.players.map((p) => (p.id === playerId ? { ...p, ...updates } : p)),
          syncStatus: 'pending',
        }));
      },

      removePlayer: async (playerId) => {
        // Remove from team first
        await db.teamMembers.where('playerId').equals(playerId).delete();
        await db.players.delete(playerId);

        const { currentTrip } = get();
        if (currentTrip) {
          queueSyncOperation('player', playerId, 'delete', currentTrip.id);
        }

        set((state) => ({
          players: state.players.filter((p) => p.id !== playerId),
          teamMembers: state.teamMembers.filter((tm) => tm.playerId !== playerId),
          syncStatus: 'pending',
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
          sortOrder: 0,
          isCaptain: false,
          createdAt: new Date().toISOString(),
        };

        await db.teamMembers.add(teamMember);

        // Queue sync
        const { currentTrip } = get();
        if (currentTrip) {
          queueSyncOperation('teamMember', teamMember.id, 'create', currentTrip.id, teamMember);
        }

        set((state) => ({
          teamMembers: [...state.teamMembers.filter((tm) => tm.playerId !== playerId), teamMember],
          syncStatus: 'pending',
        }));
      },

      removePlayerFromTeam: async (playerId, teamId) => {
        const { currentTrip, teamMembers } = get();
        const teamMember = teamMembers.find(
          (tm) => tm.playerId === playerId && tm.teamId === teamId
        );

        await db.teamMembers.where({ playerId, teamId }).delete();

        if (currentTrip && teamMember) {
          queueSyncOperation('teamMember', teamMember.id, 'delete', currentTrip.id);
        }

        set((state) => ({
          teamMembers: state.teamMembers.filter(
            (tm) => !(tm.playerId === playerId && tm.teamId === teamId)
          ),
          syncStatus: 'pending',
        }));
      },

      // Session management
      addSession: async (sessionData) => {
        const now = new Date().toISOString();
        const session: RyderCupSession = {
          ...sessionData,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };

        await db.sessions.add(session);

        // Queue sync
        const { currentTrip } = get();
        if (currentTrip) {
          queueSyncOperation('session', session.id, 'create', currentTrip.id, session);
        }

        set((state) => ({
          sessions: [...state.sessions, session].sort((a, b) => a.sessionNumber - b.sessionNumber),
          syncStatus: 'pending',
        }));

        return session;
      },

      updateSession: async (sessionId, updates) => {
        const now = new Date().toISOString();
        await db.sessions.update(sessionId, {
          ...updates,
          updatedAt: now,
        });

        const { currentTrip, sessions } = get();
        const updatedSession = sessions.find((s) => s.id === sessionId);
        if (currentTrip && updatedSession) {
          queueSyncOperation('session', sessionId, 'update', currentTrip.id, {
            ...updatedSession,
            ...updates,
            updatedAt: now,
          });
        }

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, ...updates, updatedAt: now } : s
          ),
          syncStatus: 'pending',
        }));
      },

      // Selectors
      getTeamPlayers: (teamId) => {
        const { teamMembers, players } = get();
        const memberPlayerIds = teamMembers
          .filter((tm) => tm.teamId === teamId)
          .map((tm) => tm.playerId);
        return players.filter((p) => memberPlayerIds.includes(p.id));
      },

      getTeamByColor: (color) => {
        const { teams } = get();
        return teams.find((t) => t.color === color) || null;
      },

      getActiveSession: () => {
        const { sessions } = get();
        // Return first in-progress or next scheduled session
        const inProgress = sessions.find((s) => s.status === 'inProgress');
        if (inProgress) return inProgress;

        return sessions.find((s) => s.status === 'scheduled') || null;
      },

      getSessionMatches: async (sessionId) => {
        return db.matches.where('sessionId').equals(sessionId).toArray();
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
