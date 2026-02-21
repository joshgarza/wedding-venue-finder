# Wedding Venue Finder - MVP TODO

**Last Updated:** 2026-02-19
**Status:** Pipeline ready (1 minor bug remains), Frontend partial, Data missing, Docker isolation complete

---

## Phase 0: Fix Critical Pipeline Bugs

~~Must fix before any pipeline run.~~ All critical bugs fixed. Only 0.9 remains (inefficiency, non-blocking).

### 0.1 `image-downloader.ts` — ~~Missing import + undefined variable~~
**File:** `src/utils/image-downloader.ts`
**Status:** :white_check_mark: Fixed

All three bugs resolved: `crypto` imported (L1), `targetPath` constructed via `path.join()` (L14), catch block logs with `console.error` (L32).

---

### 0.2 `stage_3_images.ts` — ~~Missing `fs` import~~
**File:** `src/pipeline/stage_3_images.ts`
**Status:** :white_check_mark: Fixed

`fs` is imported on line 1.

---

### 0.3 `stage_2_crawl.ts` — ~~Never saves markdown + broken depth tracking~~
**File:** `src/pipeline/stage_2_crawl.ts`
**Status:** :white_check_mark: Fixed

`.update()` call exists (L113-116) and writes `aggregatedMarkdown` to `raw_markdown`. Queue uses objects with `.depth` property (L32), depth guard works correctly on `item.depth` (L44).

---

### 0.4 `logo-filter.ts` — ~~Payload/query mismatch~~
**File:** `src/utils/logo-filter.ts`
**Status:** :white_check_mark: Fixed (minor fragility remains)

Payload now includes both texts: `"a business logo, watermark, or text graphic"` and `"a photograph of a place or building"`. The `.find()` calls on L26-27 work correctly but lack optional chaining — would crash if CLIP returns an unexpected response shape. Low risk on happy path.

---

### 0.5 `runPipeline.ts` — ~~No abort on stage failure~~
**File:** `src/pipeline/runPipeline.ts`
**Status:** :white_check_mark: Fixed

Checks `res.success` (L13) and throws to abort pipeline. Catch block re-throws, preventing downstream stages from running on failed data.

---

