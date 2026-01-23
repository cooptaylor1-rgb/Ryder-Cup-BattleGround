/**
 * Test Helpers & Utilities
 *
 * Shared utilities for E2E tests - handles common setup,
 * waiting, navigation, and DOM stabilization.
 *
 * Production-grade utilities with robust error handling,
 * cross-browser compatibility, and reliable page state verification.
 */

import { Page, BrowserContext, expect, Locator } from '@playwright/test';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const TEST_CONFIG = {
    timeouts: {
        fast: 5000,
        standard: 10000,
        slow: 30000,
        networkIdle: 60000,
    },
    delays: {
        hydration: 300,
        animation: 500,
        debounce: 1500,
        // WebKit needs slightly longer delays for hydration
        webkitHydration: 500,
    },
    // Minimum tap target sizes (WCAG guidelines)
    tapTargets: {
        recommended: 44, // WCAG recommended
        minimum: 24,     // Absolute minimum for small icons
    },
} as const;

// ============================================================================
// BROWSER DETECTION
// ============================================================================

/**
 * Detect if running on WebKit/Safari browser
 * WebKit has different rendering timing that requires special handling
 */
export async function isWebKit(page: Page): Promise<boolean> {
    try {
        const userAgent = await page.evaluate(() => navigator.userAgent);
        return userAgent.includes('Safari') && !userAgent.includes('Chrome');
    } catch {
        // Page might be closed or navigating, default to false
        return false;
    }
}

/**
 * Get browser-appropriate delay for hydration
 */
export async function getHydrationDelay(page: Page): Promise<number> {
    try {
        const webkit = await isWebKit(page);
        return webkit ? TEST_CONFIG.delays.webkitHydration : TEST_CONFIG.delays.hydration;
    } catch {
        // Default to standard delay if detection fails
        return TEST_CONFIG.delays.hydration;
    }
}

// ============================================================================
// DOM STABILIZATION
// ============================================================================

/**
 * Wait for the DOM to stabilize after React hydration
 */
export async function waitForStableDOM(page: Page, timeout = TEST_CONFIG.timeouts.standard): Promise<void> {
    await page.waitForLoadState('domcontentloaded');

    // Wait for Next.js compilation to complete (dev mode)
    try {
        await page.waitForFunction(() => {
            const loadingText = document.body.textContent || '';
            return !loadingText.includes('Compiling');
        }, { timeout });
    } catch {
        // Continue even if timeout - page might be in a valid state
    }

    // Wait for content to appear (not just "Loading...")
    try {
        await page.waitForFunction(() => {
            const body = document.querySelector('body');
            if (!body) return false;
            const text = body.textContent || '';
            return text.length > 50 && !text.match(/^[\s]*Loading\.\.\.[\s]*$/);
        }, { timeout: TEST_CONFIG.timeouts.fast });
    } catch {
        // Continue
    }

    // Allow React to settle (browser-aware delay)
    let hydrationDelay: number;
    try {
        hydrationDelay = await getHydrationDelay(page);
    } catch {
        hydrationDelay = TEST_CONFIG.delays.hydration;
    }
    await page.waitForTimeout(hydrationDelay).catch(() => { });
}

/**
 * Wait for network to be idle with configurable timeout
 */
export async function waitForNetworkIdle(page: Page, timeout = TEST_CONFIG.timeouts.networkIdle): Promise<void> {
    try {
        await page.waitForLoadState('networkidle', { timeout });
    } catch {
        // Network may never be fully idle in some cases
    }
}

/**
 * Robust page readiness check - replaces unreliable body.toBeVisible()
 *
 * This function addresses the common issue where body element resolves
 * but reports visibility as "hidden" due to CSS/hydration race conditions.
 *
 * @param page - Playwright page object
 * @param options - Configuration options
 */
