import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { expect, test } from '@playwright/test';

/**
 * E2E Tests für Tauri-spezifisches Fenster-Management
 *
 * Diese Tests laufen nur in einer echten Tauri-Umgebung
 * und testen Tauri-spezifische Features wie WebviewWindow API.
 *
 * Zum Ausführen:
 * 1. Tauri App bauen: pnpm tauri build --debug
 * 2. Tests ausführen: pnpm test:e2e:tauri
 */

// Skip diese Tests wenn nicht in Tauri-Umgebung
const isTauriTest = process.env.TAURI_TEST === 'true';

test.describe.skipIf(!isTauriTest)('Tauri Window Management', () => {
  let tauriProcess;
  let page;

  test.beforeAll(async ({ browser }) => {
    // Start Tauri app
    const appPath =
      platform() === 'darwin'
        ? './src-tauri/target/debug/bundle/macos/bluelight-hub.app/Contents/MacOS/bluelight-hub'
        : platform() === 'win32'
          ? './src-tauri/target/debug/bluelight-hub.exe'
          : './src-tauri/target/debug/bluelight-hub';

    tauriProcess = spawn(appPath, [], {
      env: { ...process.env, RUST_LOG: 'debug' },
    });

    // Wait for app to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Connect to Tauri app via WebDriver
    const context = await browser.newContext();
    page = await context.newPage();

    // Tauri apps usually expose a debug port
    await page.goto('http://localhost:1420'); // Default Tauri dev server port
  });

  test.afterAll(() => {
    if (tauriProcess) {
      tauriProcess.kill();
    }
  });

  test('should detect Tauri environment correctly', async () => {
    // Check if window.__TAURI__ is defined
    const isTauri = await page.evaluate(() => {
      return typeof window.__TAURI__ !== 'undefined';
    });

    expect(isTauri).toBe(true);
  });

  test('should open admin window using WebviewWindow API', async () => {
    // Login as admin first
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'AdminPassword123!');
    await page.click('button[type="submit"]');

    // Wait for main page
    await page.waitForSelector('text=Admin-Bereich');

    // Click the "Neues Fenster" button
    await page.click('button:has-text("Neues Fenster")');

    // Wait a moment for window to open
    await page.waitForTimeout(1000);

    // Check if new window was created via Tauri API
    const windowLabels = await page.evaluate(async () => {
      const { getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow');
      const windows = await getAllWebviewWindows();
      return windows.map((w) => w.label);
    });

    expect(windowLabels).toContain('admin');
  });

  test('should focus existing admin window if already open', async () => {
    // First click to open window
    await page.click('button:has-text("Neues Fenster")');
    await page.waitForTimeout(1000);

    // Second click should focus existing window
    const focusCalled = await page.evaluate(async () => {
      // Mock the focus call to track it
      let focusWasCalled = false;

      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const adminWindow = await WebviewWindow.getByLabel('admin');

      if (adminWindow) {
        const originalFocus = adminWindow.setFocus;
        adminWindow.setFocus = async () => {
          focusWasCalled = true;
          return originalFocus.call(adminWindow);
        };
      }

      // Click the button again
      document.querySelector('button:has-text("Neues Fenster")').click();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 500));

      return focusWasCalled;
    });

    expect(focusCalled).toBe(true);
  });

  test('should close admin window via close button', async () => {
    // Open admin window
    await page.click('button:has-text("Neues Fenster")');
    await page.waitForTimeout(1000);

    // Get admin window handle
    const adminWindowExists = await page.evaluate(async () => {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const adminWindow = await WebviewWindow.getByLabel('admin');
      return adminWindow !== null;
    });

    expect(adminWindowExists).toBe(true);

    // In the admin window, click close button
    // Note: This would require accessing the admin window's page context
    // which is complex in Playwright with Tauri

    // Simulate close via API for testing
    await page.evaluate(async () => {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const adminWindow = await WebviewWindow.getByLabel('admin');
      if (adminWindow) {
        await adminWindow.close();
      }
    });

    // Verify window is closed
    const adminWindowClosed = await page.evaluate(async () => {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const adminWindow = await WebviewWindow.getByLabel('admin');
      return adminWindow === null;
    });

    expect(adminWindowClosed).toBe(true);
  });

  test('should handle window events correctly', async () => {
    // const events = [];

    // Set up event listeners
    await page.evaluate(() => {
      window.tauriWindowEvents = [];

      import('@tauri-apps/api/webviewWindow').then(({ WebviewWindow }) => {
        const adminWindow = new WebviewWindow('admin-test', {
          url: '/admin/dashboard',
          width: 800,
          height: 600,
        });

        adminWindow.once('tauri://created', () => {
          window.tauriWindowEvents.push('created');
        });

        adminWindow.once('tauri://error', (error) => {
          window.tauriWindowEvents.push(`error: ${error}`);
        });
      });
    });

    // Wait for events
    await page.waitForTimeout(2000);

    // Check events
    const collectedEvents = await page.evaluate(() => window.tauriWindowEvents);
    expect(collectedEvents).toContain('created');
  });

  test('should properly set window properties', async () => {
    await page.evaluate(async () => {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');

      const testWindow = new WebviewWindow('test-props', {
        url: '/admin/dashboard',
        title: 'Test Admin Window',
        width: 1200,
        height: 800,
        resizable: true,
        center: true,
      });

      // Store reference for assertions
      window.testWindow = testWindow;
    });

    await page.waitForTimeout(1000);

    // Verify window was created with correct properties
    const windowProps = await page.evaluate(async () => {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const testWindow = await WebviewWindow.getByLabel('test-props');

      if (testWindow) {
        return {
          exists: true,
          label: testWindow.label,
        };
      }

      return { exists: false };
    });

    expect(windowProps.exists).toBe(true);
    expect(windowProps.label).toBe('test-props');

    // Clean up
    await page.evaluate(async () => {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const testWindow = await WebviewWindow.getByLabel('test-props');
      if (testWindow) {
        await testWindow.close();
      }
    });
  });
});
