import type { Locator, Page } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly homeLink: Locator;
  readonly registerTab: Locator;

  constructor(page: Page) {
    this.page = page;
    // New auth screen is under /auth with tabs. The register input placeholder changed.
    this.registerTab = page
      .getByRole('tab', { name: 'Registrieren' })
      .or(page.getByRole('button', { name: 'Registrieren' }));
    this.usernameInput = page.getByPlaceholder('z.B. max_mustermann');
    // Be more specific to avoid conflicts with login form submit button
    this.submitButton = page
      .getByRole('button', { name: 'Registrieren' })
      .filter({ hasText: 'Registrieren' });
    this.errorMessage = page.getByRole('alert');
    this.homeLink = page.getByRole('link', { name: 'Zur Startseite' });
  }

  async goto() {
    await this.page.goto('/auth');
    // Switch to Register tab so inputs are visible
    await this.registerTab.first().click();
  }

  async register(username: string) {
    await this.usernameInput.fill(username);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await this.errorMessage.waitFor();
    // Check if error contains the message
    const errorText = await this.errorMessage.textContent();
    if (!errorText?.includes(message)) {
      throw new Error(`Expected error to contain "${message}" but got "${errorText}"`);
    }
  }

  async expectSuccess() {
    // After successful registration, we should be redirected to home
    await this.page.waitForURL('/');
  }
}
