# Wedding Venue Finder - MVP TODO

**Last Updated:** 2026-02-11
**Status:** Pipeline has critical bugs, Frontend partial, Data missing

---

## Phase 0: Fix Critical Pipeline Bugs

These must be fixed before any pipeline run. The pipeline will crash or silently lose data in its current state.

### 0.1 `image-downloader.ts` — Missing import + undefined variable (CRASH)
**File:** `src/utils/image-downloader.ts`
**Status:** :x: Not Started

**Bugs:**
- [ ] **Line 11:** `crypto.createHash('md5')` called but `crypto` is never imported — runtime crash
- [ ] **Line 27:** `targetPath` is used but never constructed. `targetFolder` and `filename` exist but are never joined into `targetPath` — runtime crash
- [ ] **Lines 29-30:** `catch` block does silent `return null` with no logging — errors are invisible

---

### 0.2 `stage_3_images.ts` — Missing `fs` import (CRASH)
**File:** `src/pipeline/stage_3_images.ts`
**Status:** :x: Not Started

**Bug:**
- [ ] **Line 46:** `fs.appendFileSync('image_errors.log', ...)` called but `fs` is never imported — runtime crash on any per-venue error

---

### 0.3 `stage_2_crawl.ts` — Never saves markdown + broken depth tracking (SILENT DATA LOSS)
**File:** `src/pipeline/stage_2_crawl.ts`
**Status:** :x: Not Started

**Bugs:**
- [ ] **No `.update()` call:** `aggregatedMarkdown` is built up but never written to the database. The entire crawl stage produces no output. All downstream stages (images, enrichment, filtering) will find zero records to process.
- [ ] **Line 97:** `queue.depth` is used but `queue` is an array — `.depth` is `undefined`, so child link depth is always `NaN`. The `depth > 3` guard on line 43 never triggers (`NaN > 3` is `false`), so crawling has no depth limit.

---

### 0.4 `logo-filter.ts` — Payload/query mismatch (BROKEN FILTERING)
**File:** `src/utils/logo-filter.ts`
**Status:** :x: Not Started

**Bug:**
- [ ] **Line 26:** Searches for a match containing `"photograph"` but the payload (line 15) only sends one text: `"a business logo, watermark, or text graphic"`. `.find()` returns `undefined`, so `photoScore` is `undefined` and `logoScore > photoScore` is always `false`. Stage 5 will never filter any logos.

**Fix options:**
- A) Add a second match text `"a photograph of a place or building"` to the payload
- B) Remove the comparison and just threshold on `logoScore` alone

---

### 0.5 `runPipeline.ts` — No abort on stage failure
**File:** `src/pipeline/runPipeline.ts`
**Status:** :x: Not Started

**Bug:**
- [ ] **Lines 5-11:** Loop continues executing stages after a failure. If Stage 2 crashes, Stages 3-5 still run on stale/empty data. Should check `res.success` and abort (or at least warn).

---

## Phase 1: Data Collection

### 1.1 Collect LA Venues
**Priority:** CRITICAL
**Status:** :x: Not Started
**Depends On:** Phase 0 (pipeline bugs fixed)

**Tasks:**
- [ ] Verify LA bounding box coordinates
  - West: ~-118.67, South: ~33.70, East: ~-117.65, North: ~34.34 (verify these)
- [ ] Run full pipeline for LA area
  ```bash
  npm run pipeline -- --bbox="<VERIFIED_LA_COORDS>" --tileDeg=0.02
  ```
- [ ] Monitor all 5 stages for errors
- [ ] Verify results in database
  ```sql
  SELECT COUNT(*) FROM venues WHERE is_wedding_venue = true;
  -- Target: 200+ venues
  ```
- [ ] Check error logs (`.crawl_errors.log`, `image_errors.log`, `filter_errors.log`)

**Acceptance Criteria:**
- 200+ LA wedding venues in database
- Each venue has 3+ non-logo images
- Venue data includes pricing, lodging, capacity info

---

### 1.2 Generate CLIP Embeddings
**Priority:** CRITICAL
**Status:** :x: Not Started
**Depends On:** 1.1

**Tasks:**
- [ ] Ensure CLIP service is running
  ```bash
  docker compose ps clip_api
  curl http://localhost:51000/
  ```
- [ ] Run embedding generation
  ```bash
  npm run generate:embeddings
  ```
- [ ] Verify embeddings in database
  ```sql
  SELECT COUNT(*) FROM venue_embeddings;
  ```

**Acceptance Criteria:**
- All venue images have VECTOR(512) embeddings
- Embeddings stored in `venue_embeddings` table

---

## Phase 2: Frontend Core

### 2.1 Onboarding Flow (10 Swipes)
**Priority:** HIGH
**Status:** :x: Not Started

