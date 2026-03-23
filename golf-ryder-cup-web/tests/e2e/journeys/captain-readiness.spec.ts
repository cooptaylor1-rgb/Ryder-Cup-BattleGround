import { test, expect } from '../fixtures/test-fixtures';
import {
  dismissAllBlockingModals,
  waitForStableDOM,
} from '../utils/test-helpers';

async function logCaptainRouteError(page: import('@playwright/test').Page) {
  const boundaryHeading = page.getByText(/The command room hit a rough patch\./i);
  if (!(await boundaryHeading.isVisible().catch(() => false))) {
    return;
  }

  const errorDetails = page.getByText(/Error details/i);
  if (await errorDetails.isVisible().catch(() => false)) {
    await errorDetails.click();
    const message = await page.locator('pre').textContent().catch(() => null);
    if (message) {
      console.error('[captain-manage error details]', message);
    }
  }
}

test.describe('Captain readiness routes', () => {
  test.beforeEach(async ({ page, clearDatabase, seedSmallDataset, enableCaptainMode }) => {
    await clearDatabase();
    await page.goto('/');
    await waitForStableDOM(page);
    await dismissAllBlockingModals(page);
    await seedSmallDataset();
    await page.reload();
    await waitForStableDOM(page);
    await dismissAllBlockingModals(page);
    await enableCaptainMode();
    await page.goto('/');
    await waitForStableDOM(page);
    await dismissAllBlockingModals(page);
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
    await page.goto('/captain');
    await waitForStableDOM(page);
    await page.locator('a[href="/captain/manage"]').first().click();
    await waitForStableDOM(page);
    await logCaptainRouteError(page);

    await expect(page.getByTestId('captain-manage-page')).toBeVisible();
    const courseLibraryLink = page.getByTestId('captain-course-library-link');
    await expect(courseLibraryLink).toBeVisible();

    await courseLibraryLink.click();
    await waitForStableDOM(page);

    await expect(page).toHaveURL(/\/courses/);
  });

  test('routes into lineup setup from captain manage tools @smoke', async ({ page }) => {
    await page.goto('/captain');
    await waitForStableDOM(page);
    await page.locator('a[href="/captain/manage"]').first().click();
    await waitForStableDOM(page);
    await logCaptainRouteError(page);

    await page.getByTestId('captain-new-session-link').click();
    await waitForStableDOM(page);

    await expect(page).toHaveURL(/\/lineup\/new\?mode=session/);
    await expect(page.getByText(/Session Setup/i)).toBeVisible();
  });
});
