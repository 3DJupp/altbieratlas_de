# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Altbieratlas is an interactive map of Altbier breweries/taprooms/shops in Germany, running as a **Cloudflare Worker** with a **D1 (SQLite)** database. There is no build step — the Worker serves `public/` as static assets and handles `/api/*` routes directly.

## Common Commands

```bash
# Local development (requires wrangler login first)
npm run db:setup        # Apply schema + seed to local D1
npm run dev             # Start wrangler dev server at http://localhost:8787

# Database
npm run db:setup:remote         # Apply migrations to production D1
npm run db:create               # Create a new D1 database (first-time setup)

# Deploy (normally handled by Cloudflare Workers Builds CI, not run manually)
bash scripts/deploy.sh          # Deploy Worker only
bash scripts/deploy.sh --seed   # First-time: schema + seed + deploy

# Admin user
npm run admin:create -- admin <password> --email=x@example.com --remote
```

**UI-only testing without a backend:** Open any `public/*.html` file directly in a browser — `api-client.js` detects the missing backend and activates **mock mode**, serving data from `public/data.js` and LocalStorage.

## Architecture

### Request Flow

```
Browser
  → Cloudflare Worker (src/worker.js)
      ├─ /api/*              → route handlers in src/routes.js
      │    └─ utilities       (src/utils.js): auth, hashing, rate-limiting, email
      ├─ /sitemap.xml        → R.sitemap()
      ├─ /impressum.html     → R.serveImpressum() (SSI: site_settings injected into HTML)
      ├─ /<page> (no .html) → 301 redirect to /<page>.html (known pages only, not /)
      └─ everything else     → ASSETS binding (static files from public/)
```

`worker.js` contains a minimal hand-rolled router (`match()`) — there is no routing framework. Routes are registered as `[METHOD, pattern, handler]` tuples in the `ROUTES` array.

### Frontend (Vanilla JS, no framework)

Each HTML page is self-contained. Shared infrastructure is loaded via `<script>` tags in this order:

1. `config.js` — sets `window.ATLAS_CONFIG` (mock-mode fallback defaults)
2. `i18n.js` — DE/EN translation strings
3. `shell.js` — renders header, footer, cookie banner, site banner; reads `ATLAS_CONFIG`
4. `api-client.js` — probes `/api/config` on load; switches between **live** and **mock** mode and merges server config into `window.ATLAS_CONFIG`; exposes `window.ATLAS_API`

Pages call `window.ATLAS_API.*` methods which work identically in both modes.

### Configuration

Runtime config lives in the **Cloudflare Dashboard** (Workers → Settings → Variables and Secrets) as `SITE_CONFIG` (a JSON string). `keep_vars = true` in `wrangler.toml` keeps dashboard **plaintext variables** from being wiped on `wrangler deploy` — but it **only works as a top-level key**: if placed after any `[table]`/`[[table]]` header TOML parses it as that table's property and wrangler silently ignores it (this happened — it sat under `[[rules]]`, so every deploy deleted dashboard plaintext vars like `TURNSTILE_SITE_KEY`; **secrets always survive** regardless). Guidance: secrets (e.g. `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`) belong in the dashboard; **public, non-sensitive values that must survive every deploy** belong in `wrangler.toml` under `[vars]` (e.g. `TURNSTILE_SITE_KEY`, which takes precedence over `SITE_CONFIG.turnstileSiteKey`). Never put secrets in `[vars]` — that file is version-controlled.

Admin-configurable values (banner, social links, impressum, **Turnstile site key**) are stored in the `site_settings` D1 table and take precedence over `SITE_CONFIG`/`[vars]`. The Turnstile public site key resolves as: D1 `site_settings['turnstile.site_key']` (admin panel, no redeploy) → `env.TURNSTILE_SITE_KEY` (`[vars]`) → `SITE_CONFIG.turnstileSiteKey`. The secret (`TURNSTILE_SECRET_KEY`) stays a dashboard secret.

The `wrangler.toml` contains **placeholder** D1 credentials (`REPLACE_WITH_YOUR_D1_ID`, `REPLACE_WITH_YOUR_D1_NAME`). `scripts/deploy.sh` replaces these via `sed` at deploy time using `database_id` and `database_name` build environment variables set in the dashboard.

### Database Schema

Key tables: `breweries` (incl. `is_historical` flag), `venue_types`, `styles`, `brewery_styles` (n:m), `prices`, `events`, `event_beers`, `contributions`, `admin_users`, `admin_sessions`, `password_reset_tokens`, `rate_limits`, `glossary`, `site_settings`, `untappd_cache`.

