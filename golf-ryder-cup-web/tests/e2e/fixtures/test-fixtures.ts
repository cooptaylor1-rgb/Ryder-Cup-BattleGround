/**
 * Playwright Test Fixtures
 *
 * Extended fixtures for E2E testing including:
 * - Seeded database state
 * - Captain mode authentication
 * - Performance tracking
 * - Chaos mode flags
 */

import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  waitForStableDOM,
  dismissAllBlockingModals,
  clearIndexedDB,
  enableCaptainMode as enableCaptainModeHelper,
} from '../utils/test-helpers';
import {
  generateTestData,
  toIndexedDBFormat,
  SEED_CONFIGS,
  type SeedSize,
  type GeneratedTrip,
} from '../utils/seeder';

function getTestDatabaseVersion(): number {
  const dbSource = readFileSync(join(process.cwd(), 'src/lib/db/index.ts'), 'utf8');
  const versionMatches = [...dbSource.matchAll(/this\.version\((\d+)\)\.stores/g)];
  const currentDexieVersion = Math.max(
    1,
    ...versionMatches.map((match) => Number.parseInt(match[1] ?? '1', 10))
  );

  // Dexie stores the IndexedDB version as verno * 10 for integer schema versions.
  return currentDexieVersion * 10;
}

const TEST_DB_VERSION = getTestDatabaseVersion();

