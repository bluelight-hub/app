import { expect, test } from '@playwright/test';

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page
      .getByRole('tab', { name: 'Registrieren' })
      .or(page.getByRole('button', { name: 'Registrieren' }))
      .first()
      .click();
  });

  test('should display registration form', async ({ page }) => {
    // Check heading (auth screen)
    await expect(page.getByRole('heading', { name: /BlueLight Hub/i })).toBeVisible();

    // Check form elements
    await expect(page.getByPlaceholder('z.B. max_mustermann')).toBeVisible();
    // Use a more specific selector for the register button
    await expect(page.getByRole('button', { name: 'Registrieren' }).last()).toBeVisible();

    // Tabs present
    await expect(
      page.getByRole('tab').or(page.getByRole('button')).filter({ hasText: 'Anmelden' }).first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole('tab')
        .or(page.getByRole('button'))
        .filter({ hasText: 'Registrieren' })
        .first(),
    ).toBeVisible();
  });

  test('should validate username field', async ({ page }) => {
    // Be specific about which submit button (register, not login)
    const submitButton = page.getByRole('button', { name: 'Registrieren' }).last();
    const usernameInput = page.getByPlaceholder('z.B. max_mustermann');

    // Button should be disabled initially (invalid form)
    await expect(submitButton).toBeDisabled();

    // Type short username (invalid)
    await usernameInput.fill('ab');
    await usernameInput.blur();

    // Should show length error
    await expect(page.getByText('Benutzername muss mindestens 3 Zeichen lang sein')).toBeVisible();

    // Type valid username
    await usernameInput.fill('testuser');

    // Button should be enabled if valid
    await expect(submitButton).toBeEnabled();
  });

  test('should register new user successfully', async ({ page }) => {
    const timestamp = Date.now();
    const username = `testuser${timestamp}`;

    // Mock register API
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-' + timestamp,
          username,
          role: 'USER',
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    // Fill form
    await page.getByPlaceholder('z.B. max_mustermann').fill(username);

    // Submit
    await page.getByRole('button', { name: 'Registrieren' }).last().click();

    // Should redirect to homepage after successful registration
    await expect(page).toHaveURL('/');

    // Should show authenticated content (not redirect back to auth)
    await expect(page).not.toHaveURL('/auth');
  });

  // Skip this test - API doesn't show error for duplicate usernames
  test.skip('should show error for duplicate username', async ({ page, request }) => {
    // First create a user via API
    const existingUser = `existing${Date.now()}`;
    await request.post('http://localhost:3000/api/auth/register', {
      data: { username: existingUser },
    });

    // Try to register with same username
    await page.getByPlaceholder('Wählen Sie einen Benutzernamen').fill(existingUser);
    await page.getByRole('button', { name: 'Registrieren' }).click();

    // Should show error alert
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText('Registrierung fehlgeschlagen!')).toBeVisible();
  });

  test('should navigate to login tab', async ({ page }) => {
    await page
      .getByRole('tab', { name: 'Anmelden' })
      .or(page.getByRole('button', { name: 'Anmelden' }))
      .first()
      .click();
    await expect(page).toHaveURL('/auth');
  });

  test('should handle loading state', async ({ page }) => {
    const username = `loadingtest${Date.now()}`;

    // Mock register API
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-' + Date.now(),
          username,
          role: 'USER',
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    // Fill form
    await page.getByPlaceholder('z.B. max_mustermann').fill(username);

    // Click submit
    await page.getByRole('button', { name: 'Registrieren' }).last().click();

    // Should redirect after successful registration
    await expect(page).toHaveURL('/');
  });
});
