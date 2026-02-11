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

### 0.6 Wrong import path in pipeline stages (COMPILE ERROR)
**Files:** `src/pipeline/stage_4_enrichment.ts`, `src/pipeline/stage_5_image_filter.ts`
**Status:** :x: Not Started

**Bug:**
- [ ] **`stage_4_enrichment.ts` Line 4:** `import { PipelineCtx, StageResult } from './types'` — file `./types` does not exist. Should be `'./stages'` (where `PipelineCtx` and `StageResult` are defined). Stage 4 will not compile.
- [ ] **`stage_5_image_filter.ts` Line 4:** Same wrong `'./types'` import path. Stage 5 will not compile either.

---

### 0.7 `stage_4_enrichment.ts` — `extractionResult` silent failure on Ollama errors
**File:** `src/pipeline/stage_4_enrichment.ts`
**Status:** :x: Not Started

**Issue:**
- [ ] **Lines ~68-119:** `extractionResult` is initialized to `{ success: false }` before the retry `while` loop. If all Ollama retries throw, it stays `{ success: false }` and the DB update is silently skipped — no crash, but no logging of which venues failed enrichment. Consider adding a warning log when all retries are exhausted.

---

### 0.8 `stages.ts` — `delayMx` typo breaks Overpass rate limiting
**File:** `src/pipeline/stages.ts`
**Status:** :x: Not Started

**Bug:**
- [ ] **Line 19:** Type defines `delayMx?: number` but `stage_1_collect.ts:53` reads `ctx.overpass.delayMs`. The typo means the configured delay is never read, so Overpass requests have no delay between them. Risks IP bans from public Overpass endpoints.

**Fix:** Rename `delayMx` to `delayMs` in `stages.ts`.

---

### 0.9 `stage_5_image_filter.ts` — WHERE clause commented out (INEFFICIENT)
**File:** `src/pipeline/stage_5_image_filter.ts`
**Status:** :x: Not Started

**Bug:**
- [ ] **Lines 11-13:** The `.whereNotNull('image_data')` and `.whereRaw("(image_data->>'clip_logo_verified')::boolean IS DISTINCT FROM TRUE")` clauses are commented out. Stage 5 fetches and reprocesses ALL venues every run instead of only unverified ones.

**Fix:** Uncomment the WHERE clause, or remove the dead code if reprocessing-all is intentional.

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
**Status:** :construction: Partial (UI exists, needs E2E testing with live API)

**Done:**
- [x] Create `Onboarding.tsx` page component
- [x] Fetch 10 random venues from `/api/v1/taste-profile/onboarding`
- [x] Display venue images in swipeable cards
- [x] Add swipe gesture detection (left/right)
- [x] Add progress indicator (1/10, 2/10, etc.) — `components/swipe/ProgressDots.tsx`
- [x] Track swipes in session state — `hooks/useOnboarding.ts`
- [x] On 10th swipe, call `/api/v1/taste-profile/generate`
- [x] Show loading state during profile generation
- [x] Navigate to taste profile display on completion

**Remaining:**
- [ ] Add skip option
- [ ] E2E test with live backend API
- [ ] Swipe recording is fire-and-forget — no user feedback if POST fails
- [ ] No retry mechanism if profile generation fails (only shows error + reload)

**Acceptance Criteria:**
- New users see onboarding on first login
- Can swipe left/right on 10 venues
- Profile generates after 10 swipes
- Handles errors gracefully

---

### 2.2 Swipe Interface (Main Browsing)
**Priority:** HIGH
**Status:** :construction: Partial (UI exists, needs E2E testing with live API)

**Done:**
- [x] Create `Swipe.tsx` page component
- [x] Implement gesture-based swipe card stack (Tinder-style) — `components/swipe/SwipeCard.tsx`, `SwipeCardStack.tsx`
  - Swipe right = save to shortlist
  - Swipe left = skip
- [x] Fetch venues with taste-based ranking — `hooks/useSwipeDeck.ts` (batch prefetch)
- [x] Display venue info on card (name, image, pricing, features)
- [x] Call `/api/v1/swipes` on each swipe
- [x] "Out of venues" state

