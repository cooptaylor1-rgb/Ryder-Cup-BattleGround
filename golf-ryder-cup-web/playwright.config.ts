import { defineConfig, devices } from '@playwright/test';

/**
 * Production-Grade Playwright E2E Test Configuration
 *
 * Supports:
 * - Multiple test tiers: smoke, regression, nightly
 * - Chaos testing with network failure simulation
 * - Fuzz testing with deterministic seeds
 * - CI/CD integration with multiple reporters
 * - Sharded parallel execution
 *
 * See https://playwright.dev/docs/test-configuration
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry configuration */
  retries: process.env.CI ? 2 : 0,

  /* Worker configuration - can be overridden via CLI */
  workers: process.env.CI ? 2 : undefined,

  /* Global timeout per test */
  timeout: 60 * 1000, // 60 seconds

  /* Expect timeout */
  expect: {
    timeout: 10 * 1000, // 10 seconds
  },

  /* Reporter configuration */
  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { outputFolder: 'tests/e2e/artifacts/html-report' }],
        ['junit', { outputFile: 'tests/e2e/artifacts/junit-report.xml' }],
        ['json', { outputFile: 'tests/e2e/artifacts/test-results.json' }],
      ]
    : [['html', { outputFolder: 'tests/e2e/artifacts/html-report', open: 'on-failure' }], ['list']],

  /* Output directory for test artifacts */
  outputDir: 'tests/e2e/artifacts/test-results',

  /* Shared settings for all projects */
  use: {
    baseURL,

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure for debugging */
    video: process.env.CI ? 'on-first-retry' : 'off',

    /* Action timeout */
    actionTimeout: 15 * 1000, // 15 seconds

    /* Navigation timeout */
    navigationTimeout: 30 * 1000, // 30 seconds
  },

  /* Configure projects for different test scenarios */
  projects: [
    // ================================================================
    // SETUP & TEARDOWN
    // ================================================================
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'teardown',
      testMatch: /global\.teardown\.ts/,
    },

    // ================================================================
    // BROWSER PROJECTS
    // ================================================================
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    // ================================================================
    // TAGGED PROJECTS
    // ================================================================
    {
      name: 'smoke',
      testMatch: /\.spec\.ts$/,
      grep: /@smoke/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'regression',
      testMatch: /\.spec\.ts$/,
      grep: /@regression/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'nightly',
      testMatch: /\.spec\.ts$/,
      grep: /@nightly/,
      use: { ...devices['Desktop Chrome'] },
    },

    // ================================================================
    // SPECIALIZED PROJECTS
    // ================================================================
    {
      name: 'chaos',
      testDir: './tests/e2e/chaos',
      use: {
        ...devices['Desktop Chrome'],
        // Extended timeouts for chaos testing
        actionTimeout: 30 * 1000,
        navigationTimeout: 60 * 1000,
      },
    },
    {
      name: 'fuzz',
      testDir: './tests/e2e/fuzz',
      use: {
        ...devices['Desktop Chrome'],
        // Extended timeouts for fuzz testing
        actionTimeout: 10 * 1000,
      },
      // Fuzz tests should run single-threaded
      fullyParallel: false,
    },

    // ================================================================
    // LEGACY TESTS (existing e2e/ directory)
    // ================================================================
    {
      name: 'legacy',
      testDir: './e2e',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: {
    command: 'pnpm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
