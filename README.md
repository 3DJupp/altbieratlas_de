# Altbieratlas · v0.14.0

Die interaktive Karte des Altbiers — betrieben als **Cloudflare Worker + D1**.

```
altbieratlas/
├── src/
│   ├── worker.js            # Router (API + ASSETS)
│   ├── routes.js            # Public- & Admin-API
│   ├── seo.js               # llms.txt, SSR für /, /ranglisten, /wissen, /sorten, ?lang=en, IndexNow
│   ├── cache.js             # Edge-Cache (Cache API) für öffentliche GET-Antworten
│   ├── d1meter.js           # Zählt D1-Abfragen/gelesene Zeilen pro Request ([d1]-Logzeile)
│   └── utils.js             # PBKDF2, Turnstile, Rate-Limit, E-Mail
├── public/
│   ├── index.html           # Landing + Karte (Leaflet)
│   ├── ort.html             # Ort-Detail + Preisverlauf + Untappd + Google-Bewertung
│   ├── event.html           # Event-Detail
│   ├── ranglisten.html      # Preis-Ranglisten
│   ├── wissen.html          # Geschichte, Köbes-Kultur, Glossar
│   ├── sorten.html          # Alle Altbier-Sorten (ABV, IBU, Geschmack)
│   ├── rivalen.html         # Alt vs. Kölsch — Das Rheinderby
│   ├── stadt.html           # Stadt-Landingpage (SSR, Slugs kommen aus D1)
│   ├── staedte.html         # Übersicht aller Städte (/staedte, SSR-Liste)
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
│   ├── backfill-place-ids.mjs # Google Place IDs nachtragen (Dry-Run / --apply)
│   ├── create-admin.mjs     # Admin-User anlegen
│   ├── db-setup.sh          # DB-Setup (Schema + Seed + Upgrade)
│   ├── deploy.sh            # CI-Deploy (D1-Credentials via Env-Vars ersetzen)
│   └── indexnow.sh          # IndexNow-Submit (Sitemap oder Einzel-URLs)
├── wrangler.toml
├── BACKLOG.md           # offene Punkte (Admin-Lücken u. a.)
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

> **Seed vs. Live-DB:** Der Seed wird nur bei Neuinstallationen eingespielt. Events pflegen die Mitwirkenden in der Live-D1 (Admin-Panel, `wrangler d1 execute --remote` oder Cloudflare-MCP); Seed und `data.js` enthalten nur zwei Beispiel-Events. Ungeprüfte Funde erhalten `status='pending'` und werden im Admin freigegeben. Bei Orten enthalten Seed und `data.js` nur einen schlanken Startbestand nennenswerter Brauereien; Kneipen, Gastronomie und Handel stehen nur in der Live-D1 und werden von den Mitwirkenden gepflegt. Maßgeblich ist immer die Live-D1; Seed und `data.js` müssen nicht synchron sein.

**Genau zwei Dateien — immer.** Neue Spalten, Brauereien, Stile etc. werden direkt in `0001` bzw. `0002` eingebaut, **nicht** als neue Datei `0003_…`. Für Upgrades bestehender Produktionsinstanzen: SQL direkt in der D1-Dashboard-Console ausführen.

> ⚠️ **Wichtig: FK-Kaskaden und Datenverlust**
>
> Das Schema setzt überall auf `ON DELETE CASCADE` / `ON DELETE SET NULL`. Das bedeutet:
> - **Brauerei löschen** → alle Preise, Stil-Zuordnungen (`brewery_styles`) und Events dieser Brauerei werden ebenfalls gelöscht.
> - **Stil löschen** → alle Zuordnungen in `brewery_styles` für diesen Stil werden gelöscht; Preise mit dieser Sorte bleiben, verlieren aber die Sorte (`prices.style_id` → `NULL`).
> - **Event löschen** → alle Event-Biere (`event_beers`) dieses Events werden gelöscht.
> - **Brauerei-ID umbenennen** → der Worker-Code aktualisiert per Batch alle FK-Referenzen (Preise, Stile, Events, Nachfolger, Hauptbrauerei einer Sorte). Die alte URL `/ort/<alte-id>` wird danach zur 404. Bei unbeabsichtigter Umbenennung (z. B. Tippfehler in der ID) können Daten verloren gehen, wenn das Rollback nicht rechtzeitig erfolgt. **Vor ID-Änderungen immer ein DB-Snapshot erstellen** (D1-Dashboard → *Export* oder `wrangler d1 export`).

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
| `ADMIN_EMAIL` | Empfänger der Sofort-Benachrichtigung pro Einreichung und des Digests |
| `MAP_TILE_API_KEY` | API-Key der CARTO Basemaps ([dashboard.basemaps.carto.com](https://dashboard.basemaps.carto.com/)). Ohne Key nutzt die Karte schlüssellose OSM-Kacheln |
| `INDEXNOW_KEY` | Optional. [IndexNow](https://www.indexnow.org)-Schlüssel (8–128 Zeichen `a–z A–Z 0–9 -`). Der Worker liefert ihn unter `/<key>.txt` aus und meldet nach Admin-Änderungen die betroffenen Seiten an Bing, Yandex & Co. (Bing speist u. a. die ChatGPT-Suche). Ohne Key keine Meldung. Einrichtung: [1.5](#15-indexnow-aktivieren-optional-empfohlen) |
| `GOOGLE_PLACES_KEY` | Optional. API-Key der Google **Places API (New)**. Place-ID-Suche im Admin-Panel, wöchentlicher Bewertungsabruf und Backfill-Skript. In der Google Cloud Console unter *APIs & Services → Credentials → API restrictions* auf **„Places API (New)"** beschränken. Ohne Key keine Suche und keine Bewertungen. Einrichtung: [1.6](#16-google-place-ids-und-bewertungen-optional) |
| `INITIAL_ADMIN` | Ersteinrichtung — nach erstem Login löschen |

---

### 1.5 IndexNow aktivieren (optional, empfohlen)

[IndexNow](https://www.indexnow.org) meldet geänderte Seiten direkt an die
teilnehmenden Suchmaschinen (Bing, Yandex, Seznam, Naver, Yep) — ein Request an
`api.indexnow.org` genügt, die Verteilung übernimmt der Dienst. Bing speist u. a.
die ChatGPT-Suche. Google nimmt an IndexNow **nicht** teil und bleibt bei
Sitemap und Search Console.

**Schritt 1 — Schlüssel erzeugen** (8–128 Zeichen aus `a–z A–Z 0–9 -`):

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
# oder: openssl rand -hex 16
```

