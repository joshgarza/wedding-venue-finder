import type { Page } from '@playwright/test';

export class OnboardingPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/onboarding');
  }

  async waitForVenues() {
    await this.page.getByRole('button', { name: 'Like' }).waitFor();
  }

  async swipeRight() {
    await this.page.getByRole('button', { name: 'Like' }).click();
  }

  async swipeLeft() {
    await this.page.getByRole('button', { name: 'Skip', exact: true }).click();
  }

  async skipOnboarding() {
    await this.page.getByRole('button', { name: 'Skip onboarding' }).click();
  }

  async swipeAllVenues(totalCount: number) {
    for (let i = 0; i < totalCount; i++) {
      // Alternate: like odd-indexed, skip even-indexed
      if (i % 2 === 0) {
        await this.swipeRight();
      } else {
        await this.swipeLeft();
      }
      // Wait briefly for the next card or phase transition
      await this.page.waitForTimeout(300);
    }
  }

  async waitForGenerating() {
    await this.page.getByText('Analyzing your taste...').waitFor();
  }

  async waitForComplete() {
    await this.page.getByText('Your Taste Profile').waitFor({ timeout: 30_000 });
  }

  getDescriptiveWords() {
    return this.page.getByText('Your Taste Profile').locator('..').locator('..').locator('span');
  }

  getStartSwipingButton() {
    return this.page.getByRole('button', { name: 'Start Swiping' });
  }

  getBackToProfileButton() {
    return this.page.getByRole('button', { name: 'Back to Profile' });
  }

  getHeader() {
    return this.page.getByRole('heading', { name: /Find Your Style|Refine Your Taste/ });
  }

  isComplete() {
    return this.page.getByText('Your Taste Profile').isVisible();
  }
}
