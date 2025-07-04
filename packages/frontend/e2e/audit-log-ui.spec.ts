import { test, expect, Page } from '@playwright/test';

/**
 * E2E-Tests für die Audit Log UI
 *
 * Diese Tests validieren:
 * - Audit Log Viewer Interface
 * - Filter und Suchfunktionalität
 * - Pagination und Sortierung
 * - Real-time Updates
 * - Export Funktionalität
 * - Responsive Design
 */

class AuditLogPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/admin/audit-logs');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string = 'admin@test.com', password: string = 'Test123!') {
    await this.page.goto('/admin/login');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/admin/dashboard');
  }

  // Navigation
  async navigateToAuditLogs() {
    await this.page.click('[data-testid="audit-logs-nav"]');
    await this.page.waitForURL('/admin/audit-logs');
  }

  // Filter operations
  async filterByActionType(actionType: string) {
    await this.page.selectOption('[data-testid="action-type-filter"]', actionType);
    await this.page.waitForResponse(
      (response) => response.url().includes('/api/admin/audit-logs') && response.status() === 200,
    );
  }

  async filterBySeverity(severity: string) {
    await this.page.selectOption('[data-testid="severity-filter"]', severity);
    await this.page.waitForResponse(
      (response) => response.url().includes('/api/admin/audit-logs') && response.status() === 200,
    );
  }

  async filterByDateRange(startDate: string, endDate: string) {
    await this.page.fill('[data-testid="start-date-input"]', startDate);
    await this.page.fill('[data-testid="end-date-input"]', endDate);
    await this.page.click('[data-testid="apply-date-filter"]');
    await this.page.waitForResponse(
      (response) => response.url().includes('/api/admin/audit-logs') && response.status() === 200,
    );
  }

  async searchLogs(searchTerm: string) {
    await this.page.fill('[data-testid="search-input"]', searchTerm);
    await this.page.press('[data-testid="search-input"]', 'Enter');
    await this.page.waitForResponse(
      (response) => response.url().includes('/api/admin/audit-logs') && response.status() === 200,
    );
  }

  // Table operations
  async sortByColumn(columnName: string) {
    await this.page.click(`[data-testid="sort-${columnName}"]`);
    await this.page.waitForResponse(
      (response) => response.url().includes('/api/admin/audit-logs') && response.status() === 200,
    );
  }

  async goToPage(pageNumber: number) {
    await this.page.click(`[data-testid="pagination-page-${pageNumber}"]`);
    await this.page.waitForResponse(
      (response) => response.url().includes('/api/audit-logs') && response.status() === 200,
    );
  }

  async changePageSize(size: number) {
    await this.page.selectOption('[data-testid="page-size-selector"]', size.toString());
    await this.page.waitForResponse(
      (response) => response.url().includes('/api/audit-logs') && response.status() === 200,
    );
  }

  // Detail operations
  async openLogDetails(logId: string) {
    await this.page.click(`[data-testid="log-row-${logId}"]`);
    await this.page.waitForSelector('[data-testid="log-detail-modal"]');
  }

  async markAsReviewed(logId: string) {
    await this.page.click(`[data-testid="review-button-${logId}"]`);
    await this.page.waitForResponse(
      (response) =>
        response.url().includes(`/api/audit-logs/${logId}/review`) && response.status() === 200,
    );
  }

  // Export operations
  async exportLogs(format: 'csv' | 'json' = 'csv') {
    await this.page.click('[data-testid="export-button"]');
    await this.page.click(`[data-testid="export-${format}"]`);

    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('[data-testid="confirm-export"]');
    const download = await downloadPromise;

    return download;
  }

  // Statistics
  async viewStatistics() {
    await this.page.click('[data-testid="statistics-tab"]');
    await this.page.waitForSelector('[data-testid="statistics-dashboard"]');
  }

  // Real-time features
  async enableRealTimeUpdates() {
    await this.page.click('[data-testid="realtime-toggle"]');
    await this.page.waitForSelector('[data-testid="realtime-indicator"][data-status="connected"]');
  }

  async disableRealTimeUpdates() {
    await this.page.click('[data-testid="realtime-toggle"]');
    await this.page.waitForSelector(
      '[data-testid="realtime-indicator"][data-status="disconnected"]',
    );
  }

  // Getters
  async getLogCount() {
    const countElement = await this.page.textContent('[data-testid="total-logs-count"]');
    return parseInt(countElement || '0');
  }

  async getVisibleLogs() {
    return await this.page.locator('[data-testid^="log-row-"]').count();
  }

  async getCurrentPage() {
    const pageElement = await this.page.textContent('[data-testid="current-page"]');
    return parseInt(pageElement || '1');
  }

  async getLogById(logId: string) {
    return this.page.locator(`[data-testid="log-row-${logId}"]`);
  }
}

