import type { Page } from '@playwright/test';

export class SearchPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/search');
  }

  async waitForResults() {
    await this.page.getByText(/\d+ venues found/).waitFor();
  }

  getHeading() {
    return this.page.getByRole('heading', { name: 'Wedding Venues' });
  }

  getResultCount() {
    return this.page.getByText(/\d+ venues found/);
  }

  getLoadingIndicator() {
    return this.page.getByText('Loading...');
  }

  // Filter interactions
  async togglePricingTier(tier: 'low' | 'medium' | 'high' | 'luxury') {
    await this.page.getByLabel(tier, { exact: false }).check();
  }

  async uncheckPricingTier(tier: 'low' | 'medium' | 'high' | 'luxury') {
    await this.page.getByLabel(tier, { exact: false }).uncheck();
  }

  async toggleHasLodging() {
    await this.page.getByLabel('Has Lodging').click();
  }

  async toggleEstateVenue() {
    await this.page.getByText('Estate Venue').click();
  }

  async toggleHistoricVenue() {
    await this.page.getByText('Historic Venue').click();
  }

  // Sort
  getSortDropdown() {
    return this.page.getByRole('combobox');
  }

  async selectSort(option: string) {
    await this.getSortDropdown().selectOption(option);
  }

  // Venue grid
  getVenueCards() {
    return this.page.locator('[style*="border-radius"]').filter({ has: this.page.locator('img, div[style*="gradient"]') });
  }

  async clickFirstVenue() {
    // Click the first venue name text in the grid
    const firstVenueName = this.page.locator('h3').first();
    await firstVenueName.click();
  }

  // Pagination
  getPreviousButton() {
    return this.page.getByRole('button', { name: 'Previous' });
  }

  getNextButton() {
    return this.page.getByRole('button', { name: 'Next' });
  }

  getPageIndicator() {
    return this.page.getByText(/Page \d+ of \d+/);
  }

  async goToNextPage() {
    await this.getNextButton().click();
  }

  async goToPreviousPage() {
    await this.getPreviousButton().click();
  }

  // Clear
  getClearFiltersButton() {
    return this.page.getByRole('button', { name: 'Clear All Filters' });
  }

  async clearFilters() {
    await this.getClearFiltersButton().click();
  }
}
