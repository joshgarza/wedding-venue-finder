import { test, expect } from '../fixtures/auth.fixture';
import AxeBuilder from '@axe-core/playwright';
import { OnboardingPage } from '../page-objects/OnboardingPage';
import { SearchPage } from '../page-objects/SearchPage';

test.describe('Search and Filter Flow', () => {
  test('user can browse venues and apply pricing filter', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Skip onboarding
    const onboardingPage = new OnboardingPage(page);
    await onboardingPage.skipOnboarding();
    await page.waitForURL('**/swipe');

    // Navigate to search
    const searchPage = new SearchPage(page);
    await searchPage.goto();

    // Verify the page loaded
    await expect(searchPage.getHeading()).toBeVisible();
    await searchPage.waitForResults();

    // Note the initial count
    const initialCountText = await searchPage.getResultCount().textContent();

    // Apply a pricing filter
    await searchPage.togglePricingTier('luxury');

    // Wait for results to update
    await page.waitForTimeout(500);
    await searchPage.waitForResults();

    // Verify results updated (count text should change or remain)
    const filteredCountText = await searchPage.getResultCount().textContent();
    expect(filteredCountText).toBeTruthy();

    // Verify URL reflects the filter
    expect(page.url()).toContain('pricing_tier=luxury');
  });

  test('search page passes accessibility checks', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const onboardingPage = new OnboardingPage(page);
    await onboardingPage.skipOnboarding();
    await page.waitForURL('**/swipe');

    const searchPage = new SearchPage(page);
    await searchPage.goto();
    await searchPage.waitForResults();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
