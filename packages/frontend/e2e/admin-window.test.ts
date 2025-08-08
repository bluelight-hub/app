import { expect, test } from '@playwright/test';

/**
 * E2E Tests für Tauri Fenster-Management
 *
 * Testet das Öffnen des Admin-Dashboards in einem separaten Fenster (Tauri)
 * oder neuen Tab (Browser).
 */

test.describe('Admin Window Management', () => {
  // Helper um als Admin einzuloggen
  async function loginAsAdmin(page) {
    // Navigate to auth page
    await page.goto('/auth');

    // Login with test admin credentials
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'AdminPassword123!');
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL('/');

    // Verify admin status
    await expect(page.getByText('Admin-Bereich')).toBeVisible();
  }

  test.describe('Browser Environment', () => {
    test('should open admin dashboard in new tab when clicking "Neues Fenster" button', async ({
      page,
      context,
    }) => {
      await loginAsAdmin(page);

      // Listen for new page/tab
      const newPagePromise = context.waitForEvent('page');

      // Click the "Neues Fenster" button
      await page.click('button:has-text("Neues Fenster")');

      // Get the new page
      const newPage = await newPagePromise;
      await newPage.waitForLoadState();

      // Verify the new tab opened with admin dashboard
      expect(newPage.url()).toContain('/admin/dashboard');

      // Clean up
      await newPage.close();
    });

    test('should show admin button only for admin users', async ({ page }) => {
      // Login as regular user
      await page.goto('/auth');
      await page.fill('input[name="username"]', 'user');
      await page.fill('input[name="password"]', 'UserPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Verify admin button is not visible
      await expect(page.getByText('Neues Fenster')).not.toBeVisible();

      // Logout
      await page.click('button:has-text("Abmelden")');

      // Login as admin
      await loginAsAdmin(page);

      // Verify admin button is visible
      await expect(page.getByText('Neues Fenster')).toBeVisible();
    });

    test('should have proper button styling and icon', async ({ page }) => {
      await loginAsAdmin(page);

      // Find the button
      const adminWindowButton = page.locator('button:has-text("Neues Fenster")');

      // Verify button exists and is visible
      await expect(adminWindowButton).toBeVisible();

      // Verify button has proper attributes
      await expect(adminWindowButton).toHaveAttribute(
        'title',
        'Admin-Dashboard in separatem Fenster öffnen',
      );

      // Verify button has icon (PiDesktop icon should be present)
      const icon = adminWindowButton.locator('svg');
      await expect(icon).toBeVisible();
    });

    test('should handle popup blocker gracefully', async ({ page }) => {
      await loginAsAdmin(page);

      // Override window.open to simulate popup blocker
      await page.addInitScript(() => {
        window.open = () => null;
      });

      // Spy on console.warn
      const consoleWarnings = [];
      page.on('console', (msg) => {
        if (msg.type() === 'warning') {
          consoleWarnings.push(msg.text());
        }
      });

      // Click the button
      await page.click('button:has-text("Neues Fenster")');

      // Should fallback to navigation in current tab
      await page.waitForURL('/admin/dashboard');

      // Verify we're on admin dashboard
      await expect(page.getByText('Admin-Dashboard')).toBeVisible();
    });
  });

  test.describe('Tauri Environment', () => {
    // Diese Tests würden nur in einer echten Tauri-Umgebung laufen
    // Sie sind hier als Platzhalter für zukünftige Tauri-spezifische Tests

    test.skip('should open admin dashboard in new Tauri window', async () => {
      // This test would only run in Tauri environment
      // Requires special setup with Tauri test driver
    });

    test.skip('should focus existing admin window if already open', async () => {
      // This test would only run in Tauri environment
      // Requires special setup with Tauri test driver
    });

    test.skip('should properly handle window close in Tauri', async () => {
      // This test would only run in Tauri environment
      // Requires special setup with Tauri test driver
    });
  });

  test.describe('Admin Layout Close Button', () => {
    test('should have close button in admin layout', async ({ page }) => {
      await loginAsAdmin(page);

      // Navigate to admin dashboard
      await page.goto('/admin/dashboard');

      // Verify close button exists
      const closeButton = page.locator('button[aria-label="Fenster schließen"]');
      await expect(closeButton).toBeVisible();
    });

    test('should navigate to home when close button is clicked in browser', async ({ page }) => {
      await loginAsAdmin(page);

      // Navigate to admin dashboard
      await page.goto('/admin/dashboard');

      // Click close button
      await page.click('button[aria-label="Fenster schließen"]');

      // Should navigate back to home
      await page.waitForURL('/');
      await expect(page.getByText('Willkommen bei BlueLight Hub')).toBeVisible();
    });
  });

  test.describe('Visual Regression', () => {
    test('should match visual snapshot of admin button area', async ({ page }) => {
      await loginAsAdmin(page);

      // Take screenshot of admin area
      const adminArea = page.locator('text=Admin-Bereich').locator('..');
      await expect(adminArea).toHaveScreenshot('admin-area-with-button.png');
    });

    test('should match visual snapshot of admin dashboard in new window', async ({
      page,
      context,
    }) => {
      await loginAsAdmin(page);

      // Open new window
      const newPagePromise = context.waitForEvent('page');
      await page.click('button:has-text("Neues Fenster")');
      const newPage = await newPagePromise;
      await newPage.waitForLoadState();

      // Take screenshot of admin dashboard
      await expect(newPage).toHaveScreenshot('admin-dashboard-window.png');

      // Clean up
      await newPage.close();
    });
  });
});
