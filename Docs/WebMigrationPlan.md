# Golf Ryder Cup App — Web Migration Plan

**Version:** 1.0
**Date:** January 12, 2026
**Author:** Engineering Team
**Status:** Draft

---

## Executive Summary

This document outlines the strategy for migrating the Golf Ryder Cup iOS app to a **Progressive Web App (PWA)** that works across iOS Safari, Android Chrome, and desktop browsers. The migration prioritizes **offline-first scoring**, **captain controls**, and **data integrity** while preserving the battle-tested domain logic from the Swift codebase.

### Key Principles

1. **Offline-first always works; network enhances but never blocks**
2. **Bulletproof > fancy**: Scoring actions must be reversible and hard to fat-finger
3. **1–2 taps to the next critical action**
4. **Data integrity**: No silent mutations, deterministic behavior
5. **Ship in thin slices**: MVP → v1.0 → v1.1 with clear milestones

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Feature Mapping](#2-feature-mapping)
3. [TypeScript Domain Models](#3-typescript-domain-models)
4. [IndexedDB Storage Schema](#4-indexeddb-storage-schema)
5. [Scoring Event Log (Undo/Sync)](#5-scoring-event-log-undosync)
6. [Offline Strategy & PWA](#6-offline-strategy--pwa)
7. [UI/UX Migration](#7-uiux-migration)
8. [Project Structure](#8-project-structure)
9. [Phased Rollout](#9-phased-rollout)
10. [Risk Assessment](#10-risk-assessment)
11. [Appendix](#appendix)

---

## 1. Architecture Overview

### 1.1 Tech Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14+ (App Router) + TypeScript                         │
│  Tailwind CSS (mobile-first, dark mode default)                │
│  Zustand (state management - simpler than Redux for our needs) │
│  react-hook-form + zod (form validation)                       │
│  @dnd-kit (drag-and-drop for lineup builder)                   │
│  date-fns (date utilities)                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OFFLINE PERSISTENCE                          │
├─────────────────────────────────────────────────────────────────┤
│  Dexie.js (IndexedDB wrapper)                                  │
│  - Typed tables matching domain models                          │
│  - Event log for scoring actions (append-only)                  │
│  - Undo stack persistence                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PWA LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  Workbox (service worker generation)                           │
│  - Cache-first for static assets                               │
│  - Network-first for optional sync endpoints                    │
│  Web App Manifest (installable)                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Phase 2)
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (OPTIONAL)                          │
├─────────────────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL + Auth + Realtime)                       │
│  - Captain owns structure (schedule/pairings)                   │
│  - Scorers own match events                                     │
│  - Merge by event timestamps + audit trail                      │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Why These Choices?

| Choice | Rationale |
|--------|-----------|
| **Next.js App Router** | Server components for initial load, client components for interactivity; excellent PWA support |
| **Zustand over Redux** | Simpler API, less boilerplate, built-in persistence middleware, sufficient for our state complexity |
| **Dexie over raw IndexedDB** | Type-safe queries, reactive hooks (`useLiveQuery`), proven offline-first support |
| **Supabase over Firebase** | SQL flexibility for complex tournament queries, Postgres row-level security, predictable pricing |
| **Tailwind** | Utility-first matches our mobile-first approach, excellent dark mode support, matches existing design tokens |

---

## 2. Feature Mapping

### 2.1 iOS → Web Route Mapping

| iOS Screen | Web Route | Priority | Notes |
|------------|-----------|----------|-------|
| **HomeTabView** | `/` (root) | P0 | Command center, standings hero, next match |
| **MatchupsTabView** | `/matchups` | P0 | Session list, pairing view |
| **ScoreTabView** | `/score` | P0 | Active match scoring |
| **StandingsTabView** | `/standings` | P0 | Full standings, leaderboard |
| **TeamsTabView** | `/teams` | P0 | Team rosters, player management |
| **MoreTabView** | `/more` | P1 | Settings, courses, export |
| **LineupBuilderView** | `/matchups/[sessionId]/lineup` | P0 | Drag-drop lineup builder |
| **ScorecardSetupView** | `/score/[matchId]` | P0 | Match scoring interface |
| **CourseSetupWizardView** | `/courses/wizard` | P1 | 5-step course wizard |
| **PlayerFormView** | `/players/[playerId]` | P0 | Player add/edit |
| **AuditLogView** | `/audit` | P1 | Captain audit trail |
| **TripFormView** | `/trip/edit` | P0 | Trip settings |

### 2.2 Feature Parity Matrix

| Feature | iOS Status | Web MVP | Web v1.0 | Notes |
|---------|------------|---------|----------|-------|
| Trip CRUD | ✅ | ✅ | ✅ | Single trip mode initially |
| Team Management | ✅ | ✅ | ✅ | Two teams (Ryder Cup mode) |
| Player Management | ✅ | ✅ | ✅ | Add/edit/handicap |
| Session Management | ✅ | ✅ | ✅ | Foursomes/Fourball/Singles |
| Match Play Scoring | ✅ | ✅ | ✅ | Core feature |
| Dormie/Closeout Logic | ✅ | ✅ | ✅ | Port ScoringEngine |
| Undo Scoring | ✅ | ✅ | ✅ | Event log based |
| Handicap Calculator | ✅ | ✅ | ✅ | Port HandicapCalculator |
| Tournament Engine | ✅ | ✅ | ✅ | Points, records, strokes |
| Lineup Builder (DnD) | ✅ | ⏳ | ✅ | Use @dnd-kit |
| Auto-Fill Lineup | ✅ | ⏳ | ✅ | Port algorithm |
| Session Lock | ✅ | ✅ | ✅ | Captain safety |
| Audit Log | ✅ | ⏳ | ✅ | |
| Course Wizard | ✅ | ⏳ | ✅ | 5-step wizard |
| Standings Share | ✅ | ⏳ | ✅ | HTML canvas or html-to-image |
| Banter Feed | ✅ | ⏳ | ✅ | Local posts |
| Schedule Days | ✅ | ⏳ | ✅ | |
| Magic Number | ✅ | ⏳ | ✅ | Clinch scenarios |
| Offline Mode | ✅ | ✅ | ✅ | Core requirement |
| Multi-device Sync | ❌ | ❌ | ⏳ | Phase 2 |
| Push Notifications | ✅ | ❌ | ⏳ | Phase 2 |

---

## 3. TypeScript Domain Models

### 3.1 Core Entities

```typescript
// ============================================
// CORE TYPES & ENUMS
// ============================================

export type UUID = string;

export enum MatchStatus {
  Scheduled = 'scheduled',
  InProgress = 'in_progress',
  Final = 'final',
  Cancelled = 'cancelled',
}

export enum MatchResultType {
  TeamAWin = 'team_a_win',
  TeamBWin = 'team_b_win',
  Halved = 'halved',
  NotFinished = 'not_finished',
}

export enum HoleWinner {
  TeamA = 'team_a',
  TeamB = 'team_b',
  Halved = 'halved',
}

export enum SessionType {
  Foursomes = 'foursomes',   // Alternate shot
  Fourball = 'fourball',     // Best ball
  Singles = 'singles',       // 1v1
}

export enum TeamMode {
  Freeform = 'freeform',
  RyderCup = 'ryder_cup',
}

export enum FormatType {
  StrokePlayGross = 'stroke_play_gross',
  StrokePlayNet = 'stroke_play_net',
  Stableford = 'stableford',
  BestBall = 'best_ball',
  Scramble = 'scramble',
}

export enum AuditActionType {
  SessionCreated = 'session_created',
  SessionLocked = 'session_locked',
  SessionUnlocked = 'session_unlocked',
  PairingCreated = 'pairing_created',
  PairingEdited = 'pairing_edited',
  PairingDeleted = 'pairing_deleted',
  LineupPublished = 'lineup_published',
  MatchStarted = 'match_started',
  MatchFinalized = 'match_finalized',
  ScoreEntered = 'score_entered',
  ScoreEdited = 'score_edited',
  ScoreUndone = 'score_undone',
  CaptainModeEnabled = 'captain_mode_enabled',
  CaptainModeDisabled = 'captain_mode_disabled',
}

// ============================================
// TRIP
// ============================================

export interface Trip {
  id: UUID;
  name: string;
  startDate: string;  // ISO date string
  endDate: string;
  location?: string;
  notes?: string;
  isCaptainModeEnabled: boolean;
  captainName?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PLAYER
// ============================================

export interface Player {
  id: UUID;
  name: string;
  handicapIndex: number;
  ghin?: string;
  teePreference?: string;
  avatarUrl?: string;  // Blob URL or base64 for offline
  createdAt: string;
  updatedAt: string;
}

// ============================================
// TEAM
// ============================================

export interface Team {
  id: UUID;
  tripId: UUID;
  name: string;
  colorHex?: string;
  icon?: string;
  notes?: string;
  mode: TeamMode;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: UUID;
  teamId: UUID;
  playerId: UUID;
  sortOrder: number;
  isCaptain: boolean;
  createdAt: string;
}

// ============================================
// SESSION (RYDER CUP)
// ============================================

export interface RyderCupSession {
  id: UUID;
  tripId: UUID;
  name: string;
  sessionType: SessionType;
  scheduledDate: string;
  timeSlot: 'AM' | 'PM';
  pointsPerMatch: number;
  notes?: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// MATCH
// ============================================

export interface Match {
  id: UUID;
  sessionId: UUID;
  courseId?: UUID;
  teeSetId?: UUID;
  matchOrder: number;
  status: MatchStatus;
  startTime?: string;
  currentHole: number;

  // Player IDs (comma-separated in Swift, array here)
  teamAPlayerIds: UUID[];
  teamBPlayerIds: UUID[];

  // Handicap allowances
  teamAHandicapAllowance: number;
  teamBHandicapAllowance: number;

  // Result
  result: MatchResultType;
  margin: number;       // e.g., 3 for "3&2"
  holesRemaining: number;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// HOLE RESULT (MATCH PLAY)
// ============================================

export interface HoleResult {
  id: UUID;
  matchId: UUID;
  holeNumber: number;
  winner: HoleWinner;
  teamAStrokes?: number;
  teamBStrokes?: number;
  notes?: string;
  timestamp: string;
}

// ============================================
// COURSE & TEE SET
// ============================================

export interface Course {
  id: UUID;
  name: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeeSet {
  id: UUID;
  courseId: UUID;
  name: string;
  color?: string;
  rating: number;
  slope: number;
  par: number;
  holeHandicaps: number[];  // 18 elements, 1-18 ranking
  holePars?: number[];       // 18 elements
  yardages?: number[];       // 18 elements
  totalYardage?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SCHEDULE
// ============================================

export interface ScheduleDay {
  id: UUID;
  tripId: UUID;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleItem {
  id: UUID;
  scheduleDayId: UUID;
  type: 'tee_time' | 'event';
  title?: string;
  startTime?: string;
  endTime?: string;
  teeSetId?: UUID;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// AUDIT LOG
// ============================================

export interface AuditLogEntry {
  id: UUID;
  tripId: UUID;
  actionType: AuditActionType;
  timestamp: string;
  actorName: string;
  summary: string;
  details?: string;  // JSON string
  relatedEntityId?: string;
  relatedEntityType?: string;
}

// ============================================
// BANTER
// ============================================

export interface BanterPost {
  id: UUID;
  tripId: UUID;
  content: string;
  authorId?: UUID;
  authorName: string;
  postType: 'message' | 'result' | 'lineup' | 'system';
  emoji?: string;
  relatedMatchId?: UUID;
  timestamp: string;
}
```

### 3.2 Computed Types (ViewModel Helpers)

```typescript
// ============================================
// MATCH STATE (from ScoringEngine)
// ============================================

export interface MatchState {
  matchScore: number;      // Positive = Team A leading
  holesPlayed: number;
  holesRemaining: number;
  isDormie: boolean;
  isClosedOut: boolean;
  statusText: string;
  canContinue: boolean;
}

// ============================================
// STANDINGS
// ============================================

export interface TeamStandings {
  teamId: UUID;
  teamName: string;
  totalPoints: number;
  matchesWon: number;
  matchesLost: number;
  matchesHalved: number;
}

export interface PlayerLeaderboard {
  playerId: UUID;
  playerName: string;
  teamId: UUID;
  points: number;
  wins: number;
  losses: number;
  halves: number;
  record: string;  // e.g., "3-1-1"
}

// ============================================
// LINEUP BUILDER
// ============================================

export interface SuggestedPairing {
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  handicapDifference: number;
  repeatPairingScore: number;
  repeatOpponentScore: number;
}

export interface FairnessScore {
  score: number;  // 0-100
  strokesAdvantage: number;
  advantageTeam?: string;
  drivers: FairnessDriver[];
}

export interface FairnessDriver {
  id: string;
  factor: string;
  impact: string;
  severity: 'low' | 'medium' | 'high';
}
```

---

## 4. IndexedDB Storage Schema

### 4.1 Dexie Database Definition

```typescript
import Dexie, { Table } from 'dexie';

// Database class
export class GolfTripDB extends Dexie {
  trips!: Table<Trip>;
  players!: Table<Player>;
  teams!: Table<Team>;
  teamMembers!: Table<TeamMember>;
  sessions!: Table<RyderCupSession>;
  matches!: Table<Match>;
  holeResults!: Table<HoleResult>;
  courses!: Table<Course>;
  teeSets!: Table<TeeSet>;
  scheduleDays!: Table<ScheduleDay>;
  scheduleItems!: Table<ScheduleItem>;
  auditLog!: Table<AuditLogEntry>;
  banterPosts!: Table<BanterPost>;

  // Event log for undo/sync
  scoringEvents!: Table<ScoringEvent>;

  // Sync metadata (Phase 2)
  syncMeta!: Table<SyncMetadata>;

  constructor() {
    super('GolfTripDB');

    this.version(1).stores({
      // Primary key + indexed fields
      trips: 'id, name, startDate',
      players: 'id, name, handicapIndex',
      teams: 'id, tripId, name',
      teamMembers: 'id, teamId, playerId, [teamId+playerId]',
      sessions: 'id, tripId, scheduledDate, [tripId+scheduledDate]',
      matches: 'id, sessionId, status, [sessionId+matchOrder]',
      holeResults: 'id, matchId, holeNumber, [matchId+holeNumber]',
      courses: 'id, name',
      teeSets: 'id, courseId, [courseId+name]',
      scheduleDays: 'id, tripId, date, [tripId+date]',
      scheduleItems: 'id, scheduleDayId, startTime',
      auditLog: 'id, tripId, timestamp, [tripId+timestamp]',
      banterPosts: 'id, tripId, timestamp, [tripId+timestamp]',

      // Event log - append-only for undo/sync
      scoringEvents: '++localId, id, matchId, timestamp, synced',

      // Sync metadata
      syncMeta: 'key',
    });
  }
}

export const db = new GolfTripDB();
```

### 4.2 Indexes Explained

| Table | Index | Purpose |
|-------|-------|---------|
| `sessions` | `[tripId+scheduledDate]` | Fetch sessions for a trip sorted by date |
| `matches` | `[sessionId+matchOrder]` | Fetch matches in order within session |
| `holeResults` | `[matchId+holeNumber]` | Fetch hole results in order |
| `scoringEvents` | `synced` | Find unsynced events for Phase 2 |

### 4.3 Storage Estimates

| Data Type | Est. Records (Large Trip) | Est. Size |
|-----------|--------------------------|-----------|
| Trip | 1 | 1 KB |
| Players | 24 | 5 KB |
| Teams | 2 | 1 KB |
| Team Members | 24 | 3 KB |
| Sessions | 6 | 3 KB |
| Matches | 36 | 20 KB |
| Hole Results | 648 (36×18) | 50 KB |
| Courses | 3 | 2 KB |
| Tee Sets | 9 | 10 KB |
| Scoring Events | ~1000 | 100 KB |
| Audit Log | ~200 | 20 KB |
| **Total** | | **~215 KB** |

IndexedDB quota is typically 50MB minimum (more on most browsers), so we have ample headroom.

---

## 5. Scoring Event Log (Undo/Sync)

### 5.1 Event Sourcing for Scoring

The scoring system uses an **append-only event log** to enable:

1. **Undo**: Reverse any scoring action
2. **Audit**: Complete history of who scored what when
3. **Sync (Phase 2)**: Conflict-free merge across devices

```typescript
// ============================================
// SCORING EVENT
// ============================================

export enum ScoringEventType {
  HoleScored = 'hole_scored',
  HoleEdited = 'hole_edited',
  HoleUndone = 'hole_undone',
  MatchStarted = 'match_started',
  MatchFinalized = 'match_finalized',
  MatchCancelled = 'match_cancelled',
}

export interface ScoringEvent {
  localId?: number;           // Auto-increment for local ordering
  id: UUID;                   // Global UUID for sync
  matchId: UUID;
  eventType: ScoringEventType;
  timestamp: string;          // ISO string, used for merge ordering
  actorName: string;          // Who made this change

  // Event-specific payload
  payload: ScoringEventPayload;

  // Sync status (Phase 2)
  synced: boolean;
  serverTimestamp?: string;
}

export type ScoringEventPayload =
  | HoleScoredPayload
  | HoleEditedPayload
  | HoleUndonePayload
  | MatchStartedPayload
  | MatchFinalizedPayload;

export interface HoleScoredPayload {
  type: 'hole_scored';
  holeNumber: number;
  winner: HoleWinner;
  teamAStrokes?: number;
  teamBStrokes?: number;
}

export interface HoleEditedPayload {
  type: 'hole_edited';
  holeNumber: number;
  previousWinner: HoleWinner;
  newWinner: HoleWinner;
  previousTeamAStrokes?: number;
  previousTeamBStrokes?: number;
  newTeamAStrokes?: number;
  newTeamBStrokes?: number;
}

export interface HoleUndonePayload {
  type: 'hole_undone';
  holeNumber: number;
  previousWinner: HoleWinner;
}

export interface MatchStartedPayload {
  type: 'match_started';
  startTime: string;
}

export interface MatchFinalizedPayload {
  type: 'match_finalized';
  result: MatchResultType;
  margin: number;
  holesRemaining: number;
}
```

### 5.2 Undo Flow

```typescript
// services/scoring/undoManager.ts

export class ScoringUndoManager {
  private maxUndoStack = 20;  // Increased from iOS's 5

  async recordAction(event: ScoringEvent): Promise<void> {
    await db.scoringEvents.add(event);
    await this.trimOldEvents(event.matchId);
  }

  async undo(matchId: UUID): Promise<ScoringEvent | null> {
    // Get last non-undone event for this match
    const lastEvent = await db.scoringEvents
      .where('matchId')
      .equals(matchId)
      .filter(e => e.eventType !== ScoringEventType.HoleUndone)
      .reverse()
      .first();

    if (!lastEvent) return null;

    // Create undo event
    const undoEvent: ScoringEvent = {
      id: crypto.randomUUID(),
      matchId,
      eventType: ScoringEventType.HoleUndone,
      timestamp: new Date().toISOString(),
      actorName: 'User', // Get from context
      payload: {
        type: 'hole_undone',
        holeNumber: (lastEvent.payload as HoleScoredPayload).holeNumber,
        previousWinner: (lastEvent.payload as HoleScoredPayload).winner,
      },
      synced: false,
    };

    await this.recordAction(undoEvent);

    // Apply undo to current state
    await this.applyUndo(matchId, undoEvent);

    return undoEvent;
  }

  private async trimOldEvents(matchId: UUID): Promise<void> {
    const events = await db.scoringEvents
      .where('matchId')
      .equals(matchId)
      .sortBy('localId');

    if (events.length > this.maxUndoStack * 2) {
      const toDelete = events.slice(0, events.length - this.maxUndoStack);
      await db.scoringEvents.bulkDelete(toDelete.map(e => e.localId!));
    }
  }
}
```

### 5.3 Materialized State Rebuild

```typescript
// services/scoring/stateBuilder.ts

export async function rebuildMatchState(matchId: UUID): Promise<Match> {
  const match = await db.matches.get(matchId);
  if (!match) throw new Error(`Match ${matchId} not found`);

  const events = await db.scoringEvents
    .where('matchId')
    .equals(matchId)
    .sortBy('timestamp');

  // Start from initial state
  const holeResultsMap = new Map<number, HoleResult>();

  for (const event of events) {
    switch (event.eventType) {
      case ScoringEventType.HoleScored: {
        const payload = event.payload as HoleScoredPayload;
        holeResultsMap.set(payload.holeNumber, {
          id: crypto.randomUUID(),
          matchId,
          holeNumber: payload.holeNumber,
          winner: payload.winner,
          teamAStrokes: payload.teamAStrokes,
          teamBStrokes: payload.teamBStrokes,
          timestamp: event.timestamp,
        });
        break;
      }
      case ScoringEventType.HoleUndone: {
        const payload = event.payload as HoleUndonePayload;
        holeResultsMap.delete(payload.holeNumber);
        break;
      }
      case ScoringEventType.MatchStarted: {
        match.status = MatchStatus.InProgress;
        match.startTime = (event.payload as MatchStartedPayload).startTime;
        break;
      }
      case ScoringEventType.MatchFinalized: {
        const payload = event.payload as MatchFinalizedPayload;
        match.status = MatchStatus.Final;
        match.result = payload.result;
        match.margin = payload.margin;
        match.holesRemaining = payload.holesRemaining;
        break;
      }
    }
  }

  return match;
}
```

---

## 6. Offline Strategy & PWA

### 6.1 Service Worker Caching Strategy

```typescript
// next.config.js + workbox config

const cacheStrategies = {
  // Static assets: Cache-first, update in background
  staticAssets: {
    cacheName: 'static-assets-v1',
    strategy: 'CacheFirst',
    options: {
      cacheableResponse: { statuses: [0, 200] },
      expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 days
    },
    patterns: [
      /\/_next\/static\/.*/,
      /\.(?:js|css|woff2|png|jpg|svg|ico)$/,
    ],
  },

  // HTML pages: Network-first with cache fallback
  pages: {
    cacheName: 'pages-v1',
    strategy: 'NetworkFirst',
    options: {
      networkTimeoutSeconds: 3,
      cacheableResponse: { statuses: [0, 200] },
    },
    patterns: [/\/(?:matchups|score|standings|teams|more)?$/],
  },

  // API routes (Phase 2): Network-only with offline queue
  api: {
    cacheName: 'api-v1',
    strategy: 'NetworkOnly',
    options: {
      backgroundSync: {
        name: 'scoring-sync-queue',
        options: { maxRetentionTime: 24 * 60 }, // 24 hours
      },
    },
    patterns: [/\/api\/sync\/.*/],
  },
};
```

### 6.2 PWA Manifest

```json
{
  "name": "Golf Ryder Cup",
  "short_name": "Ryder Cup",
  "description": "Ryder Cup scoring and trip management",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0A0A0A",
  "theme_color": "#004225",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "categories": ["sports", "lifestyle"],
  "screenshots": [
    {
      "src": "/screenshots/home.png",
      "sizes": "1080x1920",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

### 6.3 Offline Detection Hook

```typescript
// hooks/useOfflineStatus.ts

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true; // Assume online during SSR
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useOfflineStatus(): boolean {
  return !useOnlineStatus();
}
```

### 6.4 Offline Indicator Component

```typescript
// components/OfflineIndicator.tsx

export function OfflineIndicator() {
  const isOffline = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-warning/90 text-black px-4 py-2 rounded-full
                      flex items-center gap-2 shadow-lg text-sm font-medium">
        <WifiOff className="h-4 w-4" />
        Offline Mode
      </div>
    </div>
  );
}
```

---

## 7. UI/UX Migration

### 7.1 Design Token Mapping (Swift → Tailwind)

```typescript
// tailwind.config.ts

const config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Augusta National Palette
        'augusta-green': '#004225',
        'azalea-pink': '#E91E63',
        'magnolia-white': '#FDFBF7',
        'patrons': '#2E7D32',
        'sunday-red': '#C62828',

        // Brand
        'primary': {
          DEFAULT: '#004225',
          light: '#2E7D32',
        },
        'secondary': {
          DEFAULT: '#FFD54F',
          dark: '#B8860B',
        },

        // Teams
        'team-usa': {
          DEFAULT: '#1565C0',
          light: '#42A5F5',
          dark: '#0D47A1',
        },
        'team-europe': {
          DEFAULT: '#C62828',
          light: '#EF5350',
          dark: '#B71C1C',
        },

        // Semantic
        'success': '#66BB6A',
        'warning': '#FFB74D',
        'error': '#EF5350',
        'info': '#64B5F6',

        // Surfaces (dark mode first)
        'surface': {
          DEFAULT: '#141414',
          background: '#0A0A0A',
          variant: '#1E1E1E',
          elevated: '#282828',
          highlight: '#333333',
        },
      },
      spacing: {
        'xxs': '2px',
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        'xxl': '32px',
        'xxxl': '48px',
        'hero': '64px',
      },
      borderRadius: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        'xxl': '32px',
      },
      fontSize: {
        'score-hero': ['72px', { lineHeight: '1', fontWeight: '700' }],
        'score-large': ['48px', { lineHeight: '1', fontWeight: '700' }],
        'score-medium': ['32px', { lineHeight: '1', fontWeight: '600' }],
        'score-small': ['24px', { lineHeight: '1', fontWeight: '500' }],
      },
      fontFamily: {
        'mono': ['SF Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
};
```

### 7.2 Component Mapping

| Swift Component | Web Component | Notes |
|----------------|---------------|-------|
| `NavigationStack` | Next.js App Router | File-based routing |
| `TabView` | Bottom navigation | Custom mobile tab bar |
| `List` | Tailwind list / virtualized | @tanstack/virtual for long lists |
| `Form` | react-hook-form | With zod validation |
| `Sheet` | Headless UI Dialog / Drawer | Or radix-ui/dialog |
| `.sheet(item:)` | Dynamic route / modal | State-driven |
| `@Observable` | Zustand store | Or React Query for server state |
| `@Query (SwiftData)` | Dexie useLiveQuery | Reactive IndexedDB |
| `Menu` | Dropdown menu | radix-ui/dropdown-menu |
| `Alert` | Toast notification | sonner or react-hot-toast |
| `ConfirmationDialog` | Alert dialog | radix-ui/alert-dialog |

### 7.3 Key Screen Wireframes

#### Home Screen (`/`)

```
┌─────────────────────────────────────┐
│ 🏆 The Ryder Cup          👑 •••    │
├─────────────────────────────────────┤
│                                     │
│     Buddy Trip 2026                 │
│     📍 Pebble Beach                 │
│     Jan 15-18, 2026                 │
│                                     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │   TEAM USA   7     TEAM EUR 5  │ │
│ │   ████████████░░░░░░░░░░░░░░   │ │
│ │      Magic #: USA needs 5.5     │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🏌️ NEXT UP                      │ │
│ │ Saturday AM Foursomes           │ │
│ │ ⏱️ Starts in 2h 15m            │ │
│ │                                 │ │
│ │ You & John vs Mike & Dave      │ │
│ │        [Score Now →]            │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 🔴 LIVE NOW                        │
│ ┌───────────────┐ ┌───────────────┐│
│ │Match 1: 2 UP │ │Match 2: AS   ││
│ │Hole 7        │ │Hole 5        ││
│ └───────────────┘ └───────────────┘│
├─────────────────────────────────────┤
│ ⚡ Captain Actions                  │
│ [Build Lineup] [Publish] [🔒Lock]  │
└─────────────────────────────────────┘
│🏠 Home │📋 Matchups│➕ Score│🏆│👥│
└─────────────────────────────────────┘
```

#### Scoring Screen (`/score/[matchId]`)

```
┌─────────────────────────────────────┐
│ ← Match 1 of 4                      │
├─────────────────────────────────────┤
│                                     │
│         TEAM USA                    │
│            2 UP                     │
│                                     │
│      through 6  •  12 to play       │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────┐  ┌───────┐  ┌───────┐ │
│  │   +1    │  │   =   │  │  +1   │ │
│  │  USA 🔵 │  │ HALVE │  │ EUR 🔴│ │
│  │         │  │       │  │       │ │
│  └─────────┘  └───────┘  └───────┘ │
│                                     │
│           Hole 7 • Par 4            │
│                                     │
├─────────────────────────────────────┤
│  1  2  3  4  5  6 [7] 8  9  ...    │
│  🔵 🔵 ○ 🔴 ○ 🔵     ...           │
├─────────────────────────────────────┤
│ [← Undo Last]              [Notes] │
└─────────────────────────────────────┘
```

#### Lineup Builder (`/matchups/[sessionId]/lineup`)

```
┌─────────────────────────────────────┐
│ ← Friday AM Foursomes    [Preview] │
├─────────────────────────────────────┤
│ Fairness: 87/100 ✓                 │
│ "Team USA +0.3 strokes advantage"  │
├───────────────────┬─────────────────┤
│    TEAM USA 🔵   │   TEAM EUR 🔴   │
├───────────────────┼─────────────────┤
│                   │                 │
│  ┌─────────────┐  │  ┌───────────┐ │
│  │ Match 1     │  │  │           │ │
│  │ ┌───┐ ┌───┐ │  │  │ ┌───┐┌───┐│ │
│  │ │J.D│ │M.S│ │  │  │ │P.R││T.W││ │
│  │ │+8 │ │+12│ │  │  │ │+6 ││+14││ │
│  │ └───┘ └───┘ │  │  │ └───┘└───┘│ │
│  │ Strokes: 3  │  │  │ Strokes: 2│ │
│  └─────────────┘  │  └───────────┘ │
│                   │                 │
│  [Drop zone 2]    │  [Drop zone 2] │
│                   │                 │
├───────────────────┴─────────────────┤
│ Available:                          │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐           │
│ │A.B│ │C.D│ │E.F│ │G.H│           │
│ │+10│ │+7 │ │+15│ │+9 │           │
│ └───┘ └───┘ └───┘ └───┘           │
├─────────────────────────────────────┤
│ [Auto-Fill]           [Save & Pub] │
└─────────────────────────────────────┘
```

---

## 8. Project Structure

```
golf-ryder-cup-web/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout (dark mode, fonts)
│   ├── page.tsx                 # Home (/)
│   ├── matchups/
│   │   ├── page.tsx             # /matchups
│   │   └── [sessionId]/
│   │       ├── page.tsx         # Session detail
│   │       └── lineup/
│   │           └── page.tsx     # Lineup builder
│   ├── score/
│   │   ├── page.tsx             # /score (match selector)
│   │   └── [matchId]/
│   │       └── page.tsx         # Scoring interface
│   ├── standings/
│   │   └── page.tsx             # /standings
│   ├── teams/
│   │   └── page.tsx             # /teams
│   ├── more/
│   │   ├── page.tsx             # /more
│   │   └── courses/
│   │       ├── page.tsx         # Course list
│   │       └── wizard/
│   │           └── page.tsx     # Course setup wizard
│   ├── players/
│   │   └── [playerId]/
│   │       └── page.tsx         # Player detail/edit
│   └── api/                     # API routes (Phase 2)
│       └── sync/
│           └── route.ts
├── components/
│   ├── ui/                      # Primitives (shadcn/ui style)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── tabs.tsx
│   │   └── toast.tsx
│   ├── layout/
│   │   ├── BottomNav.tsx
│   │   ├── Header.tsx
│   │   └── OfflineIndicator.tsx
│   ├── home/
│   │   ├── StandingsHero.tsx
│   │   ├── NextUpCard.tsx
│   │   ├── LiveMatchCard.tsx
│   │   ├── MagicNumberCard.tsx
│   │   └── CaptainActions.tsx
│   ├── scoring/
│   │   ├── MatchHeader.tsx
│   │   ├── HoleScoringButtons.tsx
│   │   ├── HoleNavigator.tsx
│   │   └── UndoButton.tsx
│   ├── lineup/
│   │   ├── LineupBuilder.tsx
│   │   ├── PlayerChip.tsx
│   │   ├── MatchSlot.tsx
│   │   └── FairnessScore.tsx
│   ├── standings/
│   │   ├── TeamScoreBoard.tsx
│   │   ├── PlayerLeaderboard.tsx
│   │   └── SessionBreakdown.tsx
│   └── course-wizard/
│       ├── WizardProgress.tsx
│       ├── Step1BasicInfo.tsx
│       ├── Step2TeeSetBasics.tsx
│       ├── Step3HolePars.tsx
│       ├── Step4HoleHandicaps.tsx
│       └── Step5Review.tsx
├── lib/
│   ├── db/
│   │   ├── index.ts             # Dexie database instance
│   │   ├── schema.ts            # Table definitions
│   │   └── seed.ts              # Demo data seeding
│   ├── services/
│   │   ├── scoringEngine.ts     # Port of ScoringEngine.swift
│   │   ├── tournamentEngine.ts  # Port of TournamentEngine.swift
│   │   ├── handicapCalculator.ts
│   │   ├── lineupAutoFill.ts    # Port of LineupAutoFillService.swift
│   │   ├── captainMode.ts       # Port of CaptainModeService.swift
│   │   └── shareService.ts
│   ├── stores/
│   │   ├── tripStore.ts         # Zustand store for trip state
│   │   ├── scoringStore.ts      # Scoring session state
│   │   └── uiStore.ts           # UI state (modals, toasts)
│   ├── hooks/
│   │   ├── useTrip.ts
│   │   ├── useMatch.ts
│   │   ├── useStandings.ts
│   │   ├── useOfflineStatus.ts
│   │   └── useScoringUndo.ts
│   ├── utils/
│   │   ├── dateUtils.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   └── types/
│       ├── models.ts            # Domain models
│       ├── events.ts            # Scoring events
│       └── api.ts               # API types (Phase 2)
├── public/
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service worker (generated)
│   └── icons/
├── styles/
│   └── globals.css              # Tailwind + custom CSS
├── tests/
│   ├── services/
│   │   ├── scoringEngine.test.ts
│   │   ├── handicapCalculator.test.ts
│   │   └── tournamentEngine.test.ts
│   └── components/
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 9. Phased Rollout

### Phase 0: Foundation (Week 1-2)

**Goal:** Scaffold project, port core domain logic, basic offline storage

| Task | Effort | Owner |
|------|--------|-------|
| Next.js project setup with TypeScript + Tailwind | 0.5d | |
| Design tokens → Tailwind config | 0.5d | |
| Dexie database schema implementation | 1d | |
| Port `HandicapCalculator` with tests | 0.5d | |
| Port `ScoringEngine` with tests | 1d | |
| Port `TournamentEngine` (points, records) | 1d | |
| Zustand stores (trip, scoring, UI) | 1d | |
| PWA manifest + basic service worker | 0.5d | |
| Offline status hook + indicator | 0.5d | |

**Deliverable:** Core services passing tests, empty UI shell

---

### Phase 1: MVP (Week 3-5)

**Goal:** Fully functional offline scoring for a single trip

#### Sprint 1.1: Trip & Teams (Week 3)

| Task | Effort |
|------|--------|
| Home page layout (empty states) | 1d |
| Bottom navigation component | 0.5d |
| Trip CRUD (create first trip) | 1d |
| Team management UI | 1d |
| Player add/edit form (react-hook-form + zod) | 1d |
| Team member assignment | 0.5d |

#### Sprint 1.2: Sessions & Matches (Week 4)

| Task | Effort |
|------|--------|
| Matchups tab - session list | 1d |
| Session create/edit form | 1d |
| Match creation for session | 1d |
| Match player assignment | 1d |
| Home page - standings hero | 0.5d |
| Home page - next up card | 0.5d |

#### Sprint 1.3: Scoring Flow (Week 5)

| Task | Effort |
|------|--------|
| Score tab - match selector | 0.5d |
| Scoring interface (big buttons) | 1.5d |
| Hole navigation component | 0.5d |
| Match state display (X UP, dormie, etc.) | 0.5d |
| Undo functionality with event log | 1d |
| Match finalization flow | 0.5d |
| Standings update on score | 0.5d |

**MVP Deliverable:** Can create trip, teams, sessions, matches; score matches offline; see standings

---

### Phase 2: Captain's Toolkit (Week 6-7)

| Task | Effort |
|------|--------|
| Session lock/unlock | 0.5d |
| Audit log storage + view | 1d |
| Lineup builder UI (drag-and-drop) | 2d |
| Auto-fill algorithm port | 1d |
| Fairness score component | 0.5d |
| Captain quick actions on home | 0.5d |
| Magic number calculation + display | 0.5d |
| Live match cards on home | 0.5d |

---

### Phase 3: Course Wizard & Polish (Week 8-9)

| Task | Effort |
|------|--------|
| Course list view | 0.5d |
| Course wizard step 1-2 (basic info, tee set) | 1d |
| Course wizard step 3 (hole pars) | 1d |
| Course wizard step 4 (hole handicaps) | 1d |
| Course wizard step 5 (review + save) | 0.5d |
| Course assignment to matches | 0.5d |
| Strokes received per hole calculation | 0.5d |
| Schedule days view | 1d |
| Banter feed (local posts) | 1d |
| Share standings (clipboard + image) | 1d |

---

### Phase 4: Sync & Multi-Device (Week 10-12) — OPTIONAL

**Prerequisite:** Phase 1-3 shipped and stable

| Task | Effort |
|------|--------|
| Supabase project setup | 0.5d |
| Auth (magic link or Google) | 1d |
| Database schema in Postgres | 1d |
| Sync service: push unsynced events | 2d |
| Sync service: pull and merge | 2d |
| Conflict resolution UI | 1d |
| Real-time subscriptions | 1d |
| Trip sharing (invite code) | 1d |
| Test multi-device scenarios | 2d |

---

## 10. Risk Assessment

### 10.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| IndexedDB quota issues | Low | Medium | Test on iOS Safari (50MB limit); compress images |
| Service worker caching bugs | Medium | High | Thorough cache versioning; clear cache on update |
| Drag-and-drop on mobile | Medium | Medium | Test @dnd-kit touch support; fallback to tap-select |
| Safari PWA limitations | Medium | Medium | Test install experience; document known issues |
| Scoring race conditions | Low | High | Event log with timestamps; optimistic UI |
| Sync conflicts (Phase 2) | Medium | High | Captain-owns-structure rule; audit trail; manual merge UI |

### 10.2 Product Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Users don't adopt PWA install | Medium | Medium | In-app install prompt; excellent non-installed experience |
| Offline UX confusing | Medium | Medium | Clear offline indicator; toast on sync |
| Feature gap from iOS | Low | Medium | Prioritize P0 features; defer P2+ |
| Captain mode too complex | Low | Medium | Guided onboarding; smart defaults |

### 10.3 Go/No-Go Criteria for MVP

- [ ] Can create trip and teams offline
- [ ] Can add players with handicaps
- [ ] Can create sessions (foursomes/fourball/singles)
- [ ] Can score matches with big-button UI
- [ ] Undo works for at least 10 actions
- [ ] Standings update correctly
- [ ] App works after closing and reopening (data persists)
- [ ] App works in airplane mode
- [ ] PWA installable on iOS and Android
- [ ] No data loss scenarios in testing

---

## Appendix

### A. Service Worker Registration

```typescript
// app/layout.tsx

'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);

          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    }
  }, []);

  return null;
}
```

### B. Zustand Store Example

```typescript
// lib/stores/scoringStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db';
import { ScoringEngine } from '@/lib/services/scoringEngine';

interface ScoringState {
  activeMatchId: string | null;
  matchState: MatchState | null;
  isLoading: boolean;

  // Actions
  setActiveMatch: (matchId: string) => Promise<void>;
  scoreHole: (holeNumber: number, winner: HoleWinner) => Promise<void>;
  undo: () => Promise<void>;
  finalizeMatch: () => Promise<void>;
}

export const useScoringStore = create<ScoringState>()(
  persist(
    (set, get) => ({
      activeMatchId: null,
      matchState: null,
      isLoading: false,

      setActiveMatch: async (matchId) => {
        set({ isLoading: true });
        const holeResults = await db.holeResults
          .where('matchId')
          .equals(matchId)
          .toArray();
        const matchState = ScoringEngine.calculateMatchState(holeResults);
        set({ activeMatchId: matchId, matchState, isLoading: false });
      },

      scoreHole: async (holeNumber, winner) => {
        const { activeMatchId } = get();
        if (!activeMatchId) return;

        // Record event
        const event = {
          id: crypto.randomUUID(),
          matchId: activeMatchId,
          eventType: 'hole_scored',
          timestamp: new Date().toISOString(),
          actorName: 'User',
          payload: { type: 'hole_scored', holeNumber, winner },
          synced: false,
        };
        await db.scoringEvents.add(event);

        // Update hole result
        await db.holeResults.put({
          id: crypto.randomUUID(),
          matchId: activeMatchId,
          holeNumber,
          winner,
          timestamp: event.timestamp,
        });

        // Recalculate state
        const holeResults = await db.holeResults
          .where('matchId')
          .equals(activeMatchId)
          .toArray();
        const matchState = ScoringEngine.calculateMatchState(holeResults);
        set({ matchState });
      },

      undo: async () => {
        // Implementation uses ScoringUndoManager
      },

      finalizeMatch: async () => {
        // Implementation
      },
    }),
    {
      name: 'scoring-storage',
      partialize: (state) => ({ activeMatchId: state.activeMatchId }),
    }
  )
);
```

### C. Testing Strategy

```typescript
// tests/services/scoringEngine.test.ts

import { describe, it, expect } from 'vitest';
import { ScoringEngine, HoleWinner } from '@/lib/services/scoringEngine';

describe('ScoringEngine', () => {
  describe('calculateMatchState', () => {
    it('returns all square when no holes played', () => {
      const state = ScoringEngine.calculateMatchState([]);
      expect(state.matchScore).toBe(0);
      expect(state.holesPlayed).toBe(0);
      expect(state.statusText).toContain('All Square');
    });

    it('calculates Team A leading correctly', () => {
      const results = [
        { holeNumber: 1, winner: HoleWinner.TeamA },
        { holeNumber: 2, winner: HoleWinner.Halved },
        { holeNumber: 3, winner: HoleWinner.TeamA },
      ];
      const state = ScoringEngine.calculateMatchState(results);
      expect(state.matchScore).toBe(2);
      expect(state.statusText).toContain('Team A 2 UP');
    });

    it('detects dormie correctly', () => {
      const results = Array.from({ length: 15 }, (_, i) => ({
        holeNumber: i + 1,
        winner: i < 3 ? HoleWinner.TeamA : HoleWinner.Halved,
      }));
      const state = ScoringEngine.calculateMatchState(results);
      expect(state.isDormie).toBe(true);
    });

    it('detects closeout correctly', () => {
      const results = Array.from({ length: 14 }, (_, i) => ({
        holeNumber: i + 1,
        winner: i < 5 ? HoleWinner.TeamA : HoleWinner.Halved,
      }));
      const state = ScoringEngine.calculateMatchState(results);
      expect(state.isClosedOut).toBe(true);
      expect(state.statusText).toContain('5&4');
    });
  });
});
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 12, 2026 | Engineering | Initial draft |

---

**Next Steps:**

1. Review with team
2. Finalize tech stack decisions
3. Create GitHub project board with Phase 0 tasks
4. Begin scaffolding in `/golf-ryder-cup-web` directory
