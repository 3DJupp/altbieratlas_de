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

## 1 · Setup in 5 Schritten

### Voraussetzungen

- Node.js ≥ 20
- `wrangler` (wird als dev-dependency installiert)
- Ein Cloudflare-Account

### 1.1 Installieren

```bash
npm install
npx wrangler login
```

### 1.2 D1-Datenbank anlegen

```bash
npm run db:create
```

Aus der Ausgabe die `database_id` kopieren und in `wrangler.toml` eintragen:

```toml
[[d1_databases]]
binding       = "DB"
database_name = "altbieratlas"
database_id   = "<HIER_DEINE_ID>"
```

### 1.3 Schema + Seed einspielen

Für die produktive Umgebung:

```bash
npm run db:setup:remote
```

Für lokale Tests (läuft gegen eine lokale SQLite-Kopie):

```bash
npm run db:setup:local
```

### 1.4 Admin-User anlegen

```bash
npm run admin:create -- admin <starkes-passwort> --remote
```

Das Passwort muss mindestens 10 Zeichen lang sein. Der Hash wird lokal mit PBKDF2-SHA256 (120 000 Iterationen) berechnet und dann per `wrangler d1 execute` in die Datenbank geschrieben — das Klartext-Passwort verlässt nie deinen Rechner.

### 1.5 Secrets setzen

```bash
# Cloudflare Turnstile (https://dash.cloudflare.com/ → Turnstile → Add Site)
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put TURNSTILE_SITE_KEY      # oder als [vars] — ist öffentlich

# Optional: E-Mail-Adresse für Nominatim-User-Agent
wrangler secret put CONTACT_EMAIL
```

### 1.6 Deployen

```bash
npm run deploy
```

Fertig. Die URL steht in der Wrangler-Ausgabe.

---

## 2 · Konfiguration

### `public/config.js`

Alle nicht-geheimen Laufzeit-Optionen. Wichtige Felder:

| Feld | Zweck |
|---|---|
| `ga4MeasurementId` | GA4-ID (`G-XXXXXXXXXX`). Setzen → nach Cookie-Consent wird GA4 geladen. |
| `turnstileSiteKey` | Fallback für den Site-Key. Der Server liefert den Wert aus `TURNSTILE_SITE_KEY` bevorzugt. |
| `author.github` | Link im Footer (leer = kein Icon) |
| `author.linkedin` | Link im Footer (leer = kein Icon) |
| `author.name` | Name im Footer |
| `impressum.owner` / `.address` / `.email` | Wird auf der Impressums-Seite gerendert |
| `apiMode` | `"auto"` (default, mit Mock-Fallback), `"live"` (hart), `"mock"` (nur Seed) |

### `wrangler.toml`

Neben `database_id` und `[vars]` muss nichts angepasst werden.

### Secrets vs. Vars

| Name | Wo | Sensibel? |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | Secret (`wrangler secret put`) | **JA** |
| `TURNSTILE_SITE_KEY` | Secret oder `[vars]` | nein (öffentlich) |
| `CONTACT_EMAIL` | `[vars]` (für Nominatim-UA) | nein |

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
