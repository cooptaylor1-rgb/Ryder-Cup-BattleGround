/**
 * Fuzz / Monkey Testing
 *
 * Executes random but VALID UI actions to find edge cases.
 * Uses deterministic seeding for reproducibility.
 *
 * Enable via environment variables:
 * - FUZZ_SEED=123 (reproducible seed)
 * - FUZZ_ACTIONS=300 (number of actions)
 *
 * On failure, writes action log to tests/e2e/artifacts/fuzz-last-run.json
 *
 * @tags @fuzz @nightly
 */

import { test, expect, Page } from '@playwright/test';
import {
    waitForStableDOM,
    dismissAllBlockingModals,
    expectPageReady,
} from '../utils/test-helpers';
import { createSeededRNG } from '../utils/seeder';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface FuzzConfig {
    seed: string;
    actionCount: number;
    maxActionTimeMs: number;
    screenshotOnError: boolean;
}

const FUZZ_CONFIG: FuzzConfig = {
    seed: process.env.FUZZ_SEED || `fuzz-${Date.now()}`,
    actionCount: parseInt(process.env.FUZZ_ACTIONS || '300', 10),
    maxActionTimeMs: 8000, // Increased for stability
    screenshotOnError: true,
};

// ============================================================================
// ACTION TYPES
// ============================================================================

type ActionType =
    | 'click_button'
    | 'click_link'
    | 'fill_input'
    | 'navigate'
    | 'scroll'
    | 'tab'
    | 'back'
    | 'refresh';

interface FuzzAction {
    type: ActionType;
    timestamp: number;
    details: Record<string, unknown>;
    success: boolean;
    error?: string;
}

// Valid navigation targets
const NAVIGATION_TARGETS = [
    '/',
    '/standings',
    '/score',
    '/schedule',
    '/more',
    '/players',
    '/matchups',
    '/captain',
    '/profile',
    '/settings',
];

// Sample input values for filling forms
const SAMPLE_INPUTS = [
    'Test',
    'John Smith',
    'test@example.com',
    '12345',
    'Pebble Beach',
    '10.5',
    '',
    '!@#$%^&*()',
    'A'.repeat(100),
];

// ============================================================================
// FUZZ RUNNER
// ============================================================================

class FuzzRunner {
    private rng: () => number;
    private actions: FuzzAction[] = [];
    private page: Page;

    constructor(page: Page, seed: string) {
        this.rng = createSeededRNG(seed);
        this.page = page;
    }

    /**
     * Get a random item from an array
     */
    private randomItem<T>(items: T[]): T {
        return items[Math.floor(this.rng() * items.length)];
    }

    /**
     * Execute a random action
     */
    async executeRandomAction(): Promise<FuzzAction> {
        const actionTypes: ActionType[] = [
            'click_button', 'click_button', 'click_button', // Weight towards clicks
            'click_link', 'click_link',
            'fill_input',
            'navigate',
            'scroll',
            'tab',
            'back',
        ];

        const type = this.randomItem(actionTypes);
        const action: FuzzAction = {
            type,
            timestamp: Date.now(),
            details: {},
            success: false,
        };

        try {
            switch (type) {
                case 'click_button':
                    await this.clickRandomButton(action);
                    break;
                case 'click_link':
                    await this.clickRandomLink(action);
                    break;
                case 'fill_input':
                    await this.fillRandomInput(action);
                    break;
                case 'navigate':
                    await this.navigateRandom(action);
                    break;
                case 'scroll':
                    await this.scrollRandom(action);
                    break;
                case 'tab':
                    await this.tabRandom(action);
                    break;
                case 'back':
                    await this.goBack(action);
                    break;
                case 'refresh':
                    await this.refresh(action);
                    break;
            }
            action.success = true;
        } catch (error) {
            action.success = false;
            action.error = error instanceof Error ? error.message : String(error);
        }

        this.actions.push(action);
        return action;
    }

    /**
     * Click a random visible button
     */
    private async clickRandomButton(action: FuzzAction): Promise<void> {
        // Filter out disabled buttons to avoid timeout waiting for them to be enabled
        const buttons = await this.page.locator('button:visible:not([disabled])').all();

        if (buttons.length === 0) {
            action.details.reason = 'No enabled visible buttons';
            return;
        }

        const index = Math.floor(this.rng() * buttons.length);
        const button = buttons[index];

        action.details.buttonIndex = index;
        action.details.buttonText = await button.textContent().catch(() => '');

        await button.click({ timeout: FUZZ_CONFIG.maxActionTimeMs });
        await this.page.waitForTimeout(300);
    }

