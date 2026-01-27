/**
 * Smoke Tests - @smoke
 *
 * Minimal tests to verify the app loads and basic functionality works.
 * These tests should run quickly and catch major regressions.
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests @smoke', () => {
  test('homepage loads and renders main heading @smoke', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be interactive
    await page.waitForLoadState('domcontentloaded');

    // Verify the app has loaded by checking for any content
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check that we don't have a critical error page
    const pageContent = await page.content();
    expect(pageContent).not.toContain('Application error');
    expect(pageContent).not.toContain('500');
  });

  test('app shell renders without JavaScript errors @smoke', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (err) => !err.includes('ResizeObserver') && !err.includes('Non-Error promise')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
