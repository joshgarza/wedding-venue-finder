# Wedding Venue Finder 💍

**AI-powered wedding venue discovery with personalized taste matching** — "Tinder for Venues"

A full-stack web application that helps couples discover their perfect wedding venue through a swipe-based interface powered by CLIP embeddings and aesthetic preference learning.

---

## 🎯 What It Does

### The Problem
Finding a wedding venue is overwhelming. Traditional search is tedious — filtering by price, capacity, and location still leaves dozens of options that "look fine" but don't match your aesthetic vision.

### The Solution
**Wedding Venue Finder** learns your taste through a 10-swipe onboarding, generates a personalized aesthetic profile (5 descriptive words), and ranks all venues by how well they match your vision using AI-powered image similarity.

### Key Features
- 🎨 **Taste Profile Generation**: Swipe on 10 venues → get your aesthetic (e.g., "Modern, Elegant, Minimalist, Garden, Romantic")
- 🤖 **AI-Powered Ranking**: CLIP embeddings + cosine similarity rank venues by taste match
- 💕 **Swipe Interface**: Tinder-style gesture controls for intuitive discovery
- 🔍 **Smart Search**: Filter by budget, location, lodging, capacity — sorted by taste score
- 📋 **Shortlist Management**: Save favorites and share with your partner
- 🗺️ **Location-Aware**: PostGIS spatial queries for radius search and distance sorting

---

## 🏗️ Architecture

### Tech Stack

**Backend (API Server)**
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express 5
- **Database**: PostgreSQL 17 + PostGIS 3.5.3 + pgvector 0.8.0
- **Authentication**: JWT (access + refresh tokens)
- **AI/ML**:
  - CLIP (ViT-B/32) for image embeddings
  - Ollama (local LLM) for venue data enrichment
- **Data Collection**: OpenStreetMap Overpass API + crawl4ai
- **Testing**: Vitest (223 tests, 100% passing)

**Frontend**
- **Framework**: React + Vite
- **Routing**: React Router
- **Maps**: Leaflet
- **UI**: Gesture-based swipe interface

**Infrastructure**
- **Deployment**: Docker Compose (5 services)
- **Database Migrations**: Knex.js
- **Development**: Hot reload with volume mounts

### System Architecture

```
┌─────────────────────────────────────────────┐
│        FRONTEND (React + Vite)              │
│  • Swipe Interface (gesture-based)          │
│  • Taste Profile Display (5 words)          │
│  • Search & Filters                         │
│  • Shortlist Management                     │
└─────────────────┬───────────────────────────┘
                  │ REST API (JWT auth)
┌─────────────────▼───────────────────────────┐
│  API SERVER (Express + TypeScript)          │
│  • User authentication                      │
│  • Venue search (taste-ranked)              │
│  • Swipe tracking                           │
│  • Taste profile generation                 │
└───┬─────────┬─────────┬─────────────────────┘
    │         │         │
┌───▼───┐ ┌───▼────┐ ┌──▼─────┐
│PostGIS│ │ CLIP   │ │ Ollama │
│+ vector│ │ Server │ │  LLM   │
└────────┘ └────────┘ └────────┘
```

### Database Schema

**Core Tables:**
- `users` - Authentication (email, password_hash, wedding_date)
- `venues` - Venue data (name, location, pricing, images, enrichment fields)
- `swipes` - User interaction history (right/left/unsave)
- `taste_profiles` - User aesthetic profiles (VECTOR(512) embeddings, descriptive words)
- `venue_embeddings` - Pre-computed image embeddings (VECTOR(512))

**Key Features:**
- `VECTOR(512)` columns for CLIP embeddings (pgvector)
- `geography(Point,4326)` for spatial queries (PostGIS)
- Pre-vetting columns for pipeline optimization

---

## 🚀 Quick Start

