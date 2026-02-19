import { test, expect } from '../fixtures/auth.fixture';
import AxeBuilder from '@axe-core/playwright';
import { OnboardingPage } from '../page-objects/OnboardingPage';
import { SearchPage } from '../page-objects/SearchPage';
import { VenueDetailPage } from '../page-objects/VenueDetailPage';
import { ShortlistPage } from '../page-objects/ShortlistPage';

test.describe('Venue Detail and Save Management', () => {
  test('user can save a venue from detail page and see it in shortlist', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Skip onboarding
    const onboardingPage = new OnboardingPage(page);
    await onboardingPage.skipOnboarding();
    await page.waitForURL('**/swipe');

    // Navigate to search to find a venue
    const searchPage = new SearchPage(page);
    await searchPage.goto();
    await searchPage.waitForResults();

    // Click the first venue to open its detail (via the venue grid card link)
    // Venue cards navigate to /venues/:id
    const firstVenueLink = page.locator('a[href^="/venues/"]').first();
    await firstVenueLink.click();

    // Wait for venue detail page
    const venueDetailPage = new VenueDetailPage(page);
    await venueDetailPage.waitForLoad();

    // Get the venue name for later verification
    const venueName = await venueDetailPage.getVenueName().textContent();
    expect(venueName).toBeTruthy();

    // Save the venue
    await venueDetailPage.save();

    // Verify feedback message
    await expect(venueDetailPage.getFeedbackMessage()).toBeVisible();

    // Navigate to shortlist
    const shortlistPage = new ShortlistPage(page);
    await shortlistPage.goto();

    // Verify the venue appears
    await expect(shortlistPage.getHeading()).toBeVisible();
    await expect(shortlistPage.getEmptyState()).not.toBeVisible({ timeout: 5_000 });

    // Verify the saved venue name appears
    if (venueName) {
      await expect(shortlistPage.getVenueByName(venueName)).toBeVisible();
    }
  });

  test('venue detail page passes accessibility checks', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const onboardingPage = new OnboardingPage(page);
    await onboardingPage.skipOnboarding();
    await page.waitForURL('**/swipe');

    // Navigate to a venue detail via search
    const searchPage = new SearchPage(page);
    await searchPage.goto();
    await searchPage.waitForResults();

    const firstVenueLink = page.locator('a[href^="/venues/"]').first();
    await firstVenueLink.click();

    const venueDetailPage = new VenueDetailPage(page);
    await venueDetailPage.waitForLoad();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
