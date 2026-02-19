import type { Page } from '@playwright/test';

export class ShortlistPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/shortlist');
  }

  getHeading() {
    return this.page.getByRole('heading', { name: 'Saved Venues' });
  }

  getEmptyState() {
    return this.page.getByText('No saved venues yet');
  }

  getSortDropdown() {
    return this.page.getByLabel('Sort by:');
  }

  async selectSort(value: 'date_saved' | 'pricing_tier' | 'name' | 'taste_score') {
    await this.getSortDropdown().selectOption(value);
  }

  getGridViewButton() {
    return this.page.getByRole('button', { name: '▦' });
  }

  getListViewButton() {
    return this.page.getByRole('button', { name: '☰' });
  }

  async switchToListView() {
    await this.getListViewButton().click();
  }

  async switchToGridView() {
    await this.getGridViewButton().click();
  }

  getVenueByName(name: string) {
    return this.page.getByText(name);
  }

  getUnsaveButtons() {
    return this.page.getByRole('button', { name: /Unsave|Remove/ });
  }

  async unsaveFirstVenue() {
    await this.getUnsaveButtons().first().click();
  }

  getStartSwipingButton() {
    return this.page.getByRole('button', { name: 'Start Swiping' });
  }

  getSearchVenuesButton() {
    return this.page.getByRole('button', { name: 'Search Venues' });
  }
}
