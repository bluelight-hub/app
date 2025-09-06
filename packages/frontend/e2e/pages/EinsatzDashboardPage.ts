import type { Locator, Page } from '@playwright/test';

export class EinsatzDashboardPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly createButton: Locator;
  readonly filterButton: Locator;
  readonly searchInput: Locator;
  readonly einsatzList: Locator;
  readonly einsatzCard: Locator;
  readonly statusFilter: Locator;
  readonly sortDropdown: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: 'Einsätze' });
    this.createButton = page.getByRole('button', { name: /neuer einsatz/i });
    this.filterButton = page.getByRole('button', { name: /filter/i });
    this.searchInput = page.getByPlaceholder(/suchen/i);
    this.einsatzList = page.getByTestId('einsatz-list');
    this.einsatzCard = page.getByTestId('einsatz-card');
    this.statusFilter = page.getByTestId('status-filter');
    this.sortDropdown = page.getByTestId('sort-dropdown');
  }

  async goto() {
    await this.page.goto('/app/einsaetze');
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateModal() {
    await this.createButton.click();
    await this.page.waitForSelector('[data-testid="quick-create-modal"]', { state: 'visible' });
  }

  async searchEinsatz(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Debounce delay
  }

  async filterByStatus(status: 'OFFEN' | 'IN_BEARBEITUNG' | 'ABGESCHLOSSEN') {
    await this.filterButton.click();
    await this.page.getByRole('checkbox', { name: status }).click();
    await this.page.keyboard.press('Escape'); // Close filter dropdown
  }

  async sortBy(sortOption: string) {
    await this.sortDropdown.click();
    await this.page.getByRole('option', { name: sortOption }).click();
  }

  async getEinsatzCount(): Promise<number> {
    const cards = await this.einsatzCard.all();
    return cards.length;
  }

  async clickEinsatzCard(index: number = 0) {
    const cards = await this.einsatzCard.all();
    if (cards[index]) {
      await cards[index].click();
      await this.page.waitForURL(/\/app\/einsaetze\/\d+/);
    }
  }

  async waitForEinsatzList() {
    await this.einsatzList.waitFor({ state: 'visible' });
  }

  async getEinsatzTitles(): Promise<string[]> {
    const titles = await this.page.$$eval('[data-testid="einsatz-card"] h3', (elements) => elements.map((el) => el.textContent?.trim() || ''));
    return titles;
  }
}
