import { expect, test } from '../fixtures/base';

test.describe('Basic Navigation', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Should redirect to auth page
    await expect(page).toHaveURL('/auth');
  });

  test('should show register page elements', async ({ page }) => {
    await page.goto('/auth');
    // Switch to Register tab
    await page
      .getByRole('tab', { name: 'Registrieren' })
      .or(page.getByRole('button', { name: 'Registrieren' }))
      .first()
      .click();

    // Check for register form elements
    await expect(page.getByRole('heading', { name: /BlueLight Hub/i })).toBeVisible();
    await expect(page.getByPlaceholder('z.B. max_mustermann')).toBeVisible();
    // Check that the register button is visible
    await expect(page.getByRole('button', { name: 'Registrieren' }).last()).toBeVisible();
    // Tabs should be present
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

  test('should validate registration form', async ({ page }) => {
    await page.goto('/auth');
    await page
      .getByRole('tab', { name: 'Registrieren' })
      .or(page.getByRole('button', { name: 'Registrieren' }))
      .first()
      .click();

    const input = page.getByPlaceholder('z.B. max_mustermann');
    await input.focus();
    await input.fill('ab');
    await input.blur();

    // Should show validation error for too short username
    await expect(page.getByText('Benutzername muss mindestens 3 Zeichen lang sein')).toBeVisible();
  });

  test('should fill and submit registration form', async ({ page }) => {
    await page.goto('/auth');
    await page
      .getByRole('tab', { name: 'Registrieren' })
      .or(page.getByRole('button', { name: 'Registrieren' }))
      .first()
      .click();

    const timestamp = Date.now();
    const username = `testuser${timestamp}`;

    // Fill form
    await page.getByPlaceholder('z.B. max_mustermann').fill(username);

    // Mock register API to avoid backend dependency
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-' + timestamp,
          username,
          role: 'SUPER_ADMIN',
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    // Submit form
    // Click the register button specifically
    await page.getByRole('button', { name: 'Registrieren' }).last().click();

    // Should redirect to home after successful registration
    await expect(page).toHaveURL('/');
  });
});
