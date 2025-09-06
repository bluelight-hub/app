import { expect, seedDatabase, test } from '../fixtures/einsatz.fixtures';

test.describe('Einsatz Performance Tests', () => {
  test.use({});

  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test('Performance: Dashboard lädt effizient mit 100+ Einsätzen', async ({ page, dashboardPage }) => {
    // Measure initial load time
    const startTime = Date.now();

    // Seed database with 100 Einsätze
    await seedDatabase(page, 100);

    // Navigate to dashboard and measure load time
    await dashboardPage.goto();
    await dashboardPage.waitForEinsatzList();

    const loadTime = Date.now() - startTime;

    // Dashboard should load within 3 seconds even with 100 items
    expect(loadTime).toBeLessThan(3000);

    // Verify virtualization is working (not all items rendered at once)
    const visibleCards = await page.$$('[data-testid="einsatz-card"]:visible');
    expect(visibleCards.length).toBeLessThan(100); // Should use virtualization

    // Test scroll performance
    const scrollStart = Date.now();
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStart;

    // Scrolling should be smooth (under 500ms)
    expect(scrollTime).toBeLessThan(500);
  });

  test('Performance: Search performs well with large dataset', async ({ page, dashboardPage }) => {
    // Seed with varied data
    await seedDatabase(page, 50);

    // Measure search performance
    const searchStart = Date.now();
    await dashboardPage.searchEinsatz('Seeded');
    await page.waitForTimeout(600); // Wait for debounce

    const searchTime = Date.now() - searchStart;
    expect(searchTime).toBeLessThan(1000);

    // Results should update quickly
    const results = await dashboardPage.getEinsatzCount();
    expect(results).toBeGreaterThan(0);
  });

  test('Performance: Filter operations are optimized', async ({ page, dashboardPage }) => {
    // Create diverse dataset
    await seedDatabase(page, 30);

    // Measure filter performance
    const filterStart = Date.now();
    await dashboardPage.filterByStatus('OFFEN');
    await page.waitForTimeout(200);

    const filterTime = Date.now() - filterStart;
    expect(filterTime).toBeLessThan(500);

    // Multiple filter changes should be fast
    await dashboardPage.filterByStatus('IN_BEARBEITUNG');
    await page.waitForTimeout(200);
    await dashboardPage.filterByStatus('ABGESCHLOSSEN');
    await page.waitForTimeout(200);

    // All operations should complete quickly
    const totalTime = Date.now() - filterStart;
    expect(totalTime).toBeLessThan(1500);
  });

  test('Performance: Detail view loads quickly', async ({ page, dashboardPage, detailPage }) => {
    // Create test Einsatz
    await dashboardPage.openCreateModal();
    const modal = page.getByTestId('quick-create-modal');
    await modal.waitFor({ state: 'visible' });
    await page.getByLabel(/titel/i).fill('Performance Test Einsatz');
    await page.getByRole('button', { name: /erstellen/i }).click();
    await modal.waitFor({ state: 'hidden' });

    // Measure navigation to detail view
    const navStart = Date.now();
    await dashboardPage.clickEinsatzCard(0);
    await page.waitForURL(/\/app\/einsaetze\/\d+/);

    const navTime = Date.now() - navStart;
    expect(navTime).toBeLessThan(1000);

    // Measure inline edit performance
    const editStart = Date.now();
    await detailPage.enterEditMode();
    await detailPage.updateTitle('Updated Title');
    await detailPage.exitEditMode(true);

    const editTime = Date.now() - editStart;
    expect(editTime).toBeLessThan(1500);
  });

  test('Performance: Optimistic updates provide instant feedback', async ({ page, detailPage }) => {
    // Navigate to an existing Einsatz
    await page.goto('/app/einsaetze/1');

    // Measure optimistic update speed
    await detailPage.enterEditMode();

    const updateStart = Date.now();
    await detailPage.updateTitle('Optimistic Update Test');

    // UI should update immediately (within 100ms)
    const uiUpdateTime = Date.now() - updateStart;
    expect(uiUpdateTime).toBeLessThan(100);

    // Verify the value changed immediately
    const currentValue = await detailPage.getFieldValue('title');
    expect(currentValue).toContain('Optimistic Update Test');

    // Save and verify persistence
    await detailPage.exitEditMode(true);
    await detailPage.waitForAutoSave();
  });

  test('Performance: Memory usage remains stable with many operations', async ({ page, dashboardPage }) => {
    // Monitor memory usage if available
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as { memory?: unknown }).memory;
      }
      return null;
    });

    if (metrics) {
      const initialMemory = metrics.usedJSHeapSize;

      // Perform many operations
      for (let i = 0; i < 10; i++) {
        await dashboardPage.openCreateModal();
        await page.getByLabel(/titel/i).fill(`Memory Test ${i}`);
        await page.getByRole('button', { name: /erstellen/i }).click();
        await page.waitForTimeout(100);
      }

      // Check memory after operations
      const finalMetrics = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as { memory?: unknown }).memory;
        }
        return null;
      });

      if (finalMetrics) {
        const memoryIncrease = finalMetrics.usedJSHeapSize - initialMemory;
        // Memory increase should be reasonable (less than 50MB)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      }
    }
  });

  test('Performance: Bundle size and initial load metrics', async ({ page }) => {
    // Navigate with performance monitoring
    const performanceData = await page.evaluate(() => {
      return JSON.stringify(performance.getEntriesByType('navigation')[0]);
    });

    const navTiming = JSON.parse(performanceData);

    // Check key performance metrics
    expect(navTiming.domContentLoadedEventEnd).toBeLessThan(2000);
    expect(navTiming.loadEventEnd).toBeLessThan(3000);

    // Check resource loading
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      return entries.map((e) => ({
        name: e.name,
        duration: e.duration,
        size: (e as { transferSize?: number }).transferSize || 0,
      }));
    });

    // Main bundle should be reasonably sized
    const mainBundle = resources.find((r) => r.name.includes('.js') && !r.name.includes('chunk'));
    if (mainBundle) {
      expect(mainBundle.size).toBeLessThan(500 * 1024); // 500KB max for main bundle
    }
  });
});
