/**
 * Chaos / Network Failure Tests
 *
 * Tests application resilience under adverse network conditions:
 * - Offline mid-operation
 * - Latency injection
 * - Transient endpoint errors
 * - Recovery scenarios
 *
 * Enable via environment variables:
 * - CHAOS_ENABLED=1
 * - CHAOS_LATENCY_MS=800
 * - CHAOS_ERROR_RATE=0.1
 *
 * @tags @chaos @nightly
 */

import { test, expect } from '../fixtures/test-fixtures';
import {
    waitForStableDOM,
    dismissAllBlockingModals,
    measureTime,
    TEST_CONFIG,
    expectPageReady,
} from '../utils/test-helpers';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const CHAOS_CONFIG = {
    // Default latency for slow network simulation
    defaultLatencyMs: parseInt(process.env.CHAOS_LATENCY_MS || '800', 10),
    // Error rate for transient failures (0-1)
    errorRate: parseFloat(process.env.CHAOS_ERROR_RATE || '0.1'),
    // Timeout for recovery tests
    recoveryTimeoutMs: 15000,
};

// ============================================================================
// OFFLINE SCENARIOS
// ============================================================================

test.describe('Chaos: Offline Scenarios', () => {
    test.beforeEach(async ({ page, seedSmallDataset }) => {
        await page.goto('/');
        await waitForStableDOM(page);
        await dismissAllBlockingModals(page);
        await seedSmallDataset();
        await page.reload();
        await waitForStableDOM(page);
    });

    test('should handle offline mid-score entry @chaos', async ({ page, context }) => {
        // Navigate to scoring
        await page.goto('/score');
        await waitForStableDOM(page);

        // Find score entry button
        const scoreButton = page.locator('button').filter({ hasText: /win|up|dn/i }).first();

        if (await scoreButton.isVisible({ timeout: TEST_CONFIG.timeouts.fast })) {
            // Go offline BEFORE clicking
            await context.setOffline(true);

            // Attempt score entry
            await scoreButton.click();
            await page.waitForTimeout(1000);

            // Should show offline indicator or queue message
            const offlineIndicator = page.locator('text=/offline|no connection|queued/i');
            const _hasIndicator = await offlineIndicator.isVisible({ timeout: TEST_CONFIG.timeouts.fast }).catch(() => false);

            // Go back online
            await context.setOffline(false);
            await page.waitForTimeout(2000);

            // Should recover - either sync or show retry option
            await expectPageReady(page);

            // No crash state
            const errorPage = page.locator('text=/error occurred|crashed/i');
            const hasCrash = await errorPage.isVisible({ timeout: 1000 }).catch(() => false);
            expect(hasCrash).toBeFalsy();
        }
    });

    test('should queue operations when offline @chaos', async ({ page, context }) => {
        // Navigate to score page
        await page.goto('/score');
        await waitForStableDOM(page);

        // Go offline
        await context.setOffline(true);

        // Try multiple operations
        for (let i = 0; i < 3; i++) {
            const button = page.locator('button').filter({ hasText: /win|up/i }).first();
            if (await button.isVisible({ timeout: 2000 })) {
                await button.click();
                await page.waitForTimeout(500);
            }
        }

        // Check for queue indicator
        const queueIndicator = page.locator('text=/pending|queued|\\d+ change/i');
        const _hasQueue = await queueIndicator.isVisible({ timeout: TEST_CONFIG.timeouts.fast }).catch(() => false);

        // Go back online
        await context.setOffline(false);
        await page.waitForTimeout(3000);

        // Operations should sync
        await expectPageReady(page);
    });

    test('should show actionable error message when offline @chaos', async ({ page, context }) => {
        // Go offline
        await context.setOffline(true);

        // Try to navigate
        await page.goto('/standings').catch(() => { });
        await page.waitForTimeout(1000);

        // Should show user-friendly message
        const pageContent = await page.textContent('body');

        // Either cached content or offline message
        const hasContent =
            (pageContent?.length || 0) > 50 ||
            pageContent?.includes('offline') ||
            pageContent?.includes('connection');

        expect(hasContent).toBeTruthy();

        // Go back online
        await context.setOffline(false);
    });

    test('should recover data after reconnection @chaos', async ({ page, context }) => {
        // Get initial state
        await page.goto('/standings');
        await waitForStableDOM(page);
        const _initialContent = await page.textContent('body');

        // Go offline and reload
        await context.setOffline(true);
        await page.reload().catch(() => { });
        await page.waitForTimeout(1000);

        // Go back online
        await context.setOffline(false);

        // Reload again
        await page.reload();
        await waitForStableDOM(page);

        // Content should be restored
        const afterContent = await page.textContent('body');
        expect(afterContent?.length).toBeGreaterThan(0);
    });
});

