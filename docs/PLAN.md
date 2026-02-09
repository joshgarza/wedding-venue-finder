# Wedding Venue Finder MVP Implementation Plan

## Context

This plan transforms the existing CLI data pipeline into a full-stack wedding venue discovery platform with the unique "Tinder for Venues" experience described in `/docs/MEETINGS.md`.

**Why this change is needed:**
- Current system is a data collection pipeline only (no user-facing application)
- MVP requires user authentication, taste profile system, and swipe-based discovery
- Users need personalized venue recommendations based on aesthetic preferences
- Target market is Los Angeles couples planning weddings

**Current State:**
- Backend: CLI pipeline (5 stages: collect, crawl, images, enrichment, image filtering)
- Database: Single `venues` table with 24 venues (SF area)
- Frontend: Basic React app with localStorage swipes, no backend connection
- Services: PostGIS, crawl4ai, Ollama, CLIP (all configured in docker-compose)

**Pipeline Issues Identified:**
- Stage 2 (crawl) uses BFS immediately, risking wasted scraping on venues that should be eliminated
- No pre-filtering mechanism to identify obvious "yes" candidates before expensive crawling

**Intended Outcome:**
A working MVP where users can:
1. Sign up and create an account
2. Complete 10-swipe onboarding to establish taste profile
3. Receive AI-generated aesthetic summary (5 descriptive words)
4. Browse LA venues ranked by taste match
5. Save venues to a shortlist
6. Search/filter by budget, location, lodging, capacity

---

## Architecture Overview

### System Design

**All services containerized via docker-compose.yml:**

```
┌─────────────────────────────────────────────┐
│        FRONTEND (React + Vite)              │
│  • Authentication (JWT)                     │
│  • Swipe Interface (gesture-based)          │
│  • Taste Profile Display                    │
│  • Search & Filters                         │
│  • Shortlist Management                     │
└─────────────────┬───────────────────────────┘
                  │ REST API
┌─────────────────▼───────────────────────────┐
│  API SERVER (Express + TypeScript)          │
│  [Docker Container - port 3000]             │
│  • User auth (JWT)                          │
│  • Venue search (taste-ranked)              │
│  • Swipe tracking                           │
│  • Taste profile generation (CLIP)          │
└───────┬─────────────┬───────────────────────┘
        │             │
   ┌────▼────┐   ┌────▼──────┐
   │PostgreSQL│   │CLIP Service│
   │+ PostGIS │   │(port 51000)│
   │+ pgvector│   └───────────┘
   └──────────┘

Docker Services (venue_network):
- db (PostGIS)
- crawler (crawl4ai)
- ollama (LLM)
- clip_api (CLIP)
- api (NEW - Express server)
```

### Database Schema Additions

**New Tables:**
1. **users** - User accounts (email, password_hash, wedding_date)
2. **swipes** - Swipe history (user_id, venue_id, action: right/left/unsave, timestamp)
3. **taste_profiles** - User taste vectors (user_id, embedding_vector, descriptive_words[5], confidence)
4. **venue_embeddings** - Pre-computed CLIP embeddings (venue_id, image_path, embedding_vector)

**Required Extension:** pgvector (for VECTOR(512) column type)

### Taste Profile Algorithm

**Onboarding Flow:**
1. Show 10 random venue images
2. User swipes right (like) or left (skip)
3. Extract CLIP embeddings from right-swiped images
4. Compute centroid (average vector) as user's taste profile
5. Compare centroid to aesthetic word embeddings ("Moody", "Elegant", "Rustic", etc.)
6. Return top 5 matching words as taste summary

**Real-Time Updates:**
- Right swipe (save): Pull profile vector toward venue's aesthetic (learning rate: 0.1)
- Unsave: Push profile vector away (negative feedback)
- Recalculate descriptive words if profile shifts significantly

**Taste-Based Ranking:**
- Apply metadata filters (budget, location, lodging)
- Compute cosine similarity between user profile and venue image embeddings
- Rank results by similarity score

---

## Pipeline Optimization (Critical)

### Problem

Current pipeline Stage 2 (crawl) uses BFS immediately on all collected venues, wasting resources on venues that should be eliminated (non-wedding venues, incomplete data, etc.).

### Solution: Add Pre-Vetting Stage

**New Pipeline Flow:**

```
Stage 1: Collect (OSM)
  ↓ [All candidates]
Stage 1.5: Pre-Vetting (NEW) - Minimal scrape to bucket venues
  ↓ [Buckets: "yes", "no", "need more confirmation"]
Stage 2: Crawl (BFS only on "yes" candidates)
  ↓
Stage 3: Images
  ↓
Stage 4: Enrichment
  ↓
Stage 5: Image Filtering
```

