# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wedding Venue Finder is a data pipeline that collects, processes, and filters wedding venue information in California. The system uses a multi-stage pipeline to:
1. Collect venue candidates from OpenStreetMap
2. Crawl venue websites for detailed information
3. Extract and download venue images
4. Enrich venue data using LLMs (Ollama)
5. Filter out logo/watermark images using CLIP

## Critical Rules

### Anti-Hallucination
- NEVER modify a pipeline stage without reading its source file first
- NEVER assume database schema - check migrations or use `npm run db:shell` to inspect
- When working with JSONB fields (`image_data`), read existing records to understand structure
- Verify Docker services are running before debugging service-related issues

### Verification Required
- After modifying a pipeline stage, test it with the appropriate `npm run test:*` command
- After creating/modifying migrations, run `npm run migrate:latest` to verify
- After pipeline changes, test with small bbox before running full California dataset
- Use `npm run db:shell` to verify database state after stage execution

### Branch Protection
- **NEVER commit directly to `main`** — a pre-commit hook will reject it
- **NEVER create merge commits on `main`** — a pre-merge-commit hook will reject it
- Only fast-forward merges (`git merge --ff-only`) are allowed on `main`
- If the Claude Code hook blocks your Edit/Write, you are on the `main` worktree — switch to a feature branch worktree

### Context Management
- Pipeline stages process data sequentially - note which stage you're working on
- Check error logs (`.crawl_errors.log`, `filter_errors.log`, `image_errors.log`) for debugging
- Re-read stage files before editing if session spans multiple stages

## Git Worktree Workflow

This repo uses a **bare repo + worktree** layout. Each branch has its own directory.

### Directory Structure
```
/home/josh/coding/claude/
  wedding-venue-finder.git/          # Bare repository (do not work here directly)
    hooks/                           # Shared git hooks (pre-commit, pre-merge-commit)
  wedding-venue-finder/              # Worktrees container (coordination hub)
    main/                            # main branch (protected, read-only for agents)
    <feature-worktrees>/             # Created per-task, deleted after merge
  wedding-venue-finder-shared/       # Shared gitignored resources
    data/                            # Pipeline data (symlinked into each worktree)
    .env                             # Template env file
```

### How to Work
- **Start Claude from a worktree directory** (e.g. `wedding-venue-finder/<feature>/`)
- Each worktree is a full working copy with its own `node_modules`, `.env`, and `data` symlink
- All worktrees share the same git history via the bare repo
- Feature worktrees are **temporary** — create for active work, delete after merging

### Worktree Lifecycle

From the hub directory (`wedding-venue-finder/`):

```bash
# Create a worktree (handles .env, settings, data symlink, npm install)
./create-worktree.sh <name> [branch-name]

# Remove a worktree and its branch (after merge)
./remove-worktree.sh <name>

# Validate all worktrees have required config
./check-worktrees.sh
```

### Merging to Main
1. Work and commit on a feature worktree
2. Rebase onto main: `git rebase main`
3. Push and open a PR:
   ```bash
   git push -u origin <branch>
   cd /home/josh/coding/claude/wedding-venue-finder/main && gh pr create
   ```
4. After PR is approved and merged on GitHub:
   ```bash
   cd /home/josh/coding/claude/wedding-venue-finder/main && git pull origin main
   cd .. && ./remove-worktree.sh <name>
   ```

### Docker with Worktrees
- Docker named volumes (`postgres_data`, `ollama_data`) are shared across worktrees
- The `docker-compose.yml` mounts paths relative to the worktree you run it from
- **Run docker from one worktree at a time** to avoid port conflicts

### Worktree Gotchas
- **Bare repo fetch refspec**: `git clone --bare` does not configure `remote.origin.fetch`. If `origin/main` is missing, run from the bare repo:
  ```bash
  git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
  git fetch origin
  ```
- **Feature branches need rebase**: After merging changes to `main`, feature branches must `git rebase main` to pick up shared files like `.claude/hooks/` and `.gitignore`
- **`npm install` is per-worktree**: Each worktree has its own `node_modules`. The `create-worktree.sh` script handles this automatically
- **Frontend uses `--legacy-peer-deps`**: Run `npm install --legacy-peer-deps` in the `frontend/` directory to avoid peer dependency errors

## Tech Stack

- **Backend**: TypeScript with Node.js
- **Database**: PostgreSQL with PostGIS extension
- **Data Ingestion**: OpenStreetMap Overpass API
- **Web Crawling**: crawl4ai (Docker service)
- **AI/ML Services**:
  - Ollama (local LLM for text enrichment)
  - CLIP (logo/image classification)
- **Frontend**: React + Vite + Leaflet (for map visualization)

## Development Commands