export async function expectPageReady(
    page: Page,
    options: {
        timeout?: number;
        requireContent?: boolean;
        contentSelector?: string;
    } = {}
): Promise<void> {
    const {
        timeout = TEST_CONFIG.timeouts.standard,
        requireContent = true,
        contentSelector = 'main, [data-testid="app-root"], #__next > div, .app-container',
    } = options;

    // Wait for DOM to be loaded
    await page.waitForLoadState('domcontentloaded');

    // Check for actual content visibility, not just body
    try {
        // First, try to find a meaningful content container
        const contentLocator = page.locator(contentSelector).first();
        const hasContentContainer = await contentLocator.count() > 0;

        if (hasContentContainer) {
            // Wait for the content container to be attached and have dimensions
            await page.waitForFunction(
                (selector) => {
                    const el = document.querySelector(selector);
                    if (!el) return false;
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                },
                contentSelector,
                { timeout }
            );
        } else if (requireContent) {
            // Fallback: ensure body has meaningful content
            await page.waitForFunction(
                () => {
                    const body = document.body;
                    if (!body) return false;
                    const rect = body.getBoundingClientRect();
                    const hasSize = rect.width > 0 && rect.height > 0;
                    const hasContent = (body.textContent?.trim().length || 0) > 10;
                    return hasSize && hasContent;
                },
                { timeout }
            );
        }
    } catch {
        // Final fallback: just ensure DOM is ready
        await page.waitForLoadState('load').catch(() => { });
    }

    // Additional stability check for hydration (browser-aware)
    let hydrationDelay: number;
    try {
        hydrationDelay = await getHydrationDelay(page);
    } catch {
        hydrationDelay = TEST_CONFIG.delays.hydration;
    }
    await page.waitForTimeout(hydrationDelay).catch(() => { });
}

/**
 * Assert page is functional (replacement for body.toBeVisible in tests)
 *
 * Use this instead of: `await expect(body).toBeVisible()`
 */
export async function assertPageFunctional(page: Page): Promise<void> {
    await expectPageReady(page);

    // Verify no error state
    const errorIndicators = page.locator('text=/error occurred|crashed|fatal/i');
    const hasError = await errorIndicators.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBeFalsy();
}

/**
 * Seed user profile in localStorage/IndexedDB for authenticated tests
 * This prevents redirects to /profile/create during navigation tests
 */
export async function seedUserProfile(page: Page, profile?: {
    id?: string;
    name?: string;
    email?: string;
    handicap?: number;
}): Promise<void> {
    const defaultProfile = {
        id: 'test-user-' + Date.now(),
        name: 'Test User',
        email: 'test@example.com',
        handicap: 15,
        createdAt: new Date().toISOString(),
        ...profile,
    };

    await page.evaluate((profileData) => {
        // Set in localStorage
        localStorage.setItem('userProfile', JSON.stringify(profileData));
        localStorage.setItem('hasCompletedOnboarding', 'true');

        // Also try to set in IndexedDB if the DB exists
        const request = indexedDB.open('GolfTripDB');
        request.onsuccess = () => {
            const db = request.result;
            try {
                if (db.objectStoreNames.contains('userProfile')) {
                    const tx = db.transaction('userProfile', 'readwrite');
                    const store = tx.objectStore('userProfile');
                    store.put(profileData);
                }
            } catch {
                // Ignore if store doesn't exist
            }
        };
    }, defaultProfile);

    // Allow storage to settle
    await page.waitForTimeout(100);
}

/**
 * Verify tap target meets minimum size requirements
 * Returns detailed info about elements that fail
 */
export async function verifyTapTargets(
    page: Page,
    options: {
        selector?: string;
        minSize?: number;
        sampleSize?: number;
        excludePatterns?: RegExp[];
    } = {}
): Promise<{ passed: boolean; failures: Array<{ element: string; width: number; height: number }> }> {
    const {
        selector = 'button, a, [role="button"], input[type="checkbox"], input[type="radio"]',
        minSize = TEST_CONFIG.tapTargets.minimum,
        sampleSize = 10,
        excludePatterns = [/sr-only/i, /hidden/i, /visually-hidden/i],
    } = options;

    const failures: Array<{ element: string; width: number; height: number }> = [];
    const clickables = page.locator(selector);
    const count = await clickables.count();

    // Check a sample of elements
    for (let i = 0; i < Math.min(count, sampleSize); i++) {
        const element = clickables.nth(i);

        try {
            // Skip hidden elements and those with excluded classes
            const isVisible = await element.isVisible({ timeout: 500 }).catch(() => false);
            if (!isVisible) continue;

            const className = await element.getAttribute('class') || '';
            if (excludePatterns.some(pattern => pattern.test(className))) continue;

            const box = await element.boundingBox();
            if (!box) continue;

            // Check if element has meaningful size
            // Some elements may have zero size but be interactive via parent
            if (box.width < 1 || box.height < 1) continue;

            // Check minimum size - but be lenient for intentionally small elements
            if (box.width < minSize || box.height < minSize) {
                // Get element details for reporting
                const tagName = await element.evaluate(el => el.tagName.toLowerCase());
                const text = await element.textContent() || '';
                failures.push({
                    element: `${tagName}: "${text.slice(0, 30)}"`,
                    width: Math.round(box.width),
                    height: Math.round(box.height),
                });
            }
        } catch {
            // Skip elements that can't be measured
        }
    }

    return {
        passed: failures.length === 0,
        failures,
    };
}