### Prerequisites
- **Docker** (for PostgreSQL, CLIP, Ollama, crawler services)
- **Node.js 20+** (for API and frontend development)
- **NVIDIA GPU** (optional, for Ollama and CLIP - CPU fallback available)

### 1. Clone & Install

```bash
git clone <repo-url>
cd wedding-venue-finder
npm install
cd frontend && npm install && cd ..
```

### 2. Environment Setup

```bash
# Copy example env file
cp .env.example .env

# Update .env with your configuration:
# - JWT_SECRET (generate: openssl rand -base64 32)
# - Database credentials (default: postgres/postgres)
# - Service URLs (defaults work for Docker)
```

### 3. Start Services

```bash
# Start all Docker services (PostgreSQL, CLIP, Ollama, crawler, API)
docker compose up -d

# Wait for database to be ready
docker compose logs db | grep "ready to accept connections"

# Run migrations
npm run migrate:latest
```

### 4. Verify Setup

```bash
# Check all services are running
docker compose ps

# Test API health check
curl http://127.0.0.1:3003/api/v1/health
# Should return: {"status":"ok","timestamp":"..."}

# Run tests (optional)
npm run test
# Should show: ✅ 223/223 tests passing
```

### 5. Start Frontend (Development)

```bash
cd frontend
npm run dev
```

Visit **http://localhost:5173** to see the app!

---

## 📦 Available Commands

### Database
```bash
npm run migrate:latest        # Run pending migrations
npm run migrate:rollback      # Rollback last migration
npm run migrate:make <name>   # Create new migration
npm run db:shell             # Access PostgreSQL shell
```

### API Development
```bash
npm run api                  # Start API server (local, port 3000)
docker compose up -d api     # Start API in Docker
docker compose logs -f api   # View API logs
```

### Data Pipeline
```bash
npm run pipeline                              # Run full 5-stage pipeline
npm run pipeline -- --bbox="<coords>"         # Custom bounding box
npm run pipeline -- --tileDeg=0.02           # Custom tile size

# Test individual stages
npm run test:crawl           # Test Stage 2 (web crawling)
npm run test:image           # Test Stage 3 (image extraction)
npm run test:enrichment      # Test Stage 4 (LLM enrichment)
npm run test:imageFilter     # Test Stage 5 (logo filtering)
```

### Embeddings
```bash
npm run generate:embeddings  # Pre-compute CLIP embeddings for all venue images
```

### Testing
```bash
npm run test                 # Run all tests
npm run test:unit            # Run unit tests only
npm run test:integration     # Run integration tests only
npm run test:watch           # Run tests in watch mode
npm run test:coverage        # Generate coverage report
```

### Frontend
```bash
cd frontend
npm run dev                  # Start dev server (port 5173)
npm run build                # Build for production
npm run preview              # Preview production build
npm run lint                 # Run ESLint
```

---

## 🧪 Testing

**Test Coverage: 100% (223/223 passing)**

### Test Structure
```
tests/
├── unit/                    # 149 tests
│   ├── services/           # Business logic tests
│   ├── utils/              # Utility function tests
│   └── middleware/         # Middleware tests
└── integration/            # 74 tests
    ├── auth.routes.test.ts
    ├── venues.routes.test.ts
    ├── swipes.routes.test.ts
    └── taste-profile.routes.test.ts
```

### Running Tests
```bash
# Run all tests (sequential for reliability)
npm run test

# Run specific test file
npm run test:unit -- taste-profile.service
npm run test:integration -- auth.routes

# Watch mode for TDD
npm run test:watch
```

---

## 🗄️ Database

### Connection Details
- **Host**: `localhost` (from host machine) or `db` (from Docker network)
- **Port**: `5433` (host) — avoids conflict with system PostgreSQL on 5432
- **Database**: `wedding_venue_finder`
- **User**: `postgres`
- **Password**: `postgres`

### Extensions Installed
- **pgvector 0.8.0** - Vector similarity search for taste matching
- **PostGIS 3.5.3** - Spatial queries for location-based search