### Database Operations
```bash
# Start all services (PostgreSQL, crawler, Ollama, CLIP)
docker compose up -d

# Check service status
docker compose ps

# Access database shell
npm run db:shell

# Create a new migration
npm run migrate:make <migration_name>

# Run pending migrations
npm run migrate:latest

# Rollback last migration
npm run migrate:rollback
```

### Running the Pipeline
```bash
# Run the full pipeline (all 5 stages)
npm run pipeline

# Run with custom bounding box
npm run pipeline -- --bbox="-122.5,37.7,-122.3,37.9"

# Run with custom tile size (degrees)
npm run pipeline -- --tileDeg=0.02
```

### Testing Individual Stages
```bash
# Test crawling stage
npm run test:crawl

# Test image extraction
npm run test:image

# Test LLM enrichment
npm run test:enrichment

# Test image filtering (logo detection)
npm run test:imageFilter
```

### Frontend Development
```bash
cd frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
```

## Testing & Verification

### When to Use Test Commands
- **After modifying a specific stage**: Use the corresponding `npm run test:<stage>` command
- **Before committing pipeline changes**: Run full pipeline with test bbox (default SF area)
- **After schema changes**: Manually verify with `npm run db:shell` and `SELECT * FROM venues LIMIT 5;`
- **Before production runs**: Test with small tileDeg (0.01) first, then scale up

### Verifying Pipeline Stages
1. **Stage 1 (Collect)**: Check `venues` table has records with `name`, `lat`, `lng`, `website_url`
2. **Stage 2 (Crawl)**: Verify `raw_markdown` column is populated
3. **Stage 3 (Images)**: Check `image_data` JSONB has `local_paths` array and files exist in `data/venues/`
4. **Stage 4 (Enrichment)**: Verify enrichment columns are populated (not null/0)
5. **Stage 5 (Image Filter)**: Confirm logo images are removed from filesystem and `image_data` updated

### Docker Service Verification
```bash
# Check all services are running
docker compose ps

# Verify Ollama is ready
curl http://localhost:11434/api/tags

# Verify CLIP is ready
curl http://localhost:51000/

# Check crawler logs if issues
docker compose logs crawler
```

## Architecture

### Pipeline Stages

The core pipeline is defined in `src/pipeline/` and runs sequentially:

1. **Stage 1: Collect** (`stage_1_collect.ts`)
   - Queries OpenStreetMap Overpass API for venues within bounding box tiles
   - Stores raw venue data (name, location, tags, website) in `venues` table
   - Uses round-robin across multiple Overpass endpoints for reliability

2. **Stage 2: Crawl** (`stage_2_crawl.ts`)
   - Crawls venue websites using crawl4ai service (BFS, max depth 2)
   - Extracts markdown content from web pages
   - Stores `raw_markdown` in venues table
   - Handles concurrency with p-limit
   - **Note**: Being deprecated for new pipeline (see git history)

3. **Stage 3: Images** (`stage_3_images.ts`)
   - Parses markdown to extract image URLs
   - Downloads images to `data/venues/<venue_id>/raw_images/`
   - Filters by size (>50KB to avoid icons)
   - Updates `image_data` JSONB column with local paths

4. **Stage 4: Enrichment** (`stage_4_enrichment.ts`)
   - Uses Ollama (local LLM) to extract structured data from markdown
   - Extracts: is_wedding_venue, is_estate, is_historic, has_lodging, lodging_capacity, pricing_tier
   - Validates output against Zod schema
   - Updates venue columns with enriched data

5. **Stage 5: Image Filter** (`stage_5_image_filter.ts`)
   - Uses CLIP service to detect logos/watermarks/text graphics
   - Removes images identified as logos (confidence >0.85)
   - Updates `image_data` with verified image paths

### Key Utilities

- **`src/utils/logo-filter.ts`**: CLIP integration for logo detection
- **`src/utils/image-downloader.ts`**: Image extraction and download logic
- **`src/utils/spatial-utils.ts`**: Geospatial utilities for tile generation
- **`src/utils/validator.ts`**: Zod schema validation for LLM outputs

### Database Schema

The `venues` table (defined in `migrations/`) contains:
- Core fields: `venue_id`, `name`, `lat`, `lng`, `website_url`
- Raw data: `raw_markdown`, `image_data` (JSONB)
- Enriched fields: `is_wedding_venue`, `is_estate`, `is_historic`, `has_lodging`, `lodging_capacity`, `pricing_tier`

Database connection configured in `db/db-config.ts` using Knex.

### Docker Services

All external services run in Docker (see `docker-compose.yml`):
- **db**: PostGIS-enabled PostgreSQL on port 5432
- **crawler**: crawl4ai service on port 11235
- **ollama**: LLM service on port 11434 (requires GPU)
- **clip_api**: CLIP image classification on port 51000 (requires GPU)

All services share the `venue_network` Docker network.

## Working with Pipeline Stages