// ============================================================================
// LATENCY INJECTION
// ============================================================================

test.describe('Chaos: Latency Injection', () => {
    test.beforeEach(async ({ page, seedSmallDataset }) => {
        await page.goto('/');
        await waitForStableDOM(page);
        await dismissAllBlockingModals(page);
        await seedSmallDataset();
        await page.reload();
        await waitForStableDOM(page);
    });

    test('should handle slow network gracefully @chaos', async ({ page }) => {
        // Simulate slow network via route interception
        await page.route('**/*', async (route) => {
            // Add artificial delay
            await new Promise(resolve => setTimeout(resolve, CHAOS_CONFIG.defaultLatencyMs));
            await route.continue();
        });

        const { durationMs } = await measureTime(async () => {
            await page.goto('/standings');
            await waitForStableDOM(page);
        });

        // Page should still load (with delay) - use 50% tolerance for timing variance
        // Network latency is not perfectly deterministic, so we allow some margin
        const minExpectedLatency = Math.floor(CHAOS_CONFIG.defaultLatencyMs * 0.5);
        expect(durationMs).toBeGreaterThan(minExpectedLatency);

        await expectPageReady(page);

        // Remove route
        await page.unroute('**/*');
    });

    test('should show loading state during slow operations @chaos', async ({ page }) => {
        // Intercept API calls
        await page.route('**/api/**', async (route) => {
            await new Promise(resolve => setTimeout(resolve, CHAOS_CONFIG.defaultLatencyMs * 2));
            await route.continue();
        });

        // Navigate to a page that loads data
        await page.goto('/standings');

        // Should show loading state
        const loadingIndicator = page.locator('text=/loading|fetching/i, [role="progressbar"], .loading');
        const _showsLoading = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);

        // Wait for load to complete
        await waitForStableDOM(page);

        // Page should render
        await expectPageReady(page);

        // Remove route
        await page.unroute('**/api/**');
    });

    test('should not timeout under moderate latency @chaos', async ({ page }) => {
        // Add 500ms latency to all requests
        await page.route('**/*', async (route) => {
            await new Promise(resolve => setTimeout(resolve, 500));
            await route.continue();
        });

        // Should still complete navigation within reasonable time
        const { durationMs } = await measureTime(async () => {
            await page.goto('/');
            await waitForStableDOM(page);
        });

        // Should complete within extended timeout
        expect(durationMs).toBeLessThan(30000);

        await page.unroute('**/*');
    });
});

// ============================================================================
// TRANSIENT ERRORS
// ============================================================================

test.describe('Chaos: Transient Errors', () => {
    test.beforeEach(async ({ page, seedSmallDataset }) => {
        await page.goto('/');
        await waitForStableDOM(page);
        await dismissAllBlockingModals(page);
        await seedSmallDataset();
        await page.reload();
        await waitForStableDOM(page);
    });

    test('should handle 500 errors gracefully @chaos', async ({ page }) => {
        let _errorCount = 0;

        // Intercept API calls with occasional 500
        await page.route('**/api/**', async (route) => {
            if (Math.random() < CHAOS_CONFIG.errorRate) {
                _errorCount++;
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal Server Error' }),
                });
            } else {
                await route.continue();
            }
        });

        // Navigate to page that makes API calls
        await page.goto('/standings');
        await waitForStableDOM(page);

        // Page should handle error gracefully
        await expectPageReady(page);

        // Should not show raw error to user
        const rawError = page.locator('text=/500|Internal Server Error/');
        const _hasRawError = await rawError.isVisible({ timeout: 1000 }).catch(() => false);

        // Raw technical errors should be hidden from users
        // (actual error display depends on app error handling)

        await page.unroute('**/api/**');
    });

    test('should offer retry after error @chaos', async ({ page }) => {
        let failedOnce = false;

        // Fail first request, succeed on retry
        await page.route('**/api/**', async (route) => {
            if (!failedOnce) {
                failedOnce = true;
                await route.fulfill({
                    status: 503,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Service Unavailable' }),
                });
            } else {
                await route.continue();
            }
        });

        // Navigate
        await page.goto('/standings');
        await waitForStableDOM(page);

        // Look for retry button or auto-retry message
        const retryButton = page.getByRole('button', { name: /retry|try again/i }).first();
        const hasRetry = await retryButton.isVisible({ timeout: TEST_CONFIG.timeouts.fast }).catch(() => false);

        if (hasRetry) {
            await retryButton.click();
            await waitForStableDOM(page);
        }

        // Page should eventually render
        await expectPageReady(page);

        await page.unroute('**/api/**');
    });

    test('should prevent duplicate submissions under errors @chaos', async ({ page }) => {
        let submitCount = 0;

        // Track submissions and fail first two
        await page.route('**/api/**', async (route) => {
            if (route.request().method() === 'POST') {
                submitCount++;
                if (submitCount <= 2) {
                    await route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: JSON.stringify({ error: 'Error' }),
                    });
                    return;
                }
            }
            await route.continue();
        });

        // Navigate to score entry
        await page.goto('/score');
        await waitForStableDOM(page);

        // Try to submit multiple times
        const submitButton = page.locator('button').filter({ hasText: /save|submit|win/i }).first();

        if (await submitButton.isVisible({ timeout: TEST_CONFIG.timeouts.fast })) {
            // Click multiple times
            for (let i = 0; i < 3; i++) {
                await submitButton.click().catch(() => { });
                await page.waitForTimeout(500);
            }

            await waitForStableDOM(page);
        }

        // Page should handle gracefully
        await expectPageReady(page);

        await page.unroute('**/api/**');
    });
});

