# Altbieratlas

Die interaktive Karte des Altbiers — betrieben als **Cloudflare Worker + D1**.

```
altbieratlas/
├── src/                     # Worker-Code
│   ├── worker.js            # Router (API + ASSETS)
│   ├── routes.js            # Public- & Admin-API
│   └── utils.js             # PBKDF2, Turnstile, Rate-Limit
├── public/                  # Statische Assets (werden via ASSETS-Binding serviert)
│   ├── index.html           # Landing + Karte
│   ├── brauerei.html        # Brauerei-Detail
│   ├── beitragen.html       # Beitrags-Formulare
│   ├── ranglisten.html      # Preis-Ranglisten
│   ├── wissen.html          # Glossar & Hintergrund
│   ├── impressum.html       # Impressum & Datenschutz
│   ├── admin.html           # Moderations-Dashboard
│   ├── api-client.js        # Einheitliche API-Schnittstelle
│   │                        #   → live (Worker) oder mock (Seed + LocalStorage)
│   ├── config.js            # Site-Konfiguration (GA4, Social, Map, Author)
│   ├── i18n.js              # DE/EN
│   ├── shell.js             # Header/Footer/Cookie
│   ├── styles.css
│   └── data.js              # Seed-Daten für Mock-Fallback
├── migrations/
│   ├── 0001_schema.sql
│   └── 0002_seed.sql
├── scripts/
│   └── create-admin.mjs     # Admin-User anlegen
├── wrangler.toml
└── package.json
```

---

## 1 · Setup

Gedeployed wird über **Workers Builds** (Cloudflare-Dashboard → GitHub-Integration). Es muss weder lokal noch in GitHub Actions `wrangler deploy` ausgeführt werden. Lokal brauchst du Wrangler nur für einmalige Admin-Aufgaben (D1 anlegen, Schema/Seed einspielen, Admin-User erzeugen).

### Voraussetzungen

- Cloudflare-Account mit verbundenem GitHub-Account
- Node.js ≥ 20 (nur für die einmaligen Admin-Schritte unten)

### 1.1 Einmalig: D1 anlegen, Schema, Admin-User

Lokal am Rechner, einmal vor dem ersten Deploy:

```bash
npm install
npx wrangler login

# D1-Datenbank anlegen
npx wrangler d1 create altbieratlas
#    → merkt euch die ausgegebene database_id
```

Die `database_id` aus der Wrangler-Ausgabe nicht in die `wrangler.toml` eintragen — die kommt gleich als **Build-Secret** ins Dashboard. Stattdessen in der committeten `wrangler.toml` den Platzhalter `REPLACE_WITH_YOUR_D1_ID` stehen lassen.

Für Schema + Seed braucht Wrangler die ID temporär. Trage sie **lokal** in der `wrangler.toml` ein (nicht committen!), dann:

```bash
npm run db:setup:remote
npm run admin:create -- admin <starkes-passwort> --remote
```

Anschließend die ID wieder auf `REPLACE_WITH_YOUR_D1_ID` zurücksetzen und **erst dann** pushen. Oder bequemer: `git stash` vor dem Push, nach dem Push `git stash pop`, wenn du die ID für weitere `db:*`-Kommandos am Rechner brauchst.

> **Alternative:** Schema und Admin-User auch im Dashboard einspielen — unter *Workers & Pages → D1 → altbieratlas → Console* kannst du beliebige SQL-Befehle ausführen. Der Inhalt aus `migrations/0001_schema.sql` + `migrations/0002_seed.sql` reinkopieren und ausführen. Dann brauchst du die ID lokal gar nicht.

### 1.2 Workers-Build im Dashboard konfigurieren

Dashboard → **Workers & Pages → altbieratlas → Settings → Build**:

- Git repository: dein GitHub-Repo
- **Build command:** `npm install`
- **Deploy command:**
  ```
  sed -i "s/REPLACE_WITH_YOUR_D1_ID/$database_id/" wrangler.toml && npx wrangler deploy
  ```
- Root directory: `/`
- Production branch: `main`

### 1.3 Build-Variables setzen

Unter *Settings → Build → Variables and secrets* (die Build-Sektion, nicht die Worker-Runtime-Sektion):

- **Name:** `database_id` · **Type:** *Secret* · **Value:** `<die-id-aus-npx-wrangler-d1-create>`

Das Secret steht dem `sed`-Kommando im Deploy als `$database_id`-Umgebungsvariable zur Verfügung, ersetzt den Platzhalter in der `wrangler.toml` zur Build-Zeit und wird nie ins Repo committed.

### 1.4 Worker-Variablen setzen (Runtime)

