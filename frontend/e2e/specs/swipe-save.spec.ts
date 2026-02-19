import { test, expect } from '../fixtures/auth.fixture';
import AxeBuilder from '@axe-core/playwright';
import { OnboardingPage } from '../page-objects/OnboardingPage';
import { SwipePage } from '../page-objects/SwipePage';
import { ShortlistPage } from '../page-objects/ShortlistPage';

test.describe('Swipe and Save Flow', () => {
  test('user can like a venue and see it in shortlist', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Skip onboarding first
    const onboardingPage = new OnboardingPage(page);
    await onboardingPage.skipOnboarding();
    await page.waitForURL('**/swipe');

    const swipePage = new SwipePage(page);
    await swipePage.waitForVenue();

    // Verify page loaded
    await expect(swipePage.getHeading()).toBeVisible();

    // Like a venue
    await swipePage.like();

    // Wait a moment for the API call
    await page.waitForTimeout(500);

    // Navigate to shortlist
    const shortlistPage = new ShortlistPage(page);
    await shortlistPage.goto();

    // Verify a venue appears in the shortlist
    await expect(shortlistPage.getHeading()).toBeVisible();

    // The shortlist should not be empty (the venue we liked should be there)
    await expect(shortlistPage.getEmptyState()).not.toBeVisible({ timeout: 5_000 });
  });

  test('swipe page passes accessibility checks', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const onboardingPage = new OnboardingPage(page);
    await onboardingPage.skipOnboarding();
    await page.waitForURL('**/swipe');

    const swipePage = new SwipePage(page);
    await swipePage.waitForVenue();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