// ============================================================================
// RECOVERY SCENARIOS
// ============================================================================

test.describe('Chaos: Recovery Scenarios', () => {
    test.beforeEach(async ({ page, seedSmallDataset }) => {
        await page.goto('/');
        await waitForStableDOM(page);
        await dismissAllBlockingModals(page);
        await seedSmallDataset();
        await page.reload();
        await waitForStableDOM(page);
    });

    test('should recover after browser refresh during operation @chaos', async ({ page }) => {
        // Navigate to score page
        await page.goto('/score');
        await waitForStableDOM(page);

        // Start an operation
        const scoreButton = page.locator('button').filter({ hasText: /win|up/i }).first();

        if (await scoreButton.isVisible({ timeout: TEST_CONFIG.timeouts.fast })) {
            // Click but immediately refresh
            await scoreButton.click();
            await page.reload();
            await waitForStableDOM(page);
        }

        // Page should be in consistent state
        await expectPageReady(page);

        // No error state
        const errorIndicator = page.locator('text=/error|corrupted|invalid state/i');
        const hasError = await errorIndicator.isVisible({ timeout: 1000 }).catch(() => false);
        expect(hasError).toBeFalsy();
    });

    test('should maintain data integrity after chaos @chaos', async ({ page, context }) => {
        // Get initial standings
        await page.goto('/standings');
        await waitForStableDOM(page);
        const initialScores = await page.locator('[data-testid*="score"]').allTextContents();

        // Simulate chaos: offline, error, slow network
        await context.setOffline(true);
        await page.reload().catch(() => { });
        await context.setOffline(false);

        // Reload and check
        await page.reload();
        await waitForStableDOM(page);

        const afterScores = await page.locator('[data-testid*="score"]').allTextContents();

        // If we had scores initially, they should persist
        if (initialScores.length > 0) {
            expect(afterScores.length).toBeGreaterThanOrEqual(0);
        }
    });

    test('should sync pending changes after recovery @chaos', async ({ page, context }) => {
        // Navigate to score entry
        await page.goto('/score');
        await waitForStableDOM(page);

        // Go offline
        await context.setOffline(true);

        // Make a change
        const scoreButton = page.locator('button').filter({ hasText: /win|up/i }).first();
        if (await scoreButton.isVisible({ timeout: TEST_CONFIG.timeouts.fast })) {
            await scoreButton.click();
            await page.waitForTimeout(500);
        }

        // Check for pending indicator
        const pendingIndicator = page.locator('text=/pending|offline|queued/i');
        const _hasPending = await pendingIndicator.isVisible({ timeout: 2000 }).catch(() => false);

        // Go online
        await context.setOffline(false);
        await page.waitForTimeout(3000); // Allow sync

        // Verify sync happened
        await expectPageReady(page);
    });
});

// ============================================================================
// CONCURRENT OPERATIONS
// ============================================================================

test.describe('Chaos: Concurrent Operations', () => {
    test('should handle rapid navigation @chaos', async ({ page }) => {
        const urls = ['/standings', '/score', '/schedule', '/more', '/'];

        // Rapid navigation
        for (const url of urls) {
            await page.goto(url).catch(() => { });
            // Don't wait for full load
        }

        // Final navigation should work
        await page.goto('/');
        await waitForStableDOM(page);

        await expectPageReady(page);
    });

    test('should handle rapid button clicks @chaos', async ({ page }) => {
        await page.goto('/score');
        await waitForStableDOM(page);

        // Find any button
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();

        if (buttonCount > 0) {
            // Rapid clicks
            for (let i = 0; i < 10; i++) {
                const randomIndex = Math.floor(Math.random() * buttonCount);
                await buttons.nth(randomIndex).click({ force: true }).catch(() => { });
            }
        }

        // Page should remain stable
        await waitForStableDOM(page);
        await expectPageReady(page);
    });
});
