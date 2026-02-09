# Wedding Venue Finder - MVP TODO

**Last Updated:** 2026-02-09
**Status:** Backend complete, Frontend partial, Data missing

---

## 🚨 CRITICAL BLOCKERS (Must Complete Before Launch)

### 1. Data Collection - LA Venues
**Priority:** CRITICAL
**Estimated Time:** 3-4 hours
**Status:** ❌ Not Started

**Tasks:**
- [ ] Get correct LA bounding box coordinates (NOT the SF coords currently in README)
  - Research actual LA metro area boundaries
  - West: ~-118.67, South: ~33.70, East: ~-117.65, North: ~34.34 (verify these!)
- [ ] Run full pipeline for LA area
  ```bash
  npm run pipeline -- --bbox="<VERIFIED_LA_COORDS>" --tileDeg=0.02
  ```
- [ ] Monitor pipeline progress
  - Stage 1: OSM collection
  - Stage 1.5: Pre-vetting (expect 40-50% marked as "yes")
  - Stage 2: Crawl (only "yes" venues)
  - Stage 3: Image extraction
  - Stage 4: LLM enrichment
  - Stage 5: Logo filtering
- [ ] Verify results in database
  ```sql
  SELECT COUNT(*) FROM venues WHERE is_wedding_venue = true;
  -- Target: 200+ venues
  ```
- [ ] Check error logs for any issues
  - `.crawl_errors.log`
  - `image_errors.log`
  - `filter_errors.log`

**Acceptance Criteria:**
- ✓ At least 200 LA wedding venues in database
- ✓ Each venue has 3+ non-logo images
- ✓ Venue data includes pricing, lodging, capacity info

---

### 2. Generate CLIP Embeddings
**Priority:** CRITICAL
**Estimated Time:** 30-60 minutes
**Status:** ❌ Not Started
**Depends On:** Task #1 (LA data collection)

**Tasks:**
- [ ] Ensure CLIP service is running
  ```bash
  docker compose ps clip_api
  curl http://localhost:51000/  # Health check
  ```
- [ ] Run embedding generation script
  ```bash
  npm run generate:embeddings
  ```
- [ ] Monitor progress (watch for errors/timeouts)
- [ ] Verify embeddings in database
  ```sql
  SELECT COUNT(*) FROM venue_embeddings;
  -- Should match total number of venue images
  ```

**Acceptance Criteria:**
- ✓ All venue images have VECTOR(512) embeddings
- ✓ No failed embeddings in error logs
- ✓ Embeddings stored in `venue_embeddings` table

---

## 🎨 FRONTEND - Core MVP Features

### 3. Onboarding Flow (10 Swipes)
**Priority:** HIGH
**Estimated Time:** 4-5 hours
**Status:** ❌ Not Started

**Tasks:**
- [ ] Create `Onboarding.tsx` page component
- [ ] Fetch 10 random venues from `/api/v1/taste-profile/onboarding`
- [ ] Display venue images in swipeable cards
- [ ] Add swipe gesture detection (left/right)
  - Option A: Use `react-swipeable` library
  - Option B: Implement custom touch handlers
- [ ] Add progress indicator (1/10, 2/10, etc.)
- [ ] Track swipes in session state
- [ ] On 10th swipe, call `/api/v1/taste-profile/generate`
- [ ] Show loading state during profile generation
- [ ] Navigate to taste profile display on completion
- [ ] Add skip option (for users who want to skip onboarding)

**Components to Create:**
- `pages/Onboarding.tsx`
- `components/OnboardingCard.tsx`
- `components/SwipeProgress.tsx`
- `hooks/useOnboarding.ts`

**Acceptance Criteria:**
- ✓ New users see onboarding on first login
- ✓ Can swipe left/right on 10 venues
- ✓ Profile generates after 10 swipes
- ✓ Swipes recorded in database
- ✓ Handles errors gracefully (no venues, API failure)

---

