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

# IndexNow (needs the INDEXNOW_KEY secret; the worker pings automatically after
# admin mutations and hourly for direct D1 changes — this is for the initial submission and for changes made
# straight in the D1 console)
INDEXNOW_KEY=<key> npm run seo:indexnow              # all sitemap URLs
INDEXNOW_KEY=<key> npm run seo:indexnow -- --dry-run # list only
# (deploy.sh does the full-sitemap submit itself after each production deploy
#  when INDEXNOW_KEY is also a build variable)
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
      ├─ /llms.txt, /llms-full.txt → SEO.llmsTxt() / SEO.llmsFullTxt() (src/seo.js, aus D1)
      ├─ /, /ranglisten, /wissen, /sorten → SEO.serveIndex/serveRanglisten/serveWissen/serveSorten (SSR, Fallback: statisch)
      ├─ /impressum.html     → R.serveImpressum() (SSI: site_settings injected into HTML)
      ├─ /<page> (no .html) → 301 redirect to /<page>.html (known pages only, not /)
      └─ everything else     → ASSETS binding (static files from public/)
```

Every GET HTML response passes through `SEO.applyLangVariant()`: `?lang=en` serves the same German HTML (translation happens client-side in `i18n.js`), so the variant gets `noindex, follow` (meta + `X-Robots-Tag`), canonical/`og:url` stay on the German URL and hreflang links are stripped. No page emits hreflang alternates; only reintroduce them together with server-side translated EN content. Unknown venue slugs, unknown/missing event IDs and unknown paths return a real 404 via `notFoundPage()` (handlers signal it with a bare 404 response), never an empty shell with 200 (Soft 404). Successful admin mutations trigger `SEO.pingIndexNow()` (no-op without the `INDEXNOW_KEY` secret, but it logs one `console.warn` per isolate so a missing key never fails silently). In addition the hourly cron runs `SEO.sweepIndexNow()`, which reports everything changed since its last run (watermark `indexnow_last_until` in `site_settings`), so venues, prices and events written straight into D1 get submitted too. Whenever either finds a change, it also submits the existing `/stadt/<slug>` pages of the changed venues and every static page in `PAGE_DATES` (so a new public page reaches IndexNow by being added there). A deploy changes pages without touching D1, so `scripts/deploy.sh` submits the whole sitemap via `scripts/indexnow.sh` after every production deploy, if `INDEXNOW_KEY` is also set as a **build** variable (missing → warning only, never a failed deploy). It waits until the key file `/<key>.txt` returns the new version's ID in `x-worker-version` (binding `CF_VERSION_METADATA`) before submitting; keep that header and never print the key in build logs.

`robots.txt` and other plain-text assets get `charset=utf-8` in the worker's final ASSETS branch: `public/_headers` is not reliably applied with `run_worker_first = true` (and `wrangler dev` adds the charset on its own, so it can't verify this).

`worker.js` contains a minimal hand-rolled router (`match()`) — there is no routing framework. Routes are registered as `[METHOD, pattern, handler]` tuples in the `ROUTES` array.

### Frontend (Vanilla JS, no framework)

Each HTML page is self-contained. Shared infrastructure is loaded via `<script>` tags in this order:

1. `config.js` — sets `window.ATLAS_CONFIG` (mock-mode fallback defaults)
2. `i18n.js` — DE/EN translation strings
3. `shell.js` — renders header, footer, cookie banner, site banner; reads `ATLAS_CONFIG`
4. `api-client.js` — probes `/api/config` on load; switches between **live** and **mock** mode and merges server config into `window.ATLAS_CONFIG`; exposes `window.ATLAS_API`

Pages call `window.ATLAS_API.*` methods which work identically in both modes.

### Configuration

Runtime config lives in the **Cloudflare Dashboard** (Workers → Settings → Variables and Secrets). There are no `[vars]` in `wrangler.toml`. The split:

- **Single-value secrets** (read directly from `env.*`, never wiped by deploys): `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `GA4_MEASUREMENT_ID`, `UNTAPPD_CLIENT_ID`, `UNTAPPD_CLIENT_SECRET`, `RESEND_API_KEY`, `ADMIN_EMAIL`, `MAP_TILE_API_KEY`, `INDEXNOW_KEY` (optional), `GOOGLE_PLACES_KEY` (optional, Places API New; also needed locally as env var for `scripts/backfill-place-ids.mjs`; never log or print it). The site key and GA4 ID are public but stored as secrets so they reliably survive deploys (the worker reads them and returns them via `/api/config`). Each is defined **once**, only as the env var — no `SITE_CONFIG`/D1 fallback. Only exception: `INDEXNOW_KEY` may also exist as a build variable with the same value, used solely by `scripts/deploy.sh`.
- **`SITE_CONFIG`** (a JSON-string **plaintext** variable) holds the remaining non-sensitive collection: `priceSizes`, `highlightedSizes`, `requireModeration`, `siteUrl`, `resendFrom`, `contactEmail`, `mapTileUrl`, `mapTileAttribution`, `digestWeekdays`, `digestHours`, `digestReminderWeekday`, `digestReminderHour`, plus `author`/`impressum` fallbacks. Plaintext vars survive deploys **only** because `keep_vars = true` sits at the **top level** of `wrangler.toml` — if placed after any `[table]`/`[[table]]` header, TOML parses it as that table's property and wrangler silently ignores it (this bug once sat under `[[rules]]`). **Secrets always survive regardless of `keep_vars`.**