**FK cascades are aggressive**: deleting a brewery cascades to prices, `brewery_styles`, events, and event_beers. Always snapshot (`wrangler d1 export`) before destructive operations.

### Migrations policy — WICHTIG

**Es gibt immer genau zwei kanonische SQL-Dateien:**

| Datei | Zweck |
|---|---|
| `migrations/0001_schema.sql` | Vollständiges Schema — alle Tabellen, Indizes, FK-Kaskaden. Idempotent (`CREATE TABLE IF NOT EXISTS`). |
| `migrations/0002_seed.sql` | Alle Seed-Daten — Venue-Typen, Stile, Glossar, Brauereien, Preise, Events. Idempotent (`INSERT OR IGNORE`). |

Wird das Schema oder die Seed-Daten geändert (neue Spalte, neue Brauerei, neue Venue-Typen etc.), sind **beide Dateien sofort anzupassen** — nicht als neue Datei `0003_…` o. ä. anlegen. Neue Numbering-Dateien nur temporär anlegen, wenn Upgrades für bestehende Produktionsinstanzen notwendig sind, und danach sofort wieder in die zwei kanonischen Dateien integrieren und die temporäre Datei löschen.

Für Live-Upgrades bestehender Instanzen: Upgrade-SQL direkt in der D1-Dashboard-Console ausführen.

### Auth & Security

- Admin sessions use a 32-byte random token in a `HttpOnly; Secure; SameSite=Strict` cookie named `atlas_session` (8h TTL)
- Passwords: PBKDF2-SHA256, 100,000 iterations, 16-byte salt
- Rate limits are D1-backed and IP-bound (`rate_limits` table): contributions 20/h, login 5/5min, password-reset 3/15min
- Turnstile verification is skipped when `TURNSTILE_SECRET_KEY` is absent (safe for local dev)

### Versioning

Bei jedem Versions-Bump **alle vier Stellen** gleichzeitig anpassen:

| Datei | Was ändern |
|---|---|
| `src/utils.js` | `APP_VERSION = "x.y.z"` |
| `package.json` | `"version": "x.y.z"` |
| `README.md` | Heading `# Altbieratlas · vx.y.z` |
| `migrations/0002_seed.sql` | Versions-Kommentar in der Kopfzeile |

Die Versionsnummer wird automatisch über `/api/config` an das Frontend gereicht und im Footer angezeigt — kein separates Frontend-Update notwendig.

### Email

All transactional mail (contribution confirmations, password-reset, daily admin digest) goes through [Resend](https://resend.com) via the `RESEND_API_KEY` secret. The daily digest is triggered by a Cloudflare Cron at `0 7 * * *` (07:00 UTC).

### README- und Sitemap-Pflege

**README.md** muss bei jeder inhaltlichen Änderung direkt mitgepflegt werden:
- Neue Seite in `public/` → Dateibaum aktualisieren
- Neues Feature → Abschnitt unter „Features" ergänzen
- Neuer API-Endpunkt → Tabelle in „API-Endpunkte" ergänzen
- Versions-Bump → Heading `# Altbieratlas · vX.Y.Z` aktualisieren

**Sitemap** (`src/routes.js`, `staticPaths`-Array in der `sitemap()`-Funktion) muss bei jeder neuen öffentlichen Seite aktualisiert werden:
- Neue Seite in `public/` → URL zur `staticPaths`-Liste hinzufügen
- Prioritäten: `/` = 1.0, Inhaltsseiten = 0.7, Rechtliches (`/impressum`) = 0.3
- Nicht in die Sitemap: `/admin`, dynamische Detail-URLs (werden separat über DB-Queries generiert)
- Aktuelle Sitemap-Seiten: `/`, `/ranglisten`, `/wissen`, `/rivalen`, `/beitragen`, `/impressum`

**Sitemap-Datum (`PAGE_DATES` in `sitemap()`)**: Jede statische Seite hat ein eigenes `lastmod`-Datum in der `PAGE_DATES`-Map. Dieses Datum **muss** aktualisiert werden, wenn:
- Eine `public/*.html`-Seite inhaltlich geändert wird → zugehöriges Datum auf aktuellen Tag setzen
- Globale Änderungen alle Seiten betreffen (z.B. neue Nav-Links in `shell.js`, neue i18n-Keys, CSS-Redesign) → alle betroffenen Seiten-Daten aktualisieren
- Reine Bugfixes ohne Inhaltsänderung (Tippfehler, Syntax) müssen das Datum **nicht** ändern

`/` und `/ranglisten` bekommen automatisch das neuere von `PAGE_DATES`-Datum und dem DB-`lastMod` (letztes Brauerei-Update), da sie datengetrieben sind.