### 4. Swipe Interface (Main Browsing)
**Priority:** HIGH
**Estimated Time:** 5-6 hours
**Status:** ❌ Not Started

**Tasks:**
- [ ] Create `Swipe.tsx` page component
- [ ] Implement gesture-based swipe card stack
  - Card stack animation (Tinder-style)
  - Swipe right = save to shortlist
  - Swipe left = skip
  - Undo last swipe (optional but nice)
- [ ] Fetch venues with taste-based ranking
  - Use `/api/v1/venues` with user's taste profile
  - Infinite scroll / load more as user swipes
- [ ] Display venue info on card
  - Venue name
  - Primary image
  - Pricing tier
  - Key features (lodging, capacity)
- [ ] Call `/api/v1/swipes` on each swipe
- [ ] Update taste profile on swipe (optional - future)
- [ ] "Out of venues" state
- [ ] Image carousel within card (tap to see more photos)

**Components to Create:**
- `pages/Swipe.tsx`
- `components/SwipeCard.tsx`
- `components/SwipeCardStack.tsx`
- `components/VenueCardInfo.tsx`
- `hooks/useSwipe.ts`

**Acceptance Criteria:**
- ✓ Smooth swipe animations
- ✓ Venues ranked by taste similarity
- ✓ Right swipes save to shortlist
- ✓ Can view multiple images per venue
- ✓ Works on mobile (touch gestures)

---

### 5. Taste Profile Display
**Priority:** HIGH
**Estimated Time:** 2-3 hours
**Status:** ❌ Not Started

**Tasks:**
- [ ] Create `TasteProfile.tsx` page component
- [ ] Fetch user's profile from `/api/v1/taste-profile`
- [ ] Display 5 descriptive words prominently
  - Large, visually appealing typography
  - Consider word cloud or badge design
- [ ] Show confidence score (0.0-1.0)
  - Visual indicator (progress ring, percentage)
- [ ] Add "Refine Profile" button
  - Triggers 5 more swipes to update profile
- [ ] Show profile creation date
- [ ] Add "How it works" explanation modal

**Components to Create:**
- `pages/TasteProfile.tsx`
- `components/TasteProfileCard.tsx`
- `components/DescriptiveWords.tsx`
- `components/ConfidenceIndicator.tsx`

**Acceptance Criteria:**
- ✓ Displays 5 aesthetic words clearly
- ✓ Shows confidence score visually
- ✓ Accessible from main navigation
- ✓ Can refine profile with more swipes

---

### 6. Shortlist Page
**Priority:** MEDIUM
**Estimated Time:** 3-4 hours
**Status:** ❌ Not Started

**Tasks:**
- [ ] Create `Shortlist.tsx` page component
- [ ] Fetch saved venues from `/api/v1/swipes/saved`
- [ ] Display as grid or list view
- [ ] Show venue cards with:
  - Thumbnail image
  - Name
  - Pricing tier
  - Key features
  - Taste score (similarity to user profile)
- [ ] Add "Unsave" action (remove from shortlist)
- [ ] Click venue to see details
- [ ] Empty state (no saved venues yet)
- [ ] Sort options (by taste score, pricing, date saved)
- [ ] Export shortlist (optional - print/PDF/share)

**Components to Create:**
- `pages/Shortlist.tsx`
- `components/VenueGrid.tsx`
- `components/VenueCard.tsx`
- `components/ShortlistEmpty.tsx`

**Acceptance Criteria:**
- ✓ Shows all saved venues
- ✓ Can remove venues from shortlist
- ✓ Sorted by taste score (default)
- ✓ Click to view details
- ✓ Empty state with CTA to start swiping

---

### 7. Search & Filter UI (Enhancement)
**Priority:** MEDIUM
**Estimated Time:** 4-5 hours
**Status:** ⚠️ PARTIAL (components exist, needs integration)

