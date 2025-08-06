import type { Locator, Page } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly homeLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByPlaceholder('Wählen Sie einen Benutzernamen');
    this.submitButton = page.getByRole('button', { name: /registrieren/i });
    this.errorMessage = page.getByRole('alert');
    this.homeLink = page.getByRole('link', { name: 'Zur Startseite' });
  }

  async goto() {
    await this.page.goto('/auth');
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
