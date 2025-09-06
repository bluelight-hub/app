import { checkA11y, injectAxe } from 'axe-playwright';
import { expect, test } from '../fixtures/einsatz.fixtures';

test.describe('Einsatz Accessibility Tests', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test('A11y: Dashboard page meets WCAG standards', async ({ page, dashboardPage }) => {
    // Inject axe-core
    await injectAxe(page);

    // Check dashboard accessibility
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });

    // Check specific elements
    await expect(dashboardPage.pageTitle).toHaveAttribute('role', 'heading');
    await expect(dashboardPage.createButton).toHaveAttribute('aria-label');

    // Verify keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('A11y: Create modal is accessible', async ({ page, dashboardPage, createModalPage }) => {
    await dashboardPage.openCreateModal();
    await createModalPage.waitForModal();

    // Inject and check
    await injectAxe(page);
    await checkA11y(page, '[data-testid="quick-create-modal"]', {
      detailedReport: true,
    });

    // Check modal attributes
    await expect(createModalPage.modal).toHaveAttribute('role', 'dialog');
    await expect(createModalPage.modal).toHaveAttribute('aria-modal', 'true');

    // Check form labels
    const titleLabel = page.getByText(/titel/i);
    await expect(titleLabel).toHaveAttribute('for');

    // Test escape key closes modal
    await page.keyboard.press('Escape');
    await expect(createModalPage.modal).not.toBeVisible();
  });

  test('A11y: Detail view supports screen readers', async ({ page, dashboardPage, detailPage }) => {
    // Create and navigate to Einsatz
    await dashboardPage.openCreateModal();
    await page.getByLabel(/titel/i).fill('Accessibility Test');
    await page.getByRole('button', { name: /erstellen/i }).click();
    await dashboardPage.waitForEinsatzList();
    await dashboardPage.clickEinsatzCard(0);

    // Inject and check
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
    });

    // Check ARIA labels
    await expect(detailPage.statusBadge).toHaveAttribute('aria-label');
    await expect(detailPage.progressBar).toHaveAttribute('aria-valuenow');
    await expect(detailPage.progressBar).toHaveAttribute('aria-valuemin', '0');
    await expect(detailPage.progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  test('A11y: Keyboard navigation works throughout application', async ({ page }) => {
    // Test tab order
    const tabbableElements = await page.$$eval('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])', (elements) =>
      elements.map((el) => ({
        tag: el.tagName,
        text: el.textContent?.trim() || '',
        tabIndex: el.getAttribute('tabindex'),
      })),
    );

    expect(tabbableElements.length).toBeGreaterThan(0);

    // Navigate through elements
    for (let i = 0; i < Math.min(5, tabbableElements.length); i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          visible: el ? window.getComputedStyle(el).visibility !== 'hidden' : false,
        };
      });
      expect(focused.visible).toBe(true);
    }
  });

  test('A11y: Focus management during modal transitions', async ({ page, dashboardPage, createModalPage }) => {
    // Store initial focus
    await dashboardPage.createButton.focus();

    // Open modal
    await page.keyboard.press('Enter');
    await createModalPage.waitForModal();

    // Focus should be trapped in modal
    const focusedInModal = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="quick-create-modal"]');
      return modal?.contains(document.activeElement);
    });
    expect(focusedInModal).toBe(true);

    // Close modal
    await page.keyboard.press('Escape');

    // Focus should return to trigger button
    const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedElement).toContain('Einsatz');
  });

  test('A11y: Color contrast meets WCAG AA standards', async ({ page }) => {
    // Check contrast ratios
    await injectAxe(page);

    const results = await page.evaluate(async () => {
      const axe = (window as { axe?: { run: (options?: unknown) => Promise<{ violations: unknown[] }> } }).axe;
      const result = await axe.run({
        rules: {
          'color-contrast': { enabled: true },
        },
      });
      return result.violations;
    });

    // No color contrast violations
    const contrastViolations = results.filter((v: { id: string }) => v.id === 'color-contrast');
    expect(contrastViolations).toHaveLength(0);
  });

  test('A11y: Form validation messages are announced', async ({ page, dashboardPage, createModalPage }) => {
    await dashboardPage.openCreateModal();
    await createModalPage.waitForModal();

    // Try to submit empty form (if validation exists)
    await createModalPage.submit();

    // Check for ARIA live regions
    const liveRegions = await page.$$('[aria-live]');
    expect(liveRegions.length).toBeGreaterThan(0);

    // Check error messages have proper ARIA
    const errors = await page.$$('[role="alert"]');
    for (const error of errors) {
      const isVisible = await error.isVisible();
      if (isVisible) {
        const text = await error.textContent();
        expect(text).toBeTruthy();
      }
    }
  });

  test('A11y: Responsive design maintains accessibility', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);

      // Check accessibility at each size
      await injectAxe(page);

      try {
        await checkA11y(page, undefined, {
          detailedReport: false,
        });
      } catch (e) {
        throw new Error(`Accessibility issues at ${viewport.name} viewport: ${e}`);
      }
    }
  });

  test('A11y: Skip links and landmarks are present', async ({ page }) => {
    // Check for skip link
    const skipLink = page.getByText(/skip to main content/i);
    const skipLinkExists = (await skipLink.count()) > 0;

    if (skipLinkExists) {
      // Skip link should be first focusable element
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.textContent);
      expect(focused?.toLowerCase()).toContain('skip');
    }

    // Check for landmarks
    const landmarks = await page.$$eval('main, nav, header, footer, aside, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]', (elements) =>
      elements.map((el) => ({
        tag: el.tagName,
        role: el.getAttribute('role'),
      })),
    );

    expect(landmarks.length).toBeGreaterThan(0);

    // Should have at least main content area
    const hasMain = landmarks.some((l) => l.tag === 'MAIN' || l.role === 'main');
    expect(hasMain).toBe(true);
  });

  test('A11y: Images have appropriate alt text', async ({ page }) => {
    // Find all images
    const images = await page.$$('img');

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      const role = await img.getAttribute('role');

      // Decorative images should have empty alt or role="presentation"
      // Informative images should have descriptive alt text
      if (role === 'presentation' || src?.includes('decoration')) {
        expect(alt).toBe('');
      } else {
        expect(alt).toBeTruthy();
        expect(alt?.length).toBeGreaterThan(0);
      }
    }
  });
});
