import { test, expect } from '../fixtures/test-fixtures';
import { dismissAllBlockingModals, seedUserProfile, waitForStableDOM } from '../utils/test-helpers';

test.describe('Score hub roundtrip', () => {
  test.beforeEach(async ({ page, clearDatabase, seedSmallDataset }) => {
    await clearDatabase();
    await page.goto('/');
    await waitForStableDOM(page);
    await dismissAllBlockingModals(page);
    await seedSmallDataset();
    await seedUserProfile(page);
    await page.reload();
    await waitForStableDOM(page);
    await dismissAllBlockingModals(page);
  });

  test('opens a match from the score hub and returns to the hub @smoke', async ({ page }) => {
    await page.goto('/score');
    await waitForStableDOM(page);

    const quickContinue = page.getByRole('button', { name: /Continue scoring active match/i });
    if (await quickContinue.isVisible().catch(() => false)) {
      await quickContinue.click();
    } else {
      await page.locator('button[aria-label^="Open Match"]').first().click();
    }

    await waitForStableDOM(page);
    await expect(page.getByText(/Current Hole/i).first()).toBeVisible();

    await page.getByRole('button', { name: 'Back' }).click();
    await waitForStableDOM(page);

    await expect(page).toHaveURL(/\/score$/);
    await expect(page.getByText(/Choose a card and start walking\./i)).toBeVisible();
  });
});