const TEST_DB_SCHEMA = [
  { name: 'trips', keyPath: 'id', indexes: [['name', 'name'], ['startDate', 'startDate']] },
  { name: 'players', keyPath: 'id', indexes: [['tripId', 'tripId'], ['name', 'name'], ['handicapIndex', 'handicapIndex']] },
  { name: 'teams', keyPath: 'id', indexes: [['tripId', 'tripId'], ['name', 'name']] },
  { name: 'teamMembers', keyPath: 'id', indexes: [['teamId', 'teamId'], ['playerId', 'playerId'], ['teamId+playerId', ['teamId', 'playerId']]] },
  { name: 'sessions', keyPath: 'id', indexes: [['tripId', 'tripId'], ['scheduledDate', 'scheduledDate'], ['tripId+scheduledDate', ['tripId', 'scheduledDate']]] },
  { name: 'matches', keyPath: 'id', indexes: [['sessionId', 'sessionId'], ['status', 'status'], ['sessionId+matchOrder', ['sessionId', 'matchOrder']]] },
  { name: 'holeResults', keyPath: 'id', indexes: [['matchId', 'matchId'], ['holeNumber', 'holeNumber'], ['matchId+holeNumber', ['matchId', 'holeNumber']]] },
  { name: 'courses', keyPath: 'id', indexes: [['name', 'name']] },
  { name: 'teeSets', keyPath: 'id', indexes: [['courseId', 'courseId'], ['courseId+name', ['courseId', 'name']]] },
  { name: 'scheduleDays', keyPath: 'id', indexes: [['tripId', 'tripId'], ['date', 'date'], ['tripId+date', ['tripId', 'date']]] },
  { name: 'scheduleItems', keyPath: 'id', indexes: [['scheduleDayId', 'scheduleDayId'], ['startTime', 'startTime']] },
  { name: 'auditLog', keyPath: 'id', indexes: [['tripId', 'tripId'], ['timestamp', 'timestamp'], ['actionType', 'actionType'], ['tripId+timestamp', ['tripId', 'timestamp']]] },
  { name: 'banterPosts', keyPath: 'id', indexes: [['tripId', 'tripId'], ['timestamp', 'timestamp'], ['tripId+timestamp', ['tripId', 'timestamp']]] },
  { name: 'scoringEvents', keyPath: 'localId', autoIncrement: true, indexes: [['id', 'id'], ['matchId', 'matchId'], ['timestamp', 'timestamp'], ['synced', 'synced'], ['matchId+timestamp', ['matchId', 'timestamp']], ['matchId+synced', ['matchId', 'synced']]] },
  { name: 'syncMeta', keyPath: 'key', indexes: [] },
  { name: 'courseProfiles', keyPath: 'id', indexes: [['name', 'name']] },
  { name: 'teeSetProfiles', keyPath: 'id', indexes: [['courseProfileId', 'courseProfileId'], ['courseProfileId+name', ['courseProfileId', 'name']]] },
  { name: 'sideBets', keyPath: 'id', indexes: [['tripId', 'tripId'], ['status', 'status'], ['tripId+status', ['tripId', 'status']]] },
  { name: 'tripStats', keyPath: 'id', indexes: [['tripId', 'tripId'], ['playerId', 'playerId'], ['sessionId', 'sessionId'], ['statType', 'statType'], ['tripId+playerId', ['tripId', 'playerId']], ['tripId+statType', ['tripId', 'statType']], ['playerId+statType', ['playerId', 'statType']]] },
  { name: 'tripAwards', keyPath: 'id', indexes: [['tripId', 'tripId'], ['awardType', 'awardType'], ['winnerId', 'winnerId'], ['tripId+awardType', ['tripId', 'awardType']]] },
  { name: 'wolfGames', keyPath: 'id', indexes: [['tripId', 'tripId'], ['sessionId', 'sessionId'], ['status', 'status'], ['tripId+status', ['tripId', 'status']]] },
  { name: 'vegasGames', keyPath: 'id', indexes: [['tripId', 'tripId'], ['sessionId', 'sessionId'], ['status', 'status'], ['tripId+status', ['tripId', 'status']]] },
  { name: 'hammerGames', keyPath: 'id', indexes: [['tripId', 'tripId'], ['sessionId', 'sessionId'], ['status', 'status'], ['tripId+status', ['tripId', 'status']]] },
  { name: 'nassauGames', keyPath: 'id', indexes: [['tripId', 'tripId'], ['sessionId', 'sessionId'], ['status', 'status'], ['tripId+status', ['tripId', 'status']]] },
  { name: 'settlements', keyPath: 'id', indexes: [['tripId', 'tripId'], ['fromPlayerId', 'fromPlayerId'], ['toPlayerId', 'toPlayerId'], ['status', 'status'], ['tripId+status', ['tripId', 'status']]] },
  { name: 'chatMessages', keyPath: 'id', indexes: [['tripId', 'tripId'], ['threadId', 'threadId'], ['authorId', 'authorId'], ['timestamp', 'timestamp'], ['tripId+timestamp', ['tripId', 'timestamp']], ['threadId+timestamp', ['threadId', 'timestamp']]] },
  { name: 'chatThreads', keyPath: 'id', indexes: [['tripId', 'tripId'], ['createdAt', 'createdAt'], ['tripId+createdAt', ['tripId', 'createdAt']]] },
  { name: 'trashTalks', keyPath: 'id', indexes: [['tripId', 'tripId'], ['authorId', 'authorId'], ['targetId', 'targetId'], ['timestamp', 'timestamp'], ['tripId+timestamp', ['tripId', 'timestamp']]] },
  { name: 'photos', keyPath: 'id', indexes: [['tripId', 'tripId'], ['albumId', 'albumId'], ['uploaderId', 'uploaderId'], ['uploadedAt', 'uploadedAt'], ['tripId+uploadedAt', ['tripId', 'uploadedAt']], ['albumId+uploadedAt', ['albumId', 'uploadedAt']]] },
  { name: 'photoAlbums', keyPath: 'id', indexes: [['tripId', 'tripId'], ['createdAt', 'createdAt'], ['tripId+createdAt', ['tripId', 'createdAt']]] },
  { name: 'polls', keyPath: 'id', indexes: [['tripId', 'tripId'], ['createdById', 'createdById'], ['status', 'status'], ['expiresAt', 'expiresAt'], ['tripId+status', ['tripId', 'status']], ['tripId+expiresAt', ['tripId', 'expiresAt']]] },
  { name: 'headToHeadRecords', keyPath: 'id', indexes: [['tripId', 'tripId'], ['player1Id', 'player1Id'], ['player2Id', 'player2Id'], ['tripId+player1Id', ['tripId', 'player1Id']], ['player1Id+player2Id', ['player1Id', 'player2Id']]] },
  { name: 'tripArchives', keyPath: 'id', indexes: [['tripId', 'tripId'], ['archivedAt', 'archivedAt']] },
  { name: 'courseSyncQueue', keyPath: 'queueId', autoIncrement: true, indexes: [['courseProfileId', 'courseProfileId'], ['status', 'status'], ['retryCount', 'retryCount'], ['createdAt', 'createdAt'], ['status+retryCount', ['status', 'retryCount']]] },
  { name: 'tripSyncQueue', keyPath: 'id', indexes: [['tripId', 'tripId'], ['status', 'status'], ['retryCount', 'retryCount'], ['createdAt', 'createdAt'], ['tripId+status', ['tripId', 'status']]] },
  { name: 'duesLineItems', keyPath: 'id', indexes: [['tripId', 'tripId'], ['playerId', 'playerId'], ['category', 'category'], ['status', 'status'], ['tripId+playerId', ['tripId', 'playerId']], ['tripId+status', ['tripId', 'status']], ['tripId+category', ['tripId', 'category']]] },
  { name: 'paymentRecords', keyPath: 'id', indexes: [['tripId', 'tripId'], ['fromPlayerId', 'fromPlayerId'], ['createdAt', 'createdAt'], ['tripId+fromPlayerId', ['tripId', 'fromPlayerId']]] },
  { name: 'tripTemplates', keyPath: 'id', indexes: [['name', 'name'], ['isBuiltin', 'isBuiltin'], ['useCount', 'useCount'], ['createdAt', 'createdAt']] },
  { name: 'tripInvitations', keyPath: 'id', indexes: [['tripId', 'tripId'], ['status', 'status'], ['recipientEmail', 'recipientEmail'], ['inviteCode', 'inviteCode'], ['createdAt', 'createdAt'], ['tripId+status', ['tripId', 'status']], ['tripId+createdAt', ['tripId', 'createdAt']]] },
  { name: 'announcements', keyPath: 'id', indexes: [['tripId', 'tripId'], ['status', 'status'], ['createdAt', 'createdAt'], ['sentAt', 'sentAt'], ['tripId+createdAt', ['tripId', 'createdAt']], ['tripId+status', ['tripId', 'status']]] },
  { name: 'attendanceRecords', keyPath: 'id', indexes: [['tripId', 'tripId'], ['playerId', 'playerId'], ['sessionId', 'sessionId'], ['status', 'status'], ['tripId+playerId', ['tripId', 'playerId']], ['tripId+sessionId', ['tripId', 'sessionId']], ['tripId+status', ['tripId', 'status']]] },
  { name: 'cartAssignments', keyPath: 'id', indexes: [['tripId', 'tripId'], ['sessionId', 'sessionId'], ['matchId', 'matchId'], ['cartNumber', 'cartNumber'], ['tripId+sessionId', ['tripId', 'sessionId']], ['tripId+matchId', ['tripId', 'matchId']], ['tripId+cartNumber', ['tripId', 'cartNumber']]] },
] as const;