**Remaining:**
- [ ] Undo last swipe
- [ ] Image carousel within card (single image only currently)
- [ ] E2E test with live backend API
- [ ] Swipe recording is fire-and-forget — no user feedback if POST fails
- [ ] If initial batch fetch returns 0 items, deck is permanently marked exhausted (no retry)

**:warning: DECIDE BEFORE BUILDING FURTHER:** `feat/swipe-interface` branch has an alternative implementation (1 commit ahead, 32 behind main) with `ImageCarousel.tsx`, `VenueDetailModal.tsx`, and a different `useSwipe.ts` hook. Main already has a different working swipe implementation. Pick one before building on top of either — do not build on both.

**Acceptance Criteria:**
- Smooth swipe animations
- Venues ranked by taste similarity
- Right swipes save to shortlist
- Works on mobile (touch gestures)

---

## Phase 3: Frontend Supporting

### 3.1 Taste Profile Display
**Priority:** HIGH
**Status:** :construction: Partial (card component exists, embedded in Profile page)

**Done:**
- [x] Create taste profile display — `components/TasteProfileCard.tsx` (embedded in `pages/Profile.tsx`, not standalone page)
- [x] Fetch profile from `/api/v1/taste-profile` — `hooks/useTasteProfile.ts`
- [x] Display 5 descriptive words prominently
- [x] Show confidence score (0.0-1.0) with color-coded bar

**Remaining:**
- [ ] Add "Refine Profile" button (triggers 5 more swipes)
- [ ] Add "How it works" explanation modal
- [ ] Standalone `TasteProfile.tsx` page (currently only shown via Profile page)

---

### 3.2 Shortlist Page
**Priority:** MEDIUM
**Status:** :construction: Partial (page and grid exist, needs polish)

**Done:**
- [x] Create `Shortlist.tsx` page component
- [x] Fetch saved venues from `/api/v1/swipes/saved` — `hooks/useShortlist.ts`
- [x] Display as grid view — `components/VenueGrid.tsx`
- [x] Show venue cards with thumbnail, name, pricing, taste score
- [x] Add "Unsave" action (optimistic removal)
- [x] Sort options (by date saved, pricing, name) — client-side sorting

**Remaining:**
- [ ] Click venue to navigate to detail page
- [ ] Empty state with CTA to start swiping (currently shows generic empty message)
- [ ] Optimistic unsave has no rollback — if POST fails, venue disappears from UI permanently
- [ ] List view toggle (grid only currently)
- [ ] Sort by taste score (not wired up yet)

---

### 3.3 Search & Filter UI
**Priority:** MEDIUM
**Status:** :construction: Partial (full UI exists, has a critical bug — see 4.7)

**Done:**
- [x] `Search.tsx` page with sidebar filters + mobile drawer
- [x] Connected to `/api/v1/venues` endpoint — `hooks/useVenueSearch.ts`
- [x] Implement filters (pricing tier, has lodging, is estate, is historic, location, radius)
- [x] Add sorting dropdown (taste score, pricing, distance) — `components/SortDropdown.tsx`
- [x] Pagination with page controls
- [x] Update URL with filter params (bidirectional URL sync)
- [x] Location search via Nominatim geocoding + browser geolocation

**Remaining:**
- [ ] **Bug:** `useVenueSearch.ts` uses raw `axios` instead of `apiClient` — token refresh won't work (see 4.7)
- [ ] Nominatim free geocoding has rate limits, no backoff — will fail under moderate traffic
- [ ] Radius slider updates filters on every change (no debounce) — could cause many API calls
- [ ] E2E test with live backend API

---

### 3.4 Venue Detail Page
**Priority:** MEDIUM
**Status:** :construction: Partial (page exists with most features)

**Done:**
- [x] Create `VenueDetail.tsx` page component
- [x] Fetch venue by ID from `/api/v1/venues/:id` — `hooks/useVenueDetail.ts`
- [x] Display: image gallery, name, website, pricing, capacity, lodging, map, taste score
- [x] `components/ImageGallery.tsx` (carousel with thumbnails)
- [x] `components/VenueMap.tsx` (Leaflet with CircleMarker)
- [x] Add "Save to Shortlist" button (with 409 conflict handling)
- [x] Collapsible raw markdown viewer