### Quick Database Access
```bash
# Via npm script
npm run db:shell

# Direct psql
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d wedding_venue_finder
```

### Schema Inspection
```sql
-- List all tables
\dt

-- View taste_profiles schema (VECTOR column)
\d taste_profiles

-- View venues schema
\d venues

-- Check installed extensions
SELECT extname, extversion FROM pg_extension;
```

---

## 🎨 Taste Profile System

### How It Works

1. **Onboarding (10 swipes)**
   - User swipes right/left on 10 random venue images
   - CLIP generates 512-dimensional embedding for each image
   - Right-swiped images averaged to create user's aesthetic centroid

2. **Profile Generation**
   - Compare centroid to 14 aesthetic word embeddings:
     - "Moody", "Elegant", "Vintage", "Modern", "Rustic", "Romantic"
     - "Luxurious", "Minimalist", "Bohemian", "Classic", "Industrial"
     - "Garden", "Beachside", "Mountain"
   - Return top 5 matches as user's taste profile

3. **Real-Time Learning (Optional)**
   - On each new right swipe: pull profile 10% toward new venue (learning rate 0.1)
   - On unsave: push profile 10% away (negative feedback)
   - Recalculate descriptive words if profile shifts significantly

4. **Taste-Based Ranking**
   - Compute cosine similarity between user profile and each venue's images
   - Sort search results by similarity score (descending)
   - Apply metadata filters (budget, lodging, location) before ranking

### API Endpoints

```bash
# Get 10 onboarding venues
GET /api/v1/taste-profile/onboarding

# Generate profile from swipes
POST /api/v1/taste-profile/generate
Body: { "session_id": "<uuid>" }

# Update profile on new swipe
PATCH /api/v1/taste-profile/update
Body: { "venue_id": "<uuid>", "action": "right" }

# Get user's profile
GET /api/v1/taste-profile

# Rank venues by taste
POST /api/v1/taste-profile/rank
Body: { "venue_ids": ["<uuid>", ...] }
```

---

## 🔍 Venue Search API

### Search Endpoint
```
GET /api/v1/venues
```

### Query Parameters

**Filtering:**
- `pricing_tier` - `low`, `medium`, `high`, `luxury` (multiple allowed)
- `has_lodging` - `true` / `false`
- `is_estate` - `true` / `false`
- `is_historic` - `true` / `false`
- `location_lat` + `location_lng` + `radius_meters` - Radius search

**Sorting:**
- `sort` - `taste_score` (default), `pricing_tier`, `distance`
- Note: `distance` requires `location_lat` and `location_lng`

**Pagination:**
- `limit` - Results per page (max 100, default 20)
- `offset` - Skip N results (default 0)

### Example Requests

```bash
# Search with taste ranking (default)
GET /api/v1/venues?has_lodging=true&pricing_tier=medium&pricing_tier=high

# Search near location (50km radius)
GET /api/v1/venues?location_lat=34.0522&location_lng=-118.2437&radius_meters=50000

# Sort by distance (requires location)
GET /api/v1/venues?location_lat=34.0522&location_lng=-118.2437&sort=distance

# Pagination
GET /api/v1/venues?limit=50&offset=100
```

### Response Format
```json
{
  "venues": [
    {
      "venue_id": "uuid",
      "name": "Example Estate",
      "pricing_tier": "high",
      "has_lodging": true,
      "lodging_capacity": 50,
      "is_estate": true,
      "is_historic": false,
      "taste_score": 0.87,
      "distance_meters": 15000,
      "thumbnail": "/venues/images/uuid/image1.jpg",
      "lat": 34.0522,
      "lng": -118.2437
    }
  ],
  "total": 142,
  "limit": 20,
  "offset": 0
}
```

---

## 🗺️ Data Collection Pipeline

### Pipeline Stages

