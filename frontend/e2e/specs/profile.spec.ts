import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SignupPage } from '../page-objects/SignupPage';
import { OnboardingPage } from '../page-objects/OnboardingPage';
import { ProfilePage } from '../page-objects/ProfilePage';

test.describe('Profile Page', () => {
  test('user can view profile with email and taste profile', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    const password = 'TestPass123!';

    // Sign up to create a new user
    const signupPage = new SignupPage(page);
    await signupPage.signup(email, password);
    await page.waitForURL('**/onboarding');

    // Complete onboarding to generate a taste profile
    const onboardingPage = new OnboardingPage(page);
    await onboardingPage.waitForVenues();

    // Swipe through all venues
    const maxSwipes = 20;
    for (let i = 0; i < maxSwipes; i++) {
      const likeButton = page.getByRole('button', { name: 'Like' });
      if (!(await likeButton.isVisible().catch(() => false))) break;

      if (i % 2 === 0) {
        await likeButton.click();
      } else {
        await page.getByRole('button', { name: 'Skip', exact: true }).click();
      }
      await page.waitForTimeout(300);
    }

    // Wait for taste profile generation
    await onboardingPage.waitForComplete();
    await onboardingPage.getStartSwipingButton().click();
    await page.waitForURL('**/swipe');

    // Navigate to profile
    const profilePage = new ProfilePage(page);
    await profilePage.goto();

    // Verify heading
    await expect(profilePage.getHeading()).toBeVisible();

    // Verify email is displayed
    await expect(page.getByText(email)).toBeVisible();

    // Verify taste profile card is visible (should show "Your Taste" since we completed onboarding)
    await expect(page.getByText('Your Taste')).toBeVisible();

    // Verify logout button exists
    await expect(profilePage.getLogoutButton()).toBeVisible();
  });

  test('profile page passes accessibility checks', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    const password = 'TestPass123!';

    // Quick signup + skip onboarding
    const signupPage = new SignupPage(page);
    await signupPage.signup(email, password);
    await page.waitForURL('**/onboarding');

    const onboardingPage = new OnboardingPage(page);
    await onboardingPage.waitForVenues();
    await onboardingPage.skipOnboarding();
    await page.waitForURL('**/swipe');

    const profilePage = new ProfilePage(page);
    await profilePage.goto();

    await expect(profilePage.getHeading()).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
