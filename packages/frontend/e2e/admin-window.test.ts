import { expect, test } from '@playwright/test';

/**
 * E2E Tests für Tauri Fenster-Management
 *
 * Testet das Öffnen des Admin-Dashboards in einem separaten Fenster (Tauri)
 * oder neuen Tab (Browser).
 */

// Temporarily skip these tests until auth flow is properly mocked
test.describe.skip('Admin Window Management', () => {
  // Helper um als Admin einzuloggen
  async function loginAsAdmin(page: Page) {
    // Set localStorage to simulate logged-in admin user
    await page.addInitScript(() => {
      const adminUser = {
        id: 'admin-1',
        username: 'admin',
        role: 'SUPER_ADMIN',
        isActive: true,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('user', JSON.stringify(adminUser));
      localStorage.setItem('isAuthenticated', 'true');
    });

    // Navigate directly to home page with auth already set
    await page.goto('/');

    // Verify admin status - check for the button specifically
    await expect(page.getByRole('button', { name: 'Admin-Bereich' })).toBeVisible();
  }

  test.describe('Browser Environment', () => {
    test('should open admin dashboard in new tab when clicking "Admin-Bereich" button', async ({
      page,
      context,
    }) => {
      await loginAsAdmin(page);

      // Listen for new page/tab
      const newPagePromise = context.waitForEvent('page');

      // Click the Admin-Bereich button
      await page.getByRole('button', { name: 'Admin-Bereich' }).click();

      // Get the new page
      const newPage = await newPagePromise;
      await newPage.waitForLoadState();

      // Verify the new tab opened with admin dashboard
      expect(newPage.url()).toContain('/admin/dashboard');

      // Clean up
      await newPage.close();
    });

    test('should show admin button only for admin users', async ({ page }) => {
      // Login as regular user (mocked)
      await page.goto('/auth');
      await page.route('**/api/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-1',
            username: 'user',
            role: 'USER',
            isActive: true,
            lastLoginAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      });
      await page
        .getByRole('tab', { name: 'Anmelden' })
        .or(page.getByRole('button', { name: 'Anmelden' }))
        .first()
        .click();
      const loginInput = page
        .getByPlaceholder('Benutzername eingeben oder auswählen...')
        .or(page.getByRole('combobox'));
      await loginInput.fill('user');
      // Click the login submit button specifically (not the tab)
      await page.getByRole('button', { name: 'Anmelden' }).last().click();
      await page.waitForURL('/');

      // Verify admin button is not visible
      await expect(page.getByRole('button', { name: 'Admin-Bereich' })).not.toBeVisible();

      // Logout
      // Logout (mock request)
      await page.route('**/api/auth/logout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      });
      await page.click('button:has-text("Abmelden")');

      // Login as admin
      await loginAsAdmin(page);

      // Verify admin button is visible
      await expect(page.getByRole('button', { name: 'Admin-Bereich' })).toBeVisible();
    });

    test('should have proper button styling and icon', async ({ page }) => {
      await loginAsAdmin(page);

      // Find the button
      const adminWindowButton = page.getByRole('button', { name: 'Admin-Bereich' });

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
      await page.getByRole('button', { name: 'Admin-Bereich' }).click();

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
      await page.getByRole('button', { name: 'Admin-Bereich' }).click();
      const newPage = await newPagePromise;
      await newPage.waitForLoadState();

      // Take screenshot of admin dashboard
      await expect(newPage).toHaveScreenshot('admin-dashboard-window.png');

      // Clean up
      await newPage.close();
    });
  });
});
