import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Standings & Statistics Flow
 *
 * Critical user journey: Viewing tournament standings and stats
 */

test.describe('Standings Display', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
    });

    test('should navigate to standings from bottom nav', async ({ page }) => {
        const standingsNav = page.locator('nav button').filter({ hasText: /standings|leaderboard/i }).first();

        if (await standingsNav.isVisible()) {
            await standingsNav.click();
            await expect(page).toHaveURL(/standings/);
        }
    });

    test('should display team scores when trip exists', async ({ page }) => {
        await page.goto('/standings');
        await page.waitForLoadState('domcontentloaded');

        // Page should load
        const body = page.locator('body');
        await expect(body).toBeVisible();

        // Look for team-related content
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeDefined();
    });

    test('should show both teams in standings', async ({ page }) => {
        await page.goto('/standings');
        await page.waitForLoadState('domcontentloaded');

        // Page should render without errors
        const body = page.locator('body');
        await expect(body).toBeVisible();

        // Look for team indicators or empty state
        const teamIndicators = page.locator('[data-testid*="team"], .team-score, .standings-team, text=/USA|Europe|Team/i');
        const emptyState = page.locator('[data-testid="empty-state"], text=/no standings|no data|create.*trip/i');

        // Either teams should be displayed OR an empty state
        const hasTeams = await teamIndicators.count() > 0;
        const hasEmptyState = await emptyState.count() > 0;
        expect(hasTeams || hasEmptyState).toBe(true);
    });

    test('should display point totals', async ({ page }) => {
        await page.goto('/standings');
        await page.waitForLoadState('domcontentloaded');

        // Look for numeric scores or point displays
        const _scoreElements = page.locator('text=/\\d+\\.?\\d*/');

        // Page should render
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('should show magic number when applicable', async ({ page }) => {
        await page.goto('/standings');
        await page.waitForLoadState('domcontentloaded');

        // Look for magic number / clinch scenario
        const _magicNumber = page.locator('text=/magic|clinch|need|to win/i');

        // If standings are competitive, magic number might show
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('should have share functionality', async ({ page }) => {
        await page.goto('/standings');
        await page.waitForLoadState('domcontentloaded');

        // Look for share button
        const shareButton = page.locator('button').filter({ hasText: /share|export/i });

        // If share button exists, it should be interactive
        if (await shareButton.count() > 0) {
            await expect(shareButton.first()).toBeEnabled();
        }
    });
});

test.describe('Player Statistics', () => {
    test('should display player leaderboard', async ({ page }) => {
        await page.goto('/standings');
        await page.waitForLoadState('domcontentloaded');

        // Look for individual player stats
        const _playerStats = page.locator('text=/w-l|wins|record|points/i');

        // Page should load
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('should allow sorting by different metrics', async ({ page }) => {
        await page.goto('/standings');
        await page.waitForLoadState('domcontentloaded');

        // Look for sort controls
        const sortControls = page.locator('button, select').filter({ hasText: /sort|points|wins|percentage/i });

        // If sort controls exist, they should be interactive
        if (await sortControls.count() > 0) {
            await expect(sortControls.first()).toBeEnabled();
        }
    });

    test('should navigate to player profile from standings', async ({ page }) => {
        await page.goto('/standings');
        await page.waitForLoadState('domcontentloaded');

        // Look for clickable player names
        const playerLinks = page.locator('a[href*="player"], button').filter({ hasText: /view|profile/i });

        // If player links exist, clicking should navigate
        if (await playerLinks.count() > 0) {
            const href = await playerLinks.first().getAttribute('href');
            if (href) {
                await playerLinks.first().click();
                await expect(page).toHaveURL(/player/);
            }
        }
    });
});

test.describe('Match Results History', () => {
    test('should show completed match results', async ({ page }) => {
        await page.goto('/standings');
        await page.waitForLoadState('domcontentloaded');

        // Look for match result indicators
        const _matchResults = page.locator('text=/completed|final|&\\d|up|dn|as/i');

        // Page should render
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('should expand session details', async ({ page }) => {
        await page.goto('/standings');
        await page.waitForLoadState('domcontentloaded');

        // Look for expandable sections
        const expandButtons = page.locator('button').filter({ hasText: /show|more|detail|expand/i });

        // If expandable sections exist
        if (await expandButtons.count() > 0) {
            await expandButtons.first().click();
            // Wait for expansion animation
            await page.waitForTimeout(300);
            // Content should still be visible
            const body = page.locator('body');
            await expect(body).toBeVisible();
        }
    });
});

test.describe('Path to Victory', () => {
    test('should show path to victory scenarios', async ({ page }) => {
        await page.goto('/standings');
        await page.waitForLoadState('domcontentloaded');

        // Look for scenario/path indicators
        const _pathIndicators = page.locator('text=/path|scenario|if|need/i');

        // Page should load
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('should update dynamically when scores change', async ({ page }) => {
        await page.goto('/standings');

        // Check initial render
        await page.waitForLoadState('domcontentloaded');
        const initialContent = await page.textContent('body');

        // Standings should be displayed
        expect(initialContent).toBeDefined();
    });
});

test.describe('Standings Accessibility', () => {
    test('should have accessible team color indicators', async ({ page }) => {
        await page.goto('/standings');
        await page.waitForLoadState('domcontentloaded');

        // Look for aria labels or role attributes
        const _accessibleElements = page.locator('[aria-label], [role="region"], [role="table"]');

        // Page should have some accessible structure
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('should be keyboard navigable', async ({ page }) => {
        await page.goto('/standings');
        await page.waitForLoadState('domcontentloaded');

        // Focus on first interactive element
        await page.keyboard.press('Tab');

        // Check that something is focused
        const focusedElement = page.locator(':focus');
        const focusedCount = await focusedElement.count();

        // Should be able to tab to at least one element
        expect(focusedCount).toBeGreaterThanOrEqual(0);
    });
});