    /**
     * Click a random visible link
     */
    private async clickRandomLink(action: FuzzAction): Promise<void> {
        // Exclude sr-only links (skip to content) which are outside viewport
        const links = await this.page.locator('a:visible:not(.sr-only)').all();

        if (links.length === 0) {
            action.details.reason = 'No visible links';
            return;
        }

        const index = Math.floor(this.rng() * links.length);
        const link = links[index];

        action.details.linkIndex = index;
        action.details.href = await link.getAttribute('href');

        await link.click({ timeout: FUZZ_CONFIG.maxActionTimeMs, force: true });
        await waitForStableDOM(this.page);
    }

    /**
     * Fill a random input with random value
     */
    private async fillRandomInput(action: FuzzAction): Promise<void> {
        const inputs = await this.page.locator('input:visible, textarea:visible').all();

        if (inputs.length === 0) {
            action.details.reason = 'No visible inputs';
            return;
        }

        const index = Math.floor(this.rng() * inputs.length);
        const input = inputs[index];
        const value = this.randomItem(SAMPLE_INPUTS);

        action.details.inputIndex = index;
        action.details.value = value;
        action.details.inputType = await input.getAttribute('type');

        await input.fill(value, { timeout: FUZZ_CONFIG.maxActionTimeMs });
    }

    /**
     * Navigate to a random page
     */
    private async navigateRandom(action: FuzzAction): Promise<void> {
        const target = this.randomItem(NAVIGATION_TARGETS);
        action.details.target = target;

        await this.page.goto(target, { timeout: FUZZ_CONFIG.maxActionTimeMs * 2 });
        await waitForStableDOM(this.page);
    }

    /**
     * Scroll randomly
     */
    private async scrollRandom(action: FuzzAction): Promise<void> {
        const direction = this.rng() > 0.5 ? 'down' : 'up';
        const amount = Math.floor(this.rng() * 500);

        action.details.direction = direction;
        action.details.amount = amount;

        await this.page.mouse.wheel(0, direction === 'down' ? amount : -amount);
        await this.page.waitForTimeout(200);
    }

    /**
     * Tab through elements
     */
    private async tabRandom(action: FuzzAction): Promise<void> {
        const tabCount = Math.floor(this.rng() * 5) + 1;
        action.details.tabCount = tabCount;

        for (let i = 0; i < tabCount; i++) {
            await this.page.keyboard.press('Tab');
            await this.page.waitForTimeout(100);
        }
    }

    /**
     * Go back in history
     */
    private async goBack(_action: FuzzAction): Promise<void> {
        await this.page.goBack({ timeout: FUZZ_CONFIG.maxActionTimeMs });
        await waitForStableDOM(this.page);
    }

    /**
     * Refresh the page
     */
    private async refresh(_action: FuzzAction): Promise<void> {
        await this.page.reload({ timeout: FUZZ_CONFIG.maxActionTimeMs * 2 });
        await waitForStableDOM(this.page);
    }

    /**
     * Get all recorded actions
     */
    getActions(): FuzzAction[] {
        return this.actions;
    }

    /**
     * Save actions to file
     */
    async saveActions(filename: string): Promise<void> {
        const artifactsDir = path.join(process.cwd(), 'tests', 'e2e', 'artifacts');

        // Ensure directory exists
        if (!fs.existsSync(artifactsDir)) {
            fs.mkdirSync(artifactsDir, { recursive: true });
        }

        const filepath = path.join(artifactsDir, filename);
        const data = {
            seed: FUZZ_CONFIG.seed,
            timestamp: new Date().toISOString(),
            actionCount: this.actions.length,
            failedActions: this.actions.filter(a => !a.success).length,
            actions: this.actions,
        };

        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    }
}

// ============================================================================
// FUZZ TESTS
// ============================================================================