async function seedDatabase(
  page: import('@playwright/test').Page,
  seedData: Record<string, unknown[]>,
  currentTripId?: string
): Promise<void> {
  await page.evaluate(
    ({ dbVersion, schema, data, tripId }) =>
      new Promise<void>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          reject(new Error('Timed out while seeding GolfTripDB'));
        }, 15000);

        const request = indexedDB.open('GolfTripDB', dbVersion);

        request.onupgradeneeded = () => {
          const db = request.result;
          const upgradeTx = request.transaction;
          if (!upgradeTx) return;

          for (const storeSchema of schema) {
            let store: IDBObjectStore;
            if (db.objectStoreNames.contains(storeSchema.name)) {
              store = upgradeTx.objectStore(storeSchema.name);
            } else {
              store = db.createObjectStore(storeSchema.name, {
                keyPath: storeSchema.keyPath,
                autoIncrement: storeSchema.autoIncrement ?? false,
              });
            }

            for (const [indexName, keyPath] of storeSchema.indexes) {
              if (!store.indexNames.contains(indexName)) {
                store.createIndex(indexName, keyPath);
              }
            }
          }
        };

        request.onerror = () => {
          window.clearTimeout(timeoutId);
          reject(request.error ?? new Error('Failed to open GolfTripDB'));
        };

        request.onblocked = () => {
          window.clearTimeout(timeoutId);
          reject(new Error('GolfTripDB open was blocked'));
        };

        request.onsuccess = () => {
          const db = request.result;
          const storeNames = Array.from(db.objectStoreNames);

          if (storeNames.length === 0) {
            window.clearTimeout(timeoutId);
            db.close();
            reject(new Error('GolfTripDB opened without object stores'));
            return;
          }

          try {
            const tx = db.transaction(storeNames, 'readwrite');

            for (const storeName of storeNames) {
              tx.objectStore(storeName).clear();
            }

            for (const [tableName, records] of Object.entries(data)) {
              const store = tx.objectStore(tableName);
              for (const record of records) {
                store.put(record);
              }
            }

            tx.oncomplete = () => {
              if (tripId) {
                localStorage.setItem(
                  'golf-trip-storage',
                  JSON.stringify({ state: { currentTripId: tripId }, version: 0 })
                );
              }
              window.clearTimeout(timeoutId);
              db.close();
              resolve();
            };

            tx.onerror = () => {
              window.clearTimeout(timeoutId);
              db.close();
              reject(tx.error ?? new Error('Failed to seed GolfTripDB'));
            };
          } catch (error) {
            window.clearTimeout(timeoutId);
            db.close();
            reject(error);
          }
        };
      }),
    {
      dbVersion: TEST_DB_VERSION,
      schema: TEST_DB_SCHEMA,
      data: seedData,
      tripId: currentTripId,
    }
  );
}

