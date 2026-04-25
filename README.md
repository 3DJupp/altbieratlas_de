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
│   └── data.js              # Seed-Daten für Mock-Fallback
├── migrations/
│   ├── 0001_schema.sql      # Tabellen, Indizes, FK-Kaskaden
│   ├── 0002_base.sql        # Basisdaten: Bierstile + Glossar (immer einspielen)
│   ├── 0003_untappd_cache.sql  # Untappd-Cache-Tabelle
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

Gedeployed wird über **Workers Builds** (Cloudflare-Dashboard → GitHub-Integration). Es muss weder lokal noch in GitHub Actions `wrangler deploy` ausgeführt werden. Lokal brauchst du Wrangler nur für einmalige Admin-Aufgaben (D1 anlegen, Schema einspielen, Admin-User erzeugen).

### Voraussetzungen

- Cloudflare-Account mit verbundenem GitHub-Account
- Node.js ≥ 20 (nur für die einmaligen Admin-Schritte)

### 1.1 Einmalig: D1 anlegen, Schema, Admin-User

```bash
npm install
npx wrangler login

# D1-Datenbank anlegen
npx wrangler d1 create altbieratlas
#    → Ausgabe merken: database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Die `database_id` kommt **nicht** in die `wrangler.toml` — sie wird als Build-Variable ins Cloudflare-Dashboard eingetragen (siehe 1.3). Für das einmalige Einspielen des Schemas brauchst du sie aber lokal. Trage sie temporär ein (nicht committen!):

```bash
# Temporär in wrangler.toml setzen (oder D1_DATABASE_NAME setzen), dann:

# Produktion: nur Schema + Basisdaten (Stile, Glossar)
D1_DATABASE_NAME=altbieratlas npm run db:setup:remote

# Staging / Dev: Schema + Basisdaten + Beispiel-Brauereien/Preise/Events
D1_DATABASE_NAME=altbieratlas npm run db:setup:demo:remote

# Admin-User anlegen
node scripts/create-admin.mjs admin <starkes-passwort> --remote