**Schritt 2 — Schlüssel als Secret setzen.** Dashboard → Workers → `altbieratlas`
→ *Settings → Variables and Secrets* → **Add → Secret**, Name `INDEXNOW_KEY`,
Wert der Schlüssel. Alternativ per CLI:

```bash
npx wrangler secret put INDEXNOW_KEY
```

Danach einmal deployen bzw. das automatische Deploy abwarten. Mehr ist nicht
nötig: der Worker liefert die Schlüsseldatei unter `/<key>.txt` aus
(`SEO.serveIndexNowKey()`) und meldet nach jeder erfolgreichen Admin-Änderung
die betroffenen Orte, Stadtseiten und Termine selbst (`SEO.pingIndexNow()`).
Zusätzlich meldet ein stündlicher Cron-Lauf (`SEO.sweepIndexNow()`) alles,
was seit dem letzten Lauf neu ist — also auch Orte, Preise und Termine, die
direkt in der D1-Konsole eingetragen wurden.
Ohne das Secret passiert nichts — kein Fehler, nur keine Meldung.

**Schritt 3 — Schlüsseldatei prüfen.** Muss den Schlüssel im Klartext liefern,
sonst antwortet IndexNow mit `403`:

```bash
KEY=dein-indexnow-key
curl -i "https://altbieratlas.de/$KEY.txt"
# → 200, Body = $KEY, content-type: text/plain; charset=utf-8
```