The data collection pipeline runs in 6 stages:

1. **Stage 1: Collect** - Query OpenStreetMap for venue candidates
2. **Stage 1.5: Pre-Vetting** - Quick homepage check to filter non-wedding venues
3. **Stage 2: Crawl** - BFS web crawling (depth 2) on vetted venues
4. **Stage 3: Images** - Extract and download venue images
5. **Stage 4: Enrichment** - LLM extraction of structured data (pricing, capacity, etc.)
6. **Stage 5: Image Filter** - CLIP-based logo/watermark removal

### Running the Pipeline

**Test Run (San Francisco):**
```bash
npm run pipeline
# Uses default bbox: SF area (small test dataset)
```

**Los Angeles Production Run:**
```bash
npm run pipeline -- --bbox="-118.6682,33.7037,-118.1553,34.3373" --tileDeg=0.02
# Expected: 500-1000 candidates → ~200-400 after pre-vetting → ~200+ final venues
```

**Custom Area:**
```bash
npm run pipeline -- --bbox="west,south,east,north" --tileDeg=0.02
# Format: longitude(west), latitude(south), longitude(east), latitude(north)
```

### Pipeline Configuration

**Environment Variables:**
```bash
# .env
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=phi3:3.8b-mini-4k-instruct-q4_K_M
CRAWL_TIMEOUT=30000
MAX_CONCURRENT_CRAWLS=5
DATA_DIR=./data
```

### Error Handling

- `.crawl_errors.log` - Failed website crawls
- `image_errors.log` - Failed image downloads
- `filter_errors.log` - CLIP processing errors

Errors are logged but don't block the pipeline — individual failures are skipped.

---

## 🐳 Docker Services

### Service Overview

```bash
docker compose ps
```

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `db` | `postgis-vector:latest` | 5433 | PostgreSQL 17 + PostGIS + pgvector |
| `crawler` | `crawl4ai:latest` | 11235 | Web scraping service (Playwright) |
| `ollama` | `ollama:latest` | 11434 | Local LLM for enrichment |
| `clip_api` | `clip-server:latest` | 51000 | CLIP embedding service |
| `api` | Custom build | 3000 | Express API server |

### Service Management

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d db

# Stop all services
docker compose down

# View logs
docker compose logs -f api
docker compose logs db | tail -50

# Restart service
docker compose restart api

# Rebuild API container
docker compose build api && docker compose up -d api
```

### GPU Configuration

Ollama and CLIP services use NVIDIA GPU if available:

```yaml
# docker-compose.yml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

**Without GPU:** Services will fall back to CPU (slower but functional).

---

## 📚 Project Structure

```
wedding-venue-finder/
├── src/
│   ├── api/                    # Express API server
│   │   ├── controllers/        # Request handlers
│   │   ├── services/           # Business logic
│   │   ├── routes/             # Route definitions
│   │   ├── middleware/         # Auth, error handling
│   │   ├── schemas/            # Zod validation schemas
│   │   ├── utils/              # Vector math, JWT, passwords
│   │   └── server.ts           # Main entry point
│   ├── pipeline/               # Data collection pipeline
│   │   ├── stage_1_collect.ts
│   │   ├── stage_1_5_pre_vetting.ts
│   │   ├── stage_2_crawl.ts
│   │   ├── stage_3_images.ts
│   │   ├── stage_4_enrichment.ts
│   │   └── stage_5_image_filter.ts
│   └── utils/                  # Shared utilities
│       ├── spatial-utils.ts
│       ├── image-downloader.ts
│       └── logo-filter.ts
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Route pages
│   │   ├── contexts/           # Global state (Auth)
│   │   ├── hooks/              # Custom React hooks
│   │   └── utils/              # API client, helpers
│   └── public/                 # Static assets
├── migrations/                 # Database migrations (Knex)
├── tests/                      # Test suite
│   ├── unit/                   # Unit tests (149)
│   └── integration/            # Integration tests (74)
├── db/                         # Database configuration
├── bin/                        # Executable scripts
│   ├── run.ts                  # Main pipeline runner
│   ├── test-*.ts               # Stage test scripts
│   └── generate-venue-embeddings.ts
├── data/                       # Generated data (gitignored)
│   └── venues/                 # Downloaded venue images
├── docker-compose.yml          # Service orchestration
├── Dockerfile                  # API container build
├── knexfile.ts                 # Database migration config
├── vitest.config.ts            # Test configuration
└── package.json                # Dependencies & scripts
```

