import { test } from '@playwright/test';

test.describe('Debug Auth Page', () => {
  test('take screenshot of auth page', async ({ page }) => {
    // Navigate to auth page
    await page.goto('/auth');

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'auth-page-debug.png', fullPage: true });

    // Log page content for debugging
    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());

    // Check if combobox exists
    const comboboxCount = await page.locator('[role="combobox"]').count();
    console.log('Combobox elements found:', comboboxCount);

    // Check for input elements
    const inputCount = await page.locator('input').count();
    console.log('Input elements found:', inputCount);

    // Check for any error messages
    const errors = await page.locator('.error, [role="alert"]').allTextContents();
    if (errors.length > 0) {
      console.log('Errors found:', errors);
    }

    // List all visible form elements
    const formElements = await page.locator('form').count();
    console.log('Form elements found:', formElements);

    // Try to find the username input specifically
    const usernameInputs = await page.locator('input[placeholder*="Benutzername"]').count();
    console.log('Username inputs by placeholder:', usernameInputs);

    // Check HeadlessUI combobox structure
    const headlessInputs = await page.locator('[data-headlessui-state]').count();
    console.log('Headless UI elements:', headlessInputs);
  });
});