**Schritt 4 — Erst-Anmeldung aller Seiten.** Einmal nach dem Aktivieren alle
Sitemap-URLs melden (das Script prüft die Schlüsseldatei, liest
`/sitemap.xml` und sendet in Blöcken à 1 000 URLs):

```bash
INDEXNOW_KEY=$KEY npm run seo:indexnow            # alles aus der Sitemap
INDEXNOW_KEY=$KEY npm run seo:indexnow -- --dry-run   # vorher nur ansehen
INDEXNOW_KEY=$KEY npm run seo:indexnow -- /ort/<slug> /ranglisten  # Einzel-URLs
```

#### curl direkt

Einzelne URL (GET, der einfachste Weg):

```bash
curl -i "https://api.indexnow.org/indexnow?url=https://altbieratlas.de/ranglisten&key=$KEY&keyLocation=https://altbieratlas.de/$KEY.txt"
```

Mehrere URLs (POST, bis 10 000 pro Request):

```bash
curl -i -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "host": "altbieratlas.de",
    "key": "'"$KEY"'",
    "keyLocation": "https://altbieratlas.de/'"$KEY"'.txt",
    "urlList": [
      "https://altbieratlas.de/",
      "https://altbieratlas.de/ranglisten",
      "https://altbieratlas.de/wissen",
      "https://altbieratlas.de/sorten",
      "https://altbieratlas.de/rivalen",
      "https://altbieratlas.de/beitragen"
    ]
  }'
```

Alle Sitemap-URLs in einem Durchgang, ohne das Script:

```bash
curl -s https://altbieratlas.de/sitemap.xml |
  grep -o '<loc>[^<]*</loc>' | sed -e 's/<[^>]*>//g' -e 's/&amp;/\&/g' |
  python3 -c 'import json,sys;u=[l.strip() for l in sys.stdin if l.strip()];print(json.dumps({"host":"altbieratlas.de","key":"'"$KEY"'","keyLocation":"https://altbieratlas.de/'"$KEY"'.txt","urlList":u}))' |
  curl -i -X POST "https://api.indexnow.org/indexnow" \
    -H "Content-Type: application/json; charset=utf-8" --data-binary @-
```

Statt `api.indexnow.org` lässt sich auch direkt an eine einzelne Engine melden
(`https://www.bing.com/indexnow?…`, `https://yandex.com/indexnow?…`) — nötig ist
das nicht, der gemeinsame Endpunkt verteilt an alle.

| Status | Bedeutung |
|---|---|
| `200` | angenommen |
| `202` | angenommen, Schlüssel wird noch geprüft (normal beim ersten Mal) |
| `400` | fehlerhaftes Format |
| `403` | Schlüssel ungültig — Schlüsseldatei unter `/<key>.txt` nicht erreichbar |
| `422` | URLs gehören nicht zum angegebenen `host`, oder Schlüssel passt nicht |
| `429` | zu viele Anfragen — später erneut |

> Nicht im Minutentakt dieselben URLs melden. Der automatische Ping des Workers
> deckt den Normalbetrieb ab; das Script ist für die Erst-Anmeldung und für
> Änderungen gedacht, die direkt in der D1-Console gemacht wurden (dort läuft
> kein Worker-Request, also auch kein Ping).

---

### 1.6 Google Place IDs und Bewertungen (optional)

Jeder aktuelle Ort kann eine Google Place ID haben (`breweries.google_place_id`).
Sie vereinheitlicht den Maps-Link und schaltet die Google-Bewertung auf der
Ortsseite, im Karten-Popup und in der Rangliste „Google-Bewertung" frei. Historische Orte (`is_historical = 1`) bekommen keine.

**Key anlegen:** In der Google Cloud Console die *Places API (New)* aktivieren,
einen API-Key erzeugen und ihn unter *API restrictions* **nur** für
„Places API (New)" freigeben. Dann als Worker-Secret hinterlegen:

```bash
npx wrangler secret put GOOGLE_PLACES_KEY
```

Für das Backfill-Skript zusätzlich lokal als Umgebungsvariable setzen
(`export GOOGLE_PLACES_KEY=…`). Der Key wird nie geloggt oder ausgegeben.

**Maps-Link** (`mapsLink()` in `src/googlePlaces.js`, im Frontend
`window.atlasMapsLink()`): mit Place ID das offizielle Maps-URLs-Format
`https://www.google.com/maps/search/?api=1&query=<Name, Adresse>&query_place_id=<id>`,
sonst die gepflegte `maps_url`, sonst die Koordinaten. `maps_url` bleibt als Fallback
erhalten. Genutzt in der API (`mapsUrl`), auf der Ortsseite und im JSON-LD (`hasMap`).

**Suche und Status** (gemeinsam für Admin-Panel und Skript): Textsuche
`"<Name>, <Adresse>"` mit `locationBias` (Kreis 100 m um die DB-Koordinaten).
Ein Treffer ist **sicher**, wenn er näher als 75 m liegt **und** die Hausnummer der
DB-Adresse in Googles Adresse vorkommt, sonst **prüfen**; ohne Treffer **kein Treffer**.

**Backfill** für alle Orte mit `is_historical = 0 AND google_place_id IS NULL`.
Am einfachsten im Admin-Panel: *Brauereien* → **„Place IDs nachtragen"**. Das läuft
im Worker mit dessen Secret, ein lokaler Key ist nicht nötig. Der Probelauf zeigt
id, Name (DB), Name (Google), Adresse (Google), Entfernung und Status; vorausgewählt
sind nur die sicheren Treffer, gespeichert wird erst nach Bestätigung. „Bericht
kopieren" legt die Tabelle tab-getrennt in die Zwischenablage. Das Panel arbeitet
in Portionen zu 20 Orten (Subrequest-Limit des Free-Plans: 50 je Aufruf).

Alternativ lokal mit dem Skript:

```bash
export GOOGLE_PLACES_KEY=…
# 1) Dry-Run (Standard): liest die Remote-D1 nur, zeigt die Tabelle
#    (id, Name DB, Name Google, Adresse Google, Entfernung, Status) und schreibt
#    place-ids-backfill.sql (UPDATEs nur für "sicher") + place-ids-backfill.json
npm run places:backfill -- --db=<d1-name>
# 2) SQL prüfen, dann anwenden
npm run places:backfill -- --db=<d1-name> --apply
```

Zwischen den Requests wartet das Skript 250 ms (`--delay=`), Fehler bei einem Ort
brechen den Lauf nicht ab. Die UPDATEs greifen nur, solange `google_place_id`
noch leer ist. Fälle mit „prüfen" / „kein Treffer" im Admin-Panel per
„Bei Google suchen" nacharbeiten.

**Bewertungen:** Ein zweiter Cron (`0 4-6 * * 1`, montags 4, 5 und 6 Uhr UTC) ruft
für die Orte mit Place ID `rating` und `userRatingCount` ab und upsertet sie in
`google_places_cache`, je Lauf höchstens 40 Orte, deren Eintrag fehlt oder älter
als 6 Tage ist (drei Läufe reichen für 120 Orte). Einträge älter als 30 Tage werden gelöscht. Laut
Google-Bedingungen darf nur die Place ID dauerhaft gespeichert werden, alles
andere höchstens 30 Tage. Manuell auslösen: Admin-Panel → *Brauereien* →
„Google-Bewertungen abrufen" (wiederholt den Endpunkt, bis alle Orte durch sind)
bzw. `POST /api/admin/google-ratings/refresh` (eine Portion je Aufruf, Antwort mit `remaining`).
Die Ortsseite zeigt z. B. „4,5 ★ (312 Bewertungen) bei Google" mit Link auf den
Maps-Link, ohne Review-Texte; fehlt der Cache-Eintrag oder ist er älter als
30 Tage, erscheint nichts.

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
- Popup-Preis wie auf der Ortsseite: jüngste 0,25-l-Meldung, sonst die kleinste gemeldete Größe
  (ohne Umrechnung, Größe steht dabei); darunter grau der Literpreis als reine Zusatzinfo
