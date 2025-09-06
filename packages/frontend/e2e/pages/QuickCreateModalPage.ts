import type { Locator, Page } from '@playwright/test';

export class QuickCreateModalPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly titleInput: Locator;
  readonly descriptionTextarea: Locator;
  readonly locationInput: Locator;
  readonly dateInput: Locator;
  readonly timeInput: Locator;
  readonly prioritySelect: Locator;
  readonly typeSelect: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId('quick-create-modal');
    this.titleInput = page.getByLabel(/titel/i);
    this.descriptionTextarea = page.getByLabel(/beschreibung/i);
    this.locationInput = page.getByLabel(/ort|standort/i);
    this.dateInput = page.getByLabel(/datum/i);
    this.timeInput = page.getByLabel(/zeit/i);
    this.prioritySelect = page.getByLabel(/priorität/i);
    this.typeSelect = page.getByLabel(/typ|art/i);
    this.submitButton = page.getByRole('button', { name: /erstellen|anlegen/i });
    this.cancelButton = page.getByRole('button', { name: /abbrechen/i });
    this.closeButton = this.modal.getByRole('button', { name: /schließen|close/i });
  }

  async waitForModal() {
    await this.modal.waitFor({ state: 'visible' });
  }

  async fillMinimalEinsatz(title?: string) {
    // Nur optionale Felder - Title wird optional übergeben
    if (title) {
      await this.titleInput.fill(title);
    }
  }

  async fillPartialEinsatz(data: { title?: string; description?: string; location?: string }) {
    if (data.title) await this.titleInput.fill(data.title);
    if (data.description) await this.descriptionTextarea.fill(data.description);
    if (data.location) await this.locationInput.fill(data.location);
  }

  async fillCompleteEinsatz(data: { title: string; description: string; location: string; date: string; time: string; priority: 'NIEDRIG' | 'MITTEL' | 'HOCH' | 'KRITISCH'; type: string }) {
    await this.titleInput.fill(data.title);
    await this.descriptionTextarea.fill(data.description);
    await this.locationInput.fill(data.location);
    await this.dateInput.fill(data.date);
    await this.timeInput.fill(data.time);
    await this.prioritySelect.selectOption(data.priority);
    await this.typeSelect.selectOption(data.type);
  }

  async submit() {
    await this.submitButton.click();
    // Wait for modal to disappear
    await this.modal.waitFor({ state: 'hidden' });
  }

  async cancel() {
    await this.cancelButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  async close() {
    await this.closeButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  async getValidationError(): Promise<string | null> {
    const errorElement = this.modal.locator('.text-red-600, .text-danger');
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }

  async isSubmitEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }
}
