import { test, expect } from '../fixtures/test-fixtures';
import { dismissAllBlockingModals, waitForStableDOM } from '../utils/test-helpers';

test.describe('Course search detail flow', () => {
  test.beforeEach(async ({ page, clearDatabase, seedSmallDataset, enableCaptainMode }) => {
    await clearDatabase();

    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url.includes('/api/golf-courses?action=check')) {
          return new Response(JSON.stringify({ configured: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (url.includes('/api/golf-courses/search?')) {
          return new Response(
            JSON.stringify({
              success: true,
              results: [
                {
                  id: 'web-cabot-roost',
                  name: 'Roost',
                  city: 'Brooksville',
                  state: 'FL',
                  country: 'United States',
                  source: 'web',
                  website: 'https://cabot.com/citrusfarms/golf/roost/',
                  description: 'A rolling Cabot course in Florida.',
                },
              ],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        if (url.includes('/api/golf-courses/web-cabot-roost')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: 'web-cabot-roost',
                name: 'Roost',
                address: 'Brooksville, FL',
                city: 'Brooksville',
                state: 'FL',
                country: 'United States',
                website: 'https://cabot.com/citrusfarms/golf/roost/',
                sourcePageUrl:
                  'https://cabot.com/uploads/2026/02/Scorecard_CCF_Roost_2025_Digital-min.pdf',
                description: 'Detailed course profile',
                source: 'web-extracted',
                dataCompleteness: 'basic',
                hasPlayableTeeData: false,
                provenance: [
                  {
                    kind: 'scorecard-pdf',
                    label: 'Linked scorecard PDF',
                    url: 'https://cabot.com/uploads/2026/02/Scorecard_CCF_Roost_2025_Digital-min.pdf',
                    confidence: 'high',
                  },
                ],
                holes: [],
                teeSets: [],
              },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return originalFetch(input, init);
      };
    });

    await page.goto('/');
    await waitForStableDOM(page);
    await dismissAllBlockingModals(page);
    await seedSmallDataset();
    await page.reload();
    await waitForStableDOM(page);
    await enableCaptainMode();
  });

  test('shows extracted source details and returns to search @smoke', async ({ page }) => {
    await page.goto('/courses');
    await waitForStableDOM(page);
    await dismissAllBlockingModals(page);
    await waitForStableDOM(page);

    await page.getByRole('button', { name: /Search Database/i }).click();
    await waitForStableDOM(page);

    await expect(page.getByText(/Search Course Database/i)).toBeVisible();

    await page.getByPlaceholder('Search by course name or city...').fill('cabot roost');
    await page.getByRole('button', { name: 'Search' }).click();

    const roostResult = page.getByRole('button', { name: /Roost/i }).first();
    await expect(roostResult).toBeVisible();
    await roostResult.click();

    await expect(page.getByText(/Basic course profile only/i)).toBeVisible();
    await expect(page.getByText(/Linked scorecard PDF/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /View extracted source/i })).toHaveAttribute(
      'href',
      'https://cabot.com/uploads/2026/02/Scorecard_CCF_Roost_2025_Digital-min.pdf'
    );

    await page.getByRole('button', { name: '← Back to search' }).click();
    await expect(page.getByText(/Search Course Database/i)).toBeVisible();
  });
});
