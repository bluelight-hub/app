import { test } from '@playwright/test';

test.describe('Debug Tests', () => {
  test('take screenshot of register page', async ({ page }) => {
    await page.goto('/register');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'register-page.png', fullPage: true });

    // Print all text content
    const textContent = await page.textContent('body');
    console.log('Page text content:', textContent);

    // Find all input elements
    const inputs = await page.locator('input').all();
    console.log(`Found ${inputs.length} input elements`);

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      const type = await input.getAttribute('type');
      console.log(
        `Input ${i}: id="${id}", name="${name}", placeholder="${placeholder}", type="${type}"`,
      );
    }

    // Find all buttons
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} button elements`);

    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = await button.textContent();
      const type = await button.getAttribute('type');
      console.log(`Button ${i}: text="${text}", type="${type}"`);
    }

    // Find all labels
    const labels = await page.locator('label').all();
    console.log(`Found ${labels.length} label elements`);

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const text = await label.textContent();
      const forAttr = await label.getAttribute('for');
      console.log(`Label ${i}: text="${text}", for="${forAttr}"`);
    }
  });
});