**Remaining:**
- [ ] Related venues (similar taste) section
- [ ] Save/unsave failure is silent — user doesn't know if action succeeded
- [ ] `isSaved` state is local only — doesn't sync if unsaved via Shortlist page

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

### 4.2 Frontend API Client — Token Field Naming
**File:** `frontend/src/utils/api-client.ts:84-88`
**Status:** :x: Not Started

**Issue:**
- [ ] Sends `{ refreshToken }` (camelCase) to `/auth/refresh`. Verify this matches backend auth controller's expected field name. Also expects `response.data.data.accessToken` — verify this nested response shape.

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

### 4.7 `useVenueSearch.ts` — Bypasses apiClient (BROKEN TOKEN REFRESH)
**Priority:** HIGH
**File:** `frontend/src/hooks/useVenueSearch.ts`
**Status:** :x: Not Started

**Bug:**
- [ ] Uses raw `axios` import with manual `Authorization` header instead of the shared `apiClient` instance. This means the 401 token refresh interceptor in `api-client.ts` is completely bypassed. When the access token expires, search will silently fail with 401 errors.

**Fix:** Replace `import axios from 'axios'` with `import apiClient from '../utils/api-client'` and remove the manual `Authorization` header logic.

---

### 4.8 Frontend Dead Code & Boilerplate Cleanup
**Priority:** LOW
**File:** Multiple
**Status:** :x: Not Started

**Tasks:**
- [ ] Delete `frontend/src/App.tsx` — the original NDJSON prototype, no longer used (router mounts pages directly)
- [ ] Delete `frontend/src/App.css` — only styled the old App.tsx, completely unused
- [ ] Fix `frontend/src/index.css` — global styles set dark background (`#242424`) but all components render light/white. Remove or align the dark theme defaults
- [ ] Fix `frontend/index.html` — title is generic "frontend", no favicon, no meta tags

---

### 4.9 Duplicate `API_BASE_URL` Definitions
**Priority:** MEDIUM
**Status:** :x: Not Started

**Files:**
- [ ] `frontend/src/utils/api-client.ts:4` — `import.meta.env.VITE_API_URL || 'http://localhost:3003/api/v1'`
- [ ] `frontend/src/hooks/useVenueSearch.ts:6` — duplicated definition
- [ ] `frontend/src/utils/image-url.ts` — duplicated definition

**Fix:** Extract to a single `frontend/src/constants.ts` and import everywhere.

---

### 4.10 All Frontend Styling Inline — No Design Tokens
**Priority:** MEDIUM
**Status:** :x: Not Started

**Issue:**
- All styling is `style={{}}` objects with hardcoded colors, spacing, and sizes across 15+ files
- Common colors repeated everywhere: `#2563eb` (blue), `#6b7280` (gray), `#111827` (dark), `#22c55e` (green), `#ef4444` (red)
- Makes visual consistency, dark mode, and accessibility improvements very difficult

**Fix:** Extract to CSS custom properties in `index.css` or a `tokens.css` file. Not blocking for MVP but reduces maintenance burden.

---

### 4.11 Stale Feature Branch Cleanup
**Priority:** LOW
**Status:** :x: Not Started

**Branches with no unique commits (can be deleted):**
- [ ] `feat/frontend-auth` — 0 ahead, 31 behind main
- [ ] `feat/search-ui` — already merged via PR #8, 0 ahead, 15 behind main
- [ ] `feat/taste-profile-ui` — 0 ahead, 32 behind main (created but never committed to)

**Branch with unmerged work:**
- [ ] `feat/swipe-interface` — 1 commit ahead, 32 behind main. Has alternative swipe implementation. Decide: rebase + PR, or discard in favor of current main implementation.

---

### 4.12 `swipe.service.ts` — Fire-and-forget taste profile update
**Priority:** MEDIUM
**File:** `src/api/services/swipe.service.ts`
**Status:** :x: Not Started

**Bug:**
- [ ] **Lines 110-112:** `updateProfile(userId).catch(err => { console.error(...) })` — no `await`, errors only go to console. If profile update fails, the user's taste profile silently becomes stale with no visibility.

**Fix:** Either `await` the call and handle the error, or add structured logging + a retry queue.

---

### 4.13 `venue.service.ts` — Missing null checks on image data
**Priority:** MEDIUM
**File:** `src/api/services/venue.service.ts`
**Status:** :x: Not Started

