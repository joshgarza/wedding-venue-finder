import type { Page } from '@playwright/test';

export class ProfilePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/profile');
  }

  getHeading() {
    return this.page.getByRole('heading', { name: 'Profile' });
  }

  getUserEmail() {
    return this.page.getByText(/Email:/).locator('..');
  }

  getWeddingDate() {
    return this.page.getByText(/Wedding Date:/).locator('..');
  }

  getTasteProfileCard() {
    return this.page.getByText(/Your Taste|No taste profile yet/);
  }

  getRefineButton() {
    return this.page.getByRole('button', { name: 'Refine Profile' });
  }

  getBuildProfileButton() {
    return this.page.getByRole('button', { name: 'Build Your Profile' });
  }

  getLogoutButton() {
    return this.page.getByRole('button', { name: 'Logout' });
  }

  async logout() {
    await this.getLogoutButton().click();
  }

  async refineProfile() {
    await this.getRefineButton().click();
  }
}
