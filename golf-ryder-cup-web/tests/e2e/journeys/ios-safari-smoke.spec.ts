/**
 * iOS Safari Smoke Journeys
 *
 * Focused smoke tests for iPhone Safari-like emulation.
 * @tags @smoke
 */

import { test, expect } from '../fixtures/test-fixtures';
import {
  waitForStableDOM,
  dismissAllBlockingModals,
  navigateViaBottomNav,
  expectPageReady,
  TEST_CONFIG,
  seedUserProfile,
} from '../utils/test-helpers';

test.describe('iOS Safari Smoke Journeys', () => {
  test.beforeEach(async ({ page, seedSmallDataset }) => {
    await page.goto('/');
    await waitForStableDOM(page);
    await dismissAllBlockingModals(page);
    await seedUserProfile(page);
    await seedSmallDataset();
    await page.reload();
    await waitForStableDOM(page);
    await dismissAllBlockingModals(page);
  });

  test('Home loads with primary navigation @smoke', async ({ page }) => {
    await expectPageReady(page);

    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible({ timeout: TEST_CONFIG.timeouts.fast });
  });

  test('Score journey: open score list and enter match @smoke', async ({ page }) => {
    await navigateViaBottomNav(page, 'score');

    // Try to enter a match from the score list
    const matchLink = page
      .locator('a, button')
      .filter({ hasText: /match|vs|play|score/i })
      .first();

    if (await matchLink.isVisible({ timeout: TEST_CONFIG.timeouts.fast })) {
      await matchLink.click();
      await waitForStableDOM(page);
    }

    await expectPageReady(page);
    expect(page.url()).toContain('/score');
  });

  test('Standings journey: open standings page @smoke', async ({ page }) => {
    await navigateViaBottomNav(page, 'standings');
    await expectPageReady(page);
    expect(page.url()).toContain('/standings');
  });

  test('Schedule journey: open schedule page @smoke', async ({ page }) => {
    await navigateViaBottomNav(page, 'schedule');
    await expectPageReady(page);
    expect(page.url()).toContain('/schedule');
  });

  test('More journey: open more page @smoke', async ({ page }) => {
    await navigateViaBottomNav(page, 'more');
    await expectPageReady(page);
    expect(page.url()).toContain('/more');
  });
});
