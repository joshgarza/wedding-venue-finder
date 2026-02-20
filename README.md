# Wedding Venue Finder

AI-powered wedding venue discovery with personalized taste matching -- "Tinder for Venues."

## What It Does

- **Taste profiling**: Swipe on 10 venues to generate a 5-word aesthetic profile using CLIP embeddings
- **AI-ranked search**: Venues sorted by cosine similarity to your taste profile
- **Smart filters**: Budget, lodging, capacity, and radius search via PostGIS
- **Shortlist management**: Save and share favorites with your partner

## Architecture

```
+---------------------------------------------+
|        FRONTEND (React + Vite)              |
|  Swipe interface, search, shortlist         |
+-----------------------+---------------------+
                        | REST API (JWT auth)
+-----------------------v---------------------+
|  API SERVER (Express + TypeScript)          |
|  Auth, venue search, taste profiles         |
+---+----------+----------+-------------------+
    |          |          |
+---v----+ +---v----+ +---v----+
| PostGIS| |  CLIP  | | Ollama |
|+vector | | Server | |  LLM   |
+--------+ +--------+ +--------+
```

**Stack**: TypeScript, Express 5, PostgreSQL 17 + PostGIS + pgvector, React, Vite, Leaflet

**Docker services**:

| Service   | Port  | Purpose                          |
|-----------|-------|----------------------------------|
| `db`      | 5433  | PostgreSQL + PostGIS + pgvector  |
| `crawler` | 11235 | crawl4ai (Playwright)            |
| `ollama`  | 11434 | Local LLM for data enrichment    |
| `clip_api`| 51000 | CLIP embedding server            |
| `api`     | 3000  | Express API server               |

## Quick Start

**Prerequisites**: Docker, Node.js 20+, NVIDIA GPU (optional -- CPU fallback available)

```bash
git clone <repo-url>
cd wedding-venue-finder
npm install
cd frontend && npm install --legacy-peer-deps && cd ..

cp .env.example .env
# Edit .env: set JWT_SECRET (openssl rand -base64 32), review defaults

docker compose up -d
npm run migrate:latest

# Verify
curl http://127.0.0.1:3003/api/v1/health

# Start frontend dev server
cd frontend && npm run dev
# Visit http://localhost:5173
```

## Key Commands

### Database
```
npm run migrate:latest          Run pending migrations
npm run migrate:rollback        Rollback last migration
npm run migrate:make <name>     Create new migration
npm run db:shell                PostgreSQL shell
```

### Pipeline
```
npm run pipeline                          Full 6-stage pipeline (default: SF test area)
npm run pipeline -- --bbox="w,s,e,n"      Custom bounding box
npm run pipeline -- --tileDeg=0.02        Custom tile size
npm run generate:embeddings               Pre-compute CLIP embeddings
```

### Testing
```
npm run test                    Run all tests
```

### Frontend
```
cd frontend
npm run dev                     Dev server (port 5173)
npm run build                   Production build
```

## Project Structure

```
src/
  api/                          Express API server
    controllers/                Request handlers
    services/                   Business logic
    routes/                     Route definitions
    middleware/                  Auth, error handling
    schemas/                    Zod validation
  pipeline/                     Data collection (stages 1-5)
  utils/                        Shared utilities
frontend/                       React application
migrations/                     Knex database migrations
tests/
  unit/                         Unit tests
  integration/                  Integration tests
bin/                            Pipeline runner and test scripts
data/                           Downloaded venue images (gitignored)
```

## Database Schema

**Core tables**: `users`, `venues`, `swipes`, `taste_profiles`, `venue_embeddings`

Key extensions:
- **pgvector**: `VECTOR(512)` columns for CLIP embeddings and taste matching
- **PostGIS**: `geography(Point,4326)` for spatial queries and radius search

## Further Documentation

- `CLAUDE.md` -- Full project guide: pipeline stages, architecture details, dev workflow, stage contracts
- `TODO.md` -- Phased priority tracker

## License

TBD