test.describe('Audit Log UI', () => {
  let auditLogPage: AuditLogPage;

  test.beforeEach(async ({ page }) => {
    auditLogPage = new AuditLogPage(page);

    // Mock API responses with test data
    await page.route('**/api/admin/audit-logs**', async (route) => {
      const url = new URL(route.request().url());
      const params = url.searchParams;

      // Generate mock data based on query parameters
      const mockData = generateMockAuditLogs(params);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData),
      });
    });

    await page.route('**/api/admin/audit-logs/statistics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalLogs: 1500,
          actionTypes: {
            CREATE: 450,
            UPDATE: 600,
            DELETE: 200,
            VIEW: 250,
          },
          severities: {
            LOW: 800,
            MEDIUM: 500,
            HIGH: 150,
            CRITICAL: 50,
          },
          successRate: {
            success: 1425,
            failed: 75,
          },
          topUsers: [
            { userId: 'user1', userEmail: 'admin1@test.com', count: 300 },
            { userId: 'user2', userEmail: 'admin2@test.com', count: 250 },
          ],
          topResources: [
            { resource: 'user', count: 600 },
            { resource: 'einsatz', count: 400 },
          ],
        }),
      });
    });

    await auditLogPage.login();
  });

  test.describe('Navigation and Initial Load', () => {
    test('should navigate to audit logs page', async () => {
      await auditLogPage.navigateToAuditLogs();
      await expect(auditLogPage.page).toHaveURL('/admin/audit-logs');
      await expect(auditLogPage.page.locator('[data-testid="audit-logs-table"]')).toBeVisible();
    });

    test('should load audit logs on page load', async () => {
      await auditLogPage.goto();

      const logCount = await auditLogPage.getVisibleLogs();
      expect(logCount).toBeGreaterThan(0);

      await expect(auditLogPage.page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
    });

    test('should display correct table headers', async () => {
      await auditLogPage.goto();

      await expect(auditLogPage.page.locator('[data-testid="header-timestamp"]')).toBeVisible();
      await expect(auditLogPage.page.locator('[data-testid="header-action"]')).toBeVisible();
      await expect(auditLogPage.page.locator('[data-testid="header-resource"]')).toBeVisible();
      await expect(auditLogPage.page.locator('[data-testid="header-user"]')).toBeVisible();
      await expect(auditLogPage.page.locator('[data-testid="header-severity"]')).toBeVisible();
      await expect(auditLogPage.page.locator('[data-testid="header-status"]')).toBeVisible();
    });
  });

  test.describe('Filtering and Search', () => {
    test('should filter by action type', async () => {
      await auditLogPage.goto();
      await auditLogPage.filterByActionType('CREATE');

      // Verify that URL contains the filter parameter
      expect(auditLogPage.page.url()).toContain('actionType=CREATE');

      // Check that filtered results are displayed
      const logCount = await auditLogPage.getVisibleLogs();
      expect(logCount).toBeGreaterThan(0);
    });

    test('should filter by severity', async () => {
      await auditLogPage.goto();
      await auditLogPage.filterBySeverity('HIGH');

      expect(auditLogPage.page.url()).toContain('severity=HIGH');

      // Verify severity badges show only HIGH severity
      const severityBadges = auditLogPage.page.locator('[data-testid^="severity-badge-"]');
      const severityTexts = await severityBadges.allTextContents();
      severityTexts.forEach((text) => {
        expect(text).toContain('HIGH');
      });
    });

    test('should filter by date range', async () => {
      await auditLogPage.goto();

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await auditLogPage.filterByDateRange(weekAgo, today);

      expect(auditLogPage.page.url()).toContain(`startDate=${weekAgo}`);
      expect(auditLogPage.page.url()).toContain(`endDate=${today}`);
    });

    test('should search audit logs', async () => {
      await auditLogPage.goto();
      await auditLogPage.searchLogs('user creation');

      expect(auditLogPage.page.url()).toContain('search=user%20creation');

      // Verify search results contain the search term
      const logRows = auditLogPage.page.locator('[data-testid^="log-row-"]');
      const count = await logRows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should combine multiple filters', async () => {
      await auditLogPage.goto();

      await auditLogPage.filterByActionType('UPDATE');
      await auditLogPage.filterBySeverity('MEDIUM');
      await auditLogPage.searchLogs('profile');

      const url = auditLogPage.page.url();
      expect(url).toContain('actionType=UPDATE');
      expect(url).toContain('severity=MEDIUM');
      expect(url).toContain('search=profile');
    });

    test('should clear filters', async () => {
      await auditLogPage.goto();

      // Apply filters
      await auditLogPage.filterByActionType('DELETE');
      await auditLogPage.filterBySeverity('HIGH');

      // Clear filters
      await auditLogPage.page.click('[data-testid="clear-filters"]');

      // Verify filters are cleared
      const actionTypeFilter = auditLogPage.page.locator('[data-testid="action-type-filter"]');
      await expect(actionTypeFilter).toHaveValue('');

      const severityFilter = auditLogPage.page.locator('[data-testid="severity-filter"]');
      await expect(severityFilter).toHaveValue('');
    });
  });

  test.describe('Sorting and Pagination', () => {
    test('should sort by timestamp', async () => {
      await auditLogPage.goto();
      await auditLogPage.sortByColumn('timestamp');

      expect(auditLogPage.page.url()).toContain('sortBy=timestamp');

      // Verify sort indicator is displayed
      await expect(auditLogPage.page.locator('[data-testid="sort-timestamp-asc"]')).toBeVisible();
    });

    test('should sort by action', async () => {
      await auditLogPage.goto();
      await auditLogPage.sortByColumn('action');

      expect(auditLogPage.page.url()).toContain('sortBy=action');
    });

    test('should navigate between pages', async () => {
      await auditLogPage.goto();

      // Verify current page
      const currentPage = await auditLogPage.getCurrentPage();
      expect(currentPage).toBe(1);

      // Go to next page
      await auditLogPage.page.click('[data-testid="pagination-next"]');

      const newPage = await auditLogPage.getCurrentPage();
      expect(newPage).toBe(2);
    });

    test('should change page size', async () => {
      await auditLogPage.goto();

      await auditLogPage.changePageSize(25);

      expect(auditLogPage.page.url()).toContain('limit=25');

      const visibleLogs = await auditLogPage.getVisibleLogs();
      expect(visibleLogs).toBeLessThanOrEqual(25);
    });
  });

  test.describe('Log Details and Actions', () => {
    test('should open log details modal', async () => {
      await auditLogPage.goto();

      // Click on first log row
      const firstLogRow = auditLogPage.page.locator('[data-testid^="log-row-"]').first();
      await firstLogRow.click();

      // Verify modal is opened
      await expect(auditLogPage.page.locator('[data-testid="log-detail-modal"]')).toBeVisible();

      // Verify detail fields are displayed
      await expect(auditLogPage.page.locator('[data-testid="detail-action"]')).toBeVisible();
      await expect(auditLogPage.page.locator('[data-testid="detail-resource"]')).toBeVisible();
      await expect(auditLogPage.page.locator('[data-testid="detail-timestamp"]')).toBeVisible();
    });

    test('should close log details modal', async () => {
      await auditLogPage.goto();

      const firstLogRow = auditLogPage.page.locator('[data-testid^="log-row-"]').first();
      await firstLogRow.click();

      await expect(auditLogPage.page.locator('[data-testid="log-detail-modal"]')).toBeVisible();

      await auditLogPage.page.click('[data-testid="close-modal"]');

      await expect(auditLogPage.page.locator('[data-testid="log-detail-modal"]')).not.toBeVisible();
    });

    test('should mark log as reviewed', async () => {
      await auditLogPage.goto();

      // Find a log that requires review
      const reviewButton = auditLogPage.page.locator('[data-testid^="review-button-"]').first();
      await reviewButton.click();

      // Verify review confirmation appears
      await expect(auditLogPage.page.locator('[data-testid="review-success"]')).toBeVisible();

      // Verify button state changes
      await expect(reviewButton).toHaveAttribute('data-reviewed', 'true');
    });

    test('should display audit log metadata', async () => {
      await auditLogPage.goto();

      const firstLogRow = auditLogPage.page.locator('[data-testid^="log-row-"]').first();
      await firstLogRow.click();

      // Verify metadata sections are displayed
      await expect(auditLogPage.page.locator('[data-testid="metadata-request"]')).toBeVisible();
      await expect(auditLogPage.page.locator('[data-testid="metadata-response"]')).toBeVisible();
      await expect(auditLogPage.page.locator('[data-testid="metadata-context"]')).toBeVisible();
    });
  });

  test.describe('Statistics Dashboard', () => {
    test('should display statistics overview', async () => {
      await auditLogPage.goto();
      await auditLogPage.viewStatistics();

      await expect(auditLogPage.page.locator('[data-testid="stats-total-logs"]')).toBeVisible();
      await expect(auditLogPage.page.locator('[data-testid="stats-success-rate"]')).toBeVisible();
      await expect(auditLogPage.page.locator('[data-testid="stats-action-types"]')).toBeVisible();
      await expect(auditLogPage.page.locator('[data-testid="stats-severities"]')).toBeVisible();
    });

    test('should display action type chart', async () => {
      await auditLogPage.goto();
      await auditLogPage.viewStatistics();

      await expect(auditLogPage.page.locator('[data-testid="chart-action-types"]')).toBeVisible();

      // Verify chart data is displayed
      await expect(auditLogPage.page.locator('[data-testid="chart-legend"]')).toBeVisible();
    });

    test('should display top users', async () => {
      await auditLogPage.goto();
      await auditLogPage.viewStatistics();

      await expect(auditLogPage.page.locator('[data-testid="top-users-list"]')).toBeVisible();

      const userItems = auditLogPage.page.locator('[data-testid^="top-user-"]');
      const count = await userItems.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Export Functionality', () => {
    test('should export logs as CSV', async () => {
      await auditLogPage.goto();

      const download = await auditLogPage.exportLogs('csv');

      expect(download.suggestedFilename()).toContain('.csv');

      // Verify download was successful
      const path = await download.path();
      expect(path).toBeTruthy();
    });

    test('should export logs as JSON', async () => {
      await auditLogPage.goto();

      const download = await auditLogPage.exportLogs('json');

      expect(download.suggestedFilename()).toContain('.json');
    });

    test('should export filtered logs', async () => {
      await auditLogPage.goto();

      // Apply filter before export
      await auditLogPage.filterByActionType('CREATE');

      const download = await auditLogPage.exportLogs('csv');

      expect(download.suggestedFilename()).toContain('.csv');
    });
  });

  test.describe('Real-time Updates', () => {
    test('should enable real-time updates', async () => {
      await auditLogPage.goto();
      await auditLogPage.enableRealTimeUpdates();

      // Verify real-time indicator shows connected status
      await expect(auditLogPage.page.locator('[data-testid="realtime-indicator"]')).toHaveAttribute(
        'data-status',
        'connected',
      );
    });

    test('should disable real-time updates', async () => {
      await auditLogPage.goto();
      await auditLogPage.enableRealTimeUpdates();
      await auditLogPage.disableRealTimeUpdates();

      await expect(auditLogPage.page.locator('[data-testid="realtime-indicator"]')).toHaveAttribute(
        'data-status',
        'disconnected',
      );
    });

    test('should update log count in real-time', async ({ page }) => {
      await auditLogPage.goto();
      await auditLogPage.enableRealTimeUpdates();

      const initialCount = await auditLogPage.getLogCount();

      // Simulate new log creation by mocking WebSocket message
      await page.evaluate(() => {
        const event = new CustomEvent('newAuditLog', {
          detail: {
            id: 'new-log-123',
            action: 'real-time-test',
            timestamp: new Date().toISOString(),
          },
        });
        window.dispatchEvent(event);
      });

      // Wait for UI to update
      await page.waitForTimeout(1000);

      const newCount = await auditLogPage.getLogCount();
      expect(newCount).toBeGreaterThan(initialCount);
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await auditLogPage.goto();

      // Verify mobile-specific elements
      await expect(page.locator('[data-testid="mobile-filter-toggle"]')).toBeVisible();
      await expect(page.locator('[data-testid="audit-logs-table"]')).toBeVisible();
    });

    test('should display correctly on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      await auditLogPage.goto();

      // Verify tablet layout
      await expect(page.locator('[data-testid="audit-logs-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();
    });

    test('should adapt table columns for small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await auditLogPage.goto();

      // Some columns should be hidden on mobile
      await expect(page.locator('[data-testid="header-metadata"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="header-action"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/admin/audit-logs**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await auditLogPage.goto();

      // Verify error message is displayed
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle network connectivity issues', async ({ page }) => {
      await auditLogPage.goto();

      // Simulate network failure
      await page.setOffline(true);

      await auditLogPage.page.click('[data-testid="refresh-button"]');

      // Verify offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

      // Restore connectivity
      await page.setOffline(false);
    });

    test('should retry failed requests', async ({ page }) => {
      let requestCount = 0;

      await page.route('**/api/admin/audit-logs**', async (route) => {
        requestCount++;
        if (requestCount <= 2) {
          await route.fulfill({ status: 500 });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(generateMockAuditLogs(new URLSearchParams())),
          });
        }
      });

      await auditLogPage.goto();

      // Click retry button
      await page.click('[data-testid="retry-button"]');

      // Should eventually succeed
      await expect(page.locator('[data-testid="audit-logs-table"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await auditLogPage.goto();

      // Tab through the interface
      await page.keyboard.press('Tab'); // Focus on first interactive element
      await page.keyboard.press('Tab'); // Move to next element

      // Verify focus is visible
      const focusedElement = await page.evaluate(() =>
        document.activeElement?.getAttribute('data-testid'),
      );
      expect(focusedElement).toBeTruthy();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await auditLogPage.goto();

      // Check table accessibility
      const table = page.locator('[data-testid="audit-logs-table"]');
      await expect(table).toHaveAttribute('role', 'table');

      // Check filter controls
      const actionTypeFilter = page.locator('[data-testid="action-type-filter"]');
      await expect(actionTypeFilter).toHaveAttribute('aria-label');
    });

    test('should support screen readers', async ({ page }) => {
      await auditLogPage.goto();

      // Verify table headers have proper roles
      const headers = page.locator('[role="columnheader"]');
      const count = await headers.count();
      expect(count).toBeGreaterThan(0);

      // Verify table cells have proper roles
      const cells = page.locator('[role="cell"]');
      const cellCount = await cells.count();
      expect(cellCount).toBeGreaterThan(0);
    });
  });
});

// Helper function to generate mock audit log data
function generateMockAuditLogs(params: URLSearchParams) {
  const page = parseInt(params.get('page') || '1');
  const limit = parseInt(params.get('limit') || '50');
  const actionType = params.get('actionType');
  const severity = params.get('severity');
  const search = params.get('search');

  const totalItems = 1500;
  const startIndex = (page - 1) * limit;

  const mockLogs = Array.from({ length: limit }, (_, i) => {
    const id = `log-${startIndex + i + 1}`;
    const actions = [
      'create-user',
      'update-profile',
      'delete-record',
      'view-data',
      'export-report',
    ];
    const resources = ['user', 'einsatz', 'profile', 'report', 'settings'];
    const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const actionTypes = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT'];

    return {
      id,
      action: actionType ? `${actionType.toLowerCase()}-action` : actions[i % actions.length],
      actionType: actionType || actionTypes[i % actionTypes.length],
      resource: resources[i % resources.length],
      resourceId: `resource-${i + 1}`,
      severity: severity || severities[i % severities.length],
      success: i % 10 !== 0, // 10% failure rate
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      userId: `user-${(i % 5) + 1}`,
      userEmail: `user${(i % 5) + 1}@test.com`,
      userRole: 'ADMIN',
      ipAddress: `192.168.1.${(i % 255) + 1}`,
      userAgent: 'Mozilla/5.0 Test Browser',
      httpMethod: ['GET', 'POST', 'PUT', 'DELETE'][i % 4],
      httpPath: `/admin/${resources[i % resources.length]}`,
      requiresReview: i % 20 === 0, // 5% require review
      reviewedAt: i % 30 === 0 ? new Date().toISOString() : null,
      reviewedBy: i % 30 === 0 ? 'reviewer@test.com' : null,
      metadata: {
        request: {
          body: search ? { searchTerm: search } : { data: `test-data-${i}` },
          query: {},
        },
        response: {
          statusCode: i % 10 === 0 ? 500 : 200,
        },
        context: {
          sessionId: `session-${i}`,
        },
      },
    };
  });

  return {
    items: mockLogs,
    pagination: {
      currentPage: page,
      itemsPerPage: limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      hasNextPage: page < Math.ceil(totalItems / limit),
      hasPreviousPage: page > 1,
    },
  };
}
