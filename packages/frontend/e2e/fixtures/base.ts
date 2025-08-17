import { test as base, expect } from '@playwright/test';

// Extend basic test by providing a "testWithAuth" fixture.
export const test = base;

export { expect };
