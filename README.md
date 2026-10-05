# Altbieratlas · v0.11.1

Die interaktive Karte des Altbiers — betrieben als **Cloudflare Worker + D1**.

```
altbieratlas/
├── src/
│   ├── worker.js            # Router (API + ASSETS)
│   ├── routes.js            # Public- & Admin-API
│   ├── seo.js               # llms.txt, SSR für /, /ranglisten, /wissen, ?lang=en, IndexNow
│   ├── cache.js             # Edge-Cache (Cache API) für öffentliche GET-Antworten
│   ├── d1meter.js           # Zählt D1-Abfragen/gelesene Zeilen pro Request ([d1]-Logzeile)
│   └── utils.js             # PBKDF2, Turnstile, Rate-Limit, E-Mail
├── public/
│   ├── index.html           # Landing + Karte (Leaflet)
│   ├── ort.html             # Ort-Detail + Preisverlauf + Untappd
│   ├── event.html           # Event-Detail
│   ├── ranglisten.html      # Preis-Ranglisten
│   ├── wissen.html          # Glossar & Hintergrund
│   ├── rivalen.html         # Alt vs. Kölsch — Das Rheinderby
│   ├── stadt.html           # Stadt-Landingpage (SSR, Slugs kommen aus D1)
│   ├── beitragen.html       # Beitrags-Formulare (5 Typen)
│   ├── impressum.html       # Impressum & Datenschutz
│   ├── admin.html           # Moderations-Dashboard
│   ├── 404.html             # Eigene Fehlerseite (Status 404, noindex)
│   ├── api-client.js        # Einheitliche API-Schnittstelle (live / mock)
│   ├── config.js            # Fallback-Konfiguration (Mock-Modus)
│   ├── i18n.js              # DE/EN
│   ├── shell.js             # Header / Footer / Cookie-Banner
│   ├── styles.css
│   ├── data.js              # Seed-Daten für Mock-Fallback
│   ├── manifest.webmanifest # PWA-Manifest
│   ├── robots.txt
│   └── favicon.svg …
├── migrations/
│   ├── 0001_schema.sql      # Vollständiges Schema (idempotent, Neuinstallation)
│   └── 0002_seed.sql        # Alle Seed-Daten: Venue-Typen, Stile, Glossar, Brauereien, Preise, Events
├── scripts/
│   ├── create-admin.mjs     # Admin-User anlegen
│   ├── db-setup.sh          # DB-Setup (Schema + Seed + Upgrade)
│   └── deploy.sh            # CI-Deploy (D1-Credentials via Env-Vars ersetzen)
├── wrangler.toml
└── package.json
```

---

## 1 · Setup

Gedeployed wird über **Workers Builds** (Cloudflare-Dashboard → GitHub-Integration). Schema-Setup und Deploys laufen vollständig im CI — **lokal brauchst du weder Wrangler noch eine installierte CLI**. Einzige Ausnahme: der Admin-User (dazu unten zwei Wege).

### Voraussetzungen

- Cloudflare-Account mit verbundenem GitHub-Account
- Node.js ≥ 20 (nur für den Admin-User, falls ohne lokalen Wrangler)

### 1.1 Einmalig: D1 anlegen, Schema einspielen, Admin-User anlegen

#### Schritt 1 — D1-Datenbank anlegen

**Option A (Dashboard):** Workers & Pages → D1 → *Create database* → Name `altbieratlas` → die angezeigte `database_id` notieren.

