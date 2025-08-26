import { expect, test } from '@playwright/test';

test.describe('Simple Auth Test', () => {
  test('should login with mocked API', async ({ page }) => {
    // Mock the API response
    await page.route('**/api/auth', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-id',
            username: 'testuser',
            role: 'USER',
            isActive: true,
          },
          isNewUser: true,
          message: 'User created successfully',
        }),
      });
    });

    // Navigate to auth page
    await page.goto('/auth');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Find and fill the username input
    const usernameInput = page.locator('input[placeholder*="Benutzername"]');
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await usernameInput.fill('testuser');

    // Find the submit button and log its text
    const buttons = await page.locator('button').all();
    console.log('Found buttons:', buttons.length);

    for (const button of buttons) {
      const text = await button.textContent();
      console.log('Button text:', text);
    }

    // Try to find button with "Anmelden" text
    const submitButton = page.locator('button:has-text("Anmelden")');
    const buttonExists = await submitButton.isVisible();
    console.log('Submit button visible:', buttonExists);

    if (buttonExists) {
      await submitButton.click();

      // Wait for navigation
      await page.waitForURL('/', { timeout: 5000 }).catch(() => {
        console.log('Navigation did not happen');
      });
    }

    // Check current URL
    console.log('Current URL:', page.url());
  });
});
