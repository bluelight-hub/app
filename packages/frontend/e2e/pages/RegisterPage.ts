import type { Locator, Page } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly homeLink: Locator;
  readonly comboboxButton: Locator;
  readonly comboboxInput: Locator;

  constructor(page: Page) {
    this.page = page;
    // New unified auth uses a combobox instead of tabs
    // The combobox allows both selecting existing users and entering new usernames
    this.comboboxButton = page.getByRole('combobox', { name: /Benutzername/i });
    this.comboboxInput = page.getByPlaceholder('Benutzername eingeben oder auswählen...');
    this.usernameInput = page.getByPlaceholder('Benutzername eingeben oder auswählen...');
    // Button now says "Anmelden" (Login) for unified auth
    this.submitButton = page.getByRole('button', { name: 'Anmelden' });
    this.errorMessage = page.getByRole('alert');
    this.homeLink = page.getByRole('link', { name: 'Zur Startseite' });
  }

  async goto() {
    await this.page.goto('/auth');
    // No need to switch tabs anymore - unified form is always visible
  }

  async register(username: string) {
    // Click on the combobox to open it
    await this.comboboxButton.click();
    // Type the username in the combobox input
    await this.comboboxInput.fill(username);
    // Close the combobox by pressing Enter or clicking outside
    await this.page.keyboard.press('Enter');
    // Click the submit button
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
