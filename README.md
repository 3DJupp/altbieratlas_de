# Altbieratlas · v0.4.1

Die interaktive Karte des Altbiers — betrieben als **Cloudflare Worker + D1**.

```
altbieratlas/
├── src/
│   ├── worker.js            # Router (API + ASSETS)
│   ├── routes.js            # Public- & Admin-API
│   └── utils.js             # PBKDF2, Turnstile, Rate-Limit, E-Mail
├── public/
│   ├── index.html           # Landing + Karte (Leaflet)
│   ├── brauerei.html        # Brauerei-Detail + Preisverlauf + Untappd
│   ├── beitragen.html       # Beitrags-Formulare (5 Typen)
│   ├── ranglisten.html      # Preis-Ranglisten
│   ├── wissen.html          # Glossar & Hintergrund
│   ├── impressum.html       # Impressum & Datenschutz
│   ├── admin.html           # Moderations-Dashboard
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
│   ├── 0001_schema.sql      # Alle Tabellen, Indizes, FK-Kaskaden (Neuinstallation)
│   ├── 0002_seed.sql        # Stile, Glossar, Venue-Typen, Brauereien, Preise, Events
│   └── 0003_upgrade.sql     # Upgrade bestehender Installationen (venue_types + maps_url)
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
| `0001_schema.sql` | Tabellen, Indizes, FK-Kaskaden |
| `0002_seed.sql` | Venue-Typen, Bierstile, Glossar, Brauereien, Preise, Events |
| `0003_upgrade.sql` | Upgrade für bestehende Installationen (neues `venue_types`-Schema, `maps_url`-Spalte) |

`0001` und `0002` sind idempotent (`CREATE TABLE IF NOT EXISTS`, `INSERT OR IGNORE`). `0003` ist für bestehende Installationen gedacht und kann wiederholt ausgeführt werden.

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
  const bits = await c.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
  const b64  = b => Buffer.from(b).toString('base64');
  const hash = 'pbkdf2\$120000\$' + b64(salt) + '\$' + b64(bits);
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
bash scripts/deploy.sh          # Standard — jeder Push auf main
bash scripts/deploy.sh --seed   # Ersteinrichtung: Schema + Seed + Upgrade + Deploy
```

### 1.3 Build-Variablen setzen

Unter *Settings → Build → Variables and secrets* (**Build-Sektion**):

| Name | Type | Wert |
|---|---|---|
| `database_id` | Secret | UUID aus `npx wrangler d1 create` |
| `database_name` | Secret | Name der D1-DB, z. B. `altbieratlas` |

### 1.4 Worker-Runtime-Variablen setzen

Unter *Settings → Variables and Secrets* (**Runtime-Sektion**):

#### Einzige Konfigurationsvariable: `SITE_CONFIG`

```json
{
  "contactEmail":      "deine@email.de",
  "ga4MeasurementId":  "G-XXXXXXXXXX",
  "turnstileSiteKey":  "0x...",
  "priceSizes":        [0.2, 0.25, 0.4, 0.5],
  "highlightedSizes":  [0.25],
  "requireModeration": true,
  "untappdClientId":   "XXXXXXXXXXXXXXXX",
  "siteUrl":           "https://altbieratlas.de",
  "resendFrom":        "Altbieratlas <noreply@altbieratlas.de>",
  "author": {
    "name":     "Dein Name",
    "github":   "https://github.com/...",
    "linkedin": "https://linkedin.com/in/...",
    "website":  "https://example.com"
  },
  "impressum": {
    "owner":   "Vor- und Nachname",
    "address": "Musterstraße 1, 40213 Düsseldorf",
    "email":   "kontakt@example.de"
  }
}
```

| Feld | Beschreibung |
|---|---|
| `highlightedSizes` | Größen, die in Ranglisten hervorgehoben werden und beim Laden vorausgewählt sind. Empfehlung: `[0.25]` |
| `requireModeration` | `true` = alle Beiträge landen in der Queue. Standard: `true` |
| `siteUrl` | Öffentliche URL — wird in E-Mail-Links verwendet |
| `resendFrom` | Absenderadresse für Mails via Resend |

#### Secrets

