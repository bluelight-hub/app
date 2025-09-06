import { expect, test } from '@playwright/test';
import { EinsatzDashboardPage } from '../pages/EinsatzDashboardPage';
import { EinsatzDetailPage } from '../pages/EinsatzDetailPage';
import { QuickCreateModalPage } from '../pages/QuickCreateModalPage';

test.describe('Einsatz User Journey - Minimale Erstellung und Bearbeitung', () => {
  let dashboardPage: EinsatzDashboardPage;
  let createModalPage: QuickCreateModalPage;
  let detailPage: EinsatzDetailPage;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    dashboardPage = new EinsatzDashboardPage(page);
    createModalPage = new QuickCreateModalPage(page);
    detailPage = new EinsatzDetailPage(page);

    // Login and navigate to dashboard
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/passwort/i).fill('Test123!');
    await page.getByRole('button', { name: /anmelden/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL('/app/**');
    await dashboardPage.goto();
  });

  test('Test 1: Minimale Einsatz-Erstellung über QuickCreateModal (nur optionale Felder)', async () => {
    // Get initial count
    const initialCount = await dashboardPage.getEinsatzCount();

    // Open create modal
    await dashboardPage.openCreateModal();
    await createModalPage.waitForModal();

    // Create minimal Einsatz (empty or with minimal data)
    await createModalPage.fillMinimalEinsatz();

    // Submit should work even without required fields (testing minimal pattern)
    await createModalPage.submit();

    // Verify new Einsatz appears in list
    await dashboardPage.waitForEinsatzList();
    const newCount = await dashboardPage.getEinsatzCount();
    expect(newCount).toBe(initialCount + 1);

    // Verify the new Einsatz is at the top of the list
    const titles = await dashboardPage.getEinsatzTitles();
    expect(titles[0]).toContain('Einsatz'); // Default title pattern
  });

  test('Test 2: Einsatz-Bearbeitung in EinsatzDetailView mit Inline-Editing', async ({ page }) => {
    // Create an Einsatz first
    await dashboardPage.openCreateModal();
    await createModalPage.waitForModal();
    await createModalPage.fillPartialEinsatz({
      title: 'Test Einsatz für Bearbeitung',
      location: 'Berlin',
    });
    await createModalPage.submit();

    // Click on the newly created Einsatz
    await dashboardPage.waitForEinsatzList();
    await dashboardPage.clickEinsatzCard(0);

    // Now in detail view
    await page.waitForURL(/\/app\/einsaetze\/\d+/);

    // Test inline editing - title
    await detailPage.enterEditMode();
    expect(await detailPage.isFieldEditable('title')).toBe(true);

    await detailPage.updateTitle('Aktualisierter Einsatz Titel');
    await detailPage.updateDescription('Neue Beschreibung mit mehr Details');
    await detailPage.updateLocation('Hamburg');

    // Save changes
    await detailPage.exitEditMode(true);
    await detailPage.waitForAutoSave();

    // Verify changes persisted
    expect(await detailPage.getFieldValue('title')).toContain('Aktualisierter Einsatz Titel');
    expect(await detailPage.getFieldValue('description')).toContain('Neue Beschreibung');
    expect(await detailPage.getFieldValue('location')).toContain('Hamburg');
  });

  test('Test 3: Kompletter Workflow von Erstellung → Bearbeitung → Vervollständigung', async ({ page }) => {
    // Step 1: Create minimal Einsatz
    await dashboardPage.openCreateModal();
    await createModalPage.waitForModal();
    await createModalPage.fillMinimalEinsatz('Workflow Test Einsatz');
    await createModalPage.submit();

    // Step 2: Navigate to detail view
    await dashboardPage.waitForEinsatzList();
    await dashboardPage.clickEinsatzCard(0);
    await page.waitForURL(/\/app\/einsaetze\/\d+/);

    // Check initial completeness (should be low)
    const initialCompleteness = await detailPage.getCompleteness();
    expect(initialCompleteness).toBeLessThan(50);

    // Step 3: Enter edit mode and complete fields
    await detailPage.enterEditMode();

    // Fill in missing information
    await detailPage.updateDescription('Vollständige Beschreibung des Einsatzes mit allen relevanten Details');
    await detailPage.updateLocation('München, Marienplatz 1');

    // Change status to IN_BEARBEITUNG
    await detailPage.updateStatus('IN_BEARBEITUNG');

    await detailPage.exitEditMode(true);
    await detailPage.waitForAutoSave();

    // Check improved completeness
    const midCompleteness = await detailPage.getCompleteness();
    expect(midCompleteness).toBeGreaterThan(initialCompleteness);

    // Step 4: Complete the Einsatz
    await detailPage.updateStatus('ABGESCHLOSSEN');
    await page.waitForTimeout(500);

    // Verify status change
    expect(await detailPage.getStatus()).toContain('ABGESCHLOSSEN');

    // Step 5: Navigate back to dashboard
    await detailPage.navigateBack();

    // Verify Einsatz appears with correct status in list
    await dashboardPage.filterByStatus('ABGESCHLOSSEN');
    const titles = await dashboardPage.getEinsatzTitles();
    expect(titles).toContain('Workflow Test Einsatz');
  });

  test('Test 4: EinsatzDashboard Navigation und Filterung', async ({ page }) => {
    // Create multiple Einsätze with different statuses
    const einsaetze = [
      { title: 'Offener Einsatz', status: 'OFFEN' },
      { title: 'In Bearbeitung', status: 'IN_BEARBEITUNG' },
      { title: 'Abgeschlossener Einsatz', status: 'ABGESCHLOSSEN' },
    ];

    for (const einsatz of einsaetze) {
      await dashboardPage.openCreateModal();
      await createModalPage.waitForModal();
      await createModalPage.fillPartialEinsatz({ title: einsatz.title });
      await createModalPage.submit();
      await page.waitForTimeout(500);
    }

    // Test search functionality
    await dashboardPage.searchEinsatz('Bearbeitung');
    await page.waitForTimeout(1000); // Wait for search debounce
    let titles = await dashboardPage.getEinsatzTitles();
    expect(titles).toContain('In Bearbeitung');
    expect(titles).not.toContain('Offener Einsatz');

    // Clear search
    await dashboardPage.searchEinsatz('');
    await page.waitForTimeout(1000);

    // Test status filtering
    await dashboardPage.filterByStatus('OFFEN');
    await page.waitForTimeout(500);
    titles = await dashboardPage.getEinsatzTitles();
    expect(titles).toContain('Offener Einsatz');
    expect(titles).not.toContain('Abgeschlossener Einsatz');

    // Test sorting (assuming there's a sort by date option)
    await dashboardPage.sortBy('Neueste zuerst');
    await page.waitForTimeout(500);
    titles = await dashboardPage.getEinsatzTitles();
    // Most recent should be first
    expect(titles[0]).toBe('Abgeschlossener Einsatz');
  });

  test('Test 5: Error Handling - Netzwerkfehler während Einsatz-Erstellung', async ({ page, context }) => {
    // Intercept API calls to simulate network error
    await context.route('**/api/einsaetze', (route) => {
      route.abort('failed');
    });

    // Try to create Einsatz
    await dashboardPage.openCreateModal();
    await createModalPage.waitForModal();
    await createModalPage.fillPartialEinsatz({
      title: 'Test mit Netzwerkfehler',
      description: 'Dies sollte fehlschlagen',
    });
    await createModalPage.submit();

    // Should show error message
    const errorMessage = await page.getByText(/fehler|error/i).textContent();
    expect(errorMessage).toBeTruthy();
  });

  test('Test 6: Responsive Design - Mobile Viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Dashboard should be responsive
    await dashboardPage.goto();
    await expect(dashboardPage.pageTitle).toBeVisible();

    // Create button should be accessible
    await expect(dashboardPage.createButton).toBeVisible();

    // Open modal on mobile
    await dashboardPage.openCreateModal();
    await createModalPage.waitForModal();

    // Modal should fit mobile screen
    const modalBounds = await createModalPage.modal.boundingBox();
    expect(modalBounds?.width).toBeLessThanOrEqual(375);

    // Close modal
    await createModalPage.cancel();

    // Navigate to detail view on mobile
    await dashboardPage.clickEinsatzCard(0);
    await page.waitForURL(/\/app\/einsaetze\/\d+/);

    // Detail view should be responsive
    await expect(detailPage.titleField).toBeVisible();
    await expect(detailPage.statusBadge).toBeVisible();
  });

  test('Test 7: Keyboard Navigation und Accessibility', async ({ page }) => {
    // Navigate to dashboard using keyboard
    await dashboardPage.goto();

    // Tab to create button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Open modal with Enter
    await page.keyboard.press('Enter');
    await createModalPage.waitForModal();

    // Tab through form fields
    await page.keyboard.press('Tab');
    await page.keyboard.type('Keyboard Test Einsatz');

    await page.keyboard.press('Tab');
    await page.keyboard.type('Beschreibung via Tastatur');

    // Submit with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Verify Einsatz was created
    await dashboardPage.waitForEinsatzList();
    const titles = await dashboardPage.getEinsatzTitles();
    expect(titles).toContain('Keyboard Test Einsatz');
  });

  test('Test 8: Visual Regression - Screenshot Comparison', async ({ page }) => {
    // Take screenshot of dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForEinsatzList();
    await expect(page).toHaveScreenshot('dashboard-overview.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Screenshot of create modal
    await dashboardPage.openCreateModal();
    await createModalPage.waitForModal();
    await expect(createModalPage.modal).toHaveScreenshot('create-modal.png');

    // Screenshot of detail view
    await createModalPage.cancel();
    await dashboardPage.clickEinsatzCard(0);
    await page.waitForURL(/\/app\/einsaetze\/\d+/);
    await expect(page).toHaveScreenshot('detail-view.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