**Stage 1.5: Pre-Vetting Logic**

Goal: Quickly identify obvious wedding venues before expensive BFS crawling.

**Minimal Scrape Strategy:**
1. Fetch ONLY the homepage (no BFS yet)
2. Check for wedding-related keywords in title, meta description, H1 tags:
   - "wedding", "venue", "reception", "ceremony", "estate", "events"
3. Check OSM tags: `venue=wedding`, `amenity=events_venue`
4. Bucket into categories:
   - **"yes"**: Keywords found + has website → proceed to BFS crawl
   - **"no"**: No keywords, generic restaurant/hotel tags → mark `pre_vetted=false`, skip crawl
   - **"need more confirmation"**: Unclear (TODO: handle later with retry logic)

**Database Changes:**
Add columns to `venues` table:
- `pre_vetting_status` ENUM('yes', 'no', 'pending', 'needs_confirmation')
- `pre_vetting_keywords` TEXT[] - Store matched keywords
- `pre_vetted_at` TIMESTAMP

**Implementation:**
- New file: `src/pipeline/stage_1_5_pre_vetting.ts`
- Update `bin/run.ts` to insert stage between collect and crawl
- Stage 2 (crawl) should ONLY process venues where `pre_vetting_status = 'yes'`

**Future TODO:**
- Implement retry logic for "need more confirmation" venues
- Use LLM (Ollama) for ambiguous cases (lightweight prompt: "Is this a wedding venue?")
- Add human review queue for edge cases

**Benefits:**
- Reduces wasted BFS crawling by ~50-70%
- Faster pipeline execution
- Lower API rate limit pressure on crawl4ai
- Better data quality (fewer false positives)

---

## Testing Strategy & Agent Workflow

### Test-Driven Development (TDD) Approach

**CRITICAL**: All agents MUST follow this workflow for every feature:

1. **Write Failing Tests First**
   - Create test file(s) before implementing the feature
   - Tests should fail initially (red)
   - Cover happy path + error cases + edge cases

2. **Implement Feature**
   - Write code until all tests pass (green)
   - Refactor if needed while keeping tests green

3. **Commit with Detailed Message**
   - Commit format (see Git Guidelines below)
   - Include: changes made, bug fixes, TODOs, notes to future agents

**IMPORTANT**: This TDD workflow applies to ALL workstreams, even if testing requirements are not explicitly detailed in each section. Every agent is responsible for:
- Writing comprehensive tests (unit + integration)
- Ensuring all tests pass before committing
- Documenting test coverage in commit message
- Following the git commit format specified below

### Test File Structure

**Backend API Tests:**
```
tests/
├── unit/
│   ├── services/
│   │   ├── auth.service.test.ts
│   │   ├── taste-profile.service.test.ts
│   │   ├── embedding.service.test.ts
│   │   └── venue.service.test.ts
│   ├── utils/
│   │   ├── vector.utils.test.ts
│   │   ├── jwt.utils.test.ts
│   │   └── password.utils.test.ts
│   └── middleware/
│       └── auth.test.ts
├── integration/
│   ├── auth.routes.test.ts
│   ├── venues.routes.test.ts
│   ├── swipes.routes.test.ts
│   └── taste-profile.routes.test.ts
└── setup.ts  # Test database setup, mocks, utilities
```

**Pipeline Tests (Existing Pattern in /bin):**
```
bin/
├── test-crawl.ts           # Existing - test Stage 2
├── test-image.ts           # Existing - test Stage 3
├── test-enrichment.ts      # Existing - test Stage 4
├── test-image-filter.ts    # Existing - test Stage 5
└── test-pre-vetting.ts     # NEW - test Stage 1.5
```

**Frontend Tests:**
```
frontend/src/
├── components/
│   ├── SwipeCard.test.tsx
│   ├── TasteProfileCard.test.tsx
│   └── SearchFilters.test.tsx
├── hooks/
│   ├── useSwipe.test.ts
│   └── useVenueSearch.test.ts
└── utils/
    └── api-client.test.ts
```

### Testing Tools & Frameworks

**Backend:**
- **Test Runner**: Jest or Vitest (recommend Vitest for TypeScript speed)
- **Assertions**: Vitest assertions or Jest expect
- **HTTP Mocking**: supertest (for API endpoint tests)
- **Database**: Separate test database (wedding_venue_finder_test)
- **Mocking**: vi.mock() or jest.mock() for external services

**Frontend:**
- **Test Runner**: Vitest
- **Component Testing**: React Testing Library
- **E2E**: Cypress (optional, post-MVP)