Map tiles: `MAP_TILE_API_KEY` is substituted into the `{apiKey}` placeholder of the tile URL — CARTO's raster basemaps expect it as the query parameter `key` (not `api_key`); a different provider is handled by overriding `SITE_CONFIG.mapTileUrl`, never by editing the substitution. Without the key the frontend falls back to keyless OSM tiles (dimmed via the `.tiles-dimmed` CSS filter) instead of CARTO's "API KEY REQUIRED" tiles. Both maps (`index.html`, `ort.html`) go through `window.atlasTileLayer()` in `shell.js` — never create a `L.tileLayer` directly.

Admin-configurable content (banner, social links/author, impressum) is stored **solely** in the `site_settings` D1 table and edited via the admin panel — there is no `SITE_CONFIG` fallback for these (single source).

The `wrangler.toml` contains **placeholder** D1 credentials (`REPLACE_WITH_YOUR_D1_ID`, `REPLACE_WITH_YOUR_D1_NAME`). `scripts/deploy.sh` replaces these via `sed` at deploy time using `database_id` and `database_name` build environment variables set in the dashboard. In a Workers Builds run for any branch other than `main` (`WORKERS_CI_BRANCH`, overridable via `PRODUCTION_BRANCH`) it only runs `wrangler versions upload` and never goes live — a branch build once overwrote production this way. Keep that guard.

### Database Schema

