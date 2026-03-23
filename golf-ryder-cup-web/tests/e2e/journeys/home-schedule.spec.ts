import { test, expect } from '../fixtures/test-fixtures';
import { dismissAllBlockingModals, seedUserProfile, waitForStableDOM } from '../utils/test-helpers';

test.describe('Home and schedule trip surfaces', () => {
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

  test('opens the selected trip on the dashboard with a Next Up block @smoke', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForStableDOM(page);

    await expect(page.getByText(/Trip Dashboard/i)).toBeVisible();
    await expect(page.getByText(/Next Up/i).first()).toBeVisible();
    await expect(page.getByText(/Everything for/i)).toBeVisible();
  });

  test('shows schedule readiness chips for course and handicap setup @smoke', async ({
    page,
  }) => {
    await page.goto('/schedule?view=all');
    await waitForStableDOM(page);

    await expect(page.getByText(/Full Schedule/i)).toBeVisible();
    await expect(page.getByText(/Needs setup|Handicap ready/i).first()).toBeVisible();
    await expect(page.getByText(/Course needed|Tee needed/i).first()).toBeVisible();
  });
});
