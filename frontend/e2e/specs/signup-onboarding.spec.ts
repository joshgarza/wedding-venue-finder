import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SignupPage } from '../page-objects/SignupPage';
import { OnboardingPage } from '../page-objects/OnboardingPage';

test.describe('Signup and Onboarding Flow', () => {
  test('new user can sign up and complete onboarding', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    const password = 'TestPass123!';

    // Sign up
    const signupPage = new SignupPage(page);
    await signupPage.signup(email, password);

    // Should redirect to onboarding
    await page.waitForURL('**/onboarding');

    const onboardingPage = new OnboardingPage(page);
    await expect(onboardingPage.getHeader()).toBeVisible();

    // Wait for venues to load
    await onboardingPage.waitForVenues();

    // Swipe through all venues (assuming around 10 onboarding venues)
    // The component transitions to 'generating' phase when all are swiped
    const maxSwipes = 20;
    for (let i = 0; i < maxSwipes; i++) {
      const likeButton = page.getByRole('button', { name: 'Like' });
      const skipButton = page.getByRole('button', { name: 'Skip', exact: true });

      // Check if we've left the swiping phase
      if (!(await likeButton.isVisible().catch(() => false))) break;

      if (i % 2 === 0) {
        await likeButton.click();
      } else {
        await skipButton.click();
      }

      // Brief wait for animation/next card
      await page.waitForTimeout(300);
    }

    // Wait for taste profile generation
    await onboardingPage.waitForComplete();

    // Verify taste profile is displayed
    await expect(page.getByText('Your Taste Profile')).toBeVisible();

    // Verify there are descriptive words shown
    await expect(page.getByText('Confidence:')).toBeVisible();

    // Click Start Swiping to proceed
    await onboardingPage.getStartSwipingButton().click();

    // Should navigate to swipe page
    await page.waitForURL('**/swipe');
  });

  test('signup page passes accessibility checks', async ({ page }) => {
    const signupPage = new SignupPage(page);
    await signupPage.goto();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