**Pipeline:**
- **Test Pattern**: Standalone execution scripts (existing pattern in /bin)
- **Database**: Use test database or small sample data

### Git Commit Guidelines

**Commit Message Format:**
```
<type>(<scope>): <subject>

<body>

Bug Fixes:
- <description of bug fixes>

TODOs:
- [ ] <future work item>
- [ ] <technical debt item>

Notes to Future Agents:
- <important context or gotchas>
- <architectural decisions>
- <dependencies or prerequisites>
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `test`: Adding/updating tests
- `refactor`: Code refactoring
- `docs`: Documentation
- `chore`: Maintenance tasks (deps, config)
- `perf`: Performance improvement

**Example Commit:**
```
feat(api): Add JWT authentication with refresh tokens

Implemented user signup, login, and token refresh endpoints.
Added bcrypt password hashing and rate limiting.

Bug Fixes:
- Fixed JWT expiration validation edge case
- Corrected error response format for 401s

TODOs:
- [ ] Add password reset flow
- [ ] Implement email verification
- [ ] Add OAuth2 providers (Google, Facebook)

Notes to Future Agents:
- JWT_SECRET must be set in .env (generate with openssl)
- Rate limiting uses in-memory store (use Redis for production)
- Refresh tokens stored in httpOnly cookies (secure flag in prod)
- Auth middleware expects "Bearer <token>" format in Authorization header
```

### Test Coverage Requirements

**Minimum Coverage Targets:**
- **Services**: 80% coverage (business logic is critical)
- **Controllers**: 70% coverage (API contract validation)
- **Utils**: 90% coverage (pure functions, easy to test)
- **Middleware**: 80% coverage (security-critical)
- **Routes**: Integration tests for all endpoints (100%)

**What to Test:**
✅ Happy path (expected inputs → expected outputs)
✅ Error cases (invalid inputs → proper error responses)
✅ Edge cases (boundary values, null/undefined, empty arrays)
✅ Authentication/authorization (protected routes, token validation)
✅ Database operations (CRUD, transactions, constraints)

**What NOT to Test:**
❌ External library internals (trust Express, Knex, React)
❌ Generated code (migrations, Zod schemas)
❌ Trivial getters/setters

### Running Tests

**Commands:**
```bash
# Backend unit tests
npm run test:unit

# Backend integration tests
npm run test:integration

# Backend all tests
npm run test

# Frontend tests
cd frontend && npm run test

# Pipeline stage tests (existing)
npm run test:crawl
npm run test:image
npm run test:enrichment
npm run test:imageFilter
npm run test:preVetting  # NEW
```

### Test Database Setup

**Create test database:**
```bash
docker compose exec db psql -U postgres -c "CREATE DATABASE wedding_venue_finder_test;"
```

**Migrate test database:**
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wedding_venue_finder_test" npm run migrate:latest
```

**Test data seeding:**
- Create `tests/fixtures/` directory with sample data
- Seed before each test suite
- Clean up after tests (or use transactions with rollback)

---

## Parallel Implementation Workstreams

### Workstream 1: Database & Migrations (CRITICAL - BLOCKS ALL)
**Owner:** Agent A

**Tasks:**
1. Enable pgvector extension in PostgreSQL
2. Create migration: `users` table
3. Create migration: `swipes` table
4. Create migration: `taste_profiles` table with VECTOR(512) column
5. Create migration: `venue_embeddings` table with VECTOR(512) column
6. Run migrations and verify schema

**Files to Create:**
- `migrations/YYYYMMDD_enable_pgvector.ts`
- `migrations/YYYYMMDD_create_users.ts`
- `migrations/YYYYMMDD_create_swipes.ts`
- `migrations/YYYYMMDD_create_taste_profiles.ts`
- `migrations/YYYYMMDD_create_venue_embeddings.ts`

**Additional Migration for Pre-Vetting:**
- `migrations/YYYYMMDD_add_pre_vetting_to_venues.ts` - Add pre-vetting columns

**Testing Requirements:**
- No unit tests needed for migrations (migrations are self-testing via up/down)
- Verify migrations manually (see Verification below)
- Document any data transformations or backfills in migration comments

**Verification:**
```bash
npm run migrate:latest
npm run db:shell
\dt  # List tables - should see 4 new tables
\d taste_profiles  # Verify VECTOR column exists
\d venues  # Verify pre_vetting_status column exists

# Test rollback
npm run migrate:rollback
npm run migrate:latest  # Should succeed
```