- Popup zeigt außerdem die Google-Bewertung (Sterne-Schnitt, Anzahl, „bei Google"),
  sofern ein höchstens 30 Tage alter Cache-Eintrag existiert
- Schnellübersicht „Günstigstes/Teuerstes Alt" vergleicht nur 0,25 l; ein Hinweis nennt,
  wie viele Orte bisher nur andere Größen gemeldet haben, und verlinkt `/ranglisten`

### Ort-Detail (`/ort/<slug>`)
- **Sprechende URLs**: `/ort/<slug>` statt `/ort?id=<slug>`.
  `/ort?id=…`, `/ort.html?id=…`, `/brauerei?id=…` und Trailing-Slash-Varianten
  leiten mit einem einzigen 301 auf die kanonische Form
- **Serverseitig gerendert**: H1, Beschreibung, Adresse, Sorten und eine
  Preistabelle (jüngste Meldung je Größe und Sorte) stehen im HTML, bevor JavaScript läuft.
  Crawler ohne JS-Rendering und Social-Previews sehen damit echten Inhalt statt „Lade…"
- JSON-LD `BarOrPub` (historische Orte: `Place`) mit Adresse, Geo, Gründungsjahr
  und `Menu`/`Offer`-Preisen, dazu `BreadcrumbList` mit Stadt-Zwischenstufe
- Preisbox: jüngste 0,25-l-Meldung, sonst die kleinste gemeldete Größe; der
  Preisverlauf (SVG-Chart) zeigt genau diese Größe und Sorte
- **Preise je Sorte** (`prices.style_id`, optional): Führt ein Ort mehrere Alts
  (z. B. Alt und Alkoholfrei), steht die Sorte an jeder Preismeldung. Eine Meldung
  ohne Sorte zählt für alle Sorten derselben Größe, eine neuere verdrängt sie
- Stile, Geschmacksnotizen (DE/EN)
- **Übernahmen** (`breweries.successor_id`): historische Orte zeigen „Heute bei: …“ mit Link,
  der übernehmende Ort listet seine übernommenen Marken
- **Untappd-Rating** (optional): Bewertung + Link, 24h in D1 gecacht; Treffer per Namenssuche oder fester `untappd_id` aus dem Admin
- **Google-Bewertung** (optional, `GOOGLE_PLACES_KEY`): „4,5 ★ (312 Bewertungen) bei Google"
  mit Link auf den Ort in Google Maps, aus dem höchstens 30 Tage alten Cache
- **Maps-Link** über die Google Place ID (sonst `maps_url`, sonst Koordinaten), siehe [1.6](#16-google-place-ids-und-bewertungen-optional)

### Stadt-Landingpages (SEO)
- Serverseitig gerenderte Seiten unter `/stadt/<slug>`
- **Slugs entstehen automatisch** aus den Städten der freigegebenen und geprüften Orte
  (`citySlug()` in `src/routes.js`, umlautfest: „ü“ → `ue`, „ß“ → `ss`,
  Leerzeichen → `-`). Keine Whitelist mehr zu pflegen —
  ein neuer Ort in einer neuen Stadt erzeugt Seite und Sitemap-Eintrag von selbst
- Listet aktive **und historische** Orte einer Stadt inkl. Ø-Preis (nur 0,25 l, damit
  vergleichbar) und Preis je Ort (jüngster Preis der kleinsten gemeldeten Größe, mit
  Größenangabe). Ungeprüfte Orte („In Prüfung“, `verified = 0`) erscheinen hier nicht,
  mit `CollectionPage`-, `BreadcrumbList`- und `ItemList`-JSON-LD sowie hreflang
- Querverlinkung „Weitere Städte" auf jeder Stadtseite; zusätzlich verlinkt der
  Footer site-weit die bis zu fünf größten Städte mit mehr als einem aktiven Ort
  (Daten via `/api/config`), dahinter „Weitere →“ auf die Übersicht `/staedte`
- `/staedte`: Übersicht aller Städte (SSR-Liste, `ItemList`-JSON-LD); `/stadt` und
  `/stadt/` leiten per 301 dorthin

### Beitragen
Fünf Einreichungstypen mit Moderation:
- **Preismeldung** — Brauerei, Sorte (Auswahl aus den Sorten des Orts; bei genau einer vorbelegt, ohne hinterlegte Sorten ausgeblendet), Preis, Größe, Datum
- **Brauerei / Kneipe** — inkl. automatischem Geocoding via Nominatim
- **Sorte & Geschmacksnotizen** — Stil, ABV, IBU, Tasting
- **Korrektur** — Freitext-Hinweis
- **Event** — Name, Datum, optionale Brauerei-Zuordnung

Optional Name/Spitzname (`contributions.submitter_name`) und E-Mail. Ohne E-Mail fragt
das Formular einmal nach, weil dann weder Freischalt-Benachrichtigung noch Rückfragen
möglich sind. Das Turnstile-Token wird nie im Payload gespeichert (Server filtert
`cf-turnstile-response` & Co. zusätzlich heraus).

### Moderations-Dashboard (`/admin`)
- **Übersicht** — Statistiken, neueste offene Beiträge und **fehlende Übersetzungen** (alle Orte, Sorten, Events, Event-Biere, Glossar-Einträge und Typen mit leerem DE- oder EN-Text; Orte öffnen direkt den Bearbeiten-Dialog)
- **Beiträge** — Approve / Reject mit optionaler Notiz; beim Freigeben eines neuen Orts sucht das Panel automatisch die Google Place ID und zeigt sie als Vorschlag (gespeichert wird nur per Klick). Beiträge zu einem bestehenden Ort (Preis, Sorte, Korrektur, Event) verlinken den Ort und springen per „Ort bearbeiten“ in dessen Dialog; Korrekturen werden danach als „Erledigt“ markiert, sie ändern selbst nichts
- **Brauereien** — Alle Einträge bearbeiten (inkl. Google-Maps-URL und Google Place ID mit „Bei Google suchen": Treffer mit Adresse, Entfernung und Status, Übernahme erst nach Bestätigung), Place IDs per Probelauf für alle Orte nachtragen, Google-Bewertungen manuell abrufen, offene (`pending`) Einträge per „Freigeben" öffentlich schalten (setzt `status = approved` und `verified`), verifizieren, löschen; neue Brauereien direkt anlegen; Nachfolger („Heute bei …“) per Auswahl setzen; Untappd-Zuordnung korrigieren (`untappd_id`: leer = Namenssuche, 0 = ausblenden, sonst feste Untappd-ID; „Prüfen“ verwirft den Cache und zeigt den Treffer)
- **Events** — Alle Events einsehen, bearbeiten (inkl. ID-Umbenennung, Enddatum/Endzeit für mehrtägige Events), löschen; neue Events direkt anlegen; Biere pro Event verwalten
- **Preise** — Alle Preise einsehen, bearbeiten (inkl. Sorte), löschen; neue Preise direkt eintragen
- **Stile** — Bierstile anlegen, bearbeiten (inkl. Ausschankorte per Mehrfachauswahl), löschen; beim Umbenennen behalten Preise ihre Sorte
- **Glossar** — Einträge anlegen, bearbeiten, löschen
- **Typen** — Venue-Typen (brewpub, brewery, taproom, gastronomie, pub, restaurant, kiosk, handel, supermarket, beverage_store) anlegen, bearbeiten, löschen
- **Einstellungen** — Impressum, Ankündigungs-Banner (DE/EN, aktivierbar), Social-Links (GitHub, LinkedIn, Instagram, Mastodon, Ko-fi, Website)
- **Passwort-Reset per E-Mail** (DE/EN)
- **Zweisprachigkeit**: fehlt beim Speichern DE oder EN (Beschreibung, Geschmack, Titel, Definition, Typ-Name/-Überschrift), fragt das Panel nach
- Mobile-optimierte Tab-Navigation

### Ranglisten
- Günstigste Brauereien, neueste Preismeldungen, Meistgemeldet
- **Google-Bewertung**: Orte nach Google-Sterneschnitt (Cache ≤ 30 Tage), nur ab
  25 Bewertungen (`GOOGLE_MIN_COUNT` in `ranglisten.html`), Gleichstand nach Anzahl
- **Preis gesucht**: alle aktiven Orte ohne Preismeldung, nach Stadt sortiert, je
  mit Link „Preis melden" (`/beitragen?typ=preis&brauerei=<id>`)
- Jüngste Meldung je Ort **und Sorte**; Filter nach Sorte (nur Sorten mit Preismeldungen)
- Top 10 (0,25 l), Kennzahlen und Meta-Description werden serverseitig gerendert;
  JSON-LD mit `ItemList` und `Dataset` (Altbier-Preise, Lizenz CC BY-SA 4.0)

### Altbier-Wissen
- Geschichte, drei Köbes-Regeln für den ersten Besuch, Brauhaus-Glossar (aus D1)
- Glossar serverseitig gerendert; JSON-LD `Article` + `DefinedTermSet`
- Querverweis auf `/sorten`

### Altbier-Sorten (`/sorten`)
- Alle Sorten aus D1 mit ABV, IBU, Geschmack und Link zur Hauptbrauerei
- Kurz eingeordnet: obergärig, Hausbrauerei, Alt aus dem Supermarkt
- Serverseitig gerendert; JSON-LD `CollectionPage` mit `ItemList`

### Das Rheinderby (`/rivalen`)
- Alt vs. Kölsch: Versus-Tabelle mit Brautechnik, IBU, Glas, EU-Schutz
- Hebt überraschende Gemeinsamkeiten hervor (beide obergärig, beide Köbes, beide 0,2 l)
- Prosa-Abschnitt zur Rivalität (Kölschkonvention 1986, g.g.A. für Kölsch, Altbier ohne Herkunftsschutz)
- Abstimmung „Team Alt vs. Team Kölsch" plus kleine Enthaltung für Pils-Trinker; eine Stimme pro IP und Tag, gespeichert nur als SHA-256-Hash über IP + Tag (`rival_votes`, zweiter Versuch am selben Tag → 429), Enthaltungen zählen nicht in die Alt/Kölsch-Prozente
- Vollständig DE/EN übersetzt

### Mehrsprachigkeit & UX
- DE / EN vollständig via `i18n.js`
- Dark Mode, PWA-Manifest, Cookie-Banner (DSGVO)
- Mock-Modus: ohne Backend läuft das UI auf Seed-Daten aus `data.js`

### SEO & Auffindbarkeit
- **Kanonische URLs**: `/ort/<slug>` und `/stadt/<slug>`; alle Altformen leiten
  mit genau einem 301 weiter (keine Redirect-Ketten)
- **Server-Rendering** auf `/`, `/ranglisten`, `/wissen`, `/sorten`, `/ort/<slug>` und
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
  `CollectionPage` je Stadt und auf `/sorten`, `Article` auf `/wissen` und `/rivalen`,
  `Dataset` der Preise, `BreadcrumbList` überall. `creator`/`author`/`publisher`
  stehen als vollständiger `Organization`-Knoten im Markup, nicht als bloße
  `@id`-Referenz — die zeigt außerhalb der Startseite ins Leere und wird in der
  Search Console als ungültiger Objekttyp gemeldet
- **Datenlizenz**: die Preismeldungen stehen unter
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — genannt im
  `license`-Feld des `Dataset` und im Kopf von `llms.txt`/`llms-full.txt`
- **IndexNow** (optional, Secret `INDEXNOW_KEY`): geänderte Orte, Stadtseiten
  und Termine werden nach jeder Admin-Änderung sofort (direkte D1-Einträge
  spätestens nach einer Stunde per Cron) an Bing, Yandex, Seznam,
  Naver und Yep gemeldet (Bing speist u. a. die ChatGPT-Suche; Google nimmt an
  IndexNow nicht teil). Die Schlüsseldatei liefert der Worker unter
  `/<key>.txt`. Für die Erst-Anmeldung und für Änderungen, die direkt in der
  D1-Console gemacht wurden, gibt es `npm run seo:indexnow`
  (→ [1.5 IndexNow aktivieren](#15-indexnow-aktivieren-optional-empfohlen))
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
- **Gecacht:** SSR-Seiten (`/`, `/ranglisten`, `/wissen`, `/sorten`, `/ort/*`, `/stadt/*`,
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
| GET | `/api/breweries` | Alle freigegebenen Brauereien (inkl. `googleRating` aus dem Cache ≤ 30 Tage) |
| GET | `/api/breweries/:id` | Detail + Preisverlauf |
| GET | `/api/prices` | Preismeldungen (max. 2000), je mit `styleId` |
| POST | `/api/prices` | Preismeldung einreichen (Wrapper) |
| GET | `/api/events` | Events (inkl. `endDate`, `endTime`) |
| GET | `/api/events/:id` | Event-Detail + Biere |
| GET | `/api/events/calendar.ics` | Alle zukünftigen Events als iCal (URL → Detailseite) |
| GET | `/api/events/:id/calendar.ics` | Einzelnes Event als ICS |
| GET | `/api/styles` | Bierstile |
| GET | `/api/glossary` | Glossar |
| GET | `/api/geocode?q=…` | Nominatim-Proxy |
| POST | `/api/contributions` | Beitrag einreichen |
| GET | `/api/rivals/votes` | Stimmen Alt / Kölsch / Enthaltung |
| POST | `/api/rivals/vote` | Stimme abgeben (`alt`, `kolsch`, `neutral`), einmal pro IP und Tag |
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
| PUT | `/api/admin/breweries/:id` | Brauerei bearbeiten (inkl. `google_place_id`, `untappd_id`) |
| DELETE | `/api/admin/breweries/:id/untappd-cache` | Untappd-Cache des Orts verwerfen |
| GET | `/api/admin/translation-gaps` | Alle Einträge mit fehlendem DE- oder EN-Text |
| GET | `/api/admin/breweries/:id/place-search` | Google-Places-Suche für den Ort (Treffer, Adresse, Entfernung, Status), speichert nichts |
| POST | `/api/admin/google-ratings/refresh` | Google-Bewertungen abrufen, max. 40 Orte je Aufruf (`remaining` = noch offen) |
| POST | `/api/admin/google-places/backfill` | Place-ID-Probelauf für Orte ohne ID, portionsweise (`{ after }` → `{ results, next, done }`), speichert nichts |
| POST | `/api/admin/google-places/apply` | Bestätigte Place IDs speichern (`{ items: [{ id, placeId }] }`), überschreibt keine bestehenden |
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
| POST | `/api/admin/prices` | Preis direkt anlegen (optional `styleId`) |
| PUT | `/api/admin/prices/:id` | Preis bearbeiten (inkl. `style_id`) |
| DELETE | `/api/admin/prices/:id` | Preis löschen |
| GET | `/api/admin/styles` | Alle Bierstile |
| POST | `/api/admin/styles` | Stil anlegen |
| PUT | `/api/admin/styles/:id` | Stil bearbeiten (inkl. Ausschankorte via `brewery_ids`) |
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
| Admin-Digest | 10:00 und 22:00 Uhr (Europe/Berlin), Einreichungen seit dem letzten Digest |

1. Account bei [resend.com](https://resend.com) anlegen
2. Domain verifizieren, API-Key erstellen
3. `RESEND_API_KEY` als Secret setzen, `resendFrom` und `siteUrl` in `SITE_CONFIG`

---

© Altbieratlas — privat und unkommerziell betrieben.