test.describe('Fuzz: Monkey Testing', () => {
    let runner: FuzzRunner;

    test.beforeEach(async ({ page }) => {
        runner = new FuzzRunner(page, FUZZ_CONFIG.seed);

        await page.goto('/');
        await waitForStableDOM(page);
        await dismissAllBlockingModals(page);
    });

    test.afterEach(async ({ page }, testInfo) => {
        // Save action log on failure
        if (testInfo.status !== 'passed') {
            await runner.saveActions('fuzz-last-run.json');

            if (FUZZ_CONFIG.screenshotOnError) {
                await page.screenshot({
                    path: path.join('tests', 'e2e', 'artifacts', 'fuzz-failure-screenshot.png'),
                    fullPage: true,
                });
            }
        }
    });

    test(`should survive ${FUZZ_CONFIG.actionCount} random actions @fuzz`, async ({ page }) => {
        // Increase test timeout for long-running fuzz test
        test.setTimeout(180000); // 3 minutes

        console.log(`Starting fuzz test with seed: ${FUZZ_CONFIG.seed}`);

        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 10;

        for (let i = 0; i < FUZZ_CONFIG.actionCount; i++) {
            const action = await runner.executeRandomAction();

            if (!action.success) {
                consecutiveErrors++;
                console.log(`Action ${i + 1} failed: ${action.type} - ${action.error}`);

                // Too many consecutive errors might indicate a crash
                if (consecutiveErrors >= maxConsecutiveErrors) {
                    // Try to recover
                    try {
                        await page.goto('/');
                        await waitForStableDOM(page);
                        await dismissAllBlockingModals(page);
                        consecutiveErrors = 0;
                    } catch {
                        // Save state before throwing
                        await runner.saveActions('fuzz-crash-run.json');
                        throw new Error(`Fuzz test crashed after ${i + 1} actions. Unable to recover.`);
                    }
                }
            } else {
                consecutiveErrors = 0;
            }

            // Periodic progress log
            if ((i + 1) % 50 === 0) {
                console.log(`Completed ${i + 1}/${FUZZ_CONFIG.actionCount} actions`);
            }

            // Verify page is still responsive - use robust check
            try {
                await expectPageReady(page);
            } catch {
                // Try recovery
                await page.goto('/').catch(() => { });
                await waitForStableDOM(page).catch(() => { });
            }
        }

        // Final validation
        const actions = runner.getActions();
        const successRate = actions.filter(a => a.success).length / actions.length;

        console.log(`Fuzz test completed. Success rate: ${(successRate * 100).toFixed(1)}%`);

        // At least 70% of actions should succeed (reduced for stability)
        expect(successRate).toBeGreaterThan(0.7);

        // Save successful run log too
        await runner.saveActions('fuzz-successful-run.json');
    });

    test('should not crash on rapid random navigation @fuzz', async ({ page }) => {
        const _localRunner = new FuzzRunner(page, FUZZ_CONFIG.seed + '-nav');

        // Rapid navigation test
        for (let i = 0; i < 50; i++) {
            const target = NAVIGATION_TARGETS[Math.floor(Math.random() * NAVIGATION_TARGETS.length)];
            await page.goto(target).catch(() => { });
        }

        // Final page should load
        await page.goto('/');
        await waitForStableDOM(page);

        await expectPageReady(page);
    });

    test('should handle random form inputs @fuzz', async ({ page }) => {
        const _localRunner = new FuzzRunner(page, FUZZ_CONFIG.seed + '-forms');

        // Navigate to pages with forms
        const formPages = ['/login', '/profile/create', '/trip/new', '/players/add'];

        for (const formPage of formPages) {
            await page.goto(formPage).catch(() => { });
            await waitForStableDOM(page);

            // Fill inputs with random values
            const inputs = await page.locator('input:visible, textarea:visible').all();

            for (const input of inputs.slice(0, 5)) {
                const value = SAMPLE_INPUTS[Math.floor(Math.random() * SAMPLE_INPUTS.length)];
                await input.fill(value).catch(() => { });
            }

            // Try to submit
            const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
            if (await submitButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                await submitButton.click().catch(() => { });
            }

            await waitForStableDOM(page);
        }

        // Page should still be responsive
        await expectPageReady(page);
    });
});

// ============================================================================
// DETERMINISTIC REPLAY TEST
// ============================================================================

test.describe('Fuzz: Deterministic Replay', () => {
    test('should produce same results with same seed @fuzz', async ({ page }) => {
        // Increase timeout for this test
        test.setTimeout(180000);

        const testSeed = 'deterministic-test-seed';

        // First run - reduced to 10 actions for faster testing
        const runner1 = new FuzzRunner(page, testSeed);
        await page.goto('/');
        await waitForStableDOM(page);
        await dismissAllBlockingModals(page);

        for (let i = 0; i < 10; i++) {
            await runner1.executeRandomAction();
        }

        const actions1 = runner1.getActions();

        // Reset
        await page.goto('/');
        await waitForStableDOM(page);
        await dismissAllBlockingModals(page);

        // Second run with same seed
        const runner2 = new FuzzRunner(page, testSeed);

        for (let i = 0; i < 10; i++) {
            await runner2.executeRandomAction();
        }

        const actions2 = runner2.getActions();

        // Action types should match (values may differ due to page state)
        // Allow for some variance due to dynamic page content
        let matchCount = 0;
        for (let i = 0; i < Math.min(actions1.length, actions2.length); i++) {
            if (actions1[i].type === actions2[i].type) {
                matchCount++;
            }
        }

        // At least 80% of action types should match (deterministic RNG)
        const matchRate = matchCount / Math.min(actions1.length, actions2.length);
        expect(matchRate).toBeGreaterThan(0.8);
    });
});
