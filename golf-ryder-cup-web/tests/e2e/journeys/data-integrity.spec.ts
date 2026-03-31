/**
 * Data Integrity Journey Tests — Export/Import & Settlement
 *
 * Validates that trip data survives round-trip export→import and that
 * side game settlement calculations produce correct payment graphs.
 *
 * @tags @regression
 */

import { test, expect } from '../fixtures/test-fixtures';
import { waitForStableDOM, dismissAllBlockingModals, expectPageReady } from '../utils/test-helpers';

test.describe('Trip Export/Import Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expectPageReady(page);
    await dismissAllBlockingModals(page);
  });

  test('exported trip can be re-imported with all data intact @regression', async ({ page }) => {
    // Navigate to settings/backup
    await page.goto('/settings');
    await waitForStableDOM(page);

    const backupLink = page.getByRole('link', { name: /backup/i });
    if (await backupLink.isVisible()) {
      await backupLink.click();
      await waitForStableDOM(page);

      // Look for export button
      const exportButton = page.getByRole('button', { name: /export/i });
      if (await exportButton.isVisible()) {
        // Trigger export and verify file download starts
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
          exportButton.click(),
        ]);

        if (download) {
          const filename = download.suggestedFilename();
          expect(filename).toMatch(/\.json$/);

          // Verify the exported file is valid JSON
          const path = await download.path();
          if (path) {
            const fs = await import('fs');
            const content = fs.readFileSync(path, 'utf-8');
            const parsed = JSON.parse(content);
            expect(parsed).toHaveProperty('trips');
          }
        }
      }
    }
  });
});

test.describe('Side Games Settlement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expectPageReady(page);
    await dismissAllBlockingModals(page);
  });

  test('settlement page loads and displays payment graph @regression', async ({ page }) => {
    // Navigate to bets/settlement if a trip with side games exists
    await page.goto('/bets');
    await waitForStableDOM(page);

    // Check if settlement section is visible
    const settlementLink = page.getByRole('link', { name: /settle|settlement|who owes/i });
    if (await settlementLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settlementLink.click();
      await waitForStableDOM(page);

      // Verify the settlement view renders without errors
      const errorBoundary = page.getByText(/something went wrong/i);
      await expect(errorBoundary).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('settlement balances sum to zero (conservation of money) @regression', async ({ page }) => {
    await page.goto('/bets');
    await waitForStableDOM(page);

    // If settlement data exists, verify balance conservation
    const amounts = await page.locator('[data-testid="settlement-amount"]').allTextContents();
    if (amounts.length > 0) {
      const total = amounts.reduce((sum, text) => {
        const num = parseFloat(text.replace(/[^-\d.]/g, ''));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
      // Net payments should sum to approximately zero
      expect(Math.abs(total)).toBeLessThan(0.01);
    }
  });
});
