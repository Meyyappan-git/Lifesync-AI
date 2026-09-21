import { test, expect } from '@playwright/test';

/**
 * Auth E2E tests for Lifesync-AI.
 * Routes exercised:
 *   /login           — login page
 *   /register        — registration page
 *   /check-email     — post-register confirmation
 *   /forgot-password — password reset request
 */

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should render the login form', async ({ page }) => {
    await expect(page).toHaveTitle(/lifesync/i);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
  });

  test('should show validation errors for empty submission', async ({ page }) => {
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    // Expect at least one error message to appear
    await expect(page.locator('[role="alert"], .error, [data-error]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('notauser@example.com');
    await page.getByLabel(/password/i).fill('WrongPassword123!');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    // Expect an error/alert to appear
    await expect(
      page.getByText(/invalid|incorrect|not found|wrong/i).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('should have a link to the register page', async ({ page }) => {
    const registerLink = page.getByRole('link', { name: /sign up|register|create account/i });
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/register/i);
  });

  test('should have a forgot password link', async ({ page }) => {
    const forgotLink = page.getByRole('link', { name: /forgot|reset/i });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    await expect(page).toHaveURL(/forgot-password/i);
  });
});

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should render the registration form', async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up|register|create/i })).toBeVisible();
  });

  test('should show validation errors for empty submission', async ({ page }) => {
    await page.getByRole('button', { name: /sign up|register|create/i }).click();
    await expect(page.locator('[role="alert"], .error, [data-error]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should reject mismatched passwords', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    // Fill first password field
    const passwordFields = page.getByLabel(/password/i);
    await passwordFields.first().fill('Password123!');
    // Fill confirm password if present
    if ((await passwordFields.count()) > 1) {
      await passwordFields.last().fill('DifferentPassword123!');
    }
    await page.getByRole('button', { name: /sign up|register|create/i }).click();
    await expect(
      page.getByText(/match|mismatch|confirm/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to check-email page on successful registration', async ({ page }) => {
    const unique = `e2e_${Date.now()}@testdomain.com`;
    await page.getByLabel(/email/i).fill(unique);
    const passwordFields = page.getByLabel(/password/i);
    await passwordFields.first().fill('Password123!');
    if ((await passwordFields.count()) > 1) {
      await passwordFields.last().fill('Password123!');
    }
    // Fill full name if present
    const nameField = page.getByLabel(/name/i);
    if ((await nameField.count()) > 0) {
      await nameField.first().fill('E2E Test User');
    }
    await page.getByRole('button', { name: /sign up|register|create/i }).click();
    // Should redirect to check-email or show a success message
    await expect(page).toHaveURL(/check-email|verify|success/i, { timeout: 10000 });
  });

  test('should have a link back to login', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /sign in|log in|login/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/login/i);
  });
});

test.describe('Forgot Password Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('should render the forgot password form', async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send|reset|submit/i })).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByRole('button', { name: /send|reset|submit/i }).click();
    await expect(
      page.getByText(/valid|invalid|format/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
