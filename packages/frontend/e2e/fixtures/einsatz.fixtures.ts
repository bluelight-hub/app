import { test as base, type Page } from '@playwright/test';
import { EinsatzDashboardPage } from '../pages/EinsatzDashboardPage';
import { QuickCreateModalPage } from '../pages/QuickCreateModalPage';
import { EinsatzDetailPage } from '../pages/EinsatzDetailPage';

// Define types for fixtures
type EinsatzFixtures = {
  dashboardPage: EinsatzDashboardPage;
  createModalPage: QuickCreateModalPage;
  detailPage: EinsatzDetailPage;
  testEinsatzData: EinsatzTestData;
  authenticatedPage: undefined;
};

type EinsatzTestData = {
  minimal: {
    title?: string;
  };
  partial: {
    title: string;
    description: string;
    location: string;
  };
  complete: {
    title: string;
    description: string;
    location: string;
    date: string;
    time: string;
    priority: 'NIEDRIG' | 'MITTEL' | 'HOCH' | 'KRITISCH';
    type: string;
  };
  multiple: Array<{
    title: string;
    status: 'OFFEN' | 'IN_BEARBEITUNG' | 'ABGESCHLOSSEN';
    priority: 'NIEDRIG' | 'MITTEL' | 'HOCH' | 'KRITISCH';
  }>;
};

// Extend base test with our fixtures
export const test = base.extend<EinsatzFixtures>({
  // Page Object fixtures
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new EinsatzDashboardPage(page);
    await use(dashboardPage);
  },

  createModalPage: async ({ page }, use) => {
    const createModalPage = new QuickCreateModalPage(page);
    await use(createModalPage);
  },

  detailPage: async ({ page }, use) => {
    const detailPage = new EinsatzDetailPage(page);
    await use(detailPage);
  },

  // Test data fixture
  testEinsatzData: async (_, use) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);

    await use({
      minimal: {
        title: `Min. Einsatz ${Date.now()}`,
      },
      partial: {
        title: `Test Einsatz ${Date.now()}`,
        description: 'Dies ist eine Testbeschreibung für einen partiellen Einsatz',
        location: 'Berlin, Alexanderplatz',
      },
      complete: {
        title: `Vollständiger Einsatz ${Date.now()}`,
        description: 'Ausführliche Beschreibung mit allen Details für den Einsatz. Dieser Text enthält alle relevanten Informationen.',
        location: 'München, Marienplatz 1, 80331 München',
        date: dateStr,
        time: timeStr,
        priority: 'HOCH',
        type: 'BRAND',
      },
      multiple: [
        {
          title: `Offener Einsatz ${Date.now()}`,
          status: 'OFFEN',
          priority: 'MITTEL',
        },
        {
          title: `Laufender Einsatz ${Date.now()}`,
          status: 'IN_BEARBEITUNG',
          priority: 'HOCH',
        },
        {
          title: `Abgeschlossener Einsatz ${Date.now()}`,
          status: 'ABGESCHLOSSEN',
          priority: 'NIEDRIG',
        },
      ],
    });
  },

  // Authentication fixture
  authenticatedPage: async ({ page }, use) => {
    // Perform login
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/passwort/i).fill(process.env.TEST_USER_PASSWORD || 'Test123!');
    await page.getByRole('button', { name: /anmelden/i }).click();

    // Wait for successful login
    await page.waitForURL('/app/**');

    // Use the authenticated page
    await use();

    // Cleanup: Logout after test
    const logoutButton = page.getByRole('button', { name: /abmelden|logout/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
  },
});

export { expect } from '@playwright/test';

// Helper functions for test data
export const generateEinsatzData = (type: 'minimal' | 'partial' | 'complete') => {
  const timestamp = Date.now();
  const baseData = {
    minimal: {
      title: `Min. Einsatz ${timestamp}`,
    },
    partial: {
      title: `Partial Einsatz ${timestamp}`,
      description: `Beschreibung ${timestamp}`,
      location: 'Test Location',
    },
    complete: {
      title: `Complete Einsatz ${timestamp}`,
      description: `Vollständige Beschreibung ${timestamp}`,
      location: 'Test Location, Street 123',
      date: new Date().toISOString().split('T')[0],
      time: '14:30',
      priority: 'HOCH' as const,
      type: 'BRAND',
    },
  };

  return baseData[type];
};

// Database seeding helper
export const seedDatabase = async (page: Page, count: number = 10) => {
  // This would typically call an API endpoint to seed test data
  // For now, we'll create them through the UI
  const dashboard = new EinsatzDashboardPage(page);
  const modal = new QuickCreateModalPage(page);

  for (let i = 0; i < count; i++) {
    await dashboard.openCreateModal();
    await modal.fillPartialEinsatz({
      title: `Seeded Einsatz ${i + 1}`,
      description: `Auto-generated test data ${i + 1}`,
      location: `Location ${i + 1}`,
    });
    await modal.submit();
    await page.waitForTimeout(200); // Small delay between creations
  }
};

// Cleanup helper
export const cleanupTestData = async (page: Page) => {
  // This would typically call an API endpoint to clean test data
  // For E2E tests, this might involve:
  // - Deleting all test Einsätze created during tests
  // - Resetting database to known state
  // - Clearing localStorage/sessionStorage

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
};
