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
import {
    waitForStableDOM,
    dismissAllBlockingModals,
    clearIndexedDB,
} from '../utils/test-helpers';
import {
    generateTestData,
    toIndexedDBFormat,
    SEED_CONFIGS,
    type SeedSize,
    type GeneratedTrip,
} from '../utils/seeder';

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
    workerSeed: [async ({ }, use, workerInfo) => {
        const seed = process.env.FUZZ_SEED || `worker-${workerInfo.workerIndex}-${Date.now()}`;
        await use(seed);
    }, { scope: 'worker' }],

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

            await page.evaluate((seedData) => {
                return new Promise<void>((resolve, reject) => {
                    const request = indexedDB.open('GolfTripDB');
                    request.onsuccess = () => {
                        const db = request.result;
                        try {
                            const tx = db.transaction(['trips', 'players', 'teams', 'teamMembers', 'sessions', 'matches'], 'readwrite');

                            for (const [tableName, records] of Object.entries(seedData)) {
                                const store = tx.objectStore(tableName);
                                for (const record of records as unknown[]) {
                                    store.put(record);
                                }
                            }

                            tx.oncomplete = () => resolve();
                            tx.onerror = () => reject(tx.error);
                        } catch (e) {
                            reject(e);
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
            }, dbData);

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

            await page.evaluate((seedData) => {
                return new Promise<void>((resolve, reject) => {
                    const request = indexedDB.open('GolfTripDB');
                    request.onsuccess = () => {
                        const db = request.result;
                        try {
                            const tx = db.transaction(['trips', 'players', 'teams', 'teamMembers', 'sessions', 'matches'], 'readwrite');

                            for (const [tableName, records] of Object.entries(seedData)) {
                                const store = tx.objectStore(tableName);
                                for (const record of records as unknown[]) {
                                    store.put(record);
                                }
                            }

                            tx.oncomplete = () => resolve();
                            tx.onerror = () => reject(tx.error);
                        } catch (e) {
                            reject(e);
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
            }, dbData);

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

            await page.evaluate((seedData) => {
                return new Promise<void>((resolve, reject) => {
                    const request = indexedDB.open('GolfTripDB');
                    request.onsuccess = () => {
                        const db = request.result;
                        try {
                            const tx = db.transaction(['trips', 'players', 'teams', 'teamMembers', 'sessions', 'matches'], 'readwrite');

                            for (const [tableName, records] of Object.entries(seedData)) {
                                const store = tx.objectStore(tableName);
                                for (const record of records as unknown[]) {
                                    store.put(record);
                                }
                            }

                            tx.oncomplete = () => resolve();
                            tx.onerror = () => reject(tx.error);
                        } catch (e) {
                            reject(e);
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
            }, dbData);

            return data;
        };
        await use(seedFn);
    },

    // Enable captain mode
    enableCaptainMode: async ({ page }, use) => {
        const enableFn = async (pin?: string) => {
            await page.goto('/captain');
            await waitForStableDOM(page);

            const pinInput = page.locator('input[type="password"], input[type="tel"], input[pattern]');

            if (await pinInput.count() > 0 && pin) {
                await pinInput.first().fill(pin);
                await page.locator('button[type="submit"], button:has-text("Verify")').first().click();
                await waitForStableDOM(page);
            }

            const captainIndicator = page.locator('text=/captain mode|captain enabled/i');
            return await captainIndicator.isVisible({ timeout: 5000 }).catch(() => false);
        };
        await use(enableFn);
    },

    // Performance trace start
    startPerformanceTrace: async ({ page }, use) => {
        const startFn = async () => {
            await page.evaluate(() => {
                (window as unknown as Record<string, unknown>).__perfStart = performance.now();
                (window as unknown as Record<string, unknown>).__resourceCount = performance.getEntriesByType('resource').length;
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
    chaosEnabled: async ({ }, use) => {
        const enabled = process.env.CHAOS_ENABLED === '1' || process.env.CHAOS_ENABLED === 'true';
        await use(enabled);
    },

    chaosLatencyMs: async ({ }, use) => {
        const latency = parseInt(process.env.CHAOS_LATENCY_MS || '0', 10);
        await use(latency);
    },

    chaosErrorRate: async ({ }, use) => {
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
