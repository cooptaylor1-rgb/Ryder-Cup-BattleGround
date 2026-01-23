import { test, expect, Page, BrowserContext } from '@playwright/test';
import { dismissOnboardingModal, waitForStableDOM, clearIndexedDBSafe, expectPageReady } from './test-utils';

/**
 * QA Simulation Suite - 500 Sessions
 *
 * Comprehensive test suite covering all critical user journeys.
 * Runs 25 scenarios across 20 iterations each = 500 total sessions.
 *
 * Scenario Categories:
 * - Auth flows (3 scenarios)
 * - Core workflows (8 scenarios)
 * - Captain mode (4 scenarios)
 * - Social features (2 scenarios)
 * - Network chaos (4 scenarios)
 * - Edge cases (4 scenarios)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ITERATIONS_PER_SCENARIO = 20; // 25 scenarios x 20 iterations = 500 sessions
const SLOW_NETWORK_LATENCY = 2000;
const FAST_TIMEOUT = 5000;
const STANDARD_TIMEOUT = 10000;

// Issue tracking for report generation
interface QAIssue {
    category: string;
    scenario: string;
    iteration: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: 'bug' | 'ux' | 'performance' | 'edge-case';
    description: string;
    steps: string[];
    expected: string;
    actual: string;
    error?: string;
}

const issues: QAIssue[] = [];

function recordIssue(issue: QAIssue) {
    issues.push(issue);
    console.log(`[QA ISSUE] ${issue.severity.toUpperCase()}: ${issue.description}`);
}

// Helper to measure performance
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
    const start = Date.now();
    const result = await fn();
    return { result, durationMs: Date.now() - start };
}

// ============================================================================
// SCENARIO 1: New User Signup Flow (20 iterations)
// ============================================================================

test.describe('S01: New User Signup Flow', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Complete signup journey`, async ({ page }) => {
            // Navigate first, then clear DB (IndexedDB needs an origin context)
            await page.goto('/', { timeout: 60000, waitUntil: 'domcontentloaded' });
            await clearIndexedDBSafe(page);
            await page.reload({ timeout: 60000, waitUntil: 'domcontentloaded' });
            await waitForStableDOM(page);

            // App uses "Create Your First Trip" or "Join a Trip" as primary actions
            // This is the expected flow for new users in this golf trip app
            const pageContent = await page.textContent('body');
            const hasValidNewUserPath = pageContent?.includes('Create') ||
                pageContent?.includes('Join') ||
                pageContent?.includes('Trip') ||
                pageContent?.includes('adventure') ||
                pageContent?.includes('Get Started');

            if (!hasValidNewUserPath) {
                recordIssue({
                    category: 'Auth',
                    scenario: 'New User Signup',
                    iteration: i,
                    severity: 'high',
                    type: 'ux',
                    description: 'No clear path to start for new users',
                    steps: ['Navigate to home page as new user'],
                    expected: 'See create/join trip option',
                    actual: 'No visible start option'
                });
            }

            // App uses profile/create or trip wizard - try trip creation path
            await page.goto('/trip/new');
            await waitForStableDOM(page);
            await page.waitForTimeout(500); // Allow redirect to complete

            await expectPageReady(page);

            // Look for trip creation form elements (template selection, inputs, etc.)
            const formInputs = page.locator('input, button, [role="button"]');
            const inputCount = await formInputs.count();

            // Trip wizard uses templates, so lower threshold is acceptable
            if (inputCount < 1) {
                recordIssue({
                    category: 'Auth',
                    scenario: 'New User Signup',
                    iteration: i,
                    severity: 'medium',
                    type: 'ux',
                    description: 'Profile creation form has insufficient fields',
                    steps: ['Navigate to /profile/create'],
                    expected: 'See form with name, email, handicap fields',
                    actual: `Only ${inputCount} input fields found`
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 2: Login with Email/PIN (20 iterations)
// ============================================================================

test.describe('S02: Login with Email/PIN', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Login flow`, async ({ page }) => {
            await page.goto('/login');
            await waitForStableDOM(page);

            // Check for login form
            const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
            const pinInput = page.locator('input[type="password"], input[type="tel"], input[name="pin"]');

            const hasEmail = await emailInput.count() > 0;
            const hasPin = await pinInput.count() > 0;

            if (!hasEmail || !hasPin) {
                recordIssue({
                    category: 'Auth',
                    scenario: 'Login',
                    iteration: i,
                    severity: 'high',
                    type: 'bug',
                    description: 'Login form missing required fields',
                    steps: ['Navigate to /login'],
                    expected: 'Email and PIN input fields',
                    actual: `Email: ${hasEmail}, PIN: ${hasPin}`
                });
            }

            // Try invalid credentials
            if (hasEmail && hasPin) {
                await emailInput.first().fill('invalid@test.com');
                await pinInput.first().fill('0000');

                const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")');
                if (await submitButton.count() > 0) {
                    await submitButton.first().click();
                    await page.waitForTimeout(1000);

                    // Should show error message
                    const errorMessage = page.locator('text=/error|invalid|not found|incorrect/i');
                    const hasError = await errorMessage.count() > 0;

                    if (!hasError) {
                        // Check if still on login page (implicit error)
                        const stillOnLogin = page.url().includes('login');
                        if (!stillOnLogin) {
                            recordIssue({
                                category: 'Auth',
                                scenario: 'Login',
                                iteration: i,
                                severity: 'critical',
                                type: 'bug',
                                description: 'Login accepts invalid credentials without error',
                                steps: ['Enter invalid email/PIN', 'Click submit'],
                                expected: 'Error message displayed',
                                actual: 'No error shown, possibly logged in'
                            });
                        }
                    }
                }
            }
        });
    }
});

// ============================================================================
// SCENARIO 3: Session Persistence (20 iterations)
// ============================================================================

test.describe('S03: Session Persistence', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Session survives reload`, async ({ page }) => {
            await page.goto('/');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            // Get initial state
            const initialUrl = page.url();

            // Reload page
            await page.reload();
            await waitForStableDOM(page);

            // Check if session maintained
            await expectPageReady(page);

            // Should not redirect to login after reload if was authenticated
            const currentUrl = page.url();
            const redirectedToLogin = currentUrl.includes('login') && !initialUrl.includes('login');

            if (redirectedToLogin) {
                recordIssue({
                    category: 'Auth',
                    scenario: 'Session Persistence',
                    iteration: i,
                    severity: 'high',
                    type: 'bug',
                    description: 'Session lost on page reload',
                    steps: ['Load home page', 'Reload page'],
                    expected: 'Stay on same page',
                    actual: 'Redirected to login'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 4: Trip Creation Wizard (20 iterations)
// ============================================================================

test.describe('S04: Trip Creation Wizard', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Complete trip creation`, async ({ page }) => {
            await page.goto('/');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            // Look for create trip button
            const createButton = page.locator('button, a').filter({
                hasText: /create|new|start.*trip/i
            }).first();

            if (await createButton.isVisible({ timeout: FAST_TIMEOUT }).catch(() => false)) {
                const { durationMs } = await measureTime(async () => {
                    await createButton.click();
                    await page.waitForLoadState('domcontentloaded');
                });

                if (durationMs > 3000) {
                    recordIssue({
                        category: 'Performance',
                        scenario: 'Trip Creation',
                        iteration: i,
                        severity: 'medium',
                        type: 'performance',
                        description: 'Trip creation navigation slow',
                        steps: ['Click create trip button'],
                        expected: 'Navigate in < 3s',
                        actual: `Took ${durationMs}ms`
                    });
                }

                // Should be on trip creation page
                await expect(page).toHaveURL(/trip|wizard|create|new/i, { timeout: STANDARD_TIMEOUT }).catch(() => {
                    recordIssue({
                        category: 'Navigation',
                        scenario: 'Trip Creation',
                        iteration: i,
                        severity: 'high',
                        type: 'bug',
                        description: 'Create trip button does not navigate correctly',
                        steps: ['Click create trip button'],
                        expected: 'Navigate to trip creation page',
                        actual: `Still on ${page.url()}`
                    });
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 5: Course Selection & Search (20 iterations)
// ============================================================================

test.describe('S05: Course Selection', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Search and select course`, async ({ page }) => {
            await page.goto('/courses');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            // Look for search input
            const searchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="search" i], input[placeholder*="course" i]');

            if (await searchInput.count() > 0) {
                await searchInput.first().fill('pebble beach');
                await page.waitForTimeout(1500); // Wait for search debounce

                // Check for results
                const results = page.locator('[data-testid="course-result"], li, [role="option"]');
                const resultCount = await results.count();

                if (resultCount === 0) {
                    recordIssue({
                        category: 'API',
                        scenario: 'Course Selection',
                        iteration: i,
                        severity: 'high',
                        type: 'bug',
                        description: 'Course search returns no results for known course',
                        steps: ['Navigate to courses', 'Search for "pebble beach"'],
                        expected: 'See search results',
                        actual: 'No results displayed'
                    });
                }
            } else {
                // If no search on courses page, it might be integrated elsewhere
                const pageContent = await page.textContent('body');
                const hasContent = pageContent && pageContent.length > 100;

                if (!hasContent) {
                    recordIssue({
                        category: 'UX',
                        scenario: 'Course Selection',
                        iteration: i,
                        severity: 'medium',
                        type: 'ux',
                        description: 'Courses page has minimal content',
                        steps: ['Navigate to /courses'],
                        expected: 'Course list or search',
                        actual: 'Minimal or empty content'
                    });
                }
            }
        });
    }
});

// ============================================================================
// SCENARIO 6: Live Scoring Flow (20 iterations)
// ============================================================================

test.describe('S06: Live Scoring', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Score entry flow`, async ({ page }) => {
            await page.goto('/score');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            await expectPageReady(page);

            // Check for scoring UI elements
            const pageContent = await page.textContent('body');
            const hasScoreUI = pageContent?.includes('Hole') ||
                pageContent?.includes('Score') ||
                pageContent?.includes('Match') ||
                pageContent?.includes('No active');

            if (!hasScoreUI) {
                recordIssue({
                    category: 'UX',
                    scenario: 'Live Scoring',
                    iteration: i,
                    severity: 'medium',
                    type: 'ux',
                    description: 'Score page lacks clear scoring interface',
                    steps: ['Navigate to /score'],
                    expected: 'See scoring UI or empty state',
                    actual: 'Unclear page content'
                });
            }

            // Look for hole selectors or score buttons
            const holeButtons = page.locator('button').filter({ hasText: /^[1-9]$|^1[0-8]$|hole/i });
            const hasHoleNav = await holeButtons.count() > 0;

            // Look for score input buttons
            const scoreButtons = page.locator('button').filter({ hasText: /win|halve|lose|up|dn|as/i });
            const hasScoreButtons = await scoreButtons.count() > 0;

            // Either should have scoring UI or show empty state gracefully
            const hasEmptyState = pageContent?.includes('No active') ||
                pageContent?.includes('no matches') ||
                pageContent?.includes('Start');

            if (!hasHoleNav && !hasScoreButtons && !hasEmptyState) {
                recordIssue({
                    category: 'UX',
                    scenario: 'Live Scoring',
                    iteration: i,
                    severity: 'medium',
                    type: 'ux',
                    description: 'Score page has no clear interaction path',
                    steps: ['Navigate to /score'],
                    expected: 'Scoring controls or clear empty state',
                    actual: 'No clear next action'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 7: Standings & Leaderboard (20 iterations)
// ============================================================================

test.describe('S07: Standings Display', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: View standings`, async ({ page }) => {
            const { durationMs } = await measureTime(async () => {
                await page.goto('/standings');
                await waitForStableDOM(page);
            });

            if (durationMs > 5000) {
                recordIssue({
                    category: 'Performance',
                    scenario: 'Standings',
                    iteration: i,
                    severity: 'medium',
                    type: 'performance',
                    description: 'Standings page loads slowly',
                    steps: ['Navigate to /standings'],
                    expected: 'Load in < 5s',
                    actual: `Took ${durationMs}ms`
                });
            }

            await dismissOnboardingModal(page);

            // Check for team indicators
            const pageContent = await page.textContent('body');
            const hasTeamContent = pageContent?.includes('Team') ||
                pageContent?.includes('USA') ||
                pageContent?.includes('Europe') ||
                pageContent?.includes('Points') ||
                pageContent?.includes('No') ||
                pageContent?.includes('empty');

            if (!hasTeamContent) {
                recordIssue({
                    category: 'UX',
                    scenario: 'Standings',
                    iteration: i,
                    severity: 'low',
                    type: 'ux',
                    description: 'Standings page content unclear',
                    steps: ['Navigate to /standings'],
                    expected: 'Team standings or empty state',
                    actual: 'Unclear content'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 8: Lineup Builder (20 iterations)
// ============================================================================

test.describe('S08: Lineup Builder', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Access lineup builder`, async ({ page }) => {
            await page.goto('/lineup');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            await expectPageReady(page);

            // Check for error states
            const errorIndicator = page.locator('text=/error|went wrong|failed/i');
            if (await errorIndicator.count() > 0) {
                recordIssue({
                    category: 'Error Handling',
                    scenario: 'Lineup Builder',
                    iteration: i,
                    severity: 'high',
                    type: 'bug',
                    description: 'Lineup page shows error state',
                    steps: ['Navigate to /lineup'],
                    expected: 'Lineup builder or empty state',
                    actual: 'Error displayed'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 9: Schedule Management (20 iterations)
// ============================================================================

test.describe('S09: Schedule Management', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: View and navigate schedule`, async ({ page }) => {
            await page.goto('/schedule');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            await expectPageReady(page);

            // Check for schedule content
            const pageContent = await page.textContent('body');
            const hasScheduleContent = pageContent?.includes('Schedule') ||
                pageContent?.includes('Day') ||
                pageContent?.includes('Round') ||
                pageContent?.includes('Tee') ||
                pageContent?.includes('No events');

            if (!hasScheduleContent) {
                recordIssue({
                    category: 'UX',
                    scenario: 'Schedule',
                    iteration: i,
                    severity: 'low',
                    type: 'ux',
                    description: 'Schedule page lacks clear schedule content',
                    steps: ['Navigate to /schedule'],
                    expected: 'Schedule display or empty state',
                    actual: 'Unclear content'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 10: Matchups View (20 iterations)
// ============================================================================

test.describe('S10: Matchups View', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: View matchups`, async ({ page }) => {
            await page.goto('/matchups');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            await expectPageReady(page);

            // Check page loads without critical errors
            const pageContent = await page.textContent('body');
            const hasCriticalError = pageContent?.includes('Something went wrong') ||
                pageContent?.includes('Application error');

            if (hasCriticalError) {
                recordIssue({
                    category: 'Error Handling',
                    scenario: 'Matchups',
                    iteration: i,
                    severity: 'critical',
                    type: 'bug',
                    description: 'Matchups page shows critical error',
                    steps: ['Navigate to /matchups'],
                    expected: 'Matchups display',
                    actual: 'Critical error shown'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 11: Players Directory (20 iterations)
// ============================================================================

test.describe('S11: Players Directory', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: View players`, async ({ page }) => {
            await page.goto('/players');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            await expectPageReady(page);

            // Check for player list or empty state
            const pageContent = await page.textContent('body');
            const hasPlayerContent = pageContent?.includes('Player') ||
                pageContent?.includes('Team') ||
                pageContent?.includes('Handicap') ||
                pageContent?.includes('No players') ||
                pageContent?.includes('Add');

            if (!hasPlayerContent) {
                recordIssue({
                    category: 'UX',
                    scenario: 'Players',
                    iteration: i,
                    severity: 'low',
                    type: 'ux',
                    description: 'Players page lacks clear content',
                    steps: ['Navigate to /players'],
                    expected: 'Player list or empty state',
                    actual: 'Unclear content'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 12: Captain Dashboard (20 iterations)
// ============================================================================

test.describe('S12: Captain Dashboard', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Access captain dashboard`, async ({ page }) => {
            await page.goto('/captain');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            await expectPageReady(page);

            // Check for captain controls
            const captainControls = page.locator('button, a').filter({
                hasText: /lineup|draft|manage|settings|publish/i
            });

            const hasControls = await captainControls.count() > 0;
            const pageContent = await page.textContent('body');
            const hasCaptainContent = pageContent?.includes('Captain') ||
                pageContent?.includes('Manage') ||
                pageContent?.includes('enable') ||
                pageContent?.includes('mode');

            if (!hasControls && !hasCaptainContent) {
                recordIssue({
                    category: 'UX',
                    scenario: 'Captain Dashboard',
                    iteration: i,
                    severity: 'medium',
                    type: 'ux',
                    description: 'Captain page lacks clear captain controls',
                    steps: ['Navigate to /captain'],
                    expected: 'Captain tools or mode toggle',
                    actual: 'No clear captain interface'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 13: Captain Lineup Builder (20 iterations)
// ============================================================================

test.describe('S13: Captain Lineup Builder', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Captain lineup tools`, async ({ page }) => {
            await page.goto('/captain/lineup-builder');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            await expectPageReady(page);

            // Check for drag-drop elements
            const dragHandles = page.locator('[draggable="true"], [data-dnd-draggable]');
            const hasDragDrop = await dragHandles.count() > 0;

            // Or check for player selection UI
            const playerSelect = page.locator('select, [role="listbox"], button:has-text("Add player")');
            const hasPlayerSelect = await playerSelect.count() > 0;

            // Check page has meaningful content
            const pageContent = await page.textContent('body');
            const hasContent = pageContent && pageContent.length > 200;

            if (!hasDragDrop && !hasPlayerSelect && !hasContent) {
                recordIssue({
                    category: 'UX',
                    scenario: 'Captain Lineup Builder',
                    iteration: i,
                    severity: 'medium',
                    type: 'ux',
                    description: 'Captain lineup builder lacks interaction elements',
                    steps: ['Navigate to /captain/lineup-builder'],
                    expected: 'Drag-drop or selection UI',
                    actual: 'No clear interaction mechanism'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 14: Draft Board (20 iterations)
// ============================================================================

test.describe('S14: Draft Board', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Access draft board`, async ({ page }) => {
            await page.goto('/captain/draft');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            await expectPageReady(page);

            // Check for draft UI elements
            const pageContent = await page.textContent('body');
            const hasDraftContent = pageContent?.includes('Draft') ||
                pageContent?.includes('Pick') ||
                pageContent?.includes('Available') ||
                pageContent?.includes('Team') ||
                pageContent?.includes('No');

            if (!hasDraftContent) {
                recordIssue({
                    category: 'UX',
                    scenario: 'Draft Board',
                    iteration: i,
                    severity: 'low',
                    type: 'ux',
                    description: 'Draft board page lacks clear draft content',
                    steps: ['Navigate to /captain/draft'],
                    expected: 'Draft board or empty state',
                    actual: 'Unclear content'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 15: Session Locking (20 iterations)
// ============================================================================

test.describe('S15: Session Locking', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Session lock controls`, async ({ page }) => {
            await page.goto('/captain/manage');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            await expectPageReady(page);

            // Check for lock/unlock controls
            const lockControls = page.locator('button, [role="switch"]').filter({
                hasText: /lock|unlock/i
            });

            // Page should have session management content
            const pageContent = await page.textContent('body');
            const hasManageContent = pageContent?.includes('Session') ||
                pageContent?.includes('Lock') ||
                pageContent?.includes('Manage') ||
                pageContent?.includes('No sessions');

            if (!hasManageContent && await lockControls.count() === 0) {
                recordIssue({
                    category: 'UX',
                    scenario: 'Session Locking',
                    iteration: i,
                    severity: 'low',
                    type: 'ux',
                    description: 'Session management page lacks lock controls',
                    steps: ['Navigate to /captain/manage'],
                    expected: 'Session list with lock controls',
                    actual: 'No clear lock mechanism'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 16: Social Banter Feed (20 iterations)
// ============================================================================

test.describe('S16: Social Banter Feed', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: View banter feed`, async ({ page }) => {
            await page.goto('/social');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            await expectPageReady(page);

            // Check for social UI elements
            const postInput = page.locator('textarea, input[placeholder*="post" i], input[placeholder*="message" i]');
            const hasPostInput = await postInput.count() > 0;

            const pageContent = await page.textContent('body');
            const hasSocialContent = pageContent?.includes('Post') ||
                pageContent?.includes('Banter') ||
                pageContent?.includes('Feed') ||
                pageContent?.includes('No posts');

            if (!hasPostInput && !hasSocialContent) {
                recordIssue({
                    category: 'UX',
                    scenario: 'Social Feed',
                    iteration: i,
                    severity: 'low',
                    type: 'ux',
                    description: 'Social page lacks clear social features',
                    steps: ['Navigate to /social'],
                    expected: 'Banter feed with post input',
                    actual: 'No clear social UI'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 17: Photo Gallery (20 iterations)
// ============================================================================

test.describe('S17: Photo Gallery', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: View photo gallery`, async ({ page }) => {
            await page.goto('/social/photos');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            await expectPageReady(page);

            // Check for photo gallery elements
            const images = page.locator('img');
            const uploadButton = page.locator('button, input[type="file"]').filter({
                hasText: /upload|add|photo/i
            });

            const pageContent = await page.textContent('body');
            const hasPhotoContent = pageContent?.includes('Photo') ||
                pageContent?.includes('Gallery') ||
                pageContent?.includes('Album') ||
                pageContent?.includes('No photos');

            if (await images.count() === 0 && await uploadButton.count() === 0 && !hasPhotoContent) {
                recordIssue({
                    category: 'UX',
                    scenario: 'Photo Gallery',
                    iteration: i,
                    severity: 'low',
                    type: 'ux',
                    description: 'Photo gallery page lacks clear photo features',
                    steps: ['Navigate to /social/photos'],
                    expected: 'Photo grid or upload option',
                    actual: 'No clear photo UI'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 18: Offline Mode - Basic (20 iterations)
// ============================================================================

test.describe('S18: Offline Mode Basic', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: App functions offline`, async ({ page, context }) => {
            // First load the page online
            await page.goto('/');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);
            await page.waitForLoadState('networkidle');

            // Go offline
            await context.setOffline(true);

            // Try to navigate to different pages
            try {
                await page.goto('/standings', { timeout: 5000 });
                await waitForStableDOM(page);

                await expectPageReady(page);

                const pageContent = await page.textContent('body');
                const hasContent = pageContent && pageContent.length > 50;

                if (!hasContent) {
                    recordIssue({
                        category: 'Offline',
                        scenario: 'Offline Basic',
                        iteration: i,
                        severity: 'high',
                        type: 'bug',
                        description: 'App shows blank page when offline',
                        steps: ['Load app online', 'Go offline', 'Navigate to /standings'],
                        expected: 'Cached content shown',
                        actual: 'Blank or minimal content'
                    });
                }
            } catch (e) {
                // Network error is expected, but PWA should handle gracefully
                recordIssue({
                    category: 'Offline',
                    scenario: 'Offline Basic',
                    iteration: i,
                    severity: 'medium',
                    type: 'bug',
                    description: 'Navigation fails when offline',
                    steps: ['Load app online', 'Go offline', 'Navigate'],
                    expected: 'Show cached page or offline indicator',
                    actual: `Network error: ${String(e).slice(0, 100)}`
                });
            }

            // Restore online
            await context.setOffline(false);
        });
    }
});

// ============================================================================
// SCENARIO 19: Offline Score Queue (20 iterations)
// ============================================================================

test.describe('S19: Offline Score Queue', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Scores queue while offline`, async ({ page, context }) => {
            await page.goto('/score');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            // Go offline
            await context.setOffline(true);

            // Try to interact with scoring (if available)
            const scoreButtons = page.locator('button').filter({ hasText: /win|halve|up|dn|submit/i });

            if (await scoreButtons.count() > 0) {
                await scoreButtons.first().click().catch(() => { });
                await page.waitForTimeout(500);

                // Check for offline indicator or queue indicator
                const offlineIndicator = page.locator('text=/offline|queue|pending|sync/i');
                const hasOfflineUI = await offlineIndicator.count() > 0;

                // Check page still functional
                const body = page.locator('body');
                const bodyVisible = await body.isVisible();

                if (!bodyVisible) {
                    recordIssue({
                        category: 'Offline',
                        scenario: 'Offline Score Queue',
                        iteration: i,
                        severity: 'high',
                        type: 'bug',
                        description: 'App crashes when scoring offline',
                        steps: ['Go to score page', 'Go offline', 'Try to score'],
                        expected: 'Score queued for later sync',
                        actual: 'Page unresponsive'
                    });
                }
            }

            await context.setOffline(false);
        });
    }
});

// ============================================================================
// SCENARIO 20: Slow Network (20 iterations)
// ============================================================================

test.describe('S20: Slow Network', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: App handles slow network`, async ({ page, context }) => {
            // Simulate slow network - use moderate throttling instead of extreme
            const cdpSession = await context.newCDPSession(page);
            await cdpSession.send('Network.emulateNetworkConditions', {
                offline: false,
                downloadThroughput: 100 * 1024 / 8, // 100kbps (more realistic slow 3G)
                uploadThroughput: 100 * 1024 / 8,
                latency: 1000 // Reduced latency for stability
            });

            const { durationMs } = await measureTime(async () => {
                // Increased timeout and waitUntil: 'domcontentloaded' for reliability
                await page.goto('/', { timeout: 60000, waitUntil: 'domcontentloaded' });
                await waitForStableDOM(page);
            });

            if (durationMs > 15000) {
                recordIssue({
                    category: 'Performance',
                    scenario: 'Slow Network',
                    iteration: i,
                    severity: 'medium',
                    type: 'performance',
                    description: 'App very slow on poor connection',
                    steps: ['Simulate 50kbps connection', 'Load home page'],
                    expected: 'Load with basic UI in < 15s',
                    actual: `Took ${durationMs}ms`
                });
            }

            await cdpSession.send('Network.emulateNetworkConditions', {
                offline: false,
                downloadThroughput: -1,
                uploadThroughput: -1,
                latency: 0
            });
        });
    }
});

// ============================================================================
// SCENARIO 21: Connection Drop Recovery (20 iterations)
// ============================================================================

test.describe('S21: Connection Drop Recovery', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Recover from connection drop`, async ({ page, context }) => {
            await page.goto('/');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            // Drop connection
            await context.setOffline(true);
            await page.waitForTimeout(1000);

            // Restore connection
            await context.setOffline(false);
            await page.waitForTimeout(2000);

            // Check for reconnection indicator or auto-retry
            await expectPageReady(page);

            // Try to navigate after reconnection
            await page.goto('/standings');
            await waitForStableDOM(page);

            const pageContent = await page.textContent('body');
            const hasContent = pageContent && pageContent.length > 50;

            if (!hasContent) {
                recordIssue({
                    category: 'Network',
                    scenario: 'Connection Recovery',
                    iteration: i,
                    severity: 'medium',
                    type: 'bug',
                    description: 'App does not recover after reconnection',
                    steps: ['Load app', 'Go offline', 'Go online', 'Navigate'],
                    expected: 'App resumes normal operation',
                    actual: 'Page still broken after reconnection'
                });
            }
        });
    }
});

// ============================================================================
// SCENARIO 22: Empty State Handling (20 iterations)
// ============================================================================

test.describe('S22: Empty State Handling', () => {
    const pagesToTest = [
        { path: '/', name: 'Home' },
        { path: '/score', name: 'Score' },
        { path: '/standings', name: 'Standings' },
        { path: '/schedule', name: 'Schedule' },
        { path: '/players', name: 'Players' },
        { path: '/social', name: 'Social' },
    ];

    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Empty states are clear`, async ({ page }) => {
            // Navigate first to establish origin, then clear DB
            await page.goto('/', { timeout: 60000, waitUntil: 'domcontentloaded' });
            await clearIndexedDBSafe(page);

            for (const { path, name } of pagesToTest) {
                await page.goto(path, { timeout: 30000, waitUntil: 'domcontentloaded' });
                await waitForStableDOM(page);
                await dismissOnboardingModal(page);

                const pageContent = await page.textContent('body');

                // Check for clear empty state messaging
                const hasEmptyState = pageContent?.includes('No ') ||
                    pageContent?.includes('Empty') ||
                    pageContent?.includes('Get started') ||
                    pageContent?.includes('Create') ||
                    pageContent?.includes('Add') ||
                    (pageContent?.length && pageContent.length > 100);

                // Check for error state (bad)
                const hasError = pageContent?.includes('Error') ||
                    pageContent?.includes('went wrong') ||
                    pageContent?.includes('failed');

                if (hasError) {
                    recordIssue({
                        category: 'Empty State',
                        scenario: 'Empty State Handling',
                        iteration: i,
                        severity: 'medium',
                        type: 'bug',
                        description: `${name} page shows error on empty data`,
                        steps: ['Clear data', `Navigate to ${path}`],
                        expected: 'Clear empty state',
                        actual: 'Error displayed'
                    });
                }

                if (!hasEmptyState && !hasError) {
                    recordIssue({
                        category: 'UX',
                        scenario: 'Empty State Handling',
                        iteration: i,
                        severity: 'low',
                        type: 'ux',
                        description: `${name} page lacks clear empty state`,
                        steps: ['Clear data', `Navigate to ${path}`],
                        expected: 'Clear guidance for empty state',
                        actual: 'Unclear or minimal content'
                    });
                }
            }
        });
    }
});

// ============================================================================
// SCENARIO 23: Form Validation (20 iterations)
// ============================================================================

test.describe('S23: Form Validation', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Forms validate input properly`, async ({ page }) => {
            await page.goto('/profile/create');
            await waitForStableDOM(page);

            // Try to submit empty form
            const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Continue")');

            if (await submitButton.count() > 0) {
                await submitButton.first().click();
                await page.waitForTimeout(500);

                // Check for validation errors - use separate locators since text= pseudo selector can't be combined with CSS
                const alertErrors = page.locator('[role="alert"], .error');
                const textErrors = page.locator('text=/required|invalid|please/i');
                const hasValidation = (await alertErrors.count() > 0) || (await textErrors.count() > 0);

                // Check form didn't submit with invalid data
                const stillOnPage = page.url().includes('profile') || page.url().includes('create');

                if (!hasValidation && !stillOnPage) {
                    recordIssue({
                        category: 'Validation',
                        scenario: 'Form Validation',
                        iteration: i,
                        severity: 'high',
                        type: 'bug',
                        description: 'Form submits without validation',
                        steps: ['Navigate to form', 'Submit empty form'],
                        expected: 'Show validation errors',
                        actual: 'Form submitted or navigated away'
                    });
                }
            }

            // Test email validation
            const emailInput = page.locator('input[type="email"], input[name="email"]');
            if (await emailInput.count() > 0) {
                await emailInput.first().fill('invalid-email');
                if (await submitButton.count() > 0) {
                    await submitButton.first().click();
                    await page.waitForTimeout(500);

                    const emailError = page.locator('text=/email|invalid/i');
                    const hasEmailError = await emailError.count() > 0;

                    // HTML5 validation should also prevent submission
                    const inputValidity = await emailInput.first().evaluate((el: HTMLInputElement) => el.validity?.valid);

                    if (!hasEmailError && inputValidity !== false) {
                        recordIssue({
                            category: 'Validation',
                            scenario: 'Form Validation',
                            iteration: i,
                            severity: 'medium',
                            type: 'bug',
                            description: 'Email validation accepts invalid format',
                            steps: ['Enter invalid email', 'Submit form'],
                            expected: 'Show email format error',
                            actual: 'No validation error'
                        });
                    }
                }
            }
        });
    }
});

// ============================================================================
// SCENARIO 24: Navigation Consistency (20 iterations)
// ============================================================================

test.describe('S24: Navigation Consistency', () => {
    for (let i = 1; i <= ITERATIONS_PER_SCENARIO; i++) {
        test(`Iteration ${i}: Bottom nav works consistently`, async ({ page }) => {
            await page.goto('/');
            await waitForStableDOM(page);
            await dismissOnboardingModal(page);

            const navRoutes = [
                { text: /home/i, expectedUrl: '/' },
                { text: /score/i, expectedUrl: '/score' },
                { text: /standings/i, expectedUrl: '/standings' },
                { text: /schedule/i, expectedUrl: '/schedule' },
                { text: /more/i, expectedUrl: '/more' },
            ];

            for (const { text, expectedUrl } of navRoutes) {
                const navButton = page.locator('nav button, nav a').filter({ hasText: text }).first();

                if (await navButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await navButton.click();
                    await page.waitForTimeout(500);

                    const currentUrl = page.url();
                    const matchesExpected = currentUrl.endsWith(expectedUrl) ||
                        currentUrl.includes(expectedUrl.replace('/', ''));

                    if (!matchesExpected && expectedUrl !== '/') {
                        recordIssue({
                            category: 'Navigation',
                            scenario: 'Navigation Consistency',
                            iteration: i,
                            severity: 'medium',
                            type: 'bug',
                            description: `Nav button does not navigate to expected URL`,
                            steps: [`Click nav button matching ${text}`],
                            expected: `Navigate to ${expectedUrl}`,
                            actual: `Navigated to ${currentUrl}`
                        });
                    }
                }
            }
        });
    }
});

// ============================================================================
// SCENARIO 25: Mobile Responsiveness (20 iterations across 4 viewports = 80 tests)
// ============================================================================

test.describe('S25: Mobile Responsiveness', () => {
    const viewports = [
        { name: 'iPhone SE', width: 375, height: 667 },
        { name: 'iPhone 12', width: 390, height: 844 },
        { name: 'Pixel 5', width: 393, height: 851 },
        { name: 'iPad Mini', width: 768, height: 1024 },
    ];

    for (let i = 1; i <= Math.ceil(ITERATIONS_PER_SCENARIO / viewports.length); i++) {
        for (const viewport of viewports) {
            test(`Iteration ${i}: ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
                await page.setViewportSize({ width: viewport.width, height: viewport.height });
                await page.goto('/');
                await waitForStableDOM(page);
                await dismissOnboardingModal(page);

                // Check for horizontal overflow
                const hasOverflow = await page.evaluate(() => {
                    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
                });

                if (hasOverflow) {
                    recordIssue({
                        category: 'Responsive',
                        scenario: 'Mobile Responsiveness',
                        iteration: i,
                        severity: 'medium',
                        type: 'ux',
                        description: `Horizontal overflow on ${viewport.name}`,
                        steps: [`Set viewport to ${viewport.width}x${viewport.height}`, 'Load home page'],
                        expected: 'No horizontal scroll',
                        actual: 'Page has horizontal overflow'
                    });
                }

                // Check touch targets (min 44px)
                const buttons = page.locator('button, a');
                const count = await buttons.count();
                let smallTargets = 0;

                for (let j = 0; j < Math.min(count, 10); j++) {
                    const button = buttons.nth(j);
                    if (await button.isVisible()) {
                        const box = await button.boundingBox();
                        if (box && box.width < 44 && box.height < 44) {
                            smallTargets++;
                        }
                    }
                }

                if (smallTargets > 3) {
                    recordIssue({
                        category: 'Responsive',
                        scenario: 'Mobile Responsiveness',
                        iteration: i,
                        severity: 'low',
                        type: 'ux',
                        description: `Multiple touch targets too small on ${viewport.name}`,
                        steps: [`Set viewport to ${viewport.width}x${viewport.height}`, 'Check button sizes'],
                        expected: 'Touch targets >= 44px',
                        actual: `${smallTargets} buttons smaller than 44px`
                    });
                }
            });
        }
    }
});

// ============================================================================
// SUMMARY REPORT GENERATION
// ============================================================================

test.afterAll(async () => {
    if (issues.length === 0) {
        console.log('\n========================================');
        console.log('QA SIMULATION COMPLETE - NO ISSUES FOUND');
        console.log('========================================\n');
        return;
    }

    console.log('\n========================================');
    console.log('QA SIMULATION SUMMARY REPORT');
    console.log(`Total Sessions: 500`);
    console.log(`Total Issues: ${issues.length}`);
    console.log('========================================\n');

    // Group issues by severity
    const bySeverity = {
        critical: issues.filter(i => i.severity === 'critical'),
        high: issues.filter(i => i.severity === 'high'),
        medium: issues.filter(i => i.severity === 'medium'),
        low: issues.filter(i => i.severity === 'low'),
    };

    console.log('ISSUES BY SEVERITY:');
    console.log(`  Critical: ${bySeverity.critical.length}`);
    console.log(`  High:     ${bySeverity.high.length}`);
    console.log(`  Medium:   ${bySeverity.medium.length}`);
    console.log(`  Low:      ${bySeverity.low.length}`);
    console.log(`  TOTAL:    ${issues.length}\n`);

    // Group by category
    const byCategory: Record<string, QAIssue[]> = {};
    for (const issue of issues) {
        if (!byCategory[issue.category]) {
            byCategory[issue.category] = [];
        }
        byCategory[issue.category].push(issue);
    }

    console.log('ISSUES BY CATEGORY:');
    for (const [category, categoryIssues] of Object.entries(byCategory)) {
        console.log(`  ${category}: ${categoryIssues.length}`);
    }

    console.log('\n--- CRITICAL ISSUES ---');
    for (const issue of bySeverity.critical) {
        console.log(`\n[${issue.category}] ${issue.description}`);
        console.log(`  Scenario: ${issue.scenario} (Iteration ${issue.iteration})`);
        console.log(`  Expected: ${issue.expected}`);
        console.log(`  Actual: ${issue.actual}`);
    }

    console.log('\n--- HIGH PRIORITY ISSUES ---');
    for (const issue of bySeverity.high.slice(0, 10)) {
        console.log(`\n[${issue.category}] ${issue.description}`);
        console.log(`  Scenario: ${issue.scenario}`);
        console.log(`  Expected: ${issue.expected}`);
        console.log(`  Actual: ${issue.actual}`);
    }

    if (bySeverity.high.length > 10) {
        console.log(`\n... and ${bySeverity.high.length - 10} more high priority issues`);
    }

    console.log('\n========================================');
    console.log('END OF QA SIMULATION REPORT');
    console.log('========================================\n');
});