**Option B (CLI):**
```bash
npx wrangler login
npx wrangler d1 create altbieratlas
#  → Ausgabe merken: database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

#### Schritt 2 — Schema und Seed-Daten einspielen

Am einfachsten **direkt beim ersten Deploy** über `deploy.sh --seed`:

```bash
bash scripts/deploy.sh --seed
```

Oder manuell mit lokalem Wrangler:

```bash
bash scripts/db-setup.sh [--remote]
```

| Datei | Inhalt |
|---|---|
| `0001_schema.sql` | Vollständiges Schema — alle Tabellen, Indizes, FK-Kaskaden. Idempotent. |
| `0002_seed.sql` | Alle Seed-Daten: Venue-Typen (9), Bierstile, Glossar, Brauereien, Preise, Events. Idempotent via `INSERT OR IGNORE`. |

> **Seed vs. Live-DB:** Der Seed wird nur bei Neuinstallationen eingespielt. Events (vor allem die neusten) stehen deshalb immer sowohl im Seed/`data.js` als auch in der Live-D1 (`INSERT OR IGNORE`, `wrangler d1 execute --remote`, Cloudflare-MCP oder Admin-Panel). Ungeprüfte Funde erhalten `status='pending'` und werden im Admin freigegeben.

**Genau zwei Dateien — immer.** Neue Spalten, Brauereien, Stile etc. werden direkt in `0001` bzw. `0002` eingebaut, **nicht** als neue Datei `0003_…`. Für Upgrades bestehender Produktionsinstanzen: SQL direkt in der D1-Dashboard-Console ausführen.

> ⚠️ **Wichtig: FK-Kaskaden und Datenverlust**
>
> Das Schema setzt überall auf `ON DELETE CASCADE` / `ON DELETE SET NULL`. Das bedeutet:
> - **Brauerei löschen** → alle Preise, Stil-Zuordnungen (`brewery_styles`) und Events dieser Brauerei werden ebenfalls gelöscht.
> - **Stil löschen** → alle Zuordnungen in `brewery_styles` für diesen Stil werden gelöscht.
> - **Event löschen** → alle Event-Biere (`event_beers`) dieses Events werden gelöscht.
> - **Brauerei-ID umbenennen** → der Worker-Code aktualisiert per Batch alle FK-Referenzen (Preise, Stile, Events). Bei unbeabsichtigter Umbenennung (z. B. Tippfehler in der ID) können Daten verloren gehen, wenn das Rollback nicht rechtzeitig erfolgt. **Vor ID-Änderungen immer ein DB-Snapshot erstellen** (D1-Dashboard → *Export* oder `wrangler d1 export`).

**Alternative (D1-Dashboard-Console):** *Workers & Pages → D1 → altbieratlas → Console* — die SQL-Dateien nacheinander einfügen und ausführen.

#### Schritt 3 — Admin-User anlegen

**Option A — `INITIAL_ADMIN`-Secret (empfohlen, kein lokales Tool nötig):**

```bash
wrangler secret put INITIAL_ADMIN
# Eingabe als JSON (einzeilig):
# {"username":"admin","password":"sicheres-passwort","email":"deine@email.de"}
```

Der Worker legt den User automatisch beim ersten Request an, sofern noch keine Admin-User existieren. **Das Secret nach dem ersten Login im CF-Dashboard löschen.**

> `email` ist optional, aber notwendig für den Passwort-Reset per E-Mail.

**Option B — mit lokalem Wrangler:**
```bash
npm run admin:create -- admin <starkes-passwort> --email=deine@email.de --remote
```

**Option C — ohne Wrangler (nur Node.js + D1-Dashboard-Console):**

```bash
node -e "
const { webcrypto: c } = require('crypto');
const user = 'admin', pass = 'DEIN-PASSWORT-HIER', email = 'deine@email.de';
(async () => {
  const salt = c.getRandomValues(new Uint8Array(16));
  const key  = await c.subtle.importKey('raw', new TextEncoder().encode(pass), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await c.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const b64  = b => Buffer.from(b).toString('base64');
  const hash = 'pbkdf2\$100000\$' + b64(salt) + '\$' + b64(bits);
  console.log(\"INSERT INTO admin_users (username, password_hash, email) VALUES ('\" + user + \"', '\" + hash + \"', '\" + email + \"');\");
})();
"
```

> Passwort mindestens 10 Zeichen.

### 1.2 Workers-Build im Dashboard konfigurieren

Dashboard → **Workers & Pages → altbieratlas → Settings → Build**:

| Feld | Wert |
|---|---|
| Git repository | dein GitHub-Repo |
| Build command | `npm install` |
| **Deploy command** | `bash scripts/deploy.sh` |
| Root directory | `/` |
| Production branch | `main` |

Deploy-Flags:

```bash
bash scripts/deploy.sh          # Standard — jeder Push auf main (nur Worker)
bash scripts/deploy.sh --seed   # Ersteinrichtung: Schema + Seed + Deploy
```

### 1.3 Build-Variablen setzen

Unter *Settings → Build → Variables and secrets* (**Build-Sektion**):

| Name | Type | Wert |
|---|---|---|
| `database_id` | Secret | UUID aus `npx wrangler d1 create` |
| `database_name` | Secret | Name der D1-DB, z. B. `altbieratlas` |

### 1.4 Worker-Runtime-Variablen setzen

Unter *Settings → Variables and Secrets* (**Runtime-Sektion**):

#### Sammel-Konfigurationsvariable: `SITE_CONFIG`

Als **JSON-String** in der Plaintext-Variable `SITE_CONFIG` hinterlegen. Eine vollständige, ausfüllbare Vorlage liegt im Repo unter [`site-config.example.json`](./site-config.example.json) — Werte anpassen, als **eine Zeile** ins Dashboard kopieren.

```json
{
  "contactEmail":      "deine@email.de",
  "priceSizes":        [0.2, 0.25, 0.4, 0.5],
  "highlightedSizes":  [0.25],
  "requireModeration": true,
  "siteUrl":           "https://altbieratlas.de",
  "resendFrom":        "Altbieratlas <noreply@altbieratlas.de>"
}
```

| Feld | Beschreibung |
|---|---|
| `highlightedSizes` | Größen, die in Ranglisten hervorgehoben werden und beim Laden vorausgewählt sind. Empfehlung: `[0.25]` |
| `requireModeration` | `true` = alle Beiträge landen in der Queue. Standard: `true` |
| `siteUrl` | Öffentliche URL — wird in E-Mail-Links verwendet |
| `resendFrom` | Absenderadresse für Mails via Resend |
| `mapTileUrl` | Optional. Kachel-URL der Karte; `{apiKey}` wird durch `MAP_TILE_API_KEY` ersetzt. CARTO erwartet den Schlüssel als Parameter `key`. Nur nötig beim Wechsel des Kachel-Anbieters |
| `mapTileAttribution` | Optional. Attribution-Zeile zur obigen Kachel-URL |

> `SITE_CONFIG` ist eine **Plaintext-Variable** und überlebt Deploys nur, weil `keep_vars = true` korrekt am **Top-Level** der `wrangler.toml` steht (steht es nach einer `[table]`-Überschrift, parst TOML es als deren Property und wrangler ignoriert es). Einzelwerte, die garantiert deploy-fest sein müssen, liegen daher als **Secret** (siehe unten) — Secrets werden von `wrangler deploy` nie gelöscht.

> **Impressum, Social-Links (Ko-fi, GitHub, Mastodon …) und Ankündigungs-Banner** werden **nicht** hier gesetzt, sondern direkt im Admin-Panel unter *Einstellungen* (gespeichert in D1 `site_settings`). Die Felder werden dort per Formular gepflegt und greifen sofort ohne Redeploy.

#### Secrets (Einzelwerte, deploy-fest)

Im Dashboard unter *Variables and Secrets* je als **Secret** anlegen. Turnstile-Site-Key und GA4-ID sind zwar öffentlich, werden hier aber als Secret gespeichert, damit sie Deploys sicher überleben (der Worker liest sie und gibt sie via `/api/config` ans Frontend).

| Name | Zweck |
|---|---|
| `TURNSTILE_SITE_KEY` | Öffentlicher Turnstile-Site-Key (aktiviert das Widget) |
| `TURNSTILE_SECRET_KEY` | Serverseitiger Turnstile-Key |
| `GA4_MEASUREMENT_ID` | GA4-Mess-ID (`G-XXXX…`); fehlt sie, kein Tracking |
| `UNTAPPD_CLIENT_ID` | Untappd-App-Client-ID |
| `UNTAPPD_CLIENT_SECRET` | Untappd-App-Secret |
| `RESEND_API_KEY` | [Resend](https://resend.com)-API-Key |
| `ADMIN_EMAIL` | Empfänger des täglichen Digests |
| `MAP_TILE_API_KEY` | API-Key der CARTO Basemaps ([dashboard.basemaps.carto.com](https://dashboard.basemaps.carto.com/)). Ohne Key nutzt die Karte schlüssellose OSM-Kacheln |
| `INDEXNOW_KEY` | Optional. [IndexNow](https://www.indexnow.org)-Schlüssel (8–128 Zeichen `a–z A–Z 0–9 -`). Der Worker liefert ihn unter `/<key>.txt` aus und meldet nach Admin-Änderungen die betroffenen Seiten an Bing, Yandex & Co. (Bing speist u. a. die ChatGPT-Suche). Ohne Key keine Meldung |
| `INITIAL_ADMIN` | Ersteinrichtung — nach erstem Login löschen |

---

## 2 · Features

### Karte & Suche
- Interaktive Leaflet-Karte aller Brauereien / Gastronomien / Shops
- **Kachel-Quelle konfigurierbar**: `MAP_TILE_API_KEY` wird in den `{apiKey}`-
  Platzhalter der Kachel-URL eingesetzt — CARTOs Raster-Basemaps erwarten ihn
  als Query-Parameter `key`. Ohne Key schaltet die Karte automatisch auf
  schlüssellose OSM-Standardkacheln um (per CSS abgedunkelt), statt CARTOs
  „API KEY REQUIRED"-Wasserzeichen anzuzeigen. Beide Karten (Startseite und
  Ortsdetail) laufen über `window.atlasTileLayer()` in `shell.js`; der Key wird
  nachgezogen, sobald `/api/config` geladen ist
- Kachel-Kontingent bei CARTO: 5 Mio. Requests pro Kalendermonat über alle Keys
  des Kontos. CARTO- und OSM-Attribution müssen sichtbar bleiben
  ([carto.com/attributions](https://carto.com/attributions/))
- Typ-spezifische Pin-Farben, Hover-Tooltips, Filter inkl. "Historisch"
- Historische Brauereien (`is_historical`) grau hervorgehoben; `highlighted`/`sponsored`-CSS für gesponserte Einträge
- Geocoder-Suche via Nominatim (serverseitig proxiert)
- **„In meiner Nähe"** — Browser-Geolocation schwenkt die Karte auf den Standort und zeigt den nächstgelegenen Ort (Haversine, ohne Backend)

### Ort-Detail (`/ort/<slug>`)
- **Sprechende URLs**: `/ort/uerige` statt `/ort?id=uerige`.
  `/ort?id=…`, `/ort.html?id=…`, `/brauerei?id=…` und Trailing-Slash-Varianten
  leiten mit einem einzigen 301 auf die kanonische Form
- **Serverseitig gerendert**: H1, Beschreibung, Adresse, Sorten und eine
  Preistabelle (jüngste Meldung je Größe) stehen im HTML, bevor JavaScript läuft.
  Crawler ohne JS-Rendering und Social-Previews sehen damit echten Inhalt statt „Lade…"
- JSON-LD `BarOrPub` (historische Orte: `Place`) mit Adresse, Geo, Gründungsjahr
  und `Menu`/`Offer`-Preisen, dazu `BreadcrumbList` mit Stadt-Zwischenstufe
- Preisverlauf als SVG-Chart, Stile, Geschmacksnotizen (DE/EN)
- **Untappd-Rating** (optional): Bewertung + Link, 24h in D1 gecacht

### Stadt-Landingpages (SEO)
- Serverseitig gerenderte Seiten unter `/stadt/<slug>`
- **Slugs entstehen automatisch** aus den Städten der freigegebenen Orte
  (`citySlug()` in `src/routes.js`, umlautfest: Düsseldorf → `duesseldorf`,
  Mönchengladbach → `moenchengladbach`). Keine Whitelist mehr zu pflegen —
  ein neuer Ort in einer neuen Stadt erzeugt Seite und Sitemap-Eintrag von selbst
- Listet aktive **und historische** Orte einer Stadt inkl. Ø-Preis und Preis je Ort,
  mit `CollectionPage`-, `BreadcrumbList`- und `ItemList`-JSON-LD sowie hreflang
- Querverlinkung „Weitere Städte" auf jeder Stadtseite; zusätzlich verlinkt der
  Footer site-weit alle Städte (Daten via `/api/config`)

### Beitragen
Fünf Einreichungstypen mit Moderation:
- **Preismeldung** — Brauerei, Preis, Größe, Datum
- **Brauerei / Kneipe** — inkl. automatischem Geocoding via Nominatim
- **Sorte & Geschmacksnotizen** — Stil, ABV, IBU, Tasting
- **Korrektur** — Freitext-Hinweis
- **Event** — Name, Datum, optionale Brauerei-Zuordnung

### Moderations-Dashboard (`/admin`)
- **Übersicht** — Statistiken + neueste offene Beiträge
- **Beiträge** — Approve / Reject mit optionaler Notiz
- **Brauereien** — Alle Einträge bearbeiten (inkl. Google-Maps-URL), offene (`pending`) Einträge per „Freigeben" öffentlich schalten (setzt `status = approved` und `verified`), verifizieren, löschen; neue Brauereien direkt anlegen
- **Events** — Alle Events einsehen, bearbeiten (inkl. ID-Umbenennung, Enddatum/Endzeit für mehrtägige Events), löschen; neue Events direkt anlegen; Biere pro Event verwalten
- **Preise** — Alle Preise einsehen, löschen; neue Preise direkt eintragen
- **Stile** — Bierstile anlegen, bearbeiten, löschen
- **Glossar** — Einträge anlegen, bearbeiten, löschen
- **Typen** — Venue-Typen (7: brewpub, brewery, pub, restaurant, kiosk, supermarket, beverage_store) anlegen, bearbeiten, löschen
- **Einstellungen** — Impressum, Ankündigungs-Banner (DE/EN, aktivierbar), Social-Links (GitHub, LinkedIn, Instagram, Mastodon, Ko-fi, Website)
- **Passwort-Reset per E-Mail** (DE/EN)
- Mobile-optimierte Tab-Navigation

### Ranglisten
- Günstigste Brauereien, neueste Preismeldungen, Meistgemeldet
- Top 10 (0,25 l), Kennzahlen und Meta-Description werden serverseitig gerendert;
  JSON-LD mit `ItemList` und `Dataset` (Altbier-Preise, Lizenz CC BY-SA 4.0)

### Altbier-Wissen
- Glossar (aus D1), Hintergrundtexte, Stilkunde
- Sorten und Glossar serverseitig gerendert; JSON-LD `Article` + `DefinedTermSet`

### Das Rheinderby (`/rivalen`)
- Alt vs. Kölsch: Versus-Tabelle mit Brautechnik, IBU, Glas, EU-Schutz
- Hebt überraschende Gemeinsamkeiten hervor (beide obergärig, beide Köbes, beide 0,2 l)
- Prosa-Abschnitt zur Rivalität (Kölschkonvention 1986, g.g.A.-Geschichte)
- Lokale Abstimmung „Team Alt vs. Team Kölsch" (localStorage, kein Tracking)
- Vollständig DE/EN übersetzt

### Mehrsprachigkeit & UX
- DE / EN vollständig via `i18n.js`
- Dark Mode, PWA-Manifest, Cookie-Banner (DSGVO)
- Mock-Modus: ohne Backend läuft das UI auf Seed-Daten aus `data.js`

### SEO & Auffindbarkeit
- **Kanonische URLs**: `/ort/<slug>` und `/stadt/<slug>`; alle Altformen leiten
  mit genau einem 301 weiter (keine Redirect-Ketten)
- **Server-Rendering** auf `/`, `/ranglisten`, `/wissen`, `/ort/<slug>` und
  `/stadt/<slug>` — Inhalt steht im HTML, nicht erst nach dem JS-Rendering.
  Das zählt doppelt, weil die meisten KI-Crawler (GPTBot, ClaudeBot,
  PerplexityBot …) kein JavaScript ausführen
- **`/llms.txt` und `/llms-full.txt`** ([llmstxt.org](https://llmstxt.org)):
  dynamisch aus D1 erzeugt. `llms.txt` ist der verlinkte Überblick (Seiten,
  Städte, Kennzahlen), `llms-full.txt` enthält alle Orte mit Adresse, Sorten und
  jüngsten Preisen, dazu Sorten, Glossar und Termine als ein Markdown-Dokument
- **`robots.txt`**: Such- und KI-Crawler ausdrücklich zugelassen, inkl.
  `Content-Signal: search=yes, ai-input=yes, ai-train=yes`. `/api/` bleibt
  gesperrt, aber `/api/og/` und die Event-Feeds sind freigegeben — sonst können
  Google, WhatsApp & Co. die OG-Bilder nicht laden und Linkvorschauen bleiben leer.
  **Achtung:** Hat die Cloudflare-Zone „Block AI bots" oder die verwaltete
  robots.txt aktiviert, überschreibt das diese Datei (Dashboard → Security → Bots)
- **Sprachvarianten**: Die hreflang-Links zeigen auf `<url>?lang=en`. `i18n.js`
  übernimmt den Parameter, der Worker setzt dafür `lang="en"`, eine
  selbstreferenzierende Canonical und `og:locale` — sonst verwirft Google das
  hreflang-Paar
- **Strukturierte Daten**: `WebSite`/`Organization` (Start), `Brewery`,
  `BarOrPub`, `Restaurant` bzw. Laden-Typen je Ort, `Event` mit Adresse,
  `CollectionPage` je Stadt, `Article` auf `/wissen` und `/rivalen`,
  `Dataset` der Preise, `BreadcrumbList` überall. `creator`/`author`/`publisher`
  stehen als vollständiger `Organization`-Knoten im Markup, nicht als bloße
  `@id`-Referenz — die zeigt außerhalb der Startseite ins Leere und wird in der
  Search Console als ungültiger Objekttyp gemeldet
- **Datenlizenz**: die Preismeldungen stehen unter
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — genannt im
  `license`-Feld des `Dataset` und im Kopf von `llms.txt`/`llms-full.txt`
- **IndexNow** (optional, Secret `INDEXNOW_KEY`): geänderte Orte, Stadtseiten
  und Termine werden nach jeder Admin-Änderung sofort gemeldet
- **Sitemap** ohne `/impressum` (die Seite ist `noindex`)
- **Eigene 404-Seite** mit Status 404 und `noindex, follow` statt der nackten
  Default-Antwort
- **Leaflet** wird am Seitenende statt im `<head>` geladen; der Textinhalt
  rendert dadurch, bevor die 150 kB Karten-JS über das Netz sind

### Edge-Cache & D1-Lesekontingent
Das D1-Free-Limit (5 Mio. gelesene Zeilen pro Tag, **pro Account**) hängt allein
an der Zahl der Requests, nicht an der Datenmenge. Öffentliche GET-Antworten
liegen deshalb fertig gerendert im Cloudflare-Cache der jeweiligen Colo
(`src/cache.js`, TTL `EDGE_CACHE_TTL` = 10 min). Ein Treffer kostet keine
D1-Abfrage.
- **Gecacht:** SSR-Seiten (`/`, `/ranglisten`, `/wissen`, `/ort/*`, `/stadt/*`,
  `/event`, `/impressum`), `/sitemap.xml`, `/llms*.txt` und die öffentlichen
  `/api/*`-GETs (config, stats, breweries, styles, prices, events inkl. ICS/Atom,
  venue-types, glossary, rivals/votes, OG-Bild). Cache-Key ist die volle URL
  inkl. `?lang=en` (die Sprachvariante wird vor dem Ablegen umgeschrieben);
  Tracking-Parameter (`utm_*`, `fbclid`, `gclid` …) fallen aus dem Key.
- **Nie gecacht:** `/api/admin/*`, Nicht-GET, `/api/geocode`, `/api/untappd/*`,
  Requests mit `atlas_session`-Cookie (eingeloggte Admins sehen immer den
  Live-Stand), Antworten mit `Set-Cookie`, Status ≠ 200 und Antworten, bei
  denen eine D1-Abfrage fehlschlug (statischer Fallback).
- **Invalidierung:** Jede Colo führt eine Cache-Generation, die selbst im Cache
  liegt und Teil jedes Keys ist. Eine erfolgreiche Admin-Mutation setzt sie neu
  → in der Colo des Admins ist die Änderung beim nächsten Reload sichtbar,
  andere Colos folgen spätestens nach 10 min. Eine neue Rivalen-Stimme löscht
  gezielt `/api/rivals/votes`.
- **Browser-Caching** bleibt wie vom jeweiligen Handler gesetzt; `/api/config`
  darf 60 s im Browser liegen. Antworten tragen `x-edge-cache: HIT|MISS`.
- **Messen:** Jeder Request, der D1 anfasst, schreibt `[d1] GET /pfad q=<Abfragen>
  rows=<gelesene Zeilen>` in die Worker-Logs (Observability → nach `[d1]`
  filtern). Cache-Treffer erzeugen keine Zeile.
- Die Cache API wirkt nur auf der eigenen Domain, nicht auf `*.workers.dev`.

> **Messung beachten:** GA4 startet erst, wenn im Cookie-Banner *„Alle
> akzeptieren"* gewählt wurde (`localStorage["atlas-consent"] === "all"`).
> Besucher, die „Nur notwendige" wählen oder den Banner ignorieren, tauchen in
> GA4 nie auf — ebenso wenig Safari-Nutzer, deren `localStorage` nach sieben
> Tagen gelöscht wird. Für die echte Besucherzahl sind die Request- und
> Visits-Zahlen im Cloudflare-Dashboard (Workers-Analytics) die verlässlichere
> Quelle; GA4 misst nur den einwilligenden Teil.

---

## 3 · Lokal entwickeln

```bash
npm run db:setup        # Schema + Seed-Daten lokal
npm run dev
```

Die Site läuft auf `http://localhost:8787`. Turnstile-Verifikation wird ohne konfiguriertes Secret übersprungen.

Für reines UI-Testen einfach eine beliebige `public/*.html`-Datei im Browser öffnen — `api-client.js` erkennt das fehlende Backend und fällt auf den **Mock-Modus** zurück.

---

## 4 · API-Endpunkte

### Public

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/config` | Turnstile-Key, GA4-ID, priceSizes, highlightedSizes, `cities` … |
| GET | `/api/stats` | Kennzahlen |
| GET | `/api/breweries` | Alle freigegebenen Brauereien |
| GET | `/api/breweries/:id` | Detail + Preisverlauf |
| GET | `/api/prices` | Preismeldungen (max. 2000) |
| POST | `/api/prices` | Preismeldung einreichen (Wrapper) |
| GET | `/api/events` | Events (inkl. `endDate`, `endTime`) |
| GET | `/api/events/:id` | Event-Detail + Biere |
| GET | `/api/events/calendar.ics` | Alle zukünftigen Events als iCal (URL → Detailseite) |
| GET | `/api/events/:id/calendar.ics` | Einzelnes Event als ICS |
| GET | `/api/styles` | Bierstile |
| GET | `/api/glossary` | Glossar |
| GET | `/api/geocode?q=…` | Nominatim-Proxy |
| POST | `/api/contributions` | Beitrag einreichen |
| GET | `/api/untappd/brewery/:id` | Untappd-Bewertung (24h Cache) |
| GET | `/api/og/ort?id=…` | Dynamisches 1200×630-OG-Bild je Ort (in `robots.txt` freigegeben) |
| GET | `/sitemap.xml` | Dynamische Sitemap (statische Seiten, Städte, Orte, Events) |
| GET | `/llms.txt` | Überblick für Sprachmodelle (Markdown, aus D1) |
| GET | `/llms-full.txt` | Volltext: alle Orte mit Preisen, Sorten, Glossar, Termine |

### Admin (Session-Cookie erforderlich)

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/api/admin/login` | Session-Cookie setzen |
| POST | `/api/admin/logout` | Session löschen |
| GET | `/api/admin/me` | Session prüfen |
| POST | `/api/admin/request-reset` | Passwort-Reset-Mail |
| POST | `/api/admin/reset-password` | Neues Passwort setzen |
| GET | `/api/admin/stats` | Admin-Statistiken |
| GET | `/api/admin/contributions?status=` | Contributions-Queue |
| POST | `/api/admin/contributions/:id/approve` | Freigabe |
| POST | `/api/admin/contributions/:id/reject` | Ablehnen |
| GET | `/api/admin/breweries` | Alle Brauereien |
| POST | `/api/admin/breweries` | Neue Brauerei anlegen |
| PUT | `/api/admin/breweries/:id` | Brauerei bearbeiten |
| DELETE | `/api/admin/breweries/:id` | Brauerei löschen |
| GET | `/api/admin/events` | Alle Events |
| POST | `/api/admin/events` | Neues Event anlegen (inkl. `end_date`, `end_time`) |
| PUT | `/api/admin/events/:id` | Event bearbeiten (inkl. ID-Umbenennung via `new_id`) |
| DELETE | `/api/admin/events/:id` | Event löschen |
| GET | `/api/admin/events/:id/beers` | Biere eines Events abrufen |
| POST | `/api/admin/events/:id/beers` | Bier zu Event hinzufügen |
| PUT | `/api/admin/events/:id/beers/:beerId` | Event-Bier bearbeiten |
| DELETE | `/api/admin/events/:id/beers/:beerId` | Event-Bier löschen |
| GET | `/api/admin/prices` | Alle Preise |
| POST | `/api/admin/prices` | Preis direkt anlegen |
| PUT | `/api/admin/prices/:id` | Preis bearbeiten |
| DELETE | `/api/admin/prices/:id` | Preis löschen |
| GET | `/api/admin/styles` | Alle Bierstile |
| POST | `/api/admin/styles` | Stil anlegen |
| PUT | `/api/admin/styles/:id` | Stil bearbeiten |
| DELETE | `/api/admin/styles/:id` | Stil löschen |
| GET | `/api/admin/glossary` | Alle Glossar-Einträge |
| POST | `/api/admin/glossary` | Eintrag anlegen |
| PUT | `/api/admin/glossary/:term` | Eintrag bearbeiten |
| DELETE | `/api/admin/glossary/:term` | Eintrag löschen |
| GET | `/api/admin/venue-types` | Alle Venue-Typen |
| POST | `/api/admin/venue-types` | Venue-Typ anlegen |
| PUT | `/api/admin/venue-types/:id` | Venue-Typ bearbeiten |
| DELETE | `/api/admin/venue-types/:id` | Venue-Typ löschen |

---

## 5 · Sicherheits-Hinweise

- Passwort-Hashing: PBKDF2-SHA256, 100 000 Iterationen, 16 B Salt
- Sessions: 32 B Token, HttpOnly · Secure · SameSite=Strict, 8h TTL
- Rate-Limits (D1-basiert, IP-gebunden): Contributions 20/h, Login 5/5min, Reset 3/15min
- Turnstile-Verifikation serverseitig
- FK-Kaskaden: Löschen einer Brauerei entfernt Preise, Stil-Zuordnungen, Events und Event-Biere — Details und Datenverlust-Risiken siehe [Warnung oben](#11-einmalig-d1-anlegen-schema-einspielen-admin-user-anlegen)
- D1-Credentials niemals im Repo

---

## 6 · E-Mail einrichten

Alle Mails laufen via [Resend](https://resend.com):

| Mail | Auslöser |
|---|---|
| Beitrags-Bestätigung | Einreichung mit E-Mail-Angabe |
| Passwort-Reset | „Passwort vergessen?" im Admin-Login |
| Admin-Digest | Täglich 07:00 UTC |

1. Account bei [resend.com](https://resend.com) anlegen
2. Domain verifizieren, API-Key erstellen
3. `RESEND_API_KEY` als Secret setzen, `resendFrom` und `siteUrl` in `SITE_CONFIG`

---

© Altbieratlas — privat und unkommerziell betrieben.