### Stage Dependencies
- Stages are **sequential and interdependent** - each stage expects specific data from the previous stage
- Stage contracts defined in `src/pipeline/stages.ts` (PipelineCtx, StageResult types)
- Modifying a stage's output may require updating downstream stages

### Common Modification Patterns
- **Adding new venue fields**: Update migration + TypeScript types + relevant stage logic
- **Changing stage output**: Check if downstream stages consume that data
- **Adding new stage**: Insert into stage array in `bin/run.ts` and implement Stage interface
- **Debugging stage issues**: Use test commands to isolate the problem stage

### Stage State Management
- Each stage updates `venues` table directly via Knex
- Use `.where()` clauses to process only relevant records (e.g., `whereNotNull('raw_markdown')`)
- Progress tracking via `cli-progress` bars (already implemented in stages)

## External Service Dependencies

This project relies on several external services that can block progress:

### Overpass API (OpenStreetMap)
- **Rate Limits**: 300ms delay between requests (configured in pipeline)
- **Failover**: Uses 3 endpoints in round-robin (overpass-api.de, private.coffee, osm.jp)
- **Blocking**: If all endpoints fail, document in `.crawl_errors.log`
- **Workaround**: Increase `delayMs` or reduce tile size

### Ollama (LLM Service)
- **Requires**: GPU (NVIDIA with docker-compose GPU support)
- **Port**: 11434
- **Common Issues**: Service not running, model not pulled, GPU memory exhausted
- **Verification**: `curl http://localhost:11434/api/tags`
- **Blocking**: If Ollama fails, Stage 4 cannot proceed - document in error logs

### CLIP (Image Classification)
- **Requires**: GPU (NVIDIA with docker-compose GPU support)
- **Port**: 51000
- **Common Issues**: Timeouts on large batches, GPU memory issues
- **Workaround**: Process images in smaller batches with p-limit
- **Blocking**: If CLIP unavailable, Stage 5 cannot filter logos

### crawl4ai (Web Crawler)
- **Port**: 11235
- **Requires**: 1GB shared memory for Playwright
- **Common Issues**: Bot protection, rate limits, site-specific blocks
- **Blocking**: Per-venue failures are logged but don't block pipeline
- **Error Logs**: `.crawl_errors.log` and `crawl_errors.log`

### When to Stop vs. Continue
- **API rate limits**: Document and continue with reduced concurrency
- **Bot protection**: Log affected venues and skip (not all venues are crawlable)
- **GPU service down**: Must fix before proceeding with dependent stages
- **Database connection issues**: Must fix immediately (blocks all stages)

## Database Schema Changes

### Migration Best Practices
- **Never modify existing migrations** - always create new ones
- **Use TypeScript migrations**: `npm run migrate:make <name>` generates `.ts` files
- **Test migrations**: Run `migrate:latest` and verify with `db:shell`
- **Rollback safety**: Implement `down()` function for all migrations

### JSONB Schema Evolution
- `image_data` column uses JSONB for flexible schema without migrations
- Current structure: `{ local_paths: string[], processed_at: Date, clip_logo_verified?: boolean }`
- Adding fields to JSONB: Update TypeScript types + stage logic (no migration needed)
- Querying JSONB: Use `.whereRaw()` for complex queries (see `stage_5_image_filter.ts`)

### Adding New Venue Fields
1. Create migration: `npm run migrate:make add_field_to_venues`
2. Update TypeScript types (if using typed models)
3. Update relevant pipeline stage(s) to populate the field
4. Run migration: `npm run migrate:latest`
5. Test with appropriate `test:*` command

## Scope Guidelines

### Pipeline Stage Modifications
- **Single stage change**: Safe to proceed after testing with `test:*` command
- **Multi-stage change**: Explain full impact and test with small bbox first
- **Stage contract change** (PipelineCtx/StageResult): May affect all stages - verify carefully

### Migration Changes
- **New migration**: Standard workflow
- **Modifying existing migration**: STOP - create new migration instead
- **Schema-breaking change**: Consider JSONB fields first to avoid breaking existing data

### Docker Compose Changes
- **Adding service**: May require `docker compose up --build`
- **Changing GPU allocation**: Requires `docker compose down` and `up`
- **Network changes**: Affects all services - update connection strings in code

### Frontend Changes
- **Completely independent** from backend pipeline
- Can be modified without affecting data processing
- Only connection point is data export (CSV/JSON output from pipeline)

## Important Notes

- The pipeline processes venues in tiles to manage memory and API rate limits
- Default bbox is a small test area in SF; change to California bbox for full runs (see `bin/run.ts`)
- GPU required for Ollama and CLIP services (configured via docker-compose)
- crawl4ai requires 1GB shared memory for Playwright browser
- Stage 2 (crawl) is deprecated for new pipeline (see git commit notes) but still functional
- Image paths in `image_data` are absolute paths on the host filesystem
- Error logs accumulate over runs - clear them periodically or rotate