### 0.6 ~~Wrong import path in pipeline stages~~
**Files:** `src/pipeline/stage_4_enrichment.ts`, `src/pipeline/stage_5_image_filter.ts`
**Status:** :white_check_mark: Fixed (PR #13)

Changed `'./types'` to `'./stages'` in both files.

---

### 0.7 `stage_4_enrichment.ts` — `extractionResult` silent failure on Ollama errors (LOW RISK)
**File:** `src/pipeline/stage_4_enrichment.ts`
**Status:** :warning: Low Risk — masked by initialization

**Original report:** `extractionResult` out of scope after loop.
**Actual state:** Variable is initialized on L68 as `{ success: false }`, so the post-loop check on L111 (`if (extractionResult.success && extractionResult.data)`) safely evaluates to `false` on failure. Control flow is messy (nested try-catch) but functionally correct. Consider adding a warning log when all retries are exhausted.

---

### 0.8 ~~`stages.ts` — `delayMx` typo breaks Overpass rate limiting~~
**File:** `src/pipeline/stages.ts`
**Status:** :white_check_mark: Fixed (PR #13)

Renamed `delayMx` to `delayMs` on line 19.

---

### 0.9 `stage_5_image_filter.ts` — WHERE clause commented out (INEFFICIENT)
**File:** `src/pipeline/stage_5_image_filter.ts`
**Status:** :x: Not Started — **Non-blocking, but wasteful on re-runs**

**Bug:**
- [ ] **Lines 12-13:** `.whereNotNull('image_data')` and `.whereRaw(...)` clauses are commented out. Stage 5 fetches and reprocesses ALL venues every run.

**Fix:** Uncomment the WHERE clause.

---

## Phase 1: Data Collection

### 1.1 Collect LA Venues
**Priority:** CRITICAL
**Status:** :x: Not Started
**Depends On:** ~~Phase 0 bugs 0.6 and 0.8 fixed~~ Unblocked (fixed in PR #13)

**Prerequisites verified:**
- LA bounding box: `-118.67,33.70,-117.65,34.34` (covers downtown LA, Santa Monica, Long Beach, Pasadena, San Gabriel Valley)
- BBox format: `"minLon,minLat,maxLon,maxLat"`
- Docker services needed: `db`, `crawler`, `ollama`, `clip_api`
- Pipeline runs 6 stages: Collect → Pre-Vetting → Crawl → Images → Enrichment → Image Filter

**Tasks:**
- [x] Fix Phase 0 bugs 0.6 and 0.8 (PR #13, merged)
- [ ] Start Docker services: `docker compose up -d db crawler ollama clip_api`
- [ ] Verify services: `docker compose ps`, `curl http://localhost:11434/api/tags`, `curl http://localhost:51000/`
- [ ] Run migrations: `npm run migrate:latest`
- [ ] Run pipeline:
  ```bash
  npm run pipeline -- --bbox="-118.67,33.70,-117.65,34.34" --tileDeg=0.01
  ```
- [ ] Monitor all 6 stages for errors
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

### 1.1a Re-run Enrichment on Crawled Venues
**Priority:** CRITICAL
**Status:** :x: Not Started
**Depends On:** 1.1 (crawl + images complete)

**Context:** As of 2026-02-21, Stages 1-3 are complete: 309 venues have markdown, 359 have images (43,984 files, 7.8 GB). However, Stage 4 (Enrichment) was originally run **before** crawling, so the LLM only had OSM name/tags to work with. Result: only 60 venues are marked `is_wedding_venue = true`. The 299 newly crawled venues (all pre-vetted "yes") still show `is_wedding_venue = false` because the LLM couldn't confirm without website content. These venues won't appear in the frontend until enrichment is re-run.

**Model change — MUST DO BEFORE RUNNING:**
- **Do NOT use `phi3`** — it is a weak model for structured JSON extraction tasks
- **Pull `qwen2.5:7b`** (Qwen 2.5 was explicitly trained for structured JSON output):
  ```bash
  docker compose exec ollama ollama pull qwen2.5:7b
  ```
- **Update `.env`:**
  ```
  OLLAMA_MODEL=qwen2.5:7b
  ```
- **Hardware note:** GTX 1070 Ti with 8 GB VRAM. The `qwen2.5:7b` Q4_K_M quantization (4.7 GB) fits but is tight. If inference is very slow (VRAM spill to RAM), fall back to `qwen2.5:3b` which runs comfortably at ~2.5 GB. Both share the same JSON-focused training improvements.
- `gemma2:9b` was also considered but requires ~6.8 GB VRAM — too large for this GPU.

**Tasks:**
- [ ] Pull the new model (see above)
- [ ] Update `OLLAMA_MODEL` in `.env` (and `wedding-venue-finder-shared/.env` template)
- [ ] Run enrichment stage:
  ```bash
  npm run pipeline -- --stage=enrichment
  ```
- [ ] Verify results:
  ```sql
  SELECT COUNT(*) FROM venues WHERE is_wedding_venue = true;
  -- Expect: significantly more than 60 (most of the 309 crawled venues should now be classified)
  ```
- [ ] Confirm venues appear in frontend at `localhost:5174`

**Why this works:** The enrichment stage filters on `whereNotNull('raw_markdown').where('lodging_capacity', 0)`, which matches all 299 newly crawled venues that need re-classification.

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
- [ ] `HowItWorksModal.tsx` — Missing `role="dialog"`, `aria-modal="true"`, `aria-label` on close button, and Escape key handler. Will fail axe-core accessibility tests. *(from PR #17 review)*
- [ ] `VenueDetail.tsx` — `useEffect` depends on `[venue]` object reference instead of `venue?.venue_id`, causing related venues fetch to re-fire on every re-render. Change dependency to `venue?.venue_id`. *(from PR #17 review)*
- [ ] `useVenueDetail.ts` — Fetches entire `/swipes/saved` list just to check if one venue is saved. Add a backend `GET /api/v1/swipes/:venueId/status` endpoint to check a single venue's saved state. *(from PR #17 review)*

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
- [ ] `frontend/src/hooks/useVenueSearch.ts:6` — `http://localhost:3003` (no `/api/v1` prefix — different from the others)
- [ ] `frontend/src/utils/image-url.ts` — `http://localhost:3003/api/v1`

**Note:** `useVenueSearch.ts` uses a different base URL (no `/api/v1` suffix). Consolidation must account for this or search requests will break.

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

### ~~4.13 `venue.service.ts` — Missing null checks on image data~~
**Status:** Removed — code already uses optional chaining and `if` guards. No bug exists.

---

### 4.18 Seed Data Leaks Into Live Venue Results
**Priority:** HIGH
**Status:** :x: Not Started

**Bug:** Seed venues (50 dummy venues from `bin/seed.ts`) appear alongside real pipeline-discovered venues in API results. Seed venues share photos from a pool of only 50 picsum IDs, causing duplicate images across venues. There is no mechanism to distinguish seed data from live data.

**Root Cause:**
- `bin/seed.ts` creates 50 venues with `osm_id: "node/seed_1"` through `"node/seed_50"`, but this is just a naming convention — no `is_seed` column exists
- Seed venues are created with `pre_vetting_status: 'yes'`, `is_wedding_venue: true`, `is_active: true` — matching all production filters
- `venue.service.ts:searchVenues()` filters only by `is_active` and `is_wedding_venue`, so seed data is served to users
- 150-250 image draws from a pool of 50 guarantees photo collisions across seed venues

**Fix (recommended):**
1. Add `is_seed BOOLEAN DEFAULT false` column to `venues` via migration
2. Update `bin/seed.ts` to set `is_seed: true` on seeded venues
3. Filter `WHERE is_seed = false` in `venue.service.ts` search queries

**Details:** See `PHOTO_FINDINGS.md` for full investigation, SQL verification queries, and alternative fix options.

**Key Files:**
| File | Role |
|------|------|
| `bin/seed.ts` | Creates 50 dummy venues with picsum photos |
| `src/api/services/venue.service.ts` | Venue search API (no seed filtering) |

---

### 4.14 `docker-compose.yml` — Insecure JWT_SECRET default
**Priority:** HIGH
**File:** `docker-compose.yml`, `docker-compose.worktree.yml`
**Status:** :x: Not Started

**Bug:**
- [ ] `JWT_SECRET=${JWT_SECRET:-your-secret-key-here-change-in-production}` — default secret is publicly visible in the repo. If `.env` is missing or incomplete, the API runs with a known secret.
- [ ] Same pattern exists in `docker-compose.worktree.yml` (inherited during Docker isolation work)

**Fix:** Remove the default value. Fail fast if `JWT_SECRET` is not set.

---

### 4.15 No request logging middleware on API
**Priority:** MEDIUM
**Status:** :x: Not Started

**Issue:**
- [ ] No request logging — all API requests are invisible. No way to debug issues, monitor traffic, or detect abuse in production.

**Fix:** Add a lightweight request logger middleware (e.g., `morgan` or a custom one with `pino`).

---

### ~~4.16 CORS hardcoded to localhost~~
**Status:** Removed — `server.ts` already reads `process.env.FRONTEND_URL` with localhost as dev fallback. No bug exists.

---

### 4.17 Docker Container Isolation for Worktrees
**Priority:** HIGH
**Status:** :white_check_mark: Complete (PRs #23, #24)

**Problem:** Agents repeatedly tore down the shared `main` Docker stack when modifying services, and defaulted to working off `main` instead of feature worktrees. No isolation between worktree Docker environments.

**Implemented:**
- [x] `protect-docker.sh` — PreToolUse hook blocks destructive `docker compose` commands on main branch
- [x] `docker-compose.worktree.yml` — Per-worktree compose template (db, api, frontend) with auto-allocated ports
- [x] `docker.sh` — Convenience wrapper generated per-worktree by `create-worktree.sh`
- [x] `.env.docker` — Per-worktree port config generated by `create-worktree.sh`
- [x] `rebuild-main.sh` — Smart rebuild of main stack based on changed files (hub directory)
- [x] `create-worktree.sh` — Updated with port allocation (+10 offset), Docker file generation, `.env` DB_PORT patching
- [x] `remove-worktree.sh` — Updated with Docker teardown before removal, infra change detection
- [x] `check-worktrees.sh` — Updated to validate `.env.docker` and `docker.sh` for non-main worktrees
- [x] CLAUDE.md — Docker Protection critical rules + Docker with Worktrees section
- [x] Hub CLAUDE.md — Docker Isolation section + updated merge workflow

**Port scheme:** main=5433/3003/5174, each worktree +10 offset. GPU services shared via `main_venue_network`.

---

### 4.19 Two-Pass Crawl — Lightweight Fetch with crawl4ai Fallback
**Priority:** MEDIUM
**Status:** :x: Not Started
**Affects:** `src/pipeline/stage_2_crawl.ts`, new `src/utils/page-fetcher.ts`

**Problem:** Stage 2 uses crawl4ai (Playwright headless browser, 1GB shared memory) for every page in the BFS — ~111 browser renders per venue. Most wedding venue sites are server-rendered and don't need a headless browser.

**Solution:** Two-pass approach: try lightweight `axios` GET + `turndown` HTML-to-markdown first, fall back to crawl4ai only when SPA detected (per-venue decision on homepage). Expected 70-85% of venues handled by lightweight pass, 3-10x faster.

**Full design:** See [`docs/TWO_PASS_CRAWL_PLAN.md`](docs/TWO_PASS_CRAWL_PLAN.md) for architecture, SPA detection heuristic, code snippets, edge cases, and testing strategy.

**New deps:** `turndown` + `@types/turndown`

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
**Status:** :construction: Partial

- [x] README rewritten for clarity and brevity — cut from 707 to 134 lines, removed emojis (PR #23)
- [x] CLAUDE.md updated with Docker Protection rules and Docker with Worktrees section (PR #24)
- [x] Hub CLAUDE.md updated with Docker Isolation section and merge workflow
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
| **0: Pipeline Bugs** | 7 | 1 | 1 | 9 |
| **1: Data Collection** | 0 | 0 | 2 | 2 |
| **2: Frontend Core** | 0 | 2 | 0 | 2 |
| **3: Frontend Supporting** | 0 | 4 | 0 | 4 |
| **4: Tech Debt** | 1 | 0 | 14 | 15 |
| **5: Testing/Docs/Deploy** | 0 | 1 | 3 | 4 |
| **TOTAL** | **8** | **8** | **20** | **36** |

---

## Blockers & Questions

### Current Blockers:
1. ~~**Bug 0.6 (import path)**~~ Fixed (PR #13)
2. ~~**Bug 0.8 (`delayMx` typo)**~~ Fixed (PR #13)
3. **LA Pipeline Run** — Unblocked. Bbox verified: `-118.67,33.70,-117.65,34.34`. Ready to run.
4. **`useVenueSearch` bypasses `apiClient`** (4.7) — Search page will silently break when tokens expire. Quick fix needed before any user testing.
5. ~~**Docker isolation**~~ Resolved (PRs #23, #24). Agents can no longer tear down main's stack. Each worktree gets isolated containers.

### Questions to Resolve:
- [ ] Hosting/deployment platform decision?
- [ ] `feat/swipe-interface` branch: rebase + PR the alternative swipe implementation, or discard?
- [ ] Clean up 3 stale feature branches? (see 4.11)

---

**Next Step:** Run LA pipeline: `npm run pipeline -- --bbox="-118.67,33.70,-117.65,34.34" --tileDeg=0.01`
**Quick frontend win:** Fix `useVenueSearch.ts` to use `apiClient` (4.7) — 1-line import change.