**Commit Message Example:**
```
feat(db): Add user tables and pgvector support

Created migrations for users, swipes, taste_profiles, and venue_embeddings tables.
Enabled pgvector extension for VECTOR(512) columns.

Bug Fixes:
- None (initial implementation)

TODOs:
- [ ] Add indexes after data population (monitor query performance)
- [ ] Consider partitioning swipes table if >1M records

Notes to Future Agents:
- pgvector requires PostgreSQL 11+ (we use PostGIS 15)
- VECTOR(512) matches CLIP embedding dimension
- taste_profiles.embedding_vector stores user aesthetic centroid
- venue_embeddings pre-computes image embeddings (batch job)
```

---

### Workstream 1.5: Pipeline Pre-Vetting Stage (CRITICAL - PIPELINE OPTIMIZATION)
**Owner:** Agent A2 (can work in parallel with Agent A after migration created)
**Dependencies:** Workstream 1 (pre-vetting migration must exist)

**Tasks:**
1. Create pre-vetting stage that fetches ONLY homepage (no BFS)
2. Implement keyword detection (title, meta, H1: "wedding", "venue", "reception", "ceremony", "estate", "events")
3. Check OSM tags for `venue=wedding`, `amenity=events_venue`
4. Bucket venues into: "yes" (has keywords), "no" (no match), "needs_confirmation" (unclear)
5. Update venues table with `pre_vetting_status`, `pre_vetting_keywords`, `pre_vetted_at`
6. Modify Stage 2 (crawl) to ONLY process `pre_vetting_status = 'yes'` venues
7. Add TODO comment for future retry logic on "needs_confirmation" venues

**Files to Create:**
- `src/pipeline/stage_1_5_pre_vetting.ts` - Pre-vetting logic
- `src/utils/keyword-matcher.ts` - Keyword detection utility

**Files to Modify:**
- `bin/run.ts` - Insert pre-vetting stage between collect and crawl:
  ```typescript
  const stages = [
    collectStage,
    preVettingStage,  // NEW - Add here
    crawlStage,       // Now only processes "yes" venues
    imageStage,
    enrichmentStage,
    imageFilterStage
  ];
  ```
- `src/pipeline/stage_2_crawl.ts` - Add WHERE clause:
  ```typescript
  .where('pre_vetting_status', 'yes')
  .whereNotNull('website_url')
  ```

**Pre-Vetting Logic Pseudocode:**
```typescript
async function preVettingStage(ctx: PipelineCtx): Promise<StageResult> {
  const venues = await ctx.db('venues')
    .whereNull('pre_vetted_at')
    .whereNotNull('website_url');

  for (const venue of venues) {
    // Fetch ONLY homepage (no BFS)
    const html = await fetchHomepage(venue.website_url);

    // Extract title, meta description, H1 tags
    const text = extractText(html);

    // Check for wedding keywords
    const keywords = ['wedding', 'venue', 'reception', 'ceremony', 'estate', 'events'];
    const matches = keywords.filter(k => text.toLowerCase().includes(k));

    // Check OSM tags
    const osmTags = venue.osm_metadata || {};
    const hasWeddingTag = osmTags.venue === 'wedding' || osmTags.amenity === 'events_venue';

    // Bucket logic
    let status = 'no';
    if (matches.length >= 2 || hasWeddingTag) {
      status = 'yes';  // Proceed to BFS crawl
    } else if (matches.length === 1) {
      status = 'needs_confirmation';  // TODO: retry later
    }

    // Update database
    await ctx.db('venues').where({ venue_id: venue.venue_id }).update({
      pre_vetting_status: status,
      pre_vetting_keywords: matches,
      pre_vetted_at: new Date()
    });
  }
}
```

**Testing Requirements:**

1. **Write test file FIRST:** `bin/test-pre-vetting.ts`
   ```typescript
   // Test cases:
   // - Venue with wedding keywords → status = "yes"
   // - Venue with OSM wedding tag → status = "yes"
   // - Generic restaurant → status = "no"
   // - Unclear venue (1 keyword) → status = "needs_confirmation"
   // - Missing website → skip (no pre-vetting needed)
   ```

2. **Unit tests:** `tests/unit/utils/keyword-matcher.test.ts`
   - Test keyword detection logic in isolation
   - Test case-insensitivity
   - Test HTML parsing (title, meta, H1 extraction)

3. **Integration test:** Run `npm run test:preVetting` on sample venues
   - Create 5-10 test venues with known characteristics
   - Verify correct status assignments

**Verification:**
```bash
# Run standalone pre-vetting test
npm run test:preVetting

# Run unit tests
npm run test:unit -- keyword-matcher

# Run full pipeline with pre-vetting
npm run pipeline

# Check pre-vetting results
npm run db:shell
SELECT pre_vetting_status, COUNT(*) FROM venues GROUP BY pre_vetting_status;
# Should show distribution: yes (30-50%), no (30-50%), needs_confirmation (10-20%)

# Verify Stage 2 only crawls "yes" venues
# Check logs - BFS should skip "no" venues
```