**Tasks:**
- [ ] Create `Onboarding.tsx` page component
- [ ] Fetch 10 random venues from `/api/v1/taste-profile/onboarding`
- [ ] Display venue images in swipeable cards
- [ ] Add swipe gesture detection (left/right)
- [ ] Add progress indicator (1/10, 2/10, etc.)
- [ ] Track swipes in session state
- [ ] On 10th swipe, call `/api/v1/taste-profile/generate`
- [ ] Show loading state during profile generation
- [ ] Navigate to taste profile display on completion
- [ ] Add skip option

**Components to Create:**
- `pages/Onboarding.tsx`
- `components/OnboardingCard.tsx`
- `components/SwipeProgress.tsx`
- `hooks/useOnboarding.ts`

**Acceptance Criteria:**
- New users see onboarding on first login
- Can swipe left/right on 10 venues
- Profile generates after 10 swipes
- Handles errors gracefully

---

### 2.2 Swipe Interface (Main Browsing)
**Priority:** HIGH
**Status:** :x: Not Started

**Tasks:**
- [ ] Create `Swipe.tsx` page component
- [ ] Implement gesture-based swipe card stack (Tinder-style)
  - Swipe right = save to shortlist
  - Swipe left = skip
  - Undo last swipe (optional)
- [ ] Fetch venues with taste-based ranking from `/api/v1/venues`
- [ ] Display venue info on card (name, image, pricing, features)
- [ ] Call `/api/v1/swipes` on each swipe
- [ ] "Out of venues" state
- [ ] Image carousel within card

**Components to Create:**
- `pages/Swipe.tsx`
- `components/SwipeCard.tsx`
- `components/SwipeCardStack.tsx`
- `components/VenueCardInfo.tsx`
- `hooks/useSwipe.ts`

**Acceptance Criteria:**
- Smooth swipe animations
- Venues ranked by taste similarity
- Right swipes save to shortlist
- Works on mobile (touch gestures)

---

## Phase 3: Frontend Supporting

### 3.1 Taste Profile Display
**Priority:** HIGH
**Status:** :x: Not Started

**Tasks:**
- [ ] Create `TasteProfile.tsx` page component
- [ ] Fetch profile from `/api/v1/taste-profile`
- [ ] Display 5 descriptive words prominently
- [ ] Show confidence score (0.0-1.0) with visual indicator
- [ ] Add "Refine Profile" button (triggers 5 more swipes)
- [ ] Add "How it works" explanation modal

**Components to Create:**
- `pages/TasteProfile.tsx`
- `components/TasteProfileCard.tsx`
- `components/DescriptiveWords.tsx`
- `components/ConfidenceIndicator.tsx`

---

### 3.2 Shortlist Page
**Priority:** MEDIUM
**Status:** :x: Not Started

**Tasks:**
- [ ] Create `Shortlist.tsx` page component
- [ ] Fetch saved venues from `/api/v1/swipes/saved`
- [ ] Display as grid or list view
- [ ] Show venue cards with thumbnail, name, pricing, taste score
- [ ] Add "Unsave" action
- [ ] Click venue to see details
- [ ] Empty state with CTA to start swiping
- [ ] Sort options (by taste score, pricing, date saved)

**Components to Create:**
- `pages/Shortlist.tsx`
- `components/VenueGrid.tsx`
- `components/VenueCard.tsx`
- `components/ShortlistEmpty.tsx`

---

### 3.3 Search & Filter UI
**Priority:** MEDIUM
**Status:** Partial (components exist, needs integration)

**Tasks:**
- [ ] Review existing `Search.tsx` and `SearchFilters.tsx`
- [ ] Connect to `/api/v1/venues` endpoint
- [ ] Implement filters (pricing tier, has lodging, is estate, is historic, location, radius)
- [ ] Add sorting dropdown (taste score, pricing, distance)
- [ ] Pagination or infinite scroll
- [ ] Update URL with filter params

**Components to Verify/Update:**
- `pages/Search.tsx`
- `components/SearchFilters.tsx`
- `components/VenueGrid.tsx`
- `hooks/useVenueSearch.ts`

---

### 3.4 Venue Detail Page
**Priority:** MEDIUM
**Status:** :x: Not Started

**Tasks:**
- [ ] Create `VenueDetail.tsx` page component
- [ ] Fetch venue by ID from `/api/v1/venues/:id`
- [ ] Display: image gallery, name, website, pricing, capacity, lodging, map, taste score
- [ ] Add "Save to Shortlist" button
- [ ] Related venues (similar taste)

**Components to Create:**
- `pages/VenueDetail.tsx`
- `components/ImageGallery.tsx`
- `components/VenueInfo.tsx`

---

## Phase 4: Technical Debt & Polish

### 4.1 Hardcoded Service URLs
**Priority:** MEDIUM
**Status:** :x: Not Started

**Files:**
- [ ] `src/pipeline/stage_2_crawl.ts:48` — hardcoded `http://127.0.0.1:11235/crawl`
- [ ] `src/pipeline/stage_4_enrichment.ts:9` — hardcoded `http://localhost:11434`
- [ ] `src/utils/logo-filter.ts:5` — hardcoded `http://clip_service:51000/rank`

