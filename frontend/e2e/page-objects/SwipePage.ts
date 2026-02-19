import type { Page } from '@playwright/test';

export class SwipePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/swipe');
  }

  async waitForVenue() {
    // Wait for the venue card to appear or the "seen all" message
    await this.page.waitForSelector('button:has-text("Like"), p:has-text("seen all")');
  }

  async like() {
    await this.page.getByRole('button', { name: /Like/ }).click();
  }

  async skip() {
    await this.page.getByRole('button', { name: /Skip/ }).click();
  }

  async undo() {
    await this.page.getByRole('button', { name: /Undo/ }).click();
  }

  getUndoButton() {
    return this.page.getByRole('button', { name: /Undo/ });
  }

  getHeading() {
    return this.page.getByRole('heading', { name: 'Discover Venues' });
  }

  getEmptyState() {
    return this.page.getByText("You've seen all the venues!");
  }

  getBrowseLink() {
    return this.page.getByRole('link', { name: /Browse all venues/ });
  }

  getErrorBanner() {
    return this.page.locator('div').filter({ hasText: /Failed|error/i }).first();
  }
}
