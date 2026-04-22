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
  syncTripToCloudFull,
  getTripSyncStatus,
  removeTripShareCode,
  type SyncStatus,
} from '../services/tripSyncService';
import { deleteTripCascade } from '../services/cascadeDelete';
import { buildMatchHandicapContext } from '../services/matchHandicapService';
import { createLogger } from '../utils/logger';
import { handleError } from '../utils/errorHandling';
import { mergeTripPlayers } from '../utils/tripPlayers';
import { useAccessStore } from './accessStore';

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

  // Tracks whether the user explicitly exited the trip (prevents auto-reload)
  userExitedTrip: boolean;

  // Actions
  loadTrip: (tripId: string) => Promise<void>;
  refreshRoster: (tripId: string) => Promise<void>;
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
      userExitedTrip: false,

      // Load a trip with all related data
      loadTrip: async (tripId: string) => {
        set({ isLoading: true, error: null, userExitedTrip: false });

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
          const teamMembers =
            teamIds.length === 0
              ? []
              : await db.teamMembers.where('teamId').anyOf(teamIds).toArray();

          const playerIds = [...new Set(teamMembers.map((tm) => tm.playerId))];
          const [tripPlayers, linkedPlayers] = await Promise.all([
            db.players.where('tripId').equals(tripId).toArray(),
            playerIds.length === 0 ? [] : db.players.where('id').anyOf(playerIds).toArray(),
          ]);
          const { players, backfilledPlayers } = mergeTripPlayers(
            tripId,
            tripPlayers,
            linkedPlayers
          );
          if (backfilledPlayers.length > 0) {
            await db.players.bulkPut(backfilledPlayers);
          }

          // Load tee sets for courses
          const courseIds = courses.map((c) => c.id);
          const teeSets =
            courseIds.length === 0
              ? []
              : await db.teeSets.where('courseId').anyOf(courseIds).toArray();

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
          const appError = handleError(error, { action: 'loadTrip', tripId }, { severity: 'high', reportToSentry: false });
          set({
            error: appError.userMessage,
            isLoading: false,
          });
        }
      },

      // Re-read roster tables from Dexie without touching isLoading.
      // Used by realtime handlers (e.g. another device's joiner insert
      // arriving on the trip channel) to pull the fresh row into the
      // active view without flashing the full-trip loading state.
      refreshRoster: async (tripId: string) => {
        try {
          const teams = await db.teams.where('tripId').equals(tripId).toArray();
          const teamIds = teams.map((t) => t.id);
          const teamMembers =
            teamIds.length === 0
              ? []
              : await db.teamMembers.where('teamId').anyOf(teamIds).toArray();

          const playerIds = [...new Set(teamMembers.map((tm) => tm.playerId))];
          const [tripPlayers, linkedPlayers] = await Promise.all([
            db.players.where('tripId').equals(tripId).toArray(),
            playerIds.length === 0 ? [] : db.players.where('id').anyOf(playerIds).toArray(),
          ]);
          const { players, backfilledPlayers } = mergeTripPlayers(
            tripId,
            tripPlayers,
            linkedPlayers
          );
          if (backfilledPlayers.length > 0) {
            await db.players.bulkPut(backfilledPlayers);
          }
          set({ teams, teamMembers, players });
        } catch (error) {
          logger.warn('refreshRoster failed:', error);
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
          userExitedTrip: true,
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
        const accessStore = useAccessStore.getState();
        if (!accessStore.isCaptainMode) {
          // Set captain mode without requiring PIN for trip creator
          accessStore.enableCaptainModeForCreator();
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
        // Use the centralized cascade delete which covers all 30 tables
        // atomically, including finances, sync queue, and schedule items
        // that the previous inline logic missed.
        await deleteTripCascade(tripId, { sync: true });
        removeTripShareCode(tripId);

        const { currentTrip } = get();
        if (currentTrip?.id === tripId) {
          get().clearTrip();
        }
      },

      // Player management
      addPlayer: async (playerData) => {
        const { currentTrip } = get();
        if (!currentTrip) {
          throw new Error('No active trip');
        }

        const player: Player = {
          ...playerData,
          id: crypto.randomUUID(),
          tripId: currentTrip.id,
        };

        await db.players.add(player);

        // Queue sync
        queueSyncOperation('player', player.id, 'create', currentTrip.id, player);

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

        // Mid-round handicap recalc. When a player's handicap index changes
        // (captain correction, GHIN refresh), every non-completed match the
        // player is in has a stale teamAHandicapAllowance / teamBHandicapAllowance
        // because those were frozen at match creation. Rebuild the match-level
        // allowance from current player data for any in-progress or scheduled
        // match containing the player. Already-scored holes keep their computed
        // winners; only future scoring uses the fresh allowance.
        if ('handicapIndex' in updates && currentTrip) {
          try {
            const affectedMatches = (await db.matches.toArray()).filter(
              (match) =>
                match.status !== 'completed' &&
                (match.teamAPlayerIds.includes(playerId) ||
                  match.teamBPlayerIds.includes(playerId)),
            );
            if (affectedMatches.length > 0) {
              const sessionIds = Array.from(
                new Set(affectedMatches.map((m) => m.sessionId)),
              );
              const sessionsById = new Map<string, RyderCupSession>(
                (await db.sessions.bulkGet(sessionIds))
                  .filter((s): s is RyderCupSession => Boolean(s))
                  .map((session) => [session.id, session]),
              );
              for (const match of affectedMatches) {
                const session = sessionsById.get(match.sessionId);
                if (!session) continue;
                // Resolve the effective tee set for this match: match
                // override first, session default as fallback. Without
                // this the allowances persist as raw rounded indexes
                // (no slope/rating) and overwrite previously-correct
                // values the next time scoring recomputes.
                const effectiveTeeSetId = match.teeSetId ?? session.defaultTeeSetId;
                const teeSet = effectiveTeeSetId
                  ? (await db.teeSets.get(effectiveTeeSetId)) ?? undefined
                  : undefined;
                const [teamAPlayers, teamBPlayers] = await Promise.all([
                  Promise.all(match.teamAPlayerIds.map((id) => db.players.get(id))),
                  Promise.all(match.teamBPlayerIds.map((id) => db.players.get(id))),
                ]);
                const ctx = buildMatchHandicapContext({
                  sessionType: session.sessionType,
                  teamAPlayers: teamAPlayers.filter((p): p is Player => Boolean(p)),
                  teamBPlayers: teamBPlayers.filter((p): p is Player => Boolean(p)),
                  teeSet,
                });
                // Don't persist fallback (no-teeSet) allowances. A match
                // that's between roster edit and course assignment
                // would otherwise clobber a future correct value.
                if (!ctx.hasCourseHandicapInfo) {
                  continue;
                }
                if (
                  ctx.teamAHandicapAllowance === match.teamAHandicapAllowance &&
                  ctx.teamBHandicapAllowance === match.teamBHandicapAllowance
                ) {
                  continue;
                }
                const nextVersion = (match.version ?? 0) + 1;
                const now = new Date().toISOString();
                await db.matches.update(match.id, {
                  teamAHandicapAllowance: ctx.teamAHandicapAllowance,
                  teamBHandicapAllowance: ctx.teamBHandicapAllowance,
                  version: nextVersion,
                  updatedAt: now,
                });
                queueSyncOperation('match', match.id, 'update', currentTrip.id, {
                  ...match,
                  teamAHandicapAllowance: ctx.teamAHandicapAllowance,
                  teamBHandicapAllowance: ctx.teamBHandicapAllowance,
                  version: nextVersion,
                  updatedAt: now,
                });
              }
              logger.log('Recalculated match handicap allowances after player edit', {
                playerId,
                matchCount: affectedMatches.length,
              });
            }
          } catch (error) {
            logger.error('Failed to recalc match allowances after player edit', {
              playerId,
              error,
            });
          }
        }
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

        // Wrap the read+write in a Dexie transaction so two captains
        // on two devices can't both compute sessionNumber=N in memory
        // and both commit it — when we detect a conflict we bump to
        // the next free number before writing. The caller's stale
        // cache loses, which is what we want.
        await db.transaction('rw', db.sessions, async () => {
          const existing = await db.sessions
            .where('tripId')
            .equals(session.tripId)
            .toArray();
          const taken = new Set(existing.map((s) => s.sessionNumber));
          if (taken.has(session.sessionNumber)) {
            let candidate = session.sessionNumber + 1;
            while (taken.has(candidate)) candidate += 1;
            session.sessionNumber = candidate;
          }
          await db.sessions.add(session);
        });

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