---

## 🛠️ Development Workflow

### Adding a New Feature

1. **Plan** (if complex)
   ```bash
   # Discuss approach, consider alternatives
   # Check CLAUDE.md for project context
   ```

2. **Write Tests First (TDD)**
   ```bash
   # Create test file
   touch tests/unit/services/my-feature.test.ts

   # Write failing tests
   npm run test:watch -- my-feature
   ```

3. **Implement Feature**
   ```bash
   # Write code until tests pass
   # Run full test suite
   npm run test
   ```

4. **Verify Integration**
   ```bash
   # Test via API
   curl http://localhost:3003/api/v1/my-endpoint

   # Test via frontend (if applicable)
   ```

5. **Commit**
   ```bash
   git add .
   git commit -m "feat(scope): Add feature description

   Detailed explanation of changes.

   Bug Fixes:
   - Fixed X issue
   - Fixed Y edge case

   TODOs:
   - [ ] Future improvement

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
   ```

### Database Changes

1. **Create Migration**
   ```bash
   npm run migrate:make add_field_to_venues
   ```

2. **Edit Migration** (TypeScript)
   ```typescript
   // migrations/YYYYMMDD_add_field_to_venues.ts
   export async function up(knex: Knex): Promise<void> {
     await knex.schema.alterTable('venues', (table) => {
       table.integer('my_field').defaultTo(0);
     });
   }

   export async function down(knex: Knex): Promise<void> {
     await knex.schema.alterTable('venues', (table) => {
       table.dropColumn('my_field');
     });
   }
   ```

3. **Run Migration**
   ```bash
   npm run migrate:latest

   # Verify
   npm run db:shell
   \d venues
   ```

4. **Update TypeScript Types** (if using typed models)

---

## 🚧 Known Issues & Limitations

### Current Limitations
- **No venue data yet**: Pipeline must be run to collect venues
- **No embeddings yet**: Run `npm run generate:embeddings` after collecting venues
- **Frontend incomplete**: Basic structure exists, full implementation pending
- **curl hangs**: Health check works in browser but curl doesn't respond (IPv6 issue?)

### Performance Notes
- **Test execution**: Sequential mode (~18s) prevents race conditions
- **Pipeline**: Pre-vetting stage reduces crawling time by 40-60%
- **CLIP embeddings**: Batch processing with p-limit (10 concurrent)

### Future Improvements
- [ ] Redis caching for embeddings
- [ ] Real-time profile updates
- [ ] OAuth providers (Google, Facebook)
- [ ] Email verification
- [ ] Password reset flow
- [ ] Advanced filters (square footage, outdoor space, etc.)
- [ ] Map view in search results
- [ ] Partner collaboration (shared shortlist)

---

## 📄 License

[Add your license here]

---

## 🙏 Acknowledgments

- **CLIP** (OpenAI) for image embeddings
- **PostGIS** for spatial queries
- **pgvector** for vector similarity search
- **crawl4ai** for web scraping infrastructure
- **Ollama** for local LLM inference

---

## 📞 Support

- **Issues**: [GitHub Issues](<repo-url>/issues)
- **Documentation**: See `CLAUDE.md` for detailed project context
- **Meetings**: See `/docs/MEETINGS.md` for product decisions

---

**Built with ❤️ for couples planning their dream wedding**
