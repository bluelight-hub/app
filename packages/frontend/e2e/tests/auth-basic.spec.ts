import { expect, test } from '../fixtures/base';

test.describe('Basic Navigation', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show register page elements', async ({ page }) => {
    await page.goto('/register');

    // Check for register form elements
    await expect(page.getByRole('heading', { name: /registrierung/i })).toBeVisible();
    await expect(page.getByPlaceholder('Wählen Sie einen Benutzernamen')).toBeVisible();
    await expect(page.getByRole('button', { name: /registrieren/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Jetzt anmelden' })).toBeVisible();
  });

  test('should validate registration form', async ({ page }) => {
    await page.goto('/register');

    // Try to submit empty form
    await page.getByRole('button', { name: /registrieren/i }).click();

    // Should show validation errors
    // Note: Exact error messages depend on your validation implementation
    await expect(page.getByText(/erforderlich|required/i).first()).toBeVisible();
  });

  test('should fill and submit registration form', async ({ page }) => {
    await page.goto('/register');

    const timestamp = Date.now();
    const username = `testuser${timestamp}`;

    // Fill form
    await page.getByPlaceholder('Wählen Sie einen Benutzernamen').fill(username);

    // Submit form
    await page.getByRole('button', { name: /registrieren/i }).click();

    // Should redirect to home after successful registration
    await expect(page).toHaveURL('/');
  });
});