**Bug:**
- [ ] **Lines ~164-196:** Accesses `imageData.local_paths` without checking if `imageData` is null/undefined. Will throw on venues with no images.

**Fix:** Add optional chaining or null guard before accessing `local_paths`.

---

### 4.14 `docker-compose.yml` — Insecure JWT_SECRET default
**Priority:** HIGH
**File:** `docker-compose.yml`
**Status:** :x: Not Started

**Bug:**
- [ ] `JWT_SECRET=${JWT_SECRET:-your-secret-key-here-change-in-production}` — default secret is publicly visible in the repo. If `.env` is missing or incomplete, the API runs with a known secret.

**Fix:** Remove the default value. Fail fast if `JWT_SECRET` is not set.

---

### 4.15 No request logging middleware on API
**Priority:** MEDIUM
**Status:** :x: Not Started

**Issue:**
- [ ] No request logging — all API requests are invisible. No way to debug issues, monitor traffic, or detect abuse in production.

**Fix:** Add a lightweight request logger middleware (e.g., `morgan` or a custom one with `pino`).

---

### 4.16 CORS hardcoded to localhost
**Priority:** MEDIUM
**File:** `src/api/server.ts`
**Status:** :x: Not Started

**Bug:**
- [ ] **Line ~36:** CORS origin hardcoded to `http://localhost:5173`. Will block all cross-origin requests in production.

**Fix:** Read from `FRONTEND_URL` environment variable with localhost as dev fallback.

---

## Phase 5: Testing, Documentation & Deployment

### 5.1 Frontend Test Infrastructure
**Priority:** HIGH
**Status:** :x: Not Started

**Issue:** Zero test files exist for the frontend. No test framework is configured in `frontend/package.json`.

**Tasks:**
- [ ] Add Vitest + React Testing Library to frontend `devDependencies`
- [ ] Add `vitest.config.ts` in `frontend/`
- [ ] Write unit tests for `api-client.ts` token refresh logic (most complex utility)
- [ ] Write unit tests for `useOnboarding` and `useSwipeDeck` hooks (complex state machines)
- [ ] Write integration test for auth flow (login -> protected route -> token refresh)

---

### 5.2 End-to-End User Flow Testing
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

### 5.3 Update Documentation
**Priority:** LOW
**Status:** :x: Not Started

- [ ] Update README with correct LA bounding box, frontend setup, environment variables
- [ ] Update CLAUDE.md with frontend architecture notes
- [ ] API documentation (Swagger/Postman collection)

---

### 5.4 Production Deployment Prep
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

| Phase | Complete | Partial | Not Started | Total |
|-------|----------|---------|-------------|-------|
| **0: Pipeline Bugs** | 0 | 0 | 9 | 9 |
| **1: Data Collection** | 0 | 0 | 2 | 2 |
| **2: Frontend Core** | 0 | 2 | 0 | 2 |
| **3: Frontend Supporting** | 0 | 4 | 0 | 4 |
| **4: Tech Debt** | 0 | 0 | 16 | 16 |
| **5: Testing/Docs/Deploy** | 0 | 0 | 4 | 4 |
| **TOTAL** | **0** | **6** | **31** | **37** |

---

## Blockers & Questions

### Current Blockers:
1. **Pipeline bugs (Phase 0)** — Must fix before any data collection
2. **LA Bounding Box** — Need verified coordinates
3. **Disk Space** — Check available space for venue images (~5-10GB estimated)
4. **`useVenueSearch` bypasses `apiClient`** (4.7) — Search page will silently break when tokens expire. Quick fix needed before any user testing.

### Questions to Resolve:
- [ ] Confirm LA area boundaries for venue collection
- [ ] Logo filter fix: add second CLIP text, or threshold-only? (see 0.4)
- [ ] Hosting/deployment platform decision?
- [ ] `feat/swipe-interface` branch: rebase + PR the alternative swipe implementation, or discard?
- [ ] Clean up 3 stale feature branches? (see 4.11)

---

**Next Step:** Fix Phase 0 bugs — start with `image-downloader.ts` (0.1) since it blocks Stage 3.
**Quick frontend win:** Fix `useVenueSearch.ts` to use `apiClient` (4.7) — 1-line import change.
