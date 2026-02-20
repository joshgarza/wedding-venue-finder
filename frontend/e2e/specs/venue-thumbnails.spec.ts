import { test, expect } from '../fixtures/auth.fixture';
import { OnboardingPage } from '../page-objects/OnboardingPage';
import { SearchPage } from '../page-objects/SearchPage';

test.describe('Venue Thumbnail URLs', () => {
  test('search result thumbnails use full backend URLs', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Skip onboarding
    const onboardingPage = new OnboardingPage(page);
    await onboardingPage.skipOnboarding();
    await page.waitForURL('**/swipe');

    // Navigate to search
    const searchPage = new SearchPage(page);
    await searchPage.goto();
    await searchPage.waitForResults();

    // Find all venue card thumbnail divs (the ones with background-image)
    // VenueGrid renders thumbnails as divs with inline style background: url(...)
    const thumbnailDivs = page.locator('div[style*="background"]').filter({
      has: page.locator('button, div[style*="Match"]'),
    });

    const count = await thumbnailDivs.count();
    expect(count).toBeGreaterThan(0);

    // Check each thumbnail that has a background-image URL (not the gradient fallback)
    let checkedAtLeastOne = false;
    for (let i = 0; i < count; i++) {
      const style = await thumbnailDivs.nth(i).getAttribute('style');
      if (!style) continue;

      // Match background-image url(...) patterns
      const urlMatch = style.match(/url\(([^)]+)\)/);
      if (!urlMatch) continue;

      const imageUrl = urlMatch[1].replace(/["']/g, '');

      // Skip gradient fallbacks
      if (imageUrl.includes('gradient')) continue;

      // The URL must point to the API backend, not be a bare relative path
      // Valid: http://localhost:3003/api/v1/images/venues/...
      // Invalid: /images/venues/... (would resolve against frontend origin)
      expect(imageUrl, `Thumbnail URL should be absolute: ${imageUrl}`).toMatch(
        /^https?:\/\/.+\/api\/v1\/images\//,
      );
      checkedAtLeastOne = true;
    }

    // Ensure we actually validated at least one thumbnail URL.
    // If no venues have thumbnails in the test DB, the test is inconclusive
    // but should not fail — skip gracefully.
    if (!checkedAtLeastOne) {
      test.skip(true, 'No venues with thumbnails found in search results');
    }
  });
});