// ============================================================================
// FIXTURE TYPES
// ============================================================================

export interface TestFixtures {
  // Setup helpers
  setupPage: () => Promise<void>;
  clearDatabase: () => Promise<void>;

  // Seeding
  seedSmallDataset: () => Promise<GeneratedTrip[]>;
  seedLargeDataset: () => Promise<GeneratedTrip[]>;
  seedCustomDataset: (config: { size: SeedSize; seed?: string }) => Promise<GeneratedTrip[]>;

  // Captain mode
  enableCaptainMode: (pin?: string) => Promise<boolean>;

  // Performance tracking
  startPerformanceTrace: () => Promise<void>;
  stopPerformanceTrace: () => Promise<{ navigationTime: number; resources: number }>;

  // Chaos mode (enabled via env var)
  chaosEnabled: boolean;
  chaosLatencyMs: number;
  chaosErrorRate: number;
}

export interface TestWorkerFixtures {
  // Worker-level fixtures (shared across tests in a worker)
  workerSeed: string;
}

// ============================================================================
// BASE TEST WITH FIXTURES
// ============================================================================

export const test = base.extend<TestFixtures, TestWorkerFixtures>({
  // Worker-level seed for reproducibility
  workerSeed: [
    async ({}, use, workerInfo) => {
      const seed = process.env.FUZZ_SEED || `worker-${workerInfo.workerIndex}-${Date.now()}`;
      await use(seed);
    },
    { scope: 'worker' },
  ],

  // Setup page helper
  setupPage: async ({ page }, use) => {
    const setupFn = async () => {
      await waitForStableDOM(page);
      await dismissAllBlockingModals(page);
    };
    await use(setupFn);
  },

  // Clear database helper
  clearDatabase: async ({ page }, use) => {
    const clearFn = async () => {
      await clearIndexedDB(page);
    };
    await use(clearFn);
  },

  // Seed small dataset
  seedSmallDataset: async ({ page }, use) => {
    const seedFn = async () => {
      const config = { ...SEED_CONFIGS.small, seed: 'small-dataset-seed' };
      const data = generateTestData(config);
      const dbData = toIndexedDBFormat(data);
      const firstTripId = data[0]?.id;
      await seedDatabase(page, dbData as Record<string, unknown[]>, firstTripId);
      return data;
    };
    await use(seedFn);
  },

  // Seed large dataset
  seedLargeDataset: async ({ page }, use) => {
    const seedFn = async () => {
      const config = { ...SEED_CONFIGS.large, seed: 'large-dataset-seed' };
      const data = generateTestData(config);
      const dbData = toIndexedDBFormat(data);
      const firstTripId = data[0]?.id;
      await seedDatabase(page, dbData as Record<string, unknown[]>, firstTripId);
      return data;
    };
    await use(seedFn);
  },

  // Seed custom dataset
  seedCustomDataset: async ({ page }, use) => {
    const seedFn = async (config: { size: SeedSize; seed?: string }) => {
      const fullConfig = { ...SEED_CONFIGS[config.size], seed: config.seed };
      const data = generateTestData(fullConfig);
      const dbData = toIndexedDBFormat(data);
      const firstTripId = data[0]?.id;
      await seedDatabase(page, dbData as Record<string, unknown[]>, firstTripId);
      return data;
    };
    await use(seedFn);
  },

  // Enable captain mode
  enableCaptainMode: async ({ page }, use) => {
    const enableFn = async (pin?: string) => {
      return enableCaptainModeHelper(page, pin);
    };
    await use(enableFn);
  },

  // Performance trace start
  startPerformanceTrace: async ({ page }, use) => {
    const startFn = async () => {
      await page.evaluate(() => {
        (window as unknown as Record<string, unknown>).__perfStart = performance.now();
        (window as unknown as Record<string, unknown>).__resourceCount =
          performance.getEntriesByType('resource').length;
      });
    };
    await use(startFn);
  },

  // Performance trace stop
  stopPerformanceTrace: async ({ page }, use) => {
    const stopFn = async () => {
      return page.evaluate(() => {
        const start = (window as unknown as Record<string, number>).__perfStart || 0;
        const startResources = (window as unknown as Record<string, number>).__resourceCount || 0;
        const endResources = performance.getEntriesByType('resource').length;

        return {
          navigationTime: performance.now() - start,
          resources: endResources - startResources,
        };
      });
    };
    await use(stopFn);
  },

  // Chaos mode flags
  chaosEnabled: async ({}, use) => {
    const enabled = process.env.CHAOS_ENABLED === '1' || process.env.CHAOS_ENABLED === 'true';
    await use(enabled);
  },

  chaosLatencyMs: async ({}, use) => {
    const latency = parseInt(process.env.CHAOS_LATENCY_MS || '0', 10);
    await use(latency);
  },

  chaosErrorRate: async ({}, use) => {
    const rate = parseFloat(process.env.CHAOS_ERROR_RATE || '0');
    await use(rate);
  },
});

export { expect };

// ============================================================================
// TAGGED TEST HELPERS
// ============================================================================

/**
 * Create a test tagged for smoke testing (fast, critical path)
 */
export const smokeTest = test.extend({});
smokeTest.use({});

/**
 * Create a test tagged for regression testing
 */
export const regressionTest = test.extend({});
regressionTest.use({});

/**
 * Create a test tagged for nightly runs
 */
export const nightlyTest = test.extend({});
nightlyTest.use({});
