import { test, expect } from '../fixtures/test-fixtures';
import {
  dismissAllBlockingModals,
  waitForStableDOM,
} from '../utils/test-helpers';

test.describe('Captain readiness routes', () => {
  test.beforeEach(async ({ page, clearDatabase, enableCaptainMode }) => {
    await clearDatabase();
    await page.goto('/');
    await waitForStableDOM(page);
    await dismissAllBlockingModals(page);

    await page
      .getByRole('button', { name: /Skip onboarding/i })
      .click({ force: true, timeout: 3000 })
      .catch(() => {});
    await page
      .getByRole('button', { name: /Skip for now/i })
      .click({ force: true, timeout: 3000 })
      .catch(() => {});

    const skipWalkthrough = page.getByRole('button', { name: /Skip walkthrough/i }).first();
    if (await skipWalkthrough.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipWalkthrough.click({ force: true });
      await page.waitForTimeout(500);
    }

    await page.getByRole('link', { name: /New Trip/i }).click();
    await waitForStableDOM(page);

    await page.getByText(/Classic Ryder Cup/i).first().click();
    await waitForStableDOM(page);

    await page.getByRole('button', { name: /Review Trip/i }).click();
    await waitForStableDOM(page);

    await page.getByRole('button', { name: /Create Trip/i }).click();
    await page.waitForURL(/\/\?tripId=/);
    await enableCaptainMode();
    await page.goto('/');
    await waitForStableDOM(page);
  });

  test('loads checklist without falling into the captain error boundary @smoke', async ({ page }) => {
    await page.goto('/captain/checklist');
    await waitForStableDOM(page);

    await expect(page.getByTestId('captain-checklist-page')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Run the trip before the trip runs you\./i })
    ).toBeVisible();
    await expect(page.getByTestId('preflight-rerun')).toBeVisible();
    await expect(page.getByText(/The command room hit a rough patch\./i)).toHaveCount(0);
  });

  test('routes captains from manage trip into the course library @smoke', async ({ page }) => {
    await page.goto('/captain/manage');
    await waitForStableDOM(page);

    await expect(page.getByTestId('captain-manage-page')).toBeVisible();
    const courseLibraryLink = page.getByTestId('captain-course-library-link');
    await expect(courseLibraryLink).toBeVisible();

    await courseLibraryLink.click();
    await waitForStableDOM(page);

    await expect(page).toHaveURL(/\/courses/);
  });

  test('routes into lineup setup from captain manage tools @smoke', async ({ page }) => {
    await page.goto('/captain/manage');
    await waitForStableDOM(page);

    await page.getByTestId('captain-new-session-link').click();
    await waitForStableDOM(page);

    await expect(page).toHaveURL(/\/lineup\/new\?mode=session/);
    await expect(page.getByText(/Session Setup/i)).toBeVisible();
  });
});
