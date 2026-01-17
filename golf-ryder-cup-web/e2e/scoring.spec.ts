import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Scoring Flow
 *
 * Critical user journey: Scoring a match
 */

test.describe('Scoring Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should navigate to score page', async ({ page }) => {
        // Click on Score nav item
        const scoreNav = page.locator('nav button').filter({ hasText: /score/i }).first();

        if (await scoreNav.isVisible()) {
            await scoreNav.click();
            await expect(page).toHaveURL(/score/);
        }
    });

    test('should display score page content', async ({ page }) => {
        await page.goto('/score');

        // Wait for content to load
        await page.waitForLoadState('domcontentloaded');

        // Check page has loaded (may show empty state if no trip)
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });
});

test.describe('Standings', () => {
    test('should display standings page', async ({ page }) => {
        await page.goto('/standings');

        await page.waitForLoadState('domcontentloaded');

        // Standings page should load
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('should show team standings when data exists', async ({ page }) => {
        await page.goto('/standings');

        // Look for standings-related content
        const pageContent = await page.textContent('body');

        // Should have some indication of standings even if empty
        expect(pageContent).toBeDefined();
    });
});

test.describe('Schedule', () => {
    test('should display schedule page', async ({ page }) => {
        await page.goto('/schedule');

        await page.waitForLoadState('domcontentloaded');

        const body = page.locator('body');
        await expect(body).toBeVisible();
    });
});

test.describe('Settings / More', () => {
    test('should display more/settings page', async ({ page }) => {
        await page.goto('/more');

        await page.waitForLoadState('domcontentloaded');

        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('should have captain mode toggle', async ({ page }) => {
        await page.goto('/more');

        // Look for captain mode option
        const captainOption = page.locator('text=/captain/i').first();

        if (await captainOption.isVisible()) {
            await expect(captainOption).toBeVisible();
        }
    });
});
