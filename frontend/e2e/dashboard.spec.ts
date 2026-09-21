import { test, expect, type Page } from '@playwright/test';

/**
 * Dashboard E2E tests for Lifesync-AI.
 *
 * These tests verify that:
 * - Unauthenticated users are redirected away from /dashboard
 * - The dashboard layout renders key structural elements
 *
 * For tests that require a logged-in session, set these environment variables:
 *   PLAYWRIGHT_TEST_EMAIL    — a verified test user email
 *   PLAYWRIGHT_TEST_PASSWORD — that user's password
 *
 * If not provided, authenticated tests are skipped gracefully.
 */

const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;

/** Helper: log in via the UI and return the page at dashboard. */
async function loginAndGoToDashboard(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_EMAIL!);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD!);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

test.describe('Dashboard — unauthenticated', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    // Should be redirected away from /dashboard
    await expect(page).not.toHaveURL(/dashboard/, { timeout: 8000 });
    // And land on the login page (or root)
    await expect(page).toHaveURL(/login|\//i);
  });
});

test.describe('Dashboard — authenticated', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Skipped: set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run authenticated tests');

  test.beforeEach(async ({ page }) => {
    await loginAndGoToDashboard(page);
  });

  test('should render the dashboard layout', async ({ page }) => {
    // Navigation / sidebar should be visible
    await expect(
      page.locator('nav, [role="navigation"], aside').first()
    ).toBeVisible();
  });

  test('should display the user greeting or name', async ({ page }) => {
    // Some form of user identity should appear
    await expect(
      page.getByText(/hello|welcome|hi|dashboard/i).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('should allow navigation to main sections', async ({ page }) => {
    // Check at least one nav link is clickable
    const navLinks = page.locator('nav a, aside a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
    // Click first nav item and confirm we stay authenticated
    await navLinks.first().click();
    await expect(page).not.toHaveURL(/login/i);
  });

  test('should allow logout', async ({ page }) => {
    // Find a logout trigger
    const logoutButton = page.getByRole('button', { name: /log out|sign out|logout/i });
    const logoutLink = page.getByRole('link', { name: /log out|sign out|logout/i });

    const trigger = (await logoutButton.count()) > 0 ? logoutButton : logoutLink;
    await expect(trigger).toBeVisible({ timeout: 5000 });
    await trigger.click();

    // After logout, should land on login or root
    await expect(page).toHaveURL(/login|\//i, { timeout: 8000 });
  });
});
