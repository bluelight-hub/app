import { expect, test } from '@playwright/test';

/**
 * Unified Auth Flow Tests
 * Tests für den vereinheitlichten Auth-Endpunkt mit automatischer Registrierung
 * @tag @auth
 */
test.describe('Unified Auth Flow @auth', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    // Navigate to auth page
    await page.goto('/auth');
    // Wait for the page to be ready
    await page.waitForLoadState('networkidle');
  });

  test('createAccount: Should auto-register new user', async ({ page }) => {
    const username = `newuser_${Date.now()}`;

    // Mock the unified auth endpoint for new user
    await page.route('**/api/auth', async (route) => {
      const postData = route.request().postData();
      const body = postData ? JSON.parse(postData) : {};

      if (body.username === username) {
        await route.fulfill({
          status: 201, // Created status for new user
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: `u_${Date.now()}`,
              username,
              role: 'USER',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            isNewUser: true,
            message: 'Benutzer erfolgreich erstellt',
          }),
          headers: {
            'Set-Cookie': [
              `accessToken=mock_token; Path=/; HttpOnly; SameSite=Strict`,
              `refreshToken=mock_refresh; Path=/; HttpOnly; SameSite=Strict`,
            ].join(', '),
          },
        });
      }
    });

    // Use the correct placeholder text and wait pattern
    const usernameInput = page.locator(
      'input[placeholder="Benutzername eingeben oder auswählen..."]',
    );
    await usernameInput.click();
    await usernameInput.fill(username);
    await usernameInput.press('Tab');
    await page.waitForTimeout(500);

    // Submit form
    await page.getByRole('button', { name: /anmelden/i }).click();

    // Verify 201 response and success toast
    await expect(page.locator('[role="alert"]')).toContainText(/erfolgreich|willkommen/i);

    // Verify redirect to home
    await expect(page).toHaveURL('/');
  });

  test('loginExisting: Should login existing user without password', async ({ page }) => {
    const existingUsername = 'existing_user';

    // Mock the unified auth endpoint for existing user
    await page.route('**/api/auth', async (route) => {
      const postData = route.request().postData();
      const body = postData ? JSON.parse(postData) : {};

      if (body.username === existingUsername) {
        await route.fulfill({
          status: 200, // OK status for existing user
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'u_existing',
              username: existingUsername,
              role: 'USER',
              isActive: true,
              lastLoginAt: new Date().toISOString(),
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: new Date().toISOString(),
            },
            isNewUser: false,
            message: 'Erfolgreich angemeldet',
          }),
          headers: {
            'Set-Cookie': [
              `accessToken=mock_token; Path=/; HttpOnly; SameSite=Strict`,
              `refreshToken=mock_refresh; Path=/; HttpOnly; SameSite=Strict`,
            ].join(', '),
          },
        });
      }
    });

    // Use the correct placeholder text and wait pattern
    const usernameInput = page.locator(
      'input[placeholder="Benutzername eingeben oder auswählen..."]',
    );
    await usernameInput.click();
    await usernameInput.fill(existingUsername);
    await usernameInput.press('Tab');
    await page.waitForTimeout(500);

    // Submit form
    await page.getByRole('button', { name: /anmelden/i }).click();

    // Verify 200 response
    await expect(page).toHaveURL('/');

    // Verify token in localStorage (if applicable)
    const hasToken = await page.evaluate(() => {
      return localStorage.getItem('auth_token') !== null || document.cookie.includes('accessToken');
    });
    expect(hasToken).toBeTruthy();
  });

  test('logout: Should clear auth and redirect to login', async ({ page, context }) => {
    // First login
    const username = `logout_test_${Date.now()}`;

    // Mock login
    await page.route('**/api/auth', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'u_test', username, role: 'USER' },
          isNewUser: false,
        }),
      });
    });

    // Mock logout
    await page.route('**/api/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Erfolgreich abgemeldet' }),
        headers: {
          'Set-Cookie': [
            `accessToken=; Path=/; HttpOnly; Max-Age=0`,
            `refreshToken=; Path=/; HttpOnly; Max-Age=0`,
          ].join(', '),
        },
      });
    });

    // Login first
    const usernameInput = page.locator(
      'input[placeholder="Benutzername eingeben oder auswählen..."]',
    );
    await usernameInput.click();
    await usernameInput.fill(username);
    await usernameInput.press('Tab');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /anmelden/i }).click();
    await page.waitForURL('/');

    // Find and click logout button
    await page.getByRole('button', { name: /logout|abmelden/i }).click();

    // Verify redirect to auth page
    await expect(page).toHaveURL('/auth');

    // Verify cookies are cleared
    const cookies = await context.cookies();
    const authCookies = cookies.filter(
      (c) => c.name === 'accessToken' || c.name === 'refreshToken',
    );
    expect(authCookies).toHaveLength(0);
  });

  test('Should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/auth', async (route) => {
      await route.abort('failed');
    });

    const usernameInput = page.locator(
      'input[placeholder="Benutzername eingeben oder auswählen..."]',
    );
    await usernameInput.click();
    await usernameInput.fill('test_user');
    await usernameInput.press('Tab');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /anmelden/i }).click();

    // Should show error message
    await expect(page.locator('[role="alert"]')).toContainText(/fehler|error/i);
  });

  test('Should validate username length (min 3 characters)', async ({ page }) => {
    // Try with short username
    const usernameInput = page.locator(
      'input[placeholder="Benutzername eingeben oder auswählen..."]',
    );
    await usernameInput.click();
    await usernameInput.fill('ab');
    await usernameInput.press('Tab');
    await page.waitForTimeout(500);

    const submitButton = page.getByRole('button', { name: /anmelden|registrieren/i });

    // Button should be disabled or show validation error
    const isDisabled = await submitButton.isDisabled();
    const hasError = await page.locator('.error, .text-red-500').isVisible();

    expect(isDisabled || hasError).toBeTruthy();
  });

  test('Should handle rate limiting (429 response)', async ({ page }) => {
    await page.route('**/api/auth', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Zu viele Anfragen. Bitte später erneut versuchen.',
        }),
      });
    });

    const usernameInput = page.locator(
      'input[placeholder="Benutzername eingeben oder auswählen..."]',
    );
    await usernameInput.click();
    await usernameInput.fill('rate_limited_user');
    await usernameInput.press('Tab');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /anmelden/i }).click();

    // Should show rate limit error
    await expect(page.locator('[role="alert"]')).toContainText(/zu viele|später/i);
  });
});
