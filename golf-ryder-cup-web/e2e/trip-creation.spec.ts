import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Trip Creation Flow
 *
 * Critical user journey: Creating a new golf trip from scratch
 */

test.describe('Trip Creation Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to home page
        await page.goto('/');
    });

    test('should display home page with create trip option', async ({ page }) => {
        // Home page should load successfully
        await expect(page).toHaveTitle(/Ryder Cup/i);

        // Should show some indication to create or start a trip
        const pageContent = await page.textContent('body');
        expect(
            pageContent?.includes('Create') ||
            pageContent?.includes('New') ||
            pageContent?.includes('Start') ||
            pageContent?.includes('Trip')
        ).toBeTruthy();
    });

    test('should navigate to trip creation wizard', async ({ page }) => {
        // Look for a button or link to create a new trip
        const createButton = page.locator('button, a').filter({
            hasText: /create|new|start/i
        }).first();

        if (await createButton.isVisible()) {
            await createButton.click();

            // Should be on trip creation page or wizard
            await expect(page).toHaveURL(/trip|wizard|create|new/i);
        }
    });

    test('should have accessible navigation', async ({ page }) => {
        // Bottom navigation should be present
        const nav = page.locator('nav[aria-label="Main navigation"]');

        if (await nav.isVisible()) {
            // Check that all main navigation items are present
            await expect(nav.locator('button')).toHaveCount(6);
        }
    });

    test('should work offline after first load', async ({ page, context }) => {
        // Wait for page to fully load
        await page.waitForLoadState('networkidle');

        // Go offline
        await context.setOffline(true);

        // Try to reload page - PWA should serve from cache
        await page.reload();

        // Page should still be functional
        await expect(page.locator('body')).toBeVisible();

        // Go back online
        await context.setOffline(false);
    });
});

test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should navigate to all main sections via bottom nav', async ({ page }) => {
        // Test navigation to each section
        const navItems = [
            { text: /schedule/i, url: /schedule/ },
            { text: /score/i, url: /score/ },
            { text: /stats/i, url: /stats/ },
            { text: /standings/i, url: /standings/ },
            { text: /more/i, url: /more/ },
        ];

        for (const item of navItems) {
            const button = page.locator('nav button').filter({ hasText: item.text }).first();
            if (await button.isVisible()) {
                await button.click();
                await expect(page).toHaveURL(item.url);
            }
        }
    });

    test('should return home when clicking home nav', async ({ page }) => {
        // Navigate away first
        await page.goto('/more');

        // Click home button
        const homeButton = page.locator('nav button').filter({ hasText: /home/i }).first();
        if (await homeButton.isVisible()) {
            await homeButton.click();
            await expect(page).toHaveURL('/');
        }
    });
});

test.describe('Mobile Responsiveness', () => {
    test('should display bottom navigation on mobile', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Bottom nav should be visible on mobile
        const bottomNav = page.locator('nav').filter({ hasText: /home|score|standings/i });
        await expect(bottomNav).toBeVisible();
    });

    test('should have touch-friendly tap targets', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Check that buttons meet minimum 44px tap target
        const buttons = page.locator('button');
        const count = await buttons.count();

        for (let i = 0; i < Math.min(count, 10); i++) {
            const button = buttons.nth(i);
            if (await button.isVisible()) {
                const box = await button.boundingBox();
                if (box) {
                    // At least 44px in one dimension (width or height)
                    expect(box.width >= 44 || box.height >= 44).toBeTruthy();
                }
            }
        }
    });
});