Key tables: `breweries` (incl. `is_historical` flag, `highlighted` — golden map pin for sponsoring, 0 = off, > 0 = on, an integer so levels can be added later — and `successor_id` — who runs the brand today, shown as „Heute bei …“; editable in the admin edit dialog), `venue_types`, `styles`, `brewery_styles` (n:m), `prices` (optional `style_id`: which beer the price is for — set it whenever a venue pours more than one Alt), `events`, `event_beers`, `contributions`, `admin_users`, `admin_sessions`, `password_reset_tokens`, `rate_limits`, `glossary`, `site_settings`, `untappd_cache` (keyed by venue ID; `breweries.untappd_id` overrides the name search: NULL = search, 0 = hidden, > 0 = fixed Untappd ID — changing it clears the cache), `google_places_cache` (rating/count and Google's coordinates per Place ID, max. 30 days per Google terms — only `breweries.google_place_id` may be stored permanently, so Google's coordinates are only compared against the pin in the admin's „Pins prüfen“, never copied into `breweries`; historical venues get no Place ID, and setting `is_historical` clears it).

Opening hours: `breweries.opening_hours` (own, format in `src/hours.js`) win; otherwise the venue page shows Google's `regularOpeningHours` from `google_places_cache` labelled „laut Google“ — never copy those into `breweries`, and only own hours go into JSON-LD. „Jetzt geöffnet“ and offer timing always use Europe/Berlin (`window.atlasHours`/`window.atlasOffers` in `shell.js`). `offers` (see `src/offers.js`) holds venue offers and partner coupons; coupons and `highlighted` venues are always visibly labelled „Partner“ (paid placement), and neither may ever influence rankings or price comparisons. `contributions.type` includes `offer`. The contact form (`POST /api/contact`, `/kooperation`) only mails `ADMIN_EMAIL` and stores nothing.

Pure breweries (venue type `brewery`) don't pour and are left out of every comparison (price rankings, averages, „Preis gesucht“, Google ranking): use `inComparisons()` (`src/utils.js`) on the server and `window.atlasInComparisons()` (`shell.js`) in the browser, never a hand-written type check. Public style lists go through `STYLE_PUBLIC_SQL`, which hides a style until one of its places is approved.

Maps links always go through `mapsLink()` (`src/googlePlaces.js`) / `window.atlasMapsLink()` (`shell.js`): Place ID → `maps_url` → coordinates. The API's `mapsUrl` is the resolved link, `rawMapsUrl` the stored field (the admin form must edit the raw one). A second cron `0 4-6 * * 1` refreshes `google_places_cache` (max. 40 places per run — the free plan allows 50 subrequests per invocation, so every Google-calling path works in batches) (`GOOGLE_RATINGS_CRON` in `worker.js` must match `wrangler.toml`).

**FK cascades are aggressive**: deleting a brewery cascades to prices, `brewery_styles`, events, and event_beers. Always snapshot (`wrangler d1 export`) before destructive operations.

### Migrations policy — WICHTIG

**Es gibt immer genau zwei kanonische SQL-Dateien:**

| Datei | Zweck |
|---|---|
| `migrations/0001_schema.sql` | Vollständiges Schema — alle Tabellen, Indizes, FK-Kaskaden. Idempotent (`CREATE TABLE IF NOT EXISTS`). |
| `migrations/0002_seed.sql` | Alle Seed-Daten — Venue-Typen, Stile, Glossar, Brauereien, Preise, Events. Idempotent (`INSERT OR IGNORE`). |

Wird das Schema oder die Seed-Daten geändert (neue Spalte, neue Brauerei, neue Venue-Typen etc.), sind **beide Dateien sofort anzupassen** — nicht als neue Datei `0003_…` o. ä. anlegen. Neue Numbering-Dateien nur temporär anlegen, wenn Upgrades für bestehende Produktionsinstanzen notwendig sind, und danach sofort wieder in die zwei kanonischen Dateien integrieren und die temporäre Datei löschen.

Für Live-Upgrades bestehender Instanzen: Upgrade-SQL direkt in der D1-Dashboard-Console ausführen.

### Daten-Updates (Events, neue Orte) — Seed vs. Live-DB

Das normale Deploy spielt den Seed **nicht** ein (nur `deploy.sh --seed` bei Neuinstallation). Änderungen an `0002_seed.sql`/`public/data.js` erreichen die Produktion also nicht.

- **Orte:** In `0002_seed.sql` und `public/data.js` kommen **nur Hausbrauereien/Brauereien** (die Produzenten, Venue-Typen mit `is_producer = 1`) samt ihren Stilen und Preisen. Kneipen, Gastronomie, Restaurants, Kioske, Handel usw. (z. B. neue Orte aus Community-Hinweisen) werden **nur in die Live-D1** geschrieben, nicht in Seed oder Mock. Einzige Ausnahme: der Stammausschank, der Primär-Ort einer Sorte ist (`styles.primary_brewery_id`). Der Seed soll schlank bleiben: nennenswerte Brauereien, kein Abbild der Live-D1.
- **Doku bleibt technisch.** README, `BACKLOG.md`, `CLAUDE.md` und Code-Kommentare nennen keine konkreten Städte, Lokale oder Orts-IDs als Aufgaben oder Beispiele (Platzhalter wie `/ort/<slug>` verwenden). Inhalte pflegen die Mitwirkenden in der Live-D1.
- **Die Live-D1 ist die Quelle der Wahrheit.** Seed und `data.js` sind nur Startbestand bzw. Mock und müssen nicht mit ihr synchron sein. Bei Abweichungen gilt die D1; vor Datenänderungen dort nachsehen, was existiert.
- **Events** gehen nur in die Live-D1 (`INSERT OR IGNORE` per `wrangler d1 execute <db> --remote --command "…"`, Cloudflare-MCP `d1_database_query` oder Admin-Panel). `0002_seed.sql` und `public/data.js` enthalten nur zwei Beispiele (ein Fest ohne Brauerei, ein Brauerei-Termin mit Event-Bier) und werden für neue Termine nicht ergänzt.
- **Status:** ungeprüfte Funde (z. B. aus der Daten-Recherche) → `status = 'pending'` (im Seed wie in der DB); der Admin prüft und schaltet frei. Nur verifizierte Einträge `approved`. Nie ungeprüft mit `approved` in die Produktion schreiben.
- Geplante Daten-Recherche-Routinen: Funde mit `pending` in die Live-D1 schreiben; vorher prüfen, ob IDs/Brauereien existieren.
- **Keine PRs und keine Commits für reine Datenpflege.** Neue Orte, Preise oder Status einzelner Lokale gehen nur in die Live-D1; Ergebnis und verworfene Kandidaten stehen in der Antwort an den Nutzer, nicht in `BACKLOG.md`. PRs nur für Code-Änderungen (inkl. Seed/Mock, wenn sich der Startbestand an Brauereien ändert).

### Zweisprachigkeit — immer DE und EN

Jedes Objekt mit Sprachfeldern wird **immer in beiden Sprachen** gepflegt: `breweries.description_*`, `styles.tasting_*`, `events.title_*`/`description_*`, `event_beers.name_*`, `glossary.definition_*`, `venue_types.name_*`/`header_*` sowie die Texte in `public/data.js`. Gilt für Seed, Mock und Live-D1 gleichermaßen; nie ein Feld leer lassen oder nur eine Sprache schreiben. Eigennamen (z. B. Biernamen) dürfen in EN identisch sein. Das Admin-Panel fragt vor dem Speichern nach, wenn eine Sprache fehlt (`confirmBothLangs()` in `admin.html`).

### Auth & Security

- Admin sessions use a 32-byte random token in a `HttpOnly; Secure; SameSite=Strict` cookie named `atlas_session` (8h TTL)
- Passwords: PBKDF2-SHA256, 100,000 iterations, 16-byte salt
- Rate limits are D1-backed and IP-bound (`rate_limits` table): contributions 20/h, contact form 5/h, login 5/5min, password-reset 3/15min
- Destructive admin actions confirm on the server too (e.g. resetting the Rhine-derby votes needs `confirm: "ZURÜCKSETZEN"`); admins can't delete themselves or the last admin
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

All transactional mail (contribution confirmations, an instant admin notification per contribution, password-reset, admin digest) goes through [Resend](https://resend.com) via the `RESEND_API_KEY` secret. The digest runs by default daily at 10:00 and 22:00 Europe/Berlin: the Cron `0 * * * *` fires hourly (UTC) and `scheduled()` asks `digestSchedule()` whether the current Berlin weekday and hour are due. It lists only contributions that are still `pending` since the last sent digest (watermark `digest_last_until` in `site_settings`), so windows never overlap and nothing is sent when nothing new is open. On reminder runs (default Monday 10:00) the same mail also lists everything older that is still pending. Weekdays and hours of both are set via `SITE_CONFIG` (`digestWeekdays`, `digestHours`, `digestReminderWeekday`, `digestReminderHour`), each a number or an array; `null`/`[]` disables. Contributions posted from a valid admin session get `payload._admin` (a client-sent value is dropped) and are skipped by both the instant notification and the digest.

### README- und Sitemap-Pflege

**README.md** muss bei jeder inhaltlichen Änderung direkt mitgepflegt werden:
- Neue Seite in `public/` → Dateibaum aktualisieren
- Neues Feature → Abschnitt unter „Features" ergänzen
- Neuer API-Endpunkt → Tabelle in „API-Endpunkte" ergänzen
- Versions-Bump → Heading `# Altbieratlas · vX.Y.Z` aktualisieren

**Sitemap** (`src/routes.js`, `staticPaths`-Array in der `sitemap()`-Funktion) muss bei jeder neuen öffentlichen Seite aktualisiert werden:
- Neue Seite in `public/` → URL zur `staticPaths`-Liste hinzufügen
- Prioritäten: `/` = 1.0, Inhaltsseiten = 0.7
- Nicht in die Sitemap: `/admin`, `noindex`-Seiten (`/impressum`, 404), dynamische Detail-URLs (werden separat über DB-Queries generiert)
- Aktuelle Sitemap-Seiten: `/`, `/ranglisten`, `/wissen`, `/sorten`, `/rivalen`, `/beitragen`, `/staedte`, `/kooperation`
- Neue öffentliche Seite → auch in `llmsTxt()` (`src/seo.js`, Abschnitt „Seiten") aufnehmen

**Sitemap-Datum (`PAGE_DATES`, exportiert direkt über `sitemap()` in `src/routes.js`, auch für JSON-LD `dateModified` genutzt)**: Jede statische Seite hat ein eigenes `lastmod`-Datum in der `PAGE_DATES`-Map. Dieses Datum **muss** aktualisiert werden, wenn:
- Eine `public/*.html`-Seite inhaltlich geändert wird → zugehöriges Datum auf aktuellen Tag setzen
- Globale Änderungen alle Seiten betreffen (z.B. neue Nav-Links in `shell.js`, neue i18n-Keys, CSS-Redesign) → alle betroffenen Seiten-Daten aktualisieren
- Reine Bugfixes ohne Inhaltsänderung (Tippfehler, Syntax) müssen das Datum **nicht** ändern

`/` und `/ranglisten` bekommen automatisch das neuere von `PAGE_DATES`-Datum und dem DB-`lastMod` (letztes Brauerei-Update), da sie datengetrieben sind.
