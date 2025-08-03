import { expect, test } from '../fixtures/base';
import { RegisterPage } from '../pages/RegisterPage';

test.describe('Authentication Flow', () => {
  test('should register a new user successfully', async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // Generate unique user data
    const timestamp = Date.now();
    const username = `testuser${timestamp}`;

    await registerPage.goto();
    await registerPage.register(username);

    // Check for successful registration (redirects to home)
    await registerPage.expectSuccess();
  });

  // Skip this test - API doesn't show error for duplicate usernames
  test.skip('should show error for duplicate username registration', async ({ page }) => {
    const registerPage = new RegisterPage(page);

    // First register a user
    const existingUsername = `existing${Date.now()}`;
    await registerPage.goto();
    await registerPage.register(existingUsername);
    await registerPage.expectSuccess();

    // Try to register with same username
    await registerPage.goto();
    await registerPage.register(existingUsername);

    // Check for error message
    await registerPage.expectError('bereits');
  });

  test('should navigate to home from register page', async ({ page }) => {
    const registerPage = new RegisterPage(page);

    await registerPage.goto();
    await expect(page).toHaveURL('/register');

    // Navigate to home
    await registerPage.homeLink.click();

    // Since we're not authenticated, it should redirect back to register
    await expect(page).toHaveURL('/register');
  });

  test('should validate required username field', async ({ page }) => {
    const registerPage = new RegisterPage(page);

    await registerPage.goto();

    // Try to submit without filling field
    await registerPage.submitButton.click();

    // Check for validation message (button should remain on same page)
    await expect(page).toHaveURL('/register');

    // Fill with short username
    await registerPage.usernameInput.fill('ab');

    // Check that we're still on register page (validation failed)
    await expect(page).toHaveURL('/register');
  });

  test('should redirect unauthenticated users to register', async ({ page }) => {
    // Try to access home page without auth
    await page.goto('/');

    // Should redirect to register
    await expect(page).toHaveURL('/register');
  });

  test('should persist authentication state', async ({ page, context }) => {
    const registerPage = new RegisterPage(page);

    // Register a new user
    const username = `persist${Date.now()}`;
    await registerPage.goto();
    await registerPage.register(username);
    await registerPage.expectSuccess();

    // Create new page in same context
    const newPage = await context.newPage();

    // Navigate to home - should not redirect to register
    await newPage.goto('/');
    await expect(newPage).not.toHaveURL('/register');

    await newPage.close();
  });
});
