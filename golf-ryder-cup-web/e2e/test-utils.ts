import { Page, expect } from '@playwright/test';

/**
 * Shared E2E Test Utilities
 */

/**
 * Wait for the DOM to stabilize after React hydration
 */
export async function waitForStableDOM(page: Page, timeout = 10000): Promise<void> {
    await page.waitForLoadState('domcontentloaded');

    // Wait for Next.js compilation to complete (dev mode)
    try {
        await page.waitForFunction(() => {
            const loadingText = document.body.textContent || '';
            return !loadingText.includes('Compiling');
        }, { timeout });
    } catch {
        // Continue even if timeout - page might be in a valid state
    }

    // Wait for content to appear (not just "Loading...")
    try {
        await page.waitForFunction(() => {
            const body = document.querySelector('body');
            if (!body) return false;
            const text = body.textContent || '';
            // Wait until we have more than just "Loading..."
            return text.length > 50 && !text.match(/^[\s]*Loading\.\.\.[\s]*$/);
        }, { timeout: 5000 });
    } catch {
        // Continue
    }

    await page.waitForTimeout(300); // Allow React to settle
}

/**
 * Robust page ready check - verifies page is loaded and functional
 * This replaces unreliable body.toBeVisible() checks that can fail due to
 * CSS hydration timing issues
 */
export async function expectPageReady(page: Page, timeout = 10000): Promise<void> {
    // First, wait for basic DOM ready state
    await page.waitForLoadState('domcontentloaded', { timeout });

    // Try to find a visible content container
    const contentSelectors = [
        'main',
        '#__next',
        '[role="main"]',
        '.container',
        'div[class*="layout"]',
        'div[class*="content"]',
        'div[class*="page"]',
    ];

    let foundContent = false;

    for (const selector of contentSelectors) {
        try {
            const element = page.locator(selector).first();
            await expect(element).toBeVisible({ timeout: 2000 });
            foundContent = true;
            break;
        } catch {
            // Try next selector
        }
    }

    // Fallback: just wait for body to have content
    if (!foundContent) {
        await page.waitForFunction(() => {
            const body = document.querySelector('body');
            return body && body.textContent && body.textContent.trim().length > 10;
        }, { timeout: 5000 });
    }

    // Additional stabilization
    await page.waitForTimeout(200);
}

/**
 * Dismiss the onboarding modal if it's visible
 * This modal blocks UI interactions on first visit
 */
export async function dismissOnboardingModal(page: Page): Promise<void> {
    // Try multiple times to dismiss any blocking modals
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            // Wait a moment for modals to potentially appear
            await page.waitForTimeout(500);

            // Check for onboarding dialog with different button texts
            const onboardingButtons = [
                page.locator('button:has-text("Skip for now")'),
                page.locator('button:has-text("Skip onboarding")'),
                page.locator('[role="dialog"] button:has-text("Skip")'),
            ];

            for (const button of onboardingButtons) {
                if (await button.first().isVisible({ timeout: 1000 }).catch(() => false)) {
                    await button.first().click();
                    await page.waitForTimeout(500);
                    break;
                }
            }

            // Check for profile creation wizard skip options
            const wizardSkipButtons = [
                page.locator('button:has-text("Skip")'),
                page.locator('button:has-text("Later")'),
                page.locator('button:has-text("Not now")'),
            ];

            for (const button of wizardSkipButtons) {
                if (await button.first().isVisible({ timeout: 500 }).catch(() => false)) {
                    await button.first().click();
                    await page.waitForTimeout(300);
                    break;
                }
            }

            // Check if modal is still visible
            const dialogStillVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
            if (!dialogStillVisible) {
                break;
            }
        } catch {
            // Continue to next attempt
        }
    }
}

/**
 * Dismiss all blocking modals/wizards (onboarding, profile creation, etc.)
 */
export async function dismissAllBlockingModals(page: Page): Promise<void> {
    // Try dismissing onboarding first
    await dismissOnboardingModal(page);

    // Check if we're on a profile creation or wizard page and handle appropriately
    try {
        const backButton = page.locator('button[aria-label="Back"], button:has-text("Back")').first();
        const isOnWizard = await page.locator('text=/step \\d+ of \\d+/i').isVisible().catch(() => false);

        if (isOnWizard && await backButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            // Navigate away from wizard by going to home
            await page.goto('/');
            await page.waitForTimeout(500);
            await dismissOnboardingModal(page);
        }
    } catch {
        // Continue
    }
}

/**
 * Setup page for testing - handles common initialization
 */
export async function setupTestPage(page: Page): Promise<void> {
    await waitForStableDOM(page);
    await dismissOnboardingModal(page);
}

/**
 * Clear IndexedDB safely (handles security restrictions)
 */
export async function clearIndexedDBSafe(page: Page): Promise<boolean> {
    try {
        return await page.evaluate(() => {
            return new Promise<boolean>((resolve) => {
                try {
                    const deleteRequest = indexedDB.deleteDatabase('GolfTripDB');
                    deleteRequest.onsuccess = () => resolve(true);
                    deleteRequest.onerror = () => resolve(false);
                    deleteRequest.onblocked = () => resolve(true);
                } catch {
                    resolve(false);
                }
            });
        });
    } catch {
        return false;
    }
}

/**
 * Navigate and setup - combines goto with common setup tasks
 */
export async function navigateAndSetup(page: Page, path: string): Promise<void> {
    await page.goto(path);
    await setupTestPage(page);
}
