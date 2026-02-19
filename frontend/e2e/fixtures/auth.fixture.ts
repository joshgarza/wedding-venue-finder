import { test as base, type Page } from '@playwright/test';
import { SignupPage } from '../page-objects/SignupPage';

type AuthFixtures = {
  authenticatedPage: Page;
  testEmail: string;
  testPassword: string;
};

export const test = base.extend<AuthFixtures>({
  testEmail: async ({}, use) => {
    const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    await use(email);
  },

  testPassword: async ({}, use) => {
    await use('TestPass123!');
  },

  authenticatedPage: async ({ page, testEmail, testPassword }, use) => {
    const signupPage = new SignupPage(page);
    await signupPage.signup(testEmail, testPassword);

    // Wait for redirect to onboarding (confirms signup succeeded)
    await page.waitForURL('**/onboarding');

    await use(page);
  },
});

export { expect } from '@playwright/test';
