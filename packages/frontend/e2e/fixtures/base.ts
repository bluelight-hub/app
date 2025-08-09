import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Extend basic test by providing a "testWithAuth" fixture.
export const test = base;

export { expect };

// Helper to wait for Chakra UI to be loaded
export async function waitForChakraUI(page: Page) {
  // Wait for Chakra UI Provider to be mounted
  await page.waitForFunction(() => {
    // Check if Chakra UI styles are loaded
    const chakraRoot = document.querySelector('[data-theme]');
    return chakraRoot !== null;
  });
}

// Helper to get auth token from localStorage
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    return localStorage.getItem('auth-token');
  });
}

// Helper to set auth token in localStorage
export async function setAuthToken(page: Page, authToken: string) {
  await page.evaluate((token) => {
    localStorage.setItem('auth-token', token);
  }, authToken);
}
