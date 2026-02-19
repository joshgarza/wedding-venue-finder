import type { Page } from '@playwright/test';

export class SignupPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/signup');
  }

  async fillEmail(email: string) {
    await this.page.getByLabel('Email *').fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByLabel('Password *', { exact: true }).fill(password);
  }

  async fillConfirmPassword(password: string) {
    await this.page.getByLabel('Confirm Password *').fill(password);
  }

  async fillWeddingDate(date: string) {
    await this.page.getByLabel('Wedding Date (Optional)').fill(date);
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Sign Up' }).click();
  }

  async signup(email: string, password: string, weddingDate?: string) {
    await this.goto();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(password);
    if (weddingDate) {
      await this.fillWeddingDate(weddingDate);
    }
    await this.submit();
  }

  getErrorMessage() {
    return this.page.locator('div').filter({ hasText: /Signup failed|Please fill|Passwords do not/ }).first();
  }

  getLoginLink() {
    return this.page.getByRole('link', { name: 'Login' });
  }
}
