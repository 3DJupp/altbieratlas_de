# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Altbieratlas is an interactive map of Altbier breweries/taprooms/shops in Germany, running as a **Cloudflare Worker** with a **D1 (SQLite)** database. There is no build step — the Worker serves `public/` as static assets and handles `/api/*` routes directly.

## Common Commands

```bash
# Local development (requires wrangler login first)
npm run db:setup        # Apply all migrations to local D1 (schema + seed + upgrade)
npm run dev             # Start wrangler dev server at http://localhost:8787

# Database
npm run db:setup:remote         # Apply migrations to production D1
npm run db:setup:demo           # Apply migrations + demo data locally
npm run db:create               # Create a new D1 database (first-time setup)

# Deploy (normally handled by Cloudflare Workers Builds CI, not run manually)
bash scripts/deploy.sh          # Deploy Worker only
bash scripts/deploy.sh --seed   # First-time: schema + seed + upgrade + deploy
bash scripts/deploy.sh --migrate # Existing install: run upgrade migration + deploy

# Admin user
npm run admin:create -- admin <password> --email=x@example.com --remote
```

**UI-only testing without a backend:** Open any `public/*.html` file directly in a browser — `api-client.js` detects the missing backend and activates **mock mode**, serving data from `public/data.js` and LocalStorage.

## Architecture

### Request Flow

```
Browser
  → Cloudflare Worker (src/worker.js)
      ├─ /api/*         → route handlers in src/routes.js
      │    └─ utilities  (src/utils.js): auth, hashing, rate-limiting, email
      ├─ /sitemap.xml   → R.sitemap()
      ├─ /impressum.html → R.serveImpressum() (SSI: SITE_CONFIG injected into HTML)
      └─ everything else → ASSETS binding (static files from public/)
```

`worker.js` contains a minimal hand-rolled router (`match()`) — there is no routing framework. Routes are registered as `[METHOD, pattern, handler]` tuples in the `ROUTES` array.

### Frontend (Vanilla JS, no framework)

Each HTML page is self-contained. Shared infrastructure is loaded via `<script>` tags in this order:

1. `config.js` — sets `window.ATLAS_CONFIG` (mock-mode fallback defaults)
2. `i18n.js` — DE/EN translation strings
3. `shell.js` — renders header, footer, cookie banner; reads `ATLAS_CONFIG`
4. `api-client.js` — probes `/api/config` on load; switches between **live** and **mock** mode and merges server config into `window.ATLAS_CONFIG`; exposes `window.ATLAS_API`

Pages call `window.ATLAS_API.*` methods which work identically in both modes.

### Configuration

All runtime configuration lives in the **Cloudflare Dashboard** (Workers → Settings → Variables and Secrets), not in `wrangler.toml`. The single variable is `SITE_CONFIG` (a JSON string). `keep_vars = true` in `wrangler.toml` ensures dashboard values survive every `wrangler deploy`.

The `wrangler.toml` contains **placeholder** D1 credentials (`REPLACE_WITH_YOUR_D1_ID`, `REPLACE_WITH_YOUR_D1_NAME`). `scripts/deploy.sh` replaces these via `sed` at deploy time using `database_id` and `database_name` build environment variables set in the dashboard.

### Database Schema

Key tables: `breweries`, `venue_types`, `styles`, `brewery_styles` (n:m), `prices`, `events`, `event_beers`, `contributions`, `admin_users`, `admin_sessions`, `password_resets`, `rate_limits`, `glossary`.

**FK cascades are aggressive**: deleting a brewery cascades to prices, `brewery_styles`, events, and event_beers. Always snapshot (`wrangler d1 export`) before destructive operations.

Migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `INSERT OR IGNORE`). New installations only need `0001` + `0002`; `0003` is an upgrade path for existing installs.

### Auth & Security

- Admin sessions use a 32-byte random token in a `HttpOnly; Secure; SameSite=Strict` cookie named `atlas_session` (8h TTL)
- Passwords: PBKDF2-SHA256, 100,000 iterations, 16-byte salt
- Rate limits are D1-backed and IP-bound (`rate_limits` table): contributions 20/h, login 5/5min, password-reset 3/15min
- Turnstile verification is skipped when `TURNSTILE_SECRET_KEY` is absent (safe for local dev)

### Versioning

`APP_VERSION` in `src/utils.js` must match the `version` field in `package.json`. Update both together when bumping the version.

### Email

All transactional mail (contribution confirmations, password-reset, daily admin digest) goes through [Resend](https://resend.com) via the `RESEND_API_KEY` secret. The daily digest is triggered by a Cloudflare Cron at `0 7 * * *` (07:00 UTC).