**Expected Impact:**
- 50-70% reduction in BFS crawling
- Faster pipeline execution (saves ~2-4 hours on full California run)
- Better data quality (fewer false positives)

**Commit Message Example:**
```
feat(pipeline): Add pre-vetting stage to filter candidates before BFS

Implemented Stage 1.5 (pre-vetting) that performs minimal homepage scrape
to identify obvious wedding venues before expensive BFS crawling.

Venues are bucketed into:
- "yes": Has wedding keywords or OSM tags → proceed to BFS
- "no": No match → skip crawling
- "needs_confirmation": Unclear → TODO for future retry logic

Bug Fixes:
- None (initial implementation)

TODOs:
- [ ] Implement retry logic for "needs_confirmation" venues
- [ ] Use Ollama LLM for ambiguous cases
- [ ] Add human review queue UI for edge cases
- [ ] Monitor false negative rate (wedding venues incorrectly marked "no")

Notes to Future Agents:
- This stage reduces pipeline execution time by ~40-60%
- Keyword list is in src/pipeline/stage_1_5_pre_vetting.ts (lines 15-20)
- OSM tags checked: venue=wedding, amenity=events_venue
- Stage 2 (crawl) now has WHERE clause: pre_vetting_status = 'yes'
- Pre-vetting only fetches homepage (no BFS), uses axios with 5s timeout
```

---

For the remaining workstreams (2-12), they include similar detailed TDD requirements, testing specifications, and commit message examples. The full plan document contains:

- Workstream 2: API Server Scaffolding + Docker (with Vitest setup)
- Workstream 3: Authentication System (comprehensive TDD examples)
- Workstream 4: CLIP Embedding Service (vector utils testing)
- Workstream 5: Taste Profile System (core MVP feature)
- Workstream 6: Venue Search & Filtering (core MVP feature)
- Workstream 7: Swipe Tracking
- Workstream 8: Frontend Authentication
- Workstream 9: Swipe Interface Upgrade
- Workstream 10: Taste Profile UI
- Workstream 11: Search & Filter UI
- Workstream 12: LA Data Collection

Each workstream includes:
- Tasks list
- Files to create/modify
- Testing requirements (TDD approach)
- Verification steps
- Commit message examples with Bug Fixes, TODOs, and Notes to Future Agents

---

## Development Phases

### Phase 1: Foundation (Weeks 1-2)
**Parallel Workstreams:** 1, 1.5, 2, 4, 12

### Phase 2: Core Backend (Weeks 3-4)
**Parallel Workstreams:** 3, 5, 6, 7

### Phase 3: Frontend Integration (Weeks 5-6)
**Parallel Workstreams:** 8, 9, 10, 11

### Phase 4: Testing & Deployment (Week 7)

---

## MVP Feature Scope

### Must-Have (Blocking Launch)
✅ User signup/login
✅ 10-swipe onboarding
✅ Taste profile generation (5 descriptive words)
✅ Taste-based venue ranking
✅ Swipe mechanic with gestures
✅ Shortlist (saved venues)
✅ Basic search with filters (budget, lodging, location)
✅ LA venue data (200+ venues minimum)

### Should-Have (v1.1 Post-Launch)
- Real-time profile updates (unsave = negative feedback)
- "More like this" feature per saved venue
- Advanced filters (is_estate, is_historic, square_footage)
- Map view in search results
- Venue detail page with full gallery

### Nice-to-Have (Future)
- Instagram/TikTok content integration
- Pinterest board import
- Partner collaboration (shared shortlist)
- In-app messaging to venues
- Wedding date timeline tracking

---

## Success Metrics

**MVP Launch Criteria:**
- [ ] User can signup/login
- [ ] User can complete onboarding and see 5 descriptive words
- [ ] User can swipe venues with gesture UI
- [ ] User can view shortlist of saved venues
- [ ] User can search LA venues with filters
- [ ] Search results are taste-ranked (venues with high similarity appear first)
- [ ] At least 200 LA wedding venues in database
- [ ] All API endpoints return <2 second response times
- [ ] Frontend deployed and accessible to test users

**Post-Launch Metrics to Track:**
- Onboarding completion rate (target: >70%)
- Average swipes per user (target: >50)
- Taste profile accuracy feedback (target: >80% positive)
- Shortlist conversion (target: >30% of users save ≥5 venues)
- Search usage (swipe vs. search preference ratio)