Unter *Settings → Variables and Secrets* (die Worker-Runtime-Sektion):

| Type | Name | Value |
|---|---|---|
| Plaintext | `CONTACT_EMAIL` | z. B. `kontakt@altbieratlas.de` |
| Plaintext | `GA4_MEASUREMENT_ID` | `G-XXXXXXXXXX` oder leer |
| Plaintext | `AUTHOR_NAME` | dein Name im Footer |
| Plaintext | `AUTHOR_GITHUB` | URL |
| Plaintext | `AUTHOR_LINKEDIN` | URL |
| Plaintext | `IMPRESSUM_OWNER` | Betreiber |
| Plaintext | `IMPRESSUM_ADDRESS` | Postanschrift |
| Plaintext | `IMPRESSUM_EMAIL` | Kontakt |
| Plaintext | `TURNSTILE_SITE_KEY` | öffentlicher Cloudflare-Turnstile-Key |
| Secret | `TURNSTILE_SECRET_KEY` | Cloudflare-Turnstile-Secret |

Dank `keep_vars = true` in der `wrangler.toml` bleiben diese Werte bei jedem Deploy erhalten.

### 1.5 Deployen

Ein Push auf `main` löst automatisch einen Build aus. Der erste Build deployed den Worker; alle weiteren Pushes werden ebenfalls automatisch ausgerollt.

---


## 2 · Konfiguration

Site-Konfiguration wird **ausschließlich im Cloudflare-Dashboard** gepflegt — unter **Workers → altbieratlas → Settings → Variables and Secrets**. Der Worker liefert die Werte über `/api/config` ans Frontend, das sie zur Laufzeit in `window.ATLAS_CONFIG` merged.

Warum Dashboard statt `wrangler.toml`? `keep_vars = true` in der `wrangler.toml` schützt Dashboard-Werte nur dann, wenn die Variable **gar nicht** in der Datei steht. Sobald ein Variablenname unter `[vars]` auftaucht (auch mit leerem String), überschreibt der Deploy den Dashboard-Wert. Deshalb ist `[vars]` in diesem Projekt bewusst leer.

### Erwartete Variablen

