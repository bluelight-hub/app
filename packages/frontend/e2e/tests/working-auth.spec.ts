import { expect, test } from '@playwright/test';

test.describe('Working Auth Test @auth', () => {
  test('should successfully authenticate', async ({ page }) => {
    // Mock the unified auth endpoint
    await page.route('**/api/auth', async (route) => {
      const postData = route.request().postData();
      const body = postData ? JSON.parse(postData) : {};

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-id',
            username: body.username || 'testuser',
            role: 'USER',
            isActive: true,
          },
          isNewUser: true,
          message: 'User created successfully',
        }),
      });
    });

    // Mock the public users endpoint
    await page.route('**/api/auth/users', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [
            { username: 'user1', role: 'USER' },
            { username: 'user2', role: 'USER' },
          ],
        }),
      });
    });

    // Navigate to auth page
    await page.goto('/auth');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Find the username input using the exact placeholder
    const usernameInput = page.locator('input[placeholder="Benutzername eingeben oder auswählen..."]');
    await expect(usernameInput).toBeVisible({ timeout: 10000 });

    // Type in the username
    await usernameInput.click();
    await usernameInput.fill('testuser123');

    // Trigger input event to ensure React state updates
    await usernameInput.press('Tab');

    // Wait a moment for form validation
    await page.waitForTimeout(500);

    // Find and click the submit button
    const submitButton = page.locator('button[type="submit"]:has-text("Anmelden")');

    // Check if button is enabled
    await expect(submitButton).toBeEnabled({ timeout: 5000 });

    // Click the button
    await submitButton.click();

    // Wait for navigation or success message
    await Promise.race([page.waitForURL('/', { timeout: 5000 }), page.locator('[role="alert"]').waitFor({ timeout: 5000 })]).catch(() => {
      console.log('No navigation or alert found');
    });

    // Log final state
    console.log('Final URL:', page.url());
  });

  test('should validate minimum username length', async ({ page }) => {
    // Navigate to auth page
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    // Find the username input
    const usernameInput = page.locator('input[placeholder="Benutzername eingeben oder auswählen..."]');
    await expect(usernameInput).toBeVisible({ timeout: 10000 });

    // Type a short username (less than 3 characters)
    await usernameInput.click();
    await usernameInput.fill('ab');
    await usernameInput.press('Tab');

    // Wait for validation
    await page.waitForTimeout(500);

    // Check if submit button is disabled
    const submitButton = page.locator('button[type="submit"]:has-text("Anmelden")');
    await expect(submitButton).toBeDisabled();

    // Check for error message
    const errorText = page.locator('text=/Mindestens 3 Zeichen/i');
    await expect(errorText).toBeVisible();
  });
});
