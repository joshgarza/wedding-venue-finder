import type { Page } from '@playwright/test';

export class VenueDetailPage {
  constructor(private page: Page) {}

  async goto(venueId: string) {
    await this.page.goto(`/venues/${venueId}`);
  }

  async waitForLoad() {
    // Wait for the venue name heading to appear
    await this.page.getByRole('heading', { level: 1 }).waitFor();
  }

  getVenueName() {
    return this.page.getByRole('heading', { level: 1 });
  }

  getBackButton() {
    return this.page.getByRole('button', { name: /Back/ });
  }

  async goBack() {
    await this.getBackButton().click();
  }

  getSaveButton() {
    return this.page.getByRole('button', { name: /Add to Shortlist|Remove from Shortlist/ });
  }

  async save() {
    await this.page.getByRole('button', { name: 'Add to Shortlist' }).click();
  }

  async unsave() {
    await this.page.getByRole('button', { name: 'Remove from Shortlist' }).click();
  }

  isSaved() {
    return this.page.getByRole('button', { name: 'Remove from Shortlist' }).isVisible();
  }

  getFeedbackMessage() {
    return this.page.getByText(/Added to shortlist|Removed from shortlist|Already in shortlist|Failed to update/);
  }

  getWebsiteLink() {
    return this.page.getByRole('link', { name: /Visit website/ });
  }

  getBadges() {
    return this.page.locator('span').filter({ hasText: /Estate|Historic|Lodging|\$|Match/ });
  }

  getWebsiteContentToggle() {
    return this.page.getByRole('button', { name: /Website Content/ });
  }

  async expandWebsiteContent() {
    await this.getWebsiteContentToggle().click();
  }

  getSimilarVenues() {
    return this.page.getByRole('heading', { name: 'Similar Venues' });
  }
}
