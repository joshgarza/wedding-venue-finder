# Seed Data Management - Session Notes

## Problem
Clicking "Try Demo" on the login page fails with "Make sure seed data exists (npm run seed)" unless the user has manually run `npm run seed` from the CLI.

## Solution
Auto-run `npm run seed` when the API container starts. The seed script is already idempotent (upserts venues, skips existing images, ignores existing user), so it's safe to run on every container start.

## Changes (2 files, 5 lines)

### `Dockerfile`
- Added `COPY --from=builder /app/bin ./bin` so the seed script is available in the container
- Changed CMD from `npm run api` to `sh -c "npm run seed && npm run api"`

### `docker-compose.yml`
- Changed `./data/venues:/app/data/venues:ro` to `./data/venues:/app/data/venues` (removed read-only — seed needs to write images)
- Added `./bin:/app/bin` volume mount so dev source changes are reflected

## Not yet tested
These changes need to be tested on a separate container instance (different ports) while the main containers stay running. The previous session attempted this but ran into issues with port conflicts and env var misconfigurations.

## Testing plan
1. Create a `docker-compose.test.yml` that runs api + frontend on different ports (e.g. 3004/5175)
2. Connect to the existing DB on `main_venue_network`
3. Set `VITE_API_URL=http://localhost:3004/api/v1` on the frontend container
4. Verify "Try Demo" works end-to-end: auto-seeds, logs in, images load, onboarding works