# Danach database_id wieder auf Platzhalter zurücksetzen!
git checkout wrangler.toml
```

Was die Migrations-Dateien enthalten:

| Datei | Inhalt | Immer einspielen? |
|---|---|---|
| `0001_schema.sql` | Tabellen, Indizes, FK-Kaskaden | **Ja** |
| `0002_base.sql` | Bierstile + Glossar | **Ja** |
| `0003_untappd_cache.sql` | Untappd-Cache-Tabelle | **Ja** |
| `demo.sql` | Brauereien, Preise, Events (Beispiele) | Nur Dev/Staging |

> **Alternative (ohne lokalen Wrangler):** SQL direkt im Dashboard eingeben unter *Workers & Pages → D1 → altbieratlas → Console*. Die drei Pflicht-Dateien (`0001`, `0002_base`, `0003`) nacheinander einfügen und ausführen. Für Demo-Daten zusätzlich `demo.sql`.

### 1.2 Workers-Build im Dashboard konfigurieren

Dashboard → **Workers & Pages → altbieratlas → Settings → Build**:

| Feld | Wert |
|---|---|
| Git repository | dein GitHub-Repo |
| Build command | `npm install` |
| **Deploy command** | `bash scripts/deploy.sh` |
| Root directory | `/` |
| Production branch | `main` |

Das `scripts/deploy.sh` ersetzt die Platzhalter in `wrangler.toml` mit den unten konfigurierten Build-Variablen, bevor es `npx wrangler versions upload` ausführt.

### 1.3 Build-Variablen setzen

Unter *Settings → Build → Variables and secrets* (**Build-Sektion**, nicht Runtime):

| Name | Type | Wert |
|---|---|---|
| `D1_DATABASE_ID` | Secret | UUID aus `npx wrangler d1 create` |
| `D1_DATABASE_NAME` | Secret | Name der D1-DB, z. B. `altbieratlas` |

### 1.4 Worker-Runtime-Variablen setzen

Unter *Settings → Variables and Secrets* (**Runtime-Sektion**):

| Name | Type | Zweck |
|---|---|---|
| `CONTACT_EMAIL` | Plaintext | User-Agent für Nominatim-Proxy |
| `GA4_MEASUREMENT_ID` | Plaintext | `G-XXXXXXXXXX`, leer = Analytics aus |
| `AUTHOR_NAME` | Plaintext | Name im Footer |
| `AUTHOR_GITHUB` | Plaintext | GitHub-Profil-URL |
| `AUTHOR_LINKEDIN` | Plaintext | LinkedIn-URL |
| `AUTHOR_WEBSITE` | Plaintext | Persönliche Website (optional) |
| `IMPRESSUM_OWNER` | Plaintext | Betreiber (§ 5 TMG) |
| `IMPRESSUM_ADDRESS` | Plaintext | Postanschrift (Komma-getrennt) |
| `IMPRESSUM_EMAIL` | Plaintext | Kontakt-E-Mail im Impressum |
| `TURNSTILE_SITE_KEY` | Plaintext | Öffentlicher Cloudflare-Turnstile-Key |
| `TURNSTILE_SECRET_KEY` | **Secret** | Serverseitiger Turnstile-Key |
| `RESEND_API_KEY` | **Secret** | [Resend](https://resend.com)-API-Key für Bestätigungsmails |
| `RESEND_FROM` | Plaintext | Absenderadresse, z. B. `Altbieratlas <noreply@altbieratlas.de>` |
| `UNTAPPD_CLIENT_ID` | Plaintext | Untappd-App-Client-ID (optional) |
| `UNTAPPD_CLIENT_SECRET` | **Secret** | Untappd-App-Client-Secret (optional) |

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

### Moderations-Dashboard (`admin.html`)
- Übersicht-Tab mit Statistiken und neuesten offenen Beiträgen
- Contributions-Tab: Approve / Reject mit optionaler Notiz; Approve schreibt direkt in die Zieltabelle (`price`, `brewery`, `event`, `style`)
- Brauereien-Tab: Alle Einträge einsehen, verifizieren, löschen (mit FK-Kaskade)

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
| GET | `/api/config` | Turnstile-Key, GA4-ID, Author-Infos, Impressum |
| GET | `/api/stats` | Kennzahlen für Footer-Ticker |
| GET | `/api/breweries` | Alle freigegebenen Brauereien |
| GET | `/api/breweries/:id` | Detail + Preisverlauf |
| GET | `/api/prices` | Preismeldungen (max. 2000) |
| POST | `/api/prices` | Preismeldung einreichen (Convenience-Wrapper) |
| GET | `/api/events` | Events |
| GET | `/api/styles` | Bierstile |
| GET | `/api/glossary` | Glossar-Einträge |
| GET | `/api/geocode?q=…` | Nominatim-Proxy (Rate-Limit: 30/min/IP) |
| POST | `/api/contributions` | Beitrag einreichen (Turnstile + Rate-Limit) |
| GET | `/api/untappd/brewery/:id` | Untappd-Bewertung (24h D1-Cache) |
| GET | `/sitemap.xml` | Dynamische Sitemap |
| POST | `/api/admin/login` | Session-Cookie setzen |
| POST | `/api/admin/logout` | Session löschen |
| GET | `/api/admin/me` | Session prüfen |
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
2. `UNTAPPD_CLIENT_ID` (Plaintext) und `UNTAPPD_CLIENT_SECRET` (Secret) im CF-Dashboard setzen
3. Migration `0003_untappd_cache.sql` einspielen (falls noch nicht geschehen)

Ohne diese Variablen antwortet `/api/untappd/brewery/:id` mit `{ "available": false }` — die Brauerei-Seite zeigt dann keine Untappd-Sektion.

**Rate-Limit:** Untappd erlaubt 100 Requests/Stunde für App-Credentials. Durch den 24h-D1-Cache fällt pro Brauerei maximal 1 Request/Tag an.

**Attribution:** Die angezeigte Bewertung verlinkt zurück auf Untappd, wie von den Untappd-Nutzungsbedingungen gefordert.

---

## 6 · E-Mail-Bestätigung einrichten

1. Account bei [resend.com](https://resend.com) anlegen (kostenlos bis 3.000 Mails/Monat)
2. Domain verifizieren und API-Key erstellen
3. Im CF-Dashboard setzen:
   - `RESEND_API_KEY` (Secret)
   - `RESEND_FROM` (Plaintext), z. B. `Altbieratlas <noreply@altbieratlas.de>`

Ohne `RESEND_API_KEY` werden keine Mails verschickt — das Einreichen funktioniert weiterhin normal.

---

## 7 · Sicherheits-Hinweise

- Passwort-Hashing: PBKDF2-SHA256, 120 000 Iterationen, 16 B Salt, 32 B Hash
- Sessions: 32 B zufälliges Token, HttpOnly · Secure · SameSite=Strict-Cookie, 8h TTL
- Login: Konstant-Zeit-Vergleich (verhindert User-Enumeration), auch bei nicht-existierentem User
- Rate-Limits (D1-basiert, IP-gebunden): Contributions 20/h, Geocode 30/min, Login 5/5min
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