| Name | Type | Zweck |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | **Secret** | Serverseitiger Turnstile-Key |
| `RESEND_API_KEY` | **Secret** | [Resend](https://resend.com)-API-Key |
| `ADMIN_EMAIL` | **Secret** | Empfänger des täglichen Digests |
| `UNTAPPD_CLIENT_SECRET` | **Secret** | Untappd-App-Secret (optional) |
| `INITIAL_ADMIN` | **Secret** | Ersteinrichtung — nach erstem Login löschen |

---

## 2 · Features

### Karte & Suche
- Interaktive Leaflet-Karte aller Brauereien / Gastronomien / Shops
- Filterung nach Typ, Verifikation, Preisspanne
- Geocoder-Suche via Nominatim (serverseitig proxiert)

### Brauerei-Detail
- Preisverlauf als SVG-Chart, Stile, Geschmacksnotizen (DE/EN)
- **Untappd-Rating** (optional): Bewertung + Link, 24h in D1 gecacht

### Beitragen
Fünf Einreichungstypen mit Moderation:
- **Preismeldung** — Brauerei, Preis, Größe, Datum
- **Brauerei / Kneipe** — inkl. automatischem Geocoding via Nominatim
- **Sorte & Geschmacksnotizen** — Stil, ABV, IBU, Tasting
- **Korrektur** — Freitext-Hinweis
- **Event** — Name, Datum, optionale Brauerei-Zuordnung

### Moderations-Dashboard (`admin.html`)
- **Übersicht** — Statistiken + neueste offene Beiträge
- **Beiträge** — Approve / Reject mit optionaler Notiz
- **Brauereien** — Alle Einträge bearbeiten (inkl. Google-Maps-URL), verifizieren, löschen; neue Brauereien direkt anlegen
- **Events** — Alle Events einsehen, bearbeiten (inkl. ID-Umbenennung), löschen; neue Events direkt anlegen
- **Preise** — Alle Preise einsehen, löschen; neue Preise direkt eintragen
- **Stile** — Bierstile anlegen, bearbeiten, löschen
- **Glossar** — Einträge anlegen, bearbeiten, löschen
- **Typen** — Venue-Typen (Hausbrauerei, Gastronomie, Handel) anlegen, bearbeiten, löschen (inkl. ID, Namen DE/EN, Header-Text DE/EN)
- **Passwort-Reset per E-Mail** (DE/EN)
- Mobile-optimierte Tab-Navigation

### Ranglisten
- Günstigste Brauereien, neueste Preismeldungen, Meistgemeldet

### Altbier-Wissen
- Glossar (aus D1), Hintergrundtexte, Stilkunde

### Mehrsprachigkeit & UX
- DE / EN vollständig via `i18n.js`
- Dark Mode, PWA-Manifest, Cookie-Banner (DSGVO)
- Mock-Modus: ohne Backend läuft das UI auf Seed-Daten aus `data.js`

---

## 3 · Lokal entwickeln

```bash
npm run db:setup        # Schema + Seed-Daten lokal
npm run dev
```

Die Site läuft auf `http://localhost:8787`. Turnstile-Verifikation wird ohne konfiguriertes Secret übersprungen.

Für reines UI-Testen einfach `index.html` im Browser öffnen — `api-client.js` erkennt das fehlende Backend und fällt auf den **Mock-Modus** zurück.

---

## 4 · API-Endpunkte

### Public

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/config` | Turnstile-Key, GA4-ID, priceSizes, highlightedSizes … |
| GET | `/api/stats` | Kennzahlen |
| GET | `/api/breweries` | Alle freigegebenen Brauereien |
| GET | `/api/breweries/:id` | Detail + Preisverlauf |
| GET | `/api/prices` | Preismeldungen (max. 2000) |
| POST | `/api/prices` | Preismeldung einreichen (Wrapper) |
| GET | `/api/events` | Events |
| GET | `/api/events/calendar.ics` | Alle zukünftigen Events als iCal |
| GET | `/api/events/:id/calendar.ics` | Einzelnes Event als ICS |
| GET | `/api/styles` | Bierstile |
| GET | `/api/glossary` | Glossar |
| GET | `/api/geocode?q=…` | Nominatim-Proxy |
| POST | `/api/contributions` | Beitrag einreichen |
| GET | `/api/untappd/brewery/:id` | Untappd-Bewertung (24h Cache) |
| GET | `/sitemap.xml` | Dynamische Sitemap |

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
| POST | `/api/admin/events` | Neues Event anlegen |
| PUT | `/api/admin/events/:id` | Event bearbeiten (inkl. ID-Umbenennung via `new_id`) |
| DELETE | `/api/admin/events/:id` | Event löschen |
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

- Passwort-Hashing: PBKDF2-SHA256, 120 000 Iterationen, 16 B Salt
- Sessions: 32 B Token, HttpOnly · Secure · SameSite=Strict, 8h TTL
- Rate-Limits (D1-basiert, IP-gebunden): Contributions 20/h, Login 5/5min, Reset 3/15min
- Turnstile-Verifikation serverseitig
- FK-Kaskaden: Löschen einer Brauerei entfernt Preise, Style-Zuordnungen und Events
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
