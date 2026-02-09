# Wedding Venue Finder - MVP Completion Plan

## Context

The user has run the SF pipeline and wants to complete the remaining TODO.md tasks to reach MVP launch. Based on codebase exploration, here's the current state:

**Backend Status: 100% Complete ✅**
- Database: PostgreSQL 17 + PostGIS + pgvector configured
- All tables created: users, swipes, taste_profiles, venue_embeddings, venues
- API Server: Running on port 3003 with 223/223 tests passing
- Auth system: JWT authentication fully functional
- All API endpoints implemented and tested
- Pre-vetting pipeline stage integrated

**Frontend Status: 30-35% Complete ⚠️**
- Auth system: 100% complete (login/signup/protected routes)
- Search & Filter UI: 70% complete (fully functional, needs polish)
- Venue Detail: 50% complete (modal works, no dedicated page)
- Onboarding Flow: 0% (placeholder only)
- Swipe Interface: 0% (placeholder only)
- Taste Profile Display: 0% (doesn't exist)
- Shortlist Page: 5% (placeholder only)

**Data Status: Partial ⚠️**
- 10 SF venues in database (user ran pipeline)
- venue_embeddings table empty (0 embeddings)
- CLIP service running but not responding on port 51000
- Embedding generation script ready but blocked by CLIP service

**Why this plan is needed:**
Transform the partially implemented frontend into a fully functional "Tinder for Venues" MVP. The backend is complete, but the core swipe experience and taste profile features are missing. Data collection has started but embeddings are not yet generated.

**Intended outcome:**
A working MVP where users can:
1. Complete 10-swipe onboarding to establish taste profile
2. Browse venues with gesture-based swipe interface
3. See their taste profile (5 descriptive words + confidence score)
4. View and manage their shortlist
5. Search/filter venues by preferences

---

## Implementation Phases

### Phase 1: Fix CLIP Service & Generate Embeddings (BLOCKER)
**Priority: CRITICAL**
**Estimated Time: 30-60 minutes**
**Must complete before frontend work**

#### Tasks:
1. **Debug CLIP service connectivity**
   - Check CLIP service logs: `docker compose logs clip_api`
   - Verify port 51000 is properly exposed
   - Restart service if needed: `docker compose restart clip_api`
   - Test health endpoint: `curl http://localhost:51000/`

2. **Verify image_data population**
   - Check if Stage 3 (Images) completed successfully
   - Query database: `SELECT venue_id, image_data FROM venues WHERE image_data IS NOT NULL;`
   - If image_data is empty, re-run Stage 3: Check pipeline logs for errors

3. **Generate venue embeddings**
   - Once CLIP is healthy, run: `npm run generate:embeddings`
   - Monitor progress (should process ~10 venues with their images)
   - Verify: `SELECT COUNT(*) FROM venue_embeddings;`
   - Expected result: Multiple embeddings (one per image per venue)

#### Files to Check:
- `docker-compose.yml` - CLIP service configuration
- `bin/generate-venue-embeddings.ts` - Embedding script
- `src/api/services/embedding.service.ts` - CLIP integration

#### Verification:
```sql
-- Check embeddings were generated
SELECT COUNT(*) FROM venue_embeddings;
-- Should return >0

-- Check embedding vector dimensions
SELECT venue_id, image_path,
       jsonb_array_length(embedding_vector::jsonb) as dimensions
FROM venue_embeddings LIMIT 1;
-- Should return 512
```

---

### Phase 2: Core Swipe Experience (HIGH PRIORITY)
**Estimated Time: 8-10 hours total**
**Can begin once embeddings are ready**

This phase implements the two most critical frontend features: onboarding and main swipe interface.

---

#### 2A: Onboarding Flow (10-Swipe Experience)
**Estimated Time: 4-5 hours**

**Current State:**
- File exists: `frontend/src/pages/Onboarding.tsx` (placeholder only)
- Auth check implemented
- No actual onboarding logic

**Implementation Steps:**

1. **Install swipe gesture library**
   ```bash
   cd frontend
   npm install react-swipeable
   npm install @types/react-swipeable --save-dev
   ```

2. **Create OnboardingCard component**
   - File: `frontend/src/components/OnboardingCard.tsx`
   - Features:
     - Display single venue image (large, centered)
     - Venue name overlay
     - Swipeable with react-swipeable
     - Visual feedback on swipe direction (tilt animation)
     - Swipe left/right gesture detection
     - Fallback buttons for non-touch devices

3. **Create SwipeProgress component**
   - File: `frontend/src/components/SwipeProgress.tsx`
   - Features:
     - Progress dots (10 total, highlight current)
     - Text: "3 of 10"
     - Smooth animation when progressing

4. **Create useOnboarding hook**
   - File: `frontend/src/hooks/useOnboarding.ts`
   - State management:
     - Fetch 10 venues from `/api/v1/taste-profile/onboarding`
     - Track current venue index (0-9)
     - Track swipes (venue_id + direction)
     - Session ID from API response
   - API calls:
     - POST to `/api/v1/swipes` for each swipe
     - POST to `/api/v1/taste-profile/generate` after 10th swipe
   - Handle loading/error states

5. **Update Onboarding.tsx page**
   - Replace placeholder with full implementation
   - Layout:
     - Progress indicator at top
     - OnboardingCard in center
     - Optional: Skip button (redirect to /swipe)
   - State flow:
     - Show loading while fetching venues
     - Display card for current venue
     - On swipe: record swipe, increment index, show next card
     - After 10 swipes: show loading, generate profile, redirect to /profile
   - Error handling: Retry button if API fails

**Key Components Structure:**
```tsx
// Onboarding.tsx
<div className="onboarding-container">
  <SwipeProgress current={currentIndex + 1} total={10} />
  <OnboardingCard
    venue={venues[currentIndex]}
    onSwipeLeft={() => handleSwipe('left')}
    onSwipeRight={() => handleSwipe('right')}
  />
  <div className="onboarding-actions">
    <button>Skip Onboarding</button>
  </div>
</div>
```

**API Integration:**
- GET `/api/v1/taste-profile/onboarding` → returns 10 venues + session_id
- POST `/api/v1/swipes` (body: {venue_id, action: 'left'|'right', session_id})
- POST `/api/v1/taste-profile/generate` (body: {session_id})

**Styling Considerations:**
- Mobile-first (majority of users on phone)
- Large touch targets for swipe areas
- Smooth CSS transitions for card exit animations
- Haptic feedback on swipe (if supported)

**Files to Create:**
- `frontend/src/components/OnboardingCard.tsx`
- `frontend/src/components/SwipeProgress.tsx`
- `frontend/src/hooks/useOnboarding.ts`

**Files to Modify:**
- `frontend/src/pages/Onboarding.tsx` (complete rewrite)
- `frontend/package.json` (add react-swipeable)

**Testing:**
- Test with actual API (10 SF venues available)
- Verify swipes are recorded in database
- Verify taste profile is generated after 10 swipes
- Test skip button flow
- Test error states (API down, no venues)

---

#### 2B: Main Swipe Interface
**Estimated Time: 5-6 hours**

**Current State:**
- File exists: `frontend/src/pages/Swipe.tsx` (placeholder only)
- Auth check implemented
- No swipe logic

**Implementation Steps:**

1. **Create SwipeCard component** (reusable from Onboarding)
   - File: `frontend/src/components/SwipeCard.tsx`
   - Features:
     - Image carousel (show multiple venue images)
     - Venue info overlay (name, pricing, key features)
     - Swipe gestures (left = skip, right = save)
     - Visual feedback (card tilt, color hints)
     - Undo last swipe button (optional MVP v1.1)

2. **Create CardStack component**
   - File: `frontend/src/components/CardStack.tsx`
   - Features:
     - Stack of 3 cards (current + next 2 visible behind)
     - CSS transforms for depth effect
     - Smooth exit animations when card swiped

3. **Create useSwipe hook**
   - File: `frontend/src/hooks/useSwipe.ts`
   - Features:
     - Infinite venue loading from `/api/v1/venues` (taste-ranked)
     - Track swipes locally
     - Batch API calls (optimize network)
     - Preload next venues (smooth UX)
     - Handle "out of venues" state

4. **Update Swipe.tsx page**
   - Layout:
     - CardStack in center
     - Action buttons at bottom (X for left, ♥ for right)
     - Counter: "12 venues saved" (link to shortlist)
   - State flow:
     - Load venues with taste ranking
     - Display current card
     - On swipe: animate card out, show next, record swipe
     - Load more venues when stack gets low
   - "Out of venues" state with illustration

**Key Features:**
- Taste-ranked venue ordering (backend handles this)
- Image carousel within each card (tap to cycle)
- Smooth animations (card flies off screen)
- Efficient loading (infinite scroll pattern)

**API Integration:**
- GET `/api/v1/venues?limit=20&offset=0` (taste score ranking automatic)
- POST `/api/v1/swipes` for each swipe

**Files to Create:**
- `frontend/src/components/SwipeCard.tsx`
- `frontend/src/components/CardStack.tsx`
- `frontend/src/hooks/useSwipe.ts`

**Files to Modify:**
- `frontend/src/pages/Swipe.tsx` (complete rewrite)

**Reusable from Onboarding:**
- Swipe gesture handling pattern
- Card animation styles
- API integration patterns

---

### Phase 3: Taste Profile & Shortlist Pages (HIGH PRIORITY)
**Estimated Time: 5-7 hours total**

---

#### 3A: Taste Profile Display Page
**Estimated Time: 2-3 hours**

**Current State:**
- No files exist for this feature

**Implementation Steps:**

1. **Create TasteProfileCard component**
   - File: `frontend/src/components/TasteProfileCard.tsx`
   - Display:
     - 5 descriptive words (large, prominent typography)
     - Confidence score (0.0-1.0 as percentage)
     - Profile creation date
     - Visual: Word cloud or badge-style layout

2. **Create DescriptiveWords component**
   - File: `frontend/src/components/DescriptiveWords.tsx`
   - Features:
     - Animated word appearance
     - Color-coded by aesthetic category
     - Tooltips explaining each word

3. **Create ConfidenceIndicator component**
   - File: `frontend/src/components/ConfidenceIndicator.tsx`
   - Visual options:
     - Circular progress ring
     - Linear progress bar with percentage
     - Color: green (>80%), yellow (60-80%), orange (<60%)

4. **Create TasteProfile.tsx page**
   - File: `frontend/src/pages/TasteProfile.tsx`
   - Layout:
     - Hero section with 5 words
     - Confidence indicator
     - "Refine Profile" button (trigger 5 more swipes)
     - "How it works" explanation modal
     - Swipe history summary

**API Integration:**
- GET `/api/v1/taste-profile` → {descriptive_words: string[], confidence: number, created_at: string}

**Files to Create:**
- `frontend/src/pages/TasteProfile.tsx`
- `frontend/src/components/TasteProfileCard.tsx`
- `frontend/src/components/DescriptiveWords.tsx`
- `frontend/src/components/ConfidenceIndicator.tsx`

**Files to Modify:**
- `frontend/src/router.tsx` (add /profile route if missing)

**User Flow:**
- After onboarding → redirected to /profile
- Can access from navigation menu
- Shows loading state if profile generating

---

#### 3B: Shortlist Page
**Estimated Time: 3-4 hours**

**Current State:**
- File exists: `frontend/src/pages/Shortlist.tsx` (placeholder only)
- VenueCard component exists and can be reused
- VenueGrid component exists and can be reused

**Implementation Steps:**

1. **Create ShortlistEmpty component**
   - File: `frontend/src/components/ShortlistEmpty.tsx`
   - Features:
     - Illustration or icon
     - Message: "No venues saved yet"
     - CTA button: "Start Swiping"

2. **Update Shortlist.tsx page**
   - Fetch saved venues from `/api/v1/swipes/saved`
   - Display using existing VenueGrid component
   - Each card shows:
     - Venue thumbnail
     - Name, location, pricing
     - Taste score badge
     - "Remove" button (unsave)
   - Add sorting dropdown:
     - By taste score (default)
     - By price (low to high, high to low)
     - By date saved (newest first)
   - Optional: Export to PDF/print (MVP v1.1)

**API Integration:**
- GET `/api/v1/swipes/saved` → returns array of venues with taste scores
- DELETE `/api/v1/swipes/:venue_id` (unsave action)

**Files to Create:**
- `frontend/src/components/ShortlistEmpty.tsx`

**Files to Modify:**
- `frontend/src/pages/Shortlist.tsx` (complete rewrite, reuse VenueGrid)

**Reusable Components:**
- `VenueGrid.tsx` (already exists)
- `VenueCard.tsx` (already exists)
- `SortDropdown.tsx` (already exists, might need sorting options adjustment)

---

### Phase 4: Polish & Testing (MEDIUM PRIORITY)
**Estimated Time: 4-5 hours total**

---

#### 4A: Search & Filter Polish (1-2 hours)

**Current State:**
- 70% complete, fully functional
- Files: `frontend/src/pages/Search.tsx`, `SearchFilters.tsx`

**Remaining Tasks:**
1. **Enhance venue detail modal**
   - Add full image gallery with prev/next navigation
   - Add share button (copy link)
   - Add "Open in Google Maps" link

2. **Add infinite scroll option**
   - Alternative to pagination
   - Load more as user scrolls
   - Better mobile UX

3. **Improve filter feedback**
   - Show number of results for each filter option
   - Disable incompatible filters (e.g., distance without location)
   - Clear visual state for active filters

**Files to Modify:**
- `frontend/src/pages/Search.tsx` (enhance modal)
- `frontend/src/components/SearchFilters.tsx` (add result counts)

---

#### 4B: Venue Detail Page (Dedicated Route) (2-3 hours)

**Current State:**
- Modal exists in Search.tsx (functional)
- No dedicated route

**Implementation:**

1. **Create VenueDetail.tsx page**
   - File: `frontend/src/pages/VenueDetail.tsx`
   - Route: `/venues/:id`
   - Features:
     - Full-screen image gallery (ImageGallery component)
     - All venue details (pricing, capacity, features)
     - Map showing location
     - Save/remove shortlist button
     - Back button
     - Share button
     - Related venues section (similar taste)

2. **Create ImageGallery component**
   - File: `frontend/src/components/ImageGallery.tsx`
   - Features:
     - Large image display
     - Thumbnails strip
     - Prev/next navigation
     - Keyboard support (arrow keys)
     - Swipe gestures on mobile

**API Integration:**
- GET `/api/v1/venues/:id` → full venue details
- Reuse existing shortlist endpoints

**Files to Create:**
- `frontend/src/pages/VenueDetail.tsx`
- `frontend/src/components/ImageGallery.tsx`

**Files to Modify:**
- `frontend/src/router.tsx` (add /venues/:id route)
- `frontend/src/components/VenueCard.tsx` (add click handler to navigate)

---

#### 4C: End-to-End Testing (1 hour)

**Test Flows:**

1. **New User Flow:**
   - Signup → Onboarding (10 swipes) → Profile generated → Browse venues

2. **Returning User Flow:**
   - Login → See existing profile → Browse/swipe → Shortlist

3. **Search Flow:**
   - Apply filters → View results → Click venue → See details

4. **Shortlist Flow:**
   - Save venues → View shortlist → Remove venue → Verify removed

5. **Mobile Responsiveness:**
   - Test all features on mobile screen sizes
   - Verify touch gestures work
   - Check performance on 3G network (Chrome DevTools throttling)

**Manual Testing Checklist:**
- [ ] Can create account
- [ ] Can complete onboarding (10 swipes)
- [ ] Profile shows 5 words and confidence
- [ ] Main swipe interface works with gestures
- [ ] Right swipes save to shortlist
- [ ] Shortlist displays saved venues
- [ ] Can remove from shortlist
- [ ] Search filters work correctly
- [ ] Venue detail modal/page displays properly
- [ ] Taste score appears on cards
- [ ] Auth persists across refresh
- [ ] No console errors

---

## Critical Files & Dependencies

### Must Read Before Implementation:

1. **`frontend/src/pages/Search.tsx`** (Lines 1-250)
   - Reference for API integration patterns
   - VenueGrid and VenueCard usage examples
   - Filter state management pattern
   - Modal implementation (can reuse for onboarding?)

2. **`frontend/src/hooks/useVenueSearch.ts`** (Lines 1-122)
   - Pattern for creating custom hooks with API calls
   - Debouncing implementation
   - Loading/error state management
   - Use as template for useOnboarding and useSwipe hooks

3. **`frontend/src/utils/api-client.ts`** (Lines 1-119)
   - Axios client with auth headers
   - Token refresh interceptor
   - Error handling patterns
   - Use for all API calls

4. **`frontend/src/contexts/AuthContext.tsx`** (Referenced in all pages)
   - User state management
   - has_taste_profile flag usage
   - Login/logout patterns

5. **Backend API Endpoints** (For reference):
   - `src/api/routes/taste-profile.routes.ts` - Onboarding endpoints
   - `src/api/routes/swipes.routes.ts` - Swipe tracking
   - `src/api/routes/venues.routes.ts` - Venue search

### Reusable Components:

From existing codebase:
- `VenueCard.tsx` - Display venue in grid
- `VenueGrid.tsx` - Grid layout for venues
- `SortDropdown.tsx` - Sort selector
- `VenueMap.tsx` - Leaflet map for location
- `PhotoStrip.tsx` - Image carousel (needs enhancement)

To create (reusable across features):
- `SwipeCard.tsx` - Card with gesture support (use in Onboarding + Swipe)
- `ImageGallery.tsx` - Full-screen gallery (use in Swipe + VenueDetail)

---

## Package Dependencies to Add

```bash
cd frontend
npm install react-swipeable
npm install @types/react-swipeable --save-dev
```

No other dependencies needed - everything else already installed.

---

## Implementation Order (Optimal Path)

**Day 1 (6-8 hours):**
1. Phase 1: Fix CLIP service + generate embeddings (1 hour)
2. Phase 2A: Onboarding flow (4-5 hours)
   - Most critical feature
   - Establishes user taste profiles
3. Test onboarding end-to-end with real API

**Day 2 (6-8 hours):**
4. Phase 2B: Main swipe interface (5-6 hours)
   - Reuse components from onboarding
   - Core engagement feature
5. Quick test of swipe → shortlist flow

**Day 3 (5-7 hours):**
6. Phase 3A: Taste profile display (2-3 hours)
7. Phase 3B: Shortlist page (3-4 hours)
8. Test full flow: Onboarding → Profile → Swipe → Shortlist

**Day 4 (4-5 hours):**
9. Phase 4A: Search polish (1-2 hours)
10. Phase 4B: Venue detail page (2-3 hours)
11. Phase 4C: End-to-end testing (1 hour)

**Total: 21-28 hours (3-4 days of work)**

---

## Success Criteria (MVP Launch Ready)

### Must Be True:
- ✅ Backend: All 223 tests passing (DONE)
- ✅ Database: Tables created and ready (DONE)
- ✅ Auth: Login/signup working (DONE)
- ⏳ Embeddings: CLIP service working + embeddings generated (PHASE 1)
- ⏳ Onboarding: 10-swipe flow functional (PHASE 2A)
- ⏳ Swipe: Gesture-based interface working (PHASE 2B)
- ⏳ Profile: 5 words + confidence displayed (PHASE 3A)
- ⏳ Shortlist: Save/view/remove venues (PHASE 3B)
- ✅ Search: Filters work (70% DONE, polish in PHASE 4A)
- ⏳ Mobile: Responsive on phone (TEST in PHASE 4C)
- ⏳ Performance: No critical bugs, <2s load times (PHASE 4C)

### Post-MVP (Future):
- Real-time profile updates (learning rate 0.1)
- Undo last swipe
- Advanced filters (estate, historic, square footage)
- Map view in search
- Related venues section
- Share functionality

---

## Risk Mitigation

**Risk: CLIP service won't start**
- Mitigation: Check docker-compose logs, verify GPU availability, restart service
- Workaround: Can implement UI without embeddings (random venue order) for initial testing

**Risk: Not enough venue data (only 10 venues)**
- Mitigation: Users can still test flow with 10 venues
- Workaround: Run pipeline again for more SF area or expand to LA
- Note: Onboarding needs minimum 10 venues (currently met)

**Risk: Gesture library doesn't work well on all devices**
- Mitigation: Provide fallback buttons (already in plan)
- Testing: Test on iPhone, Android, desktop with trackpad

**Risk: Swipe animations janky on low-end phones**
- Mitigation: Use CSS transforms (hardware accelerated), minimize JS animations
- Testing: Chrome DevTools CPU throttling

---

## Next Steps After This Plan

1. Fix CLIP service and generate embeddings (CRITICAL PATH)
2. Implement onboarding flow (HIGHEST IMPACT)
3. Implement main swipe interface (CORE ENGAGEMENT)
4. Add taste profile display (VALIDATION)
5. Complete shortlist page (USER VALUE)
6. Polish search and detail pages (REFINEMENT)
7. Test everything end-to-end (LAUNCH READY)

Once all phases complete: MVP is launch-ready for initial users! 🚀
