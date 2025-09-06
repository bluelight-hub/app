import type { Locator, Page } from '@playwright/test';

export class EinsatzDetailPage {
  readonly page: Page;
  readonly titleField: Locator;
  readonly descriptionField: Locator;
  readonly locationField: Locator;
  readonly statusBadge: Locator;
  readonly statusDropdown: Locator;
  readonly editButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;
  readonly backButton: Locator;
  readonly completenessIndicator: Locator;
  readonly progressBar: Locator;
  readonly timelineSection: Locator;
  readonly detailsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleField = page.getByTestId('einsatz-title');
    this.descriptionField = page.getByTestId('einsatz-description');
    this.locationField = page.getByTestId('einsatz-location');
    this.statusBadge = page.getByTestId('status-badge');
    this.statusDropdown = page.getByTestId('status-dropdown');
    this.editButton = page.getByRole('button', { name: /bearbeiten/i });
    this.saveButton = page.getByRole('button', { name: /speichern/i });
    this.cancelButton = page.getByRole('button', { name: /abbrechen/i });
    this.deleteButton = page.getByRole('button', { name: /löschen/i });
    this.backButton = page.getByRole('button', { name: /zurück/i });
    this.completenessIndicator = page.getByTestId('completeness-indicator');
    this.progressBar = page.getByRole('progressbar');
    this.timelineSection = page.getByTestId('timeline-section');
    this.detailsSection = page.getByTestId('details-section');
  }

  async goto(einsatzId: number) {
    await this.page.goto(`/app/einsaetze/${einsatzId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async enterEditMode() {
    await this.editButton.click();
    await this.saveButton.waitFor({ state: 'visible' });
  }

  async exitEditMode(save: boolean = true) {
    if (save) {
      await this.saveButton.click();
    } else {
      await this.cancelButton.click();
    }
    await this.editButton.waitFor({ state: 'visible' });
  }

  async updateTitle(newTitle: string) {
    await this.titleField.click();
    await this.titleField.fill(newTitle);
  }

  async updateDescription(newDescription: string) {
    await this.descriptionField.click();
    await this.descriptionField.fill(newDescription);
  }

  async updateLocation(newLocation: string) {
    await this.locationField.click();
    await this.locationField.fill(newLocation);
  }

  async updateStatus(newStatus: 'OFFEN' | 'IN_BEARBEITUNG' | 'ABGESCHLOSSEN') {
    await this.statusDropdown.click();
    await this.page.getByRole('option', { name: newStatus }).click();
  }

  async getStatus(): Promise<string> {
    return (await this.statusBadge.textContent()) || '';
  }

  async getCompleteness(): Promise<number> {
    const text = (await this.completenessIndicator.textContent()) || '0%';
    return parseInt(text.replace('%', ''), 10);
  }

  async getProgressValue(): Promise<number> {
    const value = await this.progressBar.getAttribute('aria-valuenow');
    return parseInt(value || '0', 10);
  }

  async navigateBack() {
    await this.backButton.click();
    await this.page.waitForURL('/app/einsaetze');
  }

  async deleteEinsatz() {
    await this.deleteButton.click();
    // Wait for confirmation dialog
    await this.page.getByRole('button', { name: /bestätigen|ja/i }).click();
    await this.page.waitForURL('/app/einsaetze');
  }

  async waitForAutoSave() {
    // Wait for optimistic update indicator or save message
    await this.page.waitForTimeout(1000);
    const saveIndicator = this.page.getByText(/gespeichert|saved/i);
    if (await saveIndicator.isVisible()) {
      await saveIndicator.waitFor({ state: 'hidden' });
    }
  }

  async isFieldEditable(field: 'title' | 'description' | 'location'): Promise<boolean> {
    const fieldMap = {
      title: this.titleField,
      description: this.descriptionField,
      location: this.locationField,
    };

    const fieldElement = fieldMap[field];
    return await fieldElement.isEditable();
  }

  async getFieldValue(field: 'title' | 'description' | 'location'): Promise<string> {
    const fieldMap = {
      title: this.titleField,
      description: this.descriptionField,
      location: this.locationField,
    };

    const fieldElement = fieldMap[field];
    return (await fieldElement.inputValue()) || (await fieldElement.textContent()) || '';
  }
}