**Tasks:**
- [ ] Review existing `Search.tsx` and `SearchFilters.tsx` components
- [ ] Connect to `/api/v1/venues` endpoint
- [ ] Implement filters:
  - Pricing tier (checkboxes: low, medium, high, luxury)
  - Has lodging (toggle)
  - Is estate (toggle)
  - Is historic (toggle)
  - Location (zip or map picker)
  - Radius (slider: 10-100 miles)
- [ ] Add sorting dropdown
  - Taste score (default)
  - Pricing tier
  - Distance (requires location filter)
- [ ] Display results as grid
- [ ] Show taste score badge on each card
- [ ] Pagination or infinite scroll
- [ ] Update URL with filter params (shareable links)

**Components to Verify/Update:**
- `pages/Search.tsx`
- `components/SearchFilters.tsx`
- `components/VenueGrid.tsx`
- `hooks/useVenueSearch.ts`

**Acceptance Criteria:**
- ✓ All filters work correctly
- ✓ Results ranked by taste score
- ✓ Can sort by pricing/distance
- ✓ Responsive on mobile
- ✓ Fast search (debounced)

---

### 8. Venue Detail Page
**Priority:** MEDIUM
**Estimated Time:** 3-4 hours
**Status:** ❌ Not Started

**Tasks:**
- [ ] Create `VenueDetail.tsx` page component
- [ ] Fetch venue by ID from `/api/v1/venues/:id`
- [ ] Display full venue information:
  - Image gallery (all non-logo images)
  - Venue name
  - Website link
  - Pricing tier
  - Capacity info
  - Lodging details
  - Location (map)
  - Taste score
- [ ] Add "Save to Shortlist" button
- [ ] Add "Share" button (copy link)
- [ ] Back navigation
- [ ] Related venues (similar taste)

**Components to Create:**
- `pages/VenueDetail.tsx`
- `components/ImageGallery.tsx`
- `components/VenueInfo.tsx`
- `components/VenueMap.tsx` (optional)

**Acceptance Criteria:**
- ✓ Shows all venue details
- ✓ Image gallery works smoothly
- ✓ Can save/unsave from detail page
- ✓ Map shows venue location
- ✓ Responsive design

---

## 🧪 TESTING & VERIFICATION

### 9. End-to-End User Flow Testing
**Priority:** HIGH
**Estimated Time:** 2-3 hours
**Status:** ❌ Not Started
**Depends On:** Tasks #3-8

**Test Cases:**
- [ ] **New User Flow:**
  - Sign up → Onboarding (10 swipes) → Profile generated → Browse venues
- [ ] **Returning User Flow:**
  - Login → See existing profile → Browse/swipe → Shortlist
- [ ] **Search Flow:**
  - Apply filters → View results → Click venue → See details
- [ ] **Shortlist Flow:**
  - Save venues → View shortlist → Remove venue → Verify removed
- [ ] **Mobile Responsiveness:**
  - Test all features on mobile screen sizes
  - Verify touch gestures work

**Acceptance Criteria:**
- ✓ All core flows work without errors
- ✓ No console errors in browser
- ✓ API calls succeed
- ✓ Data persists correctly

---

### 10. Performance & UX Polish
**Priority:** MEDIUM
**Estimated Time:** 2-3 hours
**Status:** ❌ Not Started

**Tasks:**
- [ ] Add loading states for all API calls
- [ ] Add error boundaries for React errors
- [ ] Optimize image loading (lazy load, thumbnails)
- [ ] Add skeleton loaders
- [ ] Improve mobile gestures (swipe sensitivity)
- [ ] Add haptic feedback (mobile)
- [ ] Polish animations (smooth transitions)
- [ ] Add success/error toast notifications
- [ ] Test on slow network (throttle in DevTools)
- [ ] Accessibility audit (keyboard nav, ARIA labels)

**Acceptance Criteria:**
- ✓ Fast perceived performance
- ✓ No layout shifts
- ✓ Smooth animations
- ✓ Clear loading/error states
- ✓ Works on 3G network

---

## 📝 DOCUMENTATION & DEPLOYMENT