| Variable | Zweck | Sensibel? |
|---|---|---|
| `GA4_MEASUREMENT_ID` | GA4-Measurement-ID (`G-XXXXXXXXXX`). Nicht gesetzt = GA4 deaktiviert. | nein |
| `AUTHOR_NAME` | Name im Footer („Entwickelt von …") | nein |
| `AUTHOR_GITHUB` | Vollständige URL zum GitHub-Profil | nein |
| `AUTHOR_LINKEDIN` | Vollständige URL zum LinkedIn-Profil | nein |
| `AUTHOR_WEBSITE` | Persönliche Website (optional) | nein |
| `IMPRESSUM_OWNER` | Name des Betreibers für § 5 TMG | nein |
| `IMPRESSUM_ADDRESS` | Postanschrift (Komma-getrennt → wird im Impressum zeilenweise umgebrochen) | nein |
| `IMPRESSUM_EMAIL` | Kontakt-E-Mail im Impressum | nein |
| `TURNSTILE_SITE_KEY` | Öffentlicher Cloudflare-Turnstile-Key. Nicht gesetzt = Bot-Schutz-Platzhalter. | nein |
| `CONTACT_EMAIL` | User-Agent-String für Nominatim-Proxy | nein |
| `TURNSTILE_SECRET_KEY` | Serverseitiger Turnstile-Key. **Nur als Secret setzen** (`wrangler secret put`)! | **JA** |

Fehlt eine Variable oder ist leer, fällt der Worker sauber auf sichtbare Platzhalter bzw. deaktivierte Features zurück — nichts crasht.

### Variablen im Dashboard setzen

1. **Workers & Pages → altbieratlas → Settings → Variables and Secrets**
2. Unter *Variables* die gewünschten Werte als Plaintext eintragen (z. B. `AUTHOR_NAME` = „Max Mustermann")
3. „Deploy" klicken — Cloudflare führt einen neuen Deployment aus, der die Variablen in die Worker-Runtime übernimmt

Das Frontend zieht den neuen Wert beim nächsten Seitenaufruf automatisch über `/api/config`.

### `public/config.js`

Enthält nur noch **Fallback-Werte für den Mock-Modus** (lokales UI-Testen ohne Backend). Im Live-Betrieb werden die Werte aus `/api/config` priorisiert. Ausnahmen, die hier direkt gesetzt werden können/müssen:

| Feld | Zweck |
|---|---|
| `apiMode` | `"auto"` (default), `"live"` oder `"mock"` |
| `map.*` | Kartenzentrum, Zoomstufen, Tile-URL |
| `features.*` | Feature-Flags (Admin-Link, Events …) |
| `priceSizes` | Verfügbare Mengen-Dropdown-Werte |

---

## 3 · Lokal entwickeln

```bash
npm run db:setup:local
npm run dev
```

Die Site läuft dann auf `http://localhost:8787`. Ohne konfiguriertes Turnstile-Secret wird die Bot-Prüfung serverseitig übersprungen (siehe `verifyTurnstile()` in `src/utils.js`).

Wenn du ganz ohne Wrangler testen willst (statische Files im Browser öffnen), greift automatisch der **Mock-Modus**: `api-client.js` erkennt, dass `/api/stats` nicht erreichbar ist, und fällt auf den Seed aus `data.js` + LocalStorage zurück. Perfekt für schnelle UI-Iterationen.

Im Footer rechts unten zeigt ein kleines Label, welcher Modus gerade aktiv ist (`live` · `mock` · `probing…`).

---

## 4 · Moderation (Admin-Panel)

Erreichbar unter `/admin.html`. Login mit dem in Schritt 1.4 angelegten User.

Drei Tabs:

- **Übersicht** — Statistik-Kacheln (offen / freigegeben / abgelehnt / Brauereien / Preise) und die neuesten offenen Beiträge auf einen Blick.
- **Offene Beiträge** — Queue aller Einreichungen mit Approve/Reject-Buttons. Beim Freigeben wird der Eintrag automatisch in die richtige Tabelle geschrieben (`price` → `prices`, `brewery` → `breweries`, `event` → `events`, `style` → `styles` + `brewery_styles`). Der Typ `correction` wird nicht automatisch angewendet — der Admin muss die Änderung manuell im DB-Datensatz vornehmen und den Beitrag dann auf `approved` setzen (oder ablehnen mit Notiz).
- **Brauereien** — Tabelle aller Brauereien mit Verifizierungs- und Lösch-Aktionen. Löschen setzt die FK-Kaskade: Preise werden mitgelöscht.

Sessions laufen nach 8 Stunden ab. Der Login selbst ist IP-rate-limitiert (5 Fehlversuche pro 5 Minuten).

---

## 5 · Wichtige API-Endpunkte

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/config` | Turnstile-Site-Key etc. |
| GET | `/api/stats` | Kennzahlen für Ticker |
| GET | `/api/breweries` | Liste aller freigegebenen Brauereien |
| GET | `/api/breweries/:id` | Detail + Preisverlauf |
| GET | `/api/prices` / `/events` / `/styles` / `/glossary` | Stammdaten |
| GET | `/api/geocode?q=…` | Nominatim-Proxy |
| POST | `/api/contributions` | Beitrag einreichen (mit Turnstile) |
| POST | `/api/admin/login` | Session-Cookie setzen |
| GET | `/api/admin/contributions?status=pending` | Admin: Queue |
| POST | `/api/admin/contributions/:id/approve` | Admin: Freigabe |
| POST | `/api/admin/contributions/:id/reject` | Admin: Ablehnung |

---

## 6 · Sicherheits-Hinweise

- Passwort-Hashing: PBKDF2-SHA256, 120 000 Iterationen, 16 B Salt, 32 B Hash
- Sessions: 32 B zufälliges Token, HttpOnly · Secure · SameSite=Strict-Cookie
- Login-Antwort: Konstant-Zeit-Vergleich, um User-Enumeration zu verhindern
- Rate-Limits: Contribution 20/h, Geocode 30/min, Login 5/5min — alle IP-basiert in D1
- Turnstile-Verifikation wird serverseitig gegen `challenges.cloudflare.com/siteverify` durchgeführt
- Alle Contributions laufen durch Input-Validierung (`str/num/oneOf` in `utils.js`)
- FK-Kaskaden: Löschen einer Brauerei löscht automatisch Preise & Style-Zuordnungen

---

## 7 · Was als nächstes sinnvoll wäre

- **Magic-Link-Login für Beiträger** — um eingereichte Beiträge bearbeiten/zurückziehen zu können
- **E-Mail-Versand bei Status-Änderung** (Resend, SendGrid o.ä.)
- **Turnstile-Pre-Clearance** auf GET-Seiten — spart das Widget auf `beitragen.html`
- **KV- oder R2-Cache** für `/api/breweries` und `/api/prices` (derzeit direkt aus D1)
- **Image-Uploads** für Brauereien (R2 + Cloudflare Images)
- **Deutschsprachiger Open-Data-Export** als CSV/JSON unter `/api/export`

---

© Altbieratlas — privat und unkommerziell betrieben.
