# Altbieratlas

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
│   ├── favicon.svg
│   ├── favicon-32.png
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   └── icon-512.png
├── migrations/
│   ├── 0001_schema.sql      # Tabellen, Indizes, FK-Kaskaden (inkl. Untappd-Cache)
│   ├── 0002_base.sql        # Basisdaten: Bierstile + Glossar (immer einspielen)
│   └── demo.sql             # Demo-Daten: Brauereien, Preise, Events (optional)
├── scripts/
│   ├── create-admin.mjs     # Admin-User anlegen
│   ├── db-setup.sh          # DB-Setup (Schema + Basis [+ Demo])
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

#### Schritt 2 — Schema und Basisdaten einspielen

Das geht am einfachsten **direkt beim ersten Deploy** über `deploy.sh --seed` (kein lokaler Wrangler nötig). Dazu im Dashboard den Deploy-Command einmalig auf `bash scripts/deploy.sh --seed` setzen, den ersten Commit pushen und danach wieder auf `bash scripts/deploy.sh` zurückstellen — oder nur diesen einen Build manuell anstoßen.

Was `--seed` einspielt:

| Datei | Inhalt | Immer einspielen? |
|---|---|---|
| `0001_schema.sql` | Tabellen, Indizes, FK-Kaskaden (inkl. Admin-User, Sessions, Passwort-Reset-Token, Untappd-Cache) | **Ja** |
| `0002_base.sql` | Bierstile + Glossar | **Ja** |
| `demo.sql` | Brauereien, Preise, Events (Beispiele) | Nur Dev/Staging |

> Beide Pflicht-Dateien sind idempotent (`CREATE TABLE IF NOT EXISTS`) — `--seed` kann bedenkenlos mehrfach ausgeführt werden.

**Alternative (Dashboard-Console):** *Workers & Pages → D1 → altbieratlas → Console* — `0001_schema.sql` und `0002_base.sql` nacheinander einfügen und ausführen. Für Demo-Daten zusätzlich `demo.sql`.

**Alternative (lokal):**
```bash
# Temporär database_id in wrangler.toml eintragen, dann:
D1_DATABASE_NAME=altbieratlas npm run db:setup:remote
# Danach wrangler.toml zurücksetzen: git checkout wrangler.toml
```

#### Schritt 3 — Admin-User anlegen

Der erste Admin-User kann auf drei Wegen angelegt werden:

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
# oder direkt:
node scripts/create-admin.mjs admin <starkes-passwort> --email=deine@email.de --remote
```

**Option C — ohne Wrangler (nur Node.js + D1-Dashboard-Console):**

Hash erzeugen und SQL ausgeben — kein Wrangler nötig:
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

Die Ausgabe (eine INSERT-Zeile) direkt in der D1-Dashboard-Console ausführen.

> Das Passwort muss mindestens 10 Zeichen lang sein.

### 1.2 Workers-Build im Dashboard konfigurieren

Dashboard → **Workers & Pages → altbieratlas → Settings → Build**:

| Feld | Wert |
|---|---|
| Git repository | dein GitHub-Repo |
| Build command | `npm install` |
| **Deploy command** | `bash scripts/deploy.sh` |
| Root directory | `/` |
| Production branch | `main` |

Das `scripts/deploy.sh` ersetzt die Platzhalter in `wrangler.toml` und startet `wrangler deploy`. Mit optionalen Flags können beim gleichen Lauf auch DB-Migrations eingespielt werden:

```bash
# Nur Worker deployen (Standard — jeder Push auf main)
bash scripts/deploy.sh

# Ersteinrichtung: Schema + Basisdaten + Deploy
bash scripts/deploy.sh --seed