### 11. Update Documentation
**Priority:** LOW
**Estimated Time:** 1 hour
**Status:** ❌ Not Started

**Tasks:**
- [ ] Update README with:
  - Correct LA bounding box coordinates
  - Frontend setup instructions
  - Environment variables needed
  - Screenshots of UI
- [ ] Update CLAUDE.md with:
  - Frontend architecture notes
  - Component structure
  - Testing approach
- [ ] Create user guide (optional)
- [ ] API documentation (Swagger/Postman collection)

---

### 12. Production Deployment Prep
**Priority:** LOW
**Estimated Time:** 3-4 hours
**Status:** ❌ Not Started

**Tasks:**
- [ ] Environment variables audit
  - Create `.env.production` templates
  - Document required secrets (JWT_SECRET, etc.)
- [ ] Frontend build optimization
  - Tree shaking
  - Code splitting
  - Minification
- [ ] API production config
  - CORS production URLs
  - Rate limiting tuning
  - Logging setup
- [ ] Database backup strategy
- [ ] CI/CD pipeline (optional)
- [ ] Domain/hosting setup
- [ ] SSL certificates
- [ ] Monitoring/analytics setup

---

## 🎯 DEFINITION OF DONE (MVP Launch Ready)

### Must Be True:
- ✅ 200+ LA wedding venues in database
- ✅ All venue images have CLIP embeddings
- ✅ User can sign up and login
- ✅ Onboarding flow works (10 swipes → taste profile)
- ✅ Swipe interface works with gestures
- ✅ Taste profile displays 5 descriptive words
- ✅ Venues ranked by taste similarity
- ✅ Shortlist saves and displays correctly
- ✅ Search/filters work
- ✅ Mobile responsive
- ✅ No critical bugs in core flows
- ✅ All API endpoints tested and working
- ✅ Documentation updated

---

## 📊 PROGRESS TRACKER

| Category | Complete | In Progress | Not Started | Total |
|----------|----------|-------------|-------------|-------|
| **Data Collection** | 0 | 0 | 2 | 2 |
| **Frontend Core** | 0 | 0 | 6 | 6 |
| **Testing** | 0 | 0 | 2 | 2 |
| **Deployment** | 0 | 0 | 2 | 2 |
| **TOTAL** | **0** | **0** | **12** | **12** |

**Overall MVP Completion: 0% of remaining work**

---

## 🚀 RECOMMENDED WORK ORDER

### Week 1: Data & Core Features
1. **Day 1:** Task #1 (LA data collection) + Task #2 (Embeddings)
2. **Day 2-3:** Task #3 (Onboarding flow)
3. **Day 4-5:** Task #4 (Swipe interface)

### Week 2: UI Completion & Testing
4. **Day 1:** Task #5 (Taste profile display)
5. **Day 2:** Task #6 (Shortlist page)
6. **Day 3:** Task #7 (Search/filter)
7. **Day 4:** Task #8 (Venue details)
8. **Day 5:** Task #9 (E2E testing) + Task #10 (Polish)

### Week 3: Launch Prep
9. **Day 1-2:** Bug fixes from testing
10. **Day 3-4:** Task #11 (Docs) + Task #12 (Deployment)
11. **Day 5:** Final verification, soft launch

**Total Estimated Time: 2-3 weeks to MVP launch** 🎉

---

## 📞 BLOCKERS & QUESTIONS

### Current Blockers:
1. ❓ **LA Bounding Box:** Need verified coordinates (current README has SF coords)
2. ⏱️ **Data Collection:** 3-4 hour pipeline run needed
3. 💾 **Disk Space:** Check available space for venue images (~5-10GB estimated)

### Questions to Resolve:
- [ ] Confirm LA area boundaries for venue collection
- [ ] Design approval for swipe UI mockups?
- [ ] Hosting/deployment platform decision?
- [ ] Budget for production infrastructure?

---

**Next Step:** Start with Task #1 (LA data collection) - this is the critical path! 🚨