**Fix:** Extract to environment variables or a shared config.

---

### 4.2 Frontend API Client — Token Field Mismatch
**File:** `frontend/src/utils/api-client.ts:85`
**Status:** :x: Not Started

**Bug:**
- [ ] Sends `refresh_token` (snake_case) but backend auth schema may expect `refreshToken` (camelCase). Verify backend contract and align.

---

### 4.3 Inconsistent API Error Response Shapes
**Status:** :x: Not Started

- [ ] Audit error responses across controllers — some return `{ error: string }`, others return `{ message: string }` or raw strings
- [ ] Standardize on a single error response shape

---

### 4.4 No Structured Logging
**Status:** :x: Not Started

- [ ] 25+ files use raw `console.log` — no log levels, no timestamps, no structured output
- [ ] Consider a lightweight logger (e.g., `pino` or `winston`)

---

### 4.5 Error Log File Accumulation
**Status:** :x: Not Started

- [ ] `.crawl_errors.log`, `image_errors.log`, `filter_errors.log` accumulate indefinitely
- [ ] Add log rotation or timestamped filenames

---

### 4.6 Performance & UX Polish
**Priority:** MEDIUM
**Status:** :x: Not Started

**Tasks:**
- [ ] Add loading states for all API calls
- [ ] Add error boundaries for React errors
- [ ] Optimize image loading (lazy load, thumbnails)
- [ ] Add skeleton loaders
- [ ] Polish animations (smooth transitions)
- [ ] Add success/error toast notifications
- [ ] Accessibility audit (keyboard nav, ARIA labels)

---

## Phase 5: Testing, Documentation & Deployment

### 5.1 End-to-End User Flow Testing
**Priority:** HIGH
**Status:** :x: Not Started
**Depends On:** Phases 2-3

**Test Cases:**
- [ ] New User: Sign up -> Onboarding (10 swipes) -> Profile generated -> Browse venues
- [ ] Returning User: Login -> Existing profile -> Browse/swipe -> Shortlist
- [ ] Search: Apply filters -> View results -> Click venue -> Details
- [ ] Shortlist: Save venues -> View shortlist -> Remove venue -> Verify removed
- [ ] Mobile: All features on mobile screen sizes, touch gestures work

---

### 5.2 Update Documentation
**Priority:** LOW
**Status:** :x: Not Started

- [ ] Update README with correct LA bounding box, frontend setup, environment variables
- [ ] Update CLAUDE.md with frontend architecture notes
- [ ] API documentation (Swagger/Postman collection)

---

### 5.3 Production Deployment Prep
**Priority:** LOW
**Status:** :x: Not Started

- [ ] Environment variables audit, `.env.production` templates
- [ ] Frontend build optimization (tree shaking, code splitting)
- [ ] API production config (CORS, rate limiting, logging)
- [ ] Database backup strategy
- [ ] Domain/hosting setup, SSL certificates

---

## Definition of Done (MVP Launch Ready)

### Must Be True:
- [ ] All Phase 0 pipeline bugs fixed and verified
- [ ] 200+ LA wedding venues in database
- [ ] All venue images have CLIP embeddings
- [ ] User can sign up and login
- [ ] Onboarding flow works (10 swipes -> taste profile)
- [ ] Swipe interface works with gestures
- [ ] Taste profile displays 5 descriptive words
- [ ] Venues ranked by taste similarity
- [ ] Shortlist saves and displays correctly
- [ ] Search/filters work
- [ ] Mobile responsive
- [ ] No critical bugs in core flows

---

## Progress Tracker

| Phase | Complete | In Progress | Not Started | Total |
|-------|----------|-------------|-------------|-------|
| **0: Pipeline Bugs** | 0 | 0 | 5 | 5 |
| **1: Data Collection** | 0 | 0 | 2 | 2 |
| **2: Frontend Core** | 0 | 0 | 2 | 2 |
| **3: Frontend Supporting** | 0 | 0 | 4 | 4 |
| **4: Tech Debt** | 0 | 0 | 6 | 6 |
| **5: Testing/Docs/Deploy** | 0 | 0 | 3 | 3 |
| **TOTAL** | **0** | **0** | **22** | **22** |

---

## Blockers & Questions

### Current Blockers:
1. **Pipeline bugs (Phase 0)** — Must fix before any data collection
2. **LA Bounding Box** — Need verified coordinates
3. **Disk Space** — Check available space for venue images (~5-10GB estimated)

### Questions to Resolve:
- [ ] Confirm LA area boundaries for venue collection
- [ ] Logo filter fix: add second CLIP text, or threshold-only? (see 0.4)
- [ ] Hosting/deployment platform decision?

---

**Next Step:** Fix Phase 0 bugs — start with `image-downloader.ts` (0.1) since it blocks Stage 3.