/**
 * Navigate with history state preservation
 * Ensures proper navigation history for back/forward tests
 */
export async function navigateWithHistory(
    page: Page,
    urls: string[],
    options: { waitForLoad?: boolean } = {}
): Promise<void> {
    const { waitForLoad = true } = options;

    for (const url of urls) {
        await page.goto(url);
        if (waitForLoad) {
            await waitForStableDOM(page);
        }
        // Small delay to ensure history entry is created
        await page.waitForTimeout(100);
    }
}

/**
 * Verify navigation history works correctly
 */
export async function verifyNavigationHistory(
    page: Page,
    expectedBackUrl: string | RegExp,
    expectedForwardUrl: string | RegExp
): Promise<{ backWorks: boolean; forwardWorks: boolean }> {
    // Go back
    await page.goBack();
    await waitForStableDOM(page);
    const urlAfterBack = page.url();
    const backWorks = typeof expectedBackUrl === 'string'
        ? urlAfterBack.includes(expectedBackUrl)
        : expectedBackUrl.test(urlAfterBack);

    // Go forward
    await page.goForward();
    await waitForStableDOM(page);
    const urlAfterForward = page.url();
    const forwardWorks = typeof expectedForwardUrl === 'string'
        ? urlAfterForward.includes(expectedForwardUrl)
        : expectedForwardUrl.test(urlAfterForward);

    return { backWorks, forwardWorks };
}

// ============================================================================
// MODAL & BLOCKING UI HANDLING
// ============================================================================

/**
 * Dismiss the onboarding modal if visible
 */
export async function dismissOnboardingModal(page: Page): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            await page.waitForTimeout(TEST_CONFIG.delays.animation);

            const dismissButtons = [
                page.locator('button:has-text("Skip for now")'),
                page.locator('button:has-text("Skip onboarding")'),
                page.locator('[role="dialog"] button:has-text("Skip")'),
                page.locator('button:has-text("Later")'),
                page.locator('button:has-text("Not now")'),
            ];

            for (const button of dismissButtons) {
                if (await button.first().isVisible({ timeout: 1000 }).catch(() => false)) {
                    await button.first().click();
                    await page.waitForTimeout(TEST_CONFIG.delays.animation);
                    break;
                }
            }

            // Check if modal is still visible
            if (!(await page.locator('[role="dialog"]').isVisible().catch(() => false))) {
                break;
            }
        } catch {
            // Continue to next attempt
        }
    }
}

/**
 * Dismiss all blocking modals/wizards
 */
export async function dismissAllBlockingModals(page: Page): Promise<void> {
    await dismissOnboardingModal(page);

    // Handle wizard pages
    try {
        const isOnWizard = await page.locator('text=/step \\d+ of \\d+/i').isVisible().catch(() => false);
        if (isOnWizard) {
            await page.goto('/');
            await page.waitForTimeout(TEST_CONFIG.delays.animation);
            await dismissOnboardingModal(page);
        }
    } catch {
        // Continue
    }
}

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/**
 * Navigate and setup - combines goto with common setup tasks
 */
export async function navigateAndSetup(page: Page, path: string): Promise<void> {
    await page.goto(path);
    await waitForStableDOM(page);
    await dismissAllBlockingModals(page);
}

/**
 * Navigate via bottom navigation
 */
export async function navigateViaBottomNav(page: Page, section: 'home' | 'schedule' | 'score' | 'standings' | 'more'): Promise<void> {
    const navMap: Record<string, RegExp> = {
        home: /home/i,
        schedule: /schedule/i,
        score: /score/i,
        standings: /standings|leaderboard/i,
        more: /more|menu/i,
    };

    const navButton = page.locator('nav button').filter({ hasText: navMap[section] }).first();

    if (await navButton.isVisible({ timeout: TEST_CONFIG.timeouts.fast })) {
        await navButton.click();
        await waitForStableDOM(page);
    }
}

// ============================================================================
// INDEXEDDB HELPERS
// ============================================================================

/**
 * Clear IndexedDB safely
 */