# Staging mit Beispieldaten: Schema + Basis + Demo + Deploy
bash scripts/deploy.sh --seed --demo
```

### 1.3 Build-Variablen setzen

Unter *Settings → Build → Variables and secrets* (**Build-Sektion**, nicht Runtime):

| Name | Type | Wert |
|---|---|---|
| `database_id` | Secret | UUID aus `npx wrangler d1 create` |
| `database_name` | Secret | Name der D1-DB, z. B. `altbieratlas` |

### 1.4 Worker-Runtime-Variablen setzen

Unter *Settings → Variables and Secrets* (**Runtime-Sektion**):

#### Einzige Konfigurationsvariable: `SITE_CONFIG`

| Name | Type | Zweck |
|---|---|---|
| `SITE_CONFIG` | Plaintext | Alle nicht-sensitiven Konfigurationswerte als JSON (siehe unten) |

```json
{
  "contactEmail":      "deine@email.de",
  "ga4MeasurementId":  "G-XXXXXXXXXX",
  "turnstileSiteKey":  "0x...",
  "priceSizes":        [0.2, 0.25, 0.4, 0.5],
  "highlightedSizes":  [0.25, 0.5],
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
| `contactEmail` | E-Mail für den Nominatim-User-Agent-Header |
| `ga4MeasurementId` | Google-Analytics-4-ID (`G-XXXXXXXXXX`), fehlt = Analytics aus |
| `turnstileSiteKey` | Öffentlicher Cloudflare-Turnstile-Key |
| `priceSizes` | Verfügbare Biergrößen als Dezimalzahlen ohne Einheit (UI ergänzt „l"). Standard: `[0.2, 0.25, 0.4, 0.5]` |
| `highlightedSizes` | Teilmenge von `priceSizes`, die in Ranglisten hervorgehoben wird. 1–n Werte möglich, z. B. `[0.25]` oder `[0.25, 0.5]`. Fehlt der Schlüssel, gibt es keine Hervorhebung. |
| `requireModeration` | `true` = alle Beiträge landen in der Moderations-Queue. Standard: `true` |
| `untappdClientId` | Client-ID der Untappd-App (optional, ersetzt die frühere Env-Variable `UNTAPPD_CLIENT_ID`) |
| `siteUrl` | Öffentliche URL der Site — wird in E-Mail-Links verwendet. Standard: `https://altbieratlas.de` |
| `resendFrom` | Absenderadresse für alle Mails via Resend, z. B. `Altbieratlas <noreply@altbieratlas.de>` |
| `author` | Footer-Angaben: `name`, `github`, `linkedin`, `website` |
| `impressum` | Impressumsangaben (§ 5 TMG): `owner`, `address`, `email`. Der Worker injiziert die Werte serverseitig in `/impressum.html` — sie erscheinen nie in der JSON-API. Fehlt `impressum.email`, wird `contactEmail` als Fallback verwendet. |

#### Secrets (immer einzeln im Dashboard setzen — nie in `SITE_CONFIG`)

| Name | Type | Zweck |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | **Secret** | Serverseitiger Turnstile-Key |
| `RESEND_API_KEY` | **Secret** | [Resend](https://resend.com)-API-Key für alle Mails (Beitrags-Bestätigung, Passwort-Reset, Digest) |
| `ADMIN_EMAIL` | **Secret** | Empfänger des täglichen Beitrags-Digests |
| `UNTAPPD_CLIENT_SECRET` | **Secret** | Untappd-App-Client-Secret (optional) |
| `INITIAL_ADMIN` | **Secret** | Ersteinrichtung: JSON `{"username":"…","password":"…","email":"…"}` — nach erstem Login löschen |

Dank `keep_vars = true` bleiben alle Runtime-Werte bei jedem Deploy erhalten.

### 1.5 Deployen

Ein Push auf `main` löst automatisch einen Build aus. Beim ersten Deploy wird der Worker erstellt; alle weiteren Pushes werden automatisch ausgerollt.

---

## 2 · Features

### Karte & Suche
- Interaktive Leaflet-Karte aller Brauereien / Gastronomien / Shops
- Filterung nach Typ, Verifikation, Preisspanne
- Geocoder-Suche via Nominatim (serverseitig proxiert — Browser-IP wird nicht weitergegeben)

### Brauerei-Detail (`brauerei.html`)
- Preisverlauf als SVG-Chart
- Stile, Geschmacksnotizen (DE/EN)
- **Untappd-Rating** (wenn `UNTAPPD_CLIENT_ID` + `UNTAPPD_CLIENT_SECRET` gesetzt sind): Bewertung, Bier-Anzahl und Link werden asynchron nachgeladen, 24h in D1 gecacht

### Beitragen (`beitragen.html`)
Fünf Einreichungstypen — alle landen in einer Moderations-Queue:
- **Preismeldung** — Brauerei, Preis, Größe, Datum
- **Brauerei / Kneipe** — inkl. optionaler Adresse; Koordinaten werden automatisch aus Name + Ort via Nominatim abgeleitet, wenn nicht manuell eingegeben
- **Sorte & Geschmacksnotizen** — Stil, ABV, IBU, Tasting
- **Korrektur** — Freitext-Hinweis zur manuellen Admin-Bearbeitung
- **Event** — Name, Datum, optionale Brauerei-Zuordnung

Zusätzlich:
- **Bestätigungsmail** (wenn E-Mail angegeben): Nach erfolgreicher Einreichung bekommt der Beitragende eine Bestätigungs-Mail via Resend. Erfordert `RESEND_API_KEY`.
- **Turnstile-Bot-Schutz** (wenn konfiguriert) auf allen Formularen
- **„Deine Einreichungen"-Cookie** (`atlas_subs`): Nach jeder Einreichung wird ein kompakter Eintrag (Typ, Kurzinfo, Datum) in einem Client-Cookie (90 Tage, max. 8 Einträge) gespeichert — sichtbar im Bereich „Deine letzten Einreichungen" auf `beitragen.html`

### Moderations-Dashboard (`admin.html`)
- Übersicht-Tab mit Statistiken und neuesten offenen Beiträgen
- Contributions-Tab: Approve / Reject mit optionaler Notiz; Approve schreibt direkt in die Zieltabelle (`price`, `brewery`, `event`, `style`)
- Brauereien-Tab: Alle Einträge einsehen, verifizieren, löschen (mit FK-Kaskade)
- **Passwort-Reset per E-Mail** (DE/EN): „Passwort vergessen?"-Link auf der Login-Seite → Reset-Link wird an die hinterlegte Admin-E-Mail geschickt (via Resend, 1h gültig, einmalig verwendbar)

### Ranglisten (`ranglisten.html`)
- Günstigste Brauereien, neueste Preismeldungen, Preisindex

### Altbier-Wissen (`wissen.html`)
- Glossar (aus D1), Hintergrundtexte, Stilkunde

### Mehrsprachigkeit & UX
- DE / EN vollständig via `i18n.js`
- Dark Mode, PWA-Manifest, Cookie-Banner mit DSGVO-konformer Einwilligung
- Mock-Modus: ohne Backend läuft das UI auf Seed-Daten aus `data.js` — für schnelle UI-Iterationen

---

## 3 · Lokal entwickeln

```bash
npm run db:setup:demo   # Schema + Basisdaten + Demo-Brauereien lokal
npm run dev
```

Die Site läuft auf `http://localhost:8787`. Turnstile-Verifikation wird ohne konfiguriertes Secret serverseitig übersprungen.

Für reines UI-Testen (ohne Wrangler) einfach `index.html` im Browser öffnen — `api-client.js` erkennt das fehlende Backend und fällt automatisch auf den **Mock-Modus** zurück. Im Footer rechts unten zeigt ein Label den aktiven Modus (`live` · `mock` · `probing…`).

---

## 4 · API-Endpunkte

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/config` | Turnstile-Key, GA4-ID, Author-Infos, priceSizes, highlightedSizes, requireModeration |
| GET | `/api/stats` | Kennzahlen für Footer-Ticker |
| GET | `/api/breweries` | Alle freigegebenen Brauereien |
| GET | `/api/breweries/:id` | Detail + Preisverlauf |
| GET | `/api/prices` | Preismeldungen (max. 2000) |
| POST | `/api/prices` | Preismeldung einreichen (Convenience-Wrapper) |
| GET | `/api/events` | Events |
| GET | `/api/events/calendar.ics` | Alle zukünftigen Events als iCal-Kalender |
| GET | `/api/events/:id/calendar.ics` | Einzelnes Event als ICS-Datei |
| GET | `/api/styles` | Bierstile |
| GET | `/api/glossary` | Glossar-Einträge |
| GET | `/api/geocode?q=…` | Nominatim-Proxy (Rate-Limit: 30/min/IP) |
| POST | `/api/contributions` | Beitrag einreichen (Turnstile + Rate-Limit) |
| GET | `/api/untappd/brewery/:id` | Untappd-Bewertung (24h D1-Cache) |
| GET | `/sitemap.xml` | Dynamische Sitemap |
| POST | `/api/admin/login` | Session-Cookie setzen |
| POST | `/api/admin/logout` | Session löschen |
| GET | `/api/admin/me` | Session prüfen |
| POST | `/api/admin/request-reset` | Passwort-Reset-Mail anfordern |
| POST | `/api/admin/reset-password` | Neues Passwort mit Token setzen |
| GET | `/api/admin/stats` | Admin-Statistiken |
| GET | `/api/admin/contributions?status=` | Contributions-Queue |
| POST | `/api/admin/contributions/:id/approve` | Freigabe → Zieltabelle schreiben |
| POST | `/api/admin/contributions/:id/reject` | Ablehnen mit optionaler Notiz |
| GET | `/api/admin/breweries` | Alle Brauereien (inkl. pending) |
| PUT | `/api/admin/breweries/:id` | Brauerei bearbeiten |
| DELETE | `/api/admin/breweries/:id` | Brauerei löschen (mit FK-Kaskade) |

---

## 5 · Untappd-Integration einrichten

1. App auf [untappd.com/api/register](https://untappd.com/api/register) registrieren
2. `untappdClientId` in `SITE_CONFIG` eintragen und `UNTAPPD_CLIENT_SECRET` als Secret im CF-Dashboard setzen

Ohne diese Variablen antwortet `/api/untappd/brewery/:id` mit `{ "available": false }` — die Brauerei-Seite zeigt dann keine Untappd-Sektion.

**Rate-Limit:** Untappd erlaubt 100 Requests/Stunde für App-Credentials. Durch den 24h-D1-Cache fällt pro Brauerei maximal 1 Request/Tag an.

**Attribution:** Die angezeigte Bewertung verlinkt zurück auf Untappd, wie von den Untappd-Nutzungsbedingungen gefordert.

---

## 6 · E-Mail einrichten

Der Worker versendet drei Typen von Mails — alle via [Resend](https://resend.com):

| Mail | Auslöser | Empfänger |
|---|---|---|
| Beitrags-Bestätigung | Einreichung mit E-Mail-Angabe | Einsender |
| Passwort-Reset | „Passwort vergessen?" im Admin-Login | Hinterlegte Admin-E-Mail |
| Admin-Digest | Täglich 07:00 UTC (Cron) | `ADMIN_EMAIL` |

**Einrichtung:**

1. Account bei [resend.com](https://resend.com) anlegen (kostenlos bis 3.000 Mails/Monat)
2. Domain verifizieren und API-Key erstellen
3. Im CF-Dashboard setzen:
   - `RESEND_API_KEY` (Secret)
   - `resendFrom` und `siteUrl` in `SITE_CONFIG` eintragen

Damit Passwort-Reset funktioniert, muss die `email`-Adresse beim Admin-User hinterlegt sein (siehe Schritt 3 in 1.1).

Ohne `RESEND_API_KEY` werden keine Mails verschickt — alle anderen Funktionen laufen normal weiter.

---

## 7 · Sicherheits-Hinweise

- Passwort-Hashing: PBKDF2-SHA256, 120 000 Iterationen, 16 B Salt, 32 B Hash
- Sessions: 32 B zufälliges Token, HttpOnly · Secure · SameSite=Strict-Cookie, 8h TTL
- Login: Konstant-Zeit-Vergleich (verhindert User-Enumeration), auch bei nicht-existierentem User
- Passwort-Reset: Token 32 B zufällig, 1h TTL, einmalig verwendbar; gleiche Antwort unabhängig davon ob E-Mail bekannt (kein User-Enumeration); alle Sessions werden beim Reset ungültig
- Rate-Limits (D1-basiert, IP-gebunden): Contributions 20/h, Geocode 30/min, Login 5/5min, Reset-Anfragen 3/15min
- Turnstile-Verifikation serverseitig gegen `challenges.cloudflare.com/siteverify`
- Input-Validierung auf allen POST-Endpunkten (`str` / `num` / `oneOf` in `utils.js`)
- FK-Kaskaden: Löschen einer Brauerei entfernt automatisch Preise, Style-Zuordnungen und Events
- D1-Credentials niemals im Repo — immer als Build-Secrets im CF-Dashboard

---

## 8 · Was als nächstes sinnvoll wäre

- **Magic-Link-Login für Beitragende** — Beiträge nachträglich bearbeiten/zurückziehen
- **Status-Mail bei Freigabe/Ablehnung** — Admin-seitig beim Approve/Reject auslösen
- **KV- oder R2-Cache** für `/api/breweries` und `/api/prices` (derzeit direkt aus D1)
- **Image-Uploads** für Brauereien (R2 + Cloudflare Images)
- **Open-Data-Export** als CSV/JSON unter `/api/export`
- **Untappd-Bier-Liste** — `/v4/brewery/beer_list/:untappd_id` für einzelne Biere mit Ratings

---

© Altbieratlas — privat und unkommerziell betrieben.