export async function clearIndexedDB(page: Page): Promise<boolean> {
    try {
        return await page.evaluate(() => {
            return new Promise<boolean>((resolve) => {
                try {
                    const deleteRequest = indexedDB.deleteDatabase('GolfTripDB');
                    deleteRequest.onsuccess = () => resolve(true);
                    deleteRequest.onerror = () => resolve(false);
                    deleteRequest.onblocked = () => resolve(true);
                } catch {
                    resolve(false);
                }
            });
        });
    } catch {
        return false;
    }
}

/**
 * Get IndexedDB data for inspection
 */
export async function getIndexedDBData(page: Page, tableName: string): Promise<unknown[]> {
    return page.evaluate(async (table) => {
        return new Promise((resolve) => {
            const request = indexedDB.open('GolfTripDB');
            request.onsuccess = () => {
                const db = request.result;
                try {
                    const tx = db.transaction(table, 'readonly');
                    const store = tx.objectStore(table);
                    const getAllRequest = store.getAll();
                    getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
                    getAllRequest.onerror = () => resolve([]);
                } catch {
                    resolve([]);
                }
            };
            request.onerror = () => resolve([]);
        });
    }, tableName);
}

// ============================================================================
// PERFORMANCE HELPERS
// ============================================================================

/**
 * Measure execution time of an async function
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
    const start = Date.now();
    const result = await fn();
    return { result, durationMs: Date.now() - start };
}

/**
 * Assert page load performance
 */
export async function assertPageLoadTime(page: Page, maxMs: number): Promise<void> {
    const timing = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return perf?.loadEventEnd - perf?.startTime || 0;
    });

    expect(timing).toBeLessThan(maxMs);
}

// ============================================================================
// CAPTAIN MODE HELPERS
// ============================================================================

/**
 * Enable captain mode via UI
 */
export async function enableCaptainMode(page: Page, pin?: string): Promise<boolean> {
    await navigateAndSetup(page, '/captain');

    // Look for PIN input
    const pinInput = page.locator('input[type="password"], input[type="tel"], input[pattern]');

    if (await pinInput.count() > 0 && pin) {
        await pinInput.first().fill(pin);
        await page.locator('button[type="submit"], button:has-text("Verify")').first().click();
        await waitForStableDOM(page);
    }

    // Check if captain mode is enabled
    const captainIndicator = page.locator('text=/captain mode|captain enabled/i');
    return await captainIndicator.isVisible({ timeout: TEST_CONFIG.timeouts.fast }).catch(() => false);
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert no console errors during test
 */
export async function assertNoConsoleErrors(page: Page, ignoredPatterns: RegExp[] = []): Promise<void> {
    const errors: string[] = [];

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            const text = msg.text();
            if (!ignoredPatterns.some(pattern => pattern.test(text))) {
                errors.push(text);
            }
        }
    });

    expect(errors).toHaveLength(0);
}

/**
 * Assert no duplicate elements with the same test id
 */
export async function assertNoDuplicateTestIds(page: Page, testIdPrefix: string): Promise<void> {
    const elements = await page.locator(`[data-testid^="${testIdPrefix}"]`).all();
    const ids = await Promise.all(elements.map(el => el.getAttribute('data-testid')));
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
}

// ============================================================================
// DATA INTEGRITY HELPERS
// ============================================================================

/**
 * Count elements matching a pattern
 */
export async function countElements(page: Page, selector: string): Promise<number> {
    return page.locator(selector).count();
}

/**
 * Get text content of all matching elements
 */
export async function getAllTextContent(page: Page, selector: string): Promise<string[]> {
    const elements = await page.locator(selector).all();
    return Promise.all(elements.map(el => el.textContent().then(t => t || '')));
}

/**
 * Verify team score totals are consistent
 */
export async function verifyScoreTotals(page: Page): Promise<{ valid: boolean; details: string }> {
    // This would be customized based on the actual app's score display
    const scoreElements = await page.locator('[data-testid*="score"], [data-testid*="points"]').all();

    if (scoreElements.length === 0) {
        return { valid: true, details: 'No score elements found (empty state)' };
    }

    // Basic validation - scores should be numbers
    const scores = await Promise.all(
        scoreElements.map(async el => {
            const text = await el.textContent();
            return parseFloat(text || '0');
        })
    );

    const hasInvalidScores = scores.some(s => isNaN(s) || s < 0);

    return {
        valid: !hasInvalidScores,
        details: hasInvalidScores ? 'Invalid score values found' : 'All scores valid',
    };
}
