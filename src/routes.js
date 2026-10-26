// ============================================================
// Altbieratlas — Routen (öffentliche & Admin-API)
// ============================================================
import { generateOgImage } from "./og.js";
import {
  searchPlace, mapsLink, refreshRatings, backfillBatch, haversine, CACHE_MAX_AGE_DAYS, PIN_CHECK_DISTANCE_M,
} from "./googlePlaces.js";
import { normalizeHours, schemaOrgHours, hoursLinesDe } from "./hours.js";
import { normalizeOffer, offerRow, OFFER_PUBLIC_SQL } from "./offers.js";
import {
  APP_VERSION,
  json, error, parseCookies, setCookieHeader,
  hashPassword, verifyPassword, uuid, randomToken,
  verifyTurnstile, rateLimit, str, num, oneOf,
  clientIp, brewRow, sendConfirmationEmail, sendPasswordResetEmail, sendAdminNotification, sendAdminDigest,
  sendContactEmail, CONTACT_TOPICS,
  siteConfig, STYLE_PUBLIC_SQL, NON_SERVING_TYPES, inComparisons, isHighlighted,
} from "./utils.js";

// Nominatim-User-Agent-E-Mail aus SITE_CONFIG.contactEmail
function contactEmail(env) {
  return siteConfig(env).contactEmail || "";
}

// Turnstile-Site-Key (öffentlich, aber als CF-Secret gespeichert → deploy-fest).
// Einzige Quelle: env.TURNSTILE_SITE_KEY (Dashboard-Secret).
function turnstileSiteKey(env) {
  const k = env.TURNSTILE_SITE_KEY || null;
  return k && String(k).trim().length > 0 ? String(k).trim() : null;
}
// Turnstile aktiv = Site-Key gesetzt und kein Platzhalter
function turnstileActive(env) {
  const k = turnstileSiteKey(env);
  return !!k && !k.includes("PLACEHOLDER");
}

// ---- Auth-Middleware ----
async function requireAdmin(req, env) {
  const cookies = parseCookies(req);
  const token = cookies["atlas_session"];
  if (!token) return { ok: false, res: error(401, "not-authenticated") };
  const row = await env.DB.prepare(
    "SELECT username, expires_at FROM admin_sessions WHERE token = ?"
  ).bind(token).first();
  if (!row) return { ok: false, res: error(401, "invalid-session") };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE token = ?").bind(token).run();
    return { ok: false, res: error(401, "session-expired") };
  }
  return { ok: true, username: row.username };
}

// ============================================================
//  ÖFFENTLICH
// ============================================================

// GET /api/config
// Liefert alle nicht-sensitiven Werte, die das Frontend zur Laufzeit benötigt.
// Quellen: deploy-feste Werte als CF-Secrets (TURNSTILE_SITE_KEY, GA4_MEASUREMENT_ID)
// über env.*; der Rest (Größen, Moderation, URLs, Autor/Impressum) aus SITE_CONFIG
// bzw. — mit Vorrang — aus D1 site_settings (Admin-Panel).
export async function getPublicConfig(req, env) {
  const v = (x) => (x && String(x).trim().length > 0 ? String(x).trim() : null);

  const sc = siteConfig(env);

  const siteKey = turnstileSiteKey(env);
  const ga      = v(env.GA4_MEASUREMENT_ID);

  const priceSizes = Array.isArray(sc.priceSizes) && sc.priceSizes.length > 0
    ? sc.priceSizes
    : null;

  const highlightedSizes = Array.isArray(sc.highlightedSizes) && sc.highlightedSizes.length > 0
    ? sc.highlightedSizes
    : null;

  // DB-Einstellungen laden (Banner + Social — Admin-konfiguriert, Vorrang vor SITE_CONFIG)
  const dbSettings = {};
  try {
    const rows = await env.DB.prepare(
      "SELECT key, value FROM site_settings WHERE key LIKE 'author.%' OR key LIKE 'banner.%'"
    ).all();
    for (const r of rows.results) {
      try { dbSettings[r.key] = JSON.parse(r.value); } catch { dbSettings[r.key] = r.value; }
    }
  } catch { /* Tabelle fehlt bei alten Instanzen */ }

  // Autor/Social + Banner: einzige Quelle ist D1 (Admin-Panel).
  const author = {
    name:      v(dbSettings["author.name"]),
    github:    v(dbSettings["author.github"]),
    linkedin:  v(dbSettings["author.linkedin"]),
    website:   v(dbSettings["author.website"]),
    instagram: v(dbSettings["author.instagram"]),
    mastodon:  v(dbSettings["author.mastodon"]),
    kofi:      v(dbSettings["author.kofi"]),
    // „Spendier mir ein Alt“: beliebiger Spendenlink (PayPal.me, Buy Me a Coffee …)
    beer:      v(dbSettings["author.beer"]),
  };

  const banner = (dbSettings["banner.text_de"] || dbSettings["banner.text_en"])
    ? {
        text_de:  dbSettings["banner.text_de"]  || null,
        text_en:  dbSettings["banner.text_en"]  || null,
        enabled:  dbSettings["banner.enabled"] === "true",
      }
    : null;

  // Kartenkacheln: CARTO verlangt seit 2026 einen API-Key. Der Key liegt als
  // Secret (deploy-fest), URL und Attribution sind optional über SITE_CONFIG
  // überschreibbar, falls der Anbieter gewechselt wird.
  const mapTileApiKey = v(env.MAP_TILE_API_KEY);
  const map = {
    tileApiKey:      mapTileApiKey,
    tileUrl:         v(sc.mapTileUrl),
    tileAttribution: v(sc.mapTileAttribution),
  };

  // Städte mit eigener Landingpage — Footer/Shell verlinken sie site-weit,
  // damit die Stadtseiten nicht als verwaiste Seiten dastehen.
  const cities = Object.entries(await cityIndex(env))
    .map(([slug, e]) => ({ slug, city: e.city, count: e.total, current: e.current }));

  return json({
    version: APP_VERSION,
    priceSizes,
    highlightedSizes,
    cities,
    map,
    turnstileSiteKey: siteKey,
    turnstileEnabled: !!siteKey && !siteKey.includes("PLACEHOLDER"),
    ga4MeasurementId: ga && ga !== "G-XXXXXXXXXX" ? ga : null,
    author,
    banner,
    requireModeration: sc.requireModeration !== false,
  }, {
    // Jede Seite fragt /api/config beim Laden ab. Kurzes Browser-Caching spart
    // beim Weiterklicken Requests; Banner-Änderungen kommen nach ≤ 1 min an.
    headers: { "cache-control": "public, max-age=60, stale-while-revalidate=600" },
  });
}

// Größenangaben sind historisch uneinheitlich gespeichert ("0.25", "0,25",
// "0.25l"). Dieser SQL-Ausdruck normalisiert sie auf eine Dezimalzahl, damit
// Aggregate nicht an der Schreibweise scheitern.
export const sizeNumSql = (col = "size") =>
  `CAST(REPLACE(REPLACE(REPLACE(${col}, ',', '.'), 'l', ''), ' ', '') AS REAL)`;

// GET /api/stats
export async function getStats(req, env) {
  const [brewCount, priceCount, avgRow] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM breweries WHERE status = 'approved'").first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM prices WHERE status = 'approved'").first(),
    // „Aktuelles 0,25 l Alt im Schnitt" — wie in den Ranglisten zählt nur die
    // jüngste Meldung je Brauerei, sonst zieht die Preishistorie den Wert nach unten.
    // Reine Brauereien schenken nicht aus und zählen nicht mit.
    env.DB.prepare(
      `SELECT AVG(price) AS avg FROM (
         SELECT p.price
         FROM prices p JOIN breweries b ON b.id = p.brewery_id
         WHERE p.status = 'approved' AND b.status = 'approved'
           AND b.type NOT IN (${NON_SERVING_TYPES.map((t) => `'${t}'`).join(", ")})
           AND ABS(${sizeNumSql('p.size')} - 0.25) < 0.001
           AND p.date = (
             SELECT MAX(p2.date) FROM prices p2
             WHERE p2.brewery_id = p.brewery_id AND p2.status = 'approved'
               AND ABS(${sizeNumSql('p2.size')} - 0.25) < 0.001
           )
         GROUP BY p.brewery_id
       )`
    ).first(),
  ]);
  return json({
    breweryCount: brewCount?.n ?? 0,
    priceCount: priceCount?.n ?? 0,
    avgPrice025: avgRow?.avg ?? null,
  });
}

// GET /api/breweries
export async function listBreweries(req, env) {
  const breweriesRes = await env.DB.prepare(
    "SELECT * FROM breweries WHERE status = 'approved' ORDER BY name"
  ).all();
  const stylesRes = await env.DB.prepare(
    "SELECT brewery_id, style_id FROM brewery_styles"
  ).all();
  const stylesByBrewery = {};
  for (const s of stylesRes.results) {
    (stylesByBrewery[s.brewery_id] ||= []).push(s.style_id);
  }
  const ratings = await googleRatingsByPlace(env);
  return json({
    breweries: breweriesRes.results.map((r) => ({
      ...brewRow(r, stylesByBrewery[r.id] || []),
      googleRating: r.is_historical ? null : ratings.get(r.google_place_id) || null,
    })),
  });
}

// Alle Google-Bewertungen aus dem Cache (höchstens 30 Tage alt) als Map
// place_id → { rating, userRatingCount, fetchedAt }. Fehlt die Tabelle → leer.
async function googleRatingsByPlace(env) {
  const map = new Map();
  try {
    const { results } = await env.DB.prepare(
      `SELECT place_id, rating, user_rating_count, fetched_at FROM google_places_cache
       WHERE rating IS NOT NULL AND fetched_at >= datetime('now', '-${CACHE_MAX_AGE_DAYS} days')`
    ).all();
    for (const c of results) {
      map.set(c.place_id, { rating: c.rating, userRatingCount: c.user_rating_count ?? null, fetchedAt: c.fetched_at });
    }
  } catch {}
  return map;
}

// GET /api/breweries/:id
export async function getBrewery(req, env, { id }) {
  const row = await env.DB.prepare(
    `SELECT b.*, v.header_de AS type_header_de, v.header_en AS type_header_en
     FROM breweries b LEFT JOIN venue_types v ON v.id = b.type
     WHERE b.id = ? AND b.status = 'approved'`
  ).bind(id).first();
  if (!row) return error(404, "not-found");
  const styles = await env.DB.prepare(
    "SELECT style_id FROM brewery_styles WHERE brewery_id = ?"
  ).bind(id).all();
  // Übernahmen in beide Richtungen: wer führt die Marke heute, wen hat dieser Ort übernommen
  const successor = row.successor_id
    ? await env.DB.prepare("SELECT id, name FROM breweries WHERE id = ? AND status = 'approved'")
        .bind(row.successor_id).first()
    : null;
  const predecessors = await env.DB.prepare(
    "SELECT id, name FROM breweries WHERE successor_id = ? AND status = 'approved' ORDER BY name"
  ).bind(id).all();
  const prices = await env.DB.prepare(
    "SELECT date, size, price, source, notes, style_id FROM prices WHERE brewery_id = ? AND status = 'approved' ORDER BY date DESC, price ASC"
  ).bind(id).all();
  const google = await googleCacheFor(env, row);
  const offers = await env.DB.prepare(
    `SELECT o.* FROM offers o JOIN breweries b ON b.id = o.brewery_id
     WHERE o.brewery_id = ? AND ${OFFER_PUBLIC_SQL} ORDER BY o.kind DESC, o.id`
  ).bind(id).all().catch(() => ({ results: [] }));
  const base = brewRow(row, styles.results.map((s) => s.style_id));
  return json({
    brewery: {
      ...base,
      googleRating: google.rating,
      // Googles Zeiten nur, wenn keine eigenen gepflegt sind (Anzeige „laut Google“)
      googleOpeningHours: base.openingHours ? null : google.hours,
      successor: successor || null,
      predecessors: predecessors.results,
      // Überschrift über den Sorten aus dem Ortstyp ("Was hier ausgeschenkt wird" …)
      typeHeader: row.type_header_de || row.type_header_en
        ? { de: row.type_header_de || null, en: row.type_header_en || null }
        : null,
    },
    prices: prices.results.map((p) => ({
      breweryId: id, date: p.date, size: p.size, price: p.price, source: p.source, notes: p.notes,
      styleId: p.style_id || null,
    })),
    offers: offers.results.map(offerRow),
  });
}

// ============================================================
//  AKTIONEN UND COUPONS
// ============================================================

// GET /api/offers → alle laufenden und kommenden Aktionen freigegebener Orte.
// CROSS JOIN legt die Reihenfolge fest: erst offers, dann der Ort per Primärschlüssel;
// sonst liest SQLite alle Orte, auch wenn es kaum Aktionen gibt.
export async function listOffers(req, env) {
  const { results } = await env.DB.prepare(
    `SELECT o.* FROM offers o CROSS JOIN breweries b ON b.id = o.brewery_id
     WHERE ${OFFER_PUBLIC_SQL} ORDER BY o.brewery_id, o.id`
  ).all();
  return json({ offers: results.map(offerRow) });
}

async function insertOffer(env, o) {
  const cols = Object.keys(o);
  const res = await env.DB.prepare(
    `INSERT INTO offers (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`
  ).bind(...cols.map((k) => o[k])).run();
  return res.meta?.last_row_id;
}

// GET /api/admin/offers → alle Aktionen inkl. abgelaufener und offener
export async function adminListOffers(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const { results } = await env.DB.prepare(
    `SELECT o.*, b.name AS brewery_name, b.city AS brewery_city
     FROM offers o LEFT JOIN breweries b ON b.id = o.brewery_id
     ORDER BY o.status = 'pending' DESC, o.updated_at DESC`
  ).all();
  return json({
    offers: results.map((r) => ({
      ...offerRow(r), code: r.code || null, status: r.status,
      breweryName: r.brewery_name, breweryCity: r.brewery_city,
      titleDe: r.title_de, titleEn: r.title_en, descriptionDe: r.description_de, descriptionEn: r.description_en,
    })),
  });
}

// POST /api/admin/offers
export async function adminCreateOffer(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  let o;
  try { o = normalizeOffer(body); } catch (e) { return error(400, "validation-failed", { detail: e.message }); }
  const b = await env.DB.prepare("SELECT id FROM breweries WHERE id = ?").bind(o.brewery_id).first();
  if (!b) return error(400, "brewery-not-found");
  const id = await insertOffer(env, o);
  return json({ ok: true, id }, { status: 201 });
}

// PUT /api/admin/offers/:id
export async function adminUpdateOffer(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  let o;
  try { o = normalizeOffer(body, { partial: true }); } catch (e) { return error(400, "validation-failed", { detail: e.message }); }
  const cols = Object.keys(o);
  if (!cols.length) return error(400, "no-fields");
  const res = await env.DB.prepare(
    `UPDATE offers SET ${cols.map((k) => `${k} = ?`).join(", ")}, updated_at = datetime('now') WHERE id = ?`
  ).bind(...cols.map((k) => o[k]), parseInt(id, 10)).run();
  if (!res.meta?.changes) return error(404, "not-found");
  return json({ ok: true });
}

// DELETE /api/admin/offers/:id
export async function adminDeleteOffer(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare("DELETE FROM offers WHERE id = ?").bind(parseInt(id, 10)).run();
  if (!res.meta?.changes) return error(404, "not-found");
  return json({ ok: true });
}

// Google-Bewertung und -Öffnungszeiten aus dem Cache, in einer Abfrage, nur wenn
// höchstens 30 Tage alt (Google-Bedingungen). Kein Eintrag, zu alt oder Tabelle
// fehlt → beides null, nichts anzeigen.
async function googleCacheFor(env, row) {
  const none = { rating: null, hours: null };
  if (!row?.google_place_id || row.is_historical) return none;
  try {
    const c = await env.DB.prepare(
      `SELECT rating, user_rating_count, opening_hours, fetched_at FROM google_places_cache
       WHERE place_id = ? AND fetched_at >= datetime('now', '-${CACHE_MAX_AGE_DAYS} days')`
    ).bind(row.google_place_id).first();
    if (!c) return none;
    return {
      rating: c.rating == null ? null
        : { rating: c.rating, userRatingCount: c.user_rating_count ?? null, fetchedAt: c.fetched_at },
      hours: c.opening_hours ? { days: JSON.parse(c.opening_hours), fetchedAt: c.fetched_at } : null,
    };
  } catch {
    return none;
  }
}

// GET /api/styles
export async function listStyles(req, env) {
  const res = await env.DB.prepare(
    `SELECT s.*, b.name AS primary_brewery_name
     FROM styles s
     LEFT JOIN breweries b ON b.id = s.primary_brewery_id AND b.status = 'approved'
     WHERE ${STYLE_PUBLIC_SQL}
     ORDER BY s.name`
  ).all();
  return json({
    styles: res.results.map((s) => ({
      id: s.id, name: s.name, abv: s.abv, ibu: s.ibu, color: s.color,
      tasting: { de: s.tasting_de, en: s.tasting_en },
      logoUrl: s.logo_key ? `/logos/${s.logo_key}` : null,
      primaryBrewery: s.primary_brewery_id
        ? { id: s.primary_brewery_id, name: s.primary_brewery_name }
        : null,
    })),
  });
}

// GET /api/prices
// Bewusst ohne LIMIT: Ranglisten zählen die ganze Historie („Meistgemeldet“),
// eine Obergrenze ließe ältere Meldungen still verschwinden. Die Antwort liegt im
// Edge-Cache; wird sie zu groß, auf „jüngste Meldung je Slot + Anzahl“ umbauen.
export async function listPrices(req, env) {
  const res = await env.DB.prepare(
    "SELECT brewery_id, date, size, price, source, style_id, created_at FROM prices WHERE status = 'approved' ORDER BY date DESC"
  ).all();
  return json({
    prices: res.results.map((r) => ({
      breweryId: r.brewery_id, date: r.date, size: r.size, price: r.price, source: r.source,
      styleId: r.style_id || null, createdAt: r.created_at,
    })),
  });
}

// GET /api/events
export async function listEvents(req, env) {
  const res = await env.DB.prepare(
    "SELECT * FROM events WHERE status = 'approved' ORDER BY date ASC, time ASC"
  ).all();
  return json({
    events: res.results.map((e) => ({
      id: e.id,
      title: { de: e.title_de, en: e.title_en },
      breweryId: e.brewery_id,
      date: e.date,
      time: e.time || null,
      endDate: e.end_date || null,
      endTime: e.end_time || null,
      location: e.location || null,
      url: e.url || null,
      description: { de: e.description_de, en: e.description_en },
    })),
  });
}

// GET /api/events/:id
export async function getEvent(req, env, { id }) {
  const e = await env.DB.prepare(
    `SELECT e.*, b.name AS brewery_name, b.city AS brewery_city
     FROM events e LEFT JOIN breweries b ON b.id = e.brewery_id
     WHERE e.id = ? AND e.status = 'approved'`
  ).bind(id).first();
  if (!e) return error(404, "not-found");
  const beers = await env.DB.prepare(
    "SELECT id, name_de, name_en, size, price, notes FROM event_beers WHERE event_id = ? ORDER BY id"
  ).bind(id).all();
  return json({
    event: {
      id: e.id,
      title: { de: e.title_de, en: e.title_en },
      breweryId: e.brewery_id,
      breweryName: e.brewery_name || null,
      breweryCity: e.brewery_city || null,
      date: e.date,
      time: e.time || null,
      endDate: e.end_date || null,
      endTime: e.end_time || null,
      location: e.location || null,
      url: e.url || null,
      description: { de: e.description_de, en: e.description_en },
    },
    beers: beers.results.map((b) => ({
      id: b.id, name: { de: b.name_de, en: b.name_en },
      size: b.size, price: b.price, notes: b.notes,
    })),
  });
}

// ---- ICS-Hilfsfunktionen ----
function icsEscape(s) {
  return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;")
    .replace(/,/g, "\\,").replace(/\n/g, "\\n").replace(/\r/g, "");
}
function icsFoldLine(line) {
  const chars = [...line];
  const out = [];
  let cur = "";
  for (const ch of chars) {
    if ((cur + ch).length > 75) { out.push(cur); cur = " " + ch; }
    else { cur += ch; }
  }
  if (cur) out.push(cur);
  return out.join("\r\n");
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}
function buildVEvent(e, base, lang) {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z/, "Z");
  const hasTime = !!e.time;
  const dtstart = hasTime
    ? `DTSTART;TZID=Europe/Berlin:${e.date.replace(/-/g, "")}T${e.time.replace(":", "")}00`
    : `DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`;

  let dtend = null;
  if (hasTime) {
    // Endzeitpunkt: end_date + end_time, oder end_date mit gleicher Uhrzeit, oder nur end_time selber Tag
    const endDateStr = e.end_date || e.date;
    const endTimeStr = e.end_time || e.time;
    dtend = `DTEND;TZID=Europe/Berlin:${endDateStr.replace(/-/g, "")}T${endTimeStr.replace(":", "")}00`;
  } else if (e.end_date) {
    // Ganztägig mehrtägig: DTEND = end_date + 1 Tag (RFC 5545 exklusives Ende)
    dtend = `DTEND;VALUE=DATE:${addDays(e.end_date, 1)}`;
  }

  const title   = lang === "en" ? (e.title_en || e.title_de) : (e.title_de || e.title_en);
  const descRaw = lang === "en" ? (e.description_en || e.description_de) : (e.description_de || e.description_en);
  const summary  = icsEscape(title || "Event");
  const location = e.brewery_name
    ? icsEscape(`${e.brewery_name}${e.brewery_city ? ", " + e.brewery_city : ""}`)
    : (e.location ? icsEscape(e.location) : "");
  // ICS URL zeigt immer auf die Detail-Seite
  const detailUrl = `${base}/event.html?id=${encodeURIComponent(e.id)}`;
  const descWithUrl = descRaw ? `${descRaw}\n\n${detailUrl}` : detailUrl;
  const desc = icsEscape(descWithUrl);
  const lines = [
    "BEGIN:VEVENT",
    icsFoldLine(`UID:${e.id}@altbieratlas.de`),
    `DTSTAMP:${dtstamp}`,
    icsFoldLine(dtstart),
  ];
  if (dtend) lines.push(icsFoldLine(dtend));
  lines.push(icsFoldLine(`SUMMARY:${summary}`));
  if (location) lines.push(icsFoldLine(`LOCATION:${location}`));
  if (desc)     lines.push(icsFoldLine(`DESCRIPTION:${desc}`));
  lines.push(icsFoldLine(`URL:${detailUrl}`));
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}
function icsResponse(vevents, calName, filename) {
  const cal = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Altbieratlas//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    icsFoldLine(`X-WR-CALNAME:${calName}`),
    "X-WR-TIMEZONE:Europe/Berlin",
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(cal, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "public, max-age=900",
    },
  });
}

// GET /api/events/calendar.ics  — alle zukünftigen Events als Kalender
export async function eventsIcs(req, env) {
  const url  = new URL(req.url);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "de";
  const res = await env.DB.prepare(
    `SELECT e.*, b.name AS brewery_name, b.city AS brewery_city
     FROM events e LEFT JOIN breweries b ON b.id = e.brewery_id
     WHERE e.status = 'approved' AND COALESCE(e.end_date, e.date) >= date('now')
     ORDER BY e.date ASC, e.time ASC`
  ).all();
  const base    = `${url.protocol}//${url.host}`;
  const calName = lang === "en" ? "Altbieratlas – Events" : "Altbieratlas – Termine";
  return icsResponse(
    res.results.map((e) => buildVEvent(e, base, lang)),
    calName,
    "altbieratlas.ics",
  );
}

// GET /api/events/:id/calendar.ics  — einzelnes Event als ICS
export async function eventIcs(req, env, { id }) {
  const url  = new URL(req.url);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "de";
  const e = await env.DB.prepare(
    `SELECT e.*, b.name AS brewery_name, b.city AS brewery_city
     FROM events e LEFT JOIN breweries b ON b.id = e.brewery_id
     WHERE e.id = ? AND e.status = 'approved'`
  ).bind(id).first();
  if (!e) return error(404, "not-found");
  const base    = `${url.protocol}//${url.host}`;
  const calName = icsEscape((lang === "en" ? e.title_en : e.title_de) || e.title_de || e.title_en || "Event");
  return icsResponse([buildVEvent(e, base, lang)], calName, `${id}.ics`);
}

// GET /api/events/feed.xml  — Atom-Feed für alle kommenden Events (DE + EN)
export async function eventsAtom(req, env) {
  const url  = new URL(req.url);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "de";
  const base = `${url.protocol}//${url.host}`;
  const res = await env.DB.prepare(
    `SELECT e.*, b.name AS brewery_name
     FROM events e LEFT JOIN breweries b ON b.id = e.brewery_id
     WHERE e.status = 'approved' AND COALESCE(e.end_date, e.date) >= date('now', '-7 days')
     ORDER BY e.date ASC, e.time ASC
     LIMIT 50`
  ).all();
  const events = res.results;

  const updated = events.length
    ? new Date(events[0].date).toISOString()
    : new Date().toISOString();

  const isDE = lang === "de";
  const feedTitle  = isDE ? "Altbieratlas – Termine" : "Altbieratlas – Events";
  const feedSub    = isDE
    ? "Kommende Altbier-Veranstaltungen"
    : "Upcoming Altbier events";

  function xmlEsc(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const entries = events.map((e) => {
    const title  = xmlEsc((isDE ? e.title_de : e.title_en) || e.title_de || e.title_en || "");
    const desc   = xmlEsc((isDE ? e.description_de : e.description_en) || e.description_de || e.description_en || "");
    const link   = `${base}/event?id=${encodeURIComponent(e.id)}`;
    const dateTs = new Date(e.date).toISOString();
    const where  = e.location || (e.brewery_name ? xmlEsc(e.brewery_name) : "");
    const summary = [
      e.date,
      e.time ? ` · ${e.time}` : "",
      where ? ` · ${where}` : "",
      desc ? `\n${desc}` : "",
    ].join("");

    return `  <entry>
    <id>${xmlEsc(link)}</id>
    <title>${title}</title>
    <link href="${xmlEsc(link)}" />
    <updated>${dateTs}</updated>
    <summary>${xmlEsc(summary)}</summary>
  </entry>`;
  }).join("\n");

  const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${base}/api/events/feed.xml</id>
  <title>${xmlEsc(feedTitle)}</title>
  <subtitle>${xmlEsc(feedSub)}</subtitle>
  <link href="${base}/api/events/feed.xml?lang=${lang}" rel="self" />
  <link href="${base}/" />
  <updated>${updated}</updated>
  <author><name>Altbieratlas</name><uri>${base}/</uri></author>
${entries}
</feed>`;

  return new Response(atom, {
    status: 200,
    headers: {
      "content-type": "application/atom+xml; charset=utf-8",
      "cache-control": "public, max-age=900",
    },
  });
}

// GET /api/venue-types
export async function listVenueTypes(req, env) {
  const res = await env.DB.prepare("SELECT * FROM venue_types ORDER BY id").all();
  return json({
    venueTypes: res.results.map((r) => ({
      id: r.id, nameDe: r.name_de, nameEn: r.name_en,
      headerDe: r.header_de, headerEn: r.header_en,
      isProducer: !!r.is_producer,
    })),
  });
}

// GET /api/glossary
export async function listGlossary(req, env) {
  const res = await env.DB.prepare("SELECT * FROM glossary ORDER BY term").all();
  return json({
    glossary: res.results.map((g) => ({
      term: g.term,
      definition: { de: g.definition_de, en: g.definition_en },
    })),
  });
}

// GET /api/geocode?q=Berlin
// Proxy zu Nominatim. Auf Worker-Seite gebündelt, um User-Agent-Vorgabe zu erfüllen
// und um CORS nicht dem Client aufzubürden. Ergebnisse 24h gecached (via cf.cacheTtl).
export async function geocode(req, env) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return json({ results: [] });
  if (q.length > 100) return error(400, "query-too-long");

  // Soft-Rate-Limit pro IP (Nominatim-Fairness)
  const ip = clientIp(req);
  const rl = await rateLimit(env.DB, `geo:${ip}:${Math.floor(Date.now() / 60000)}`, 30, 60);
  if (!rl.allowed) return error(429, "rate-limited");

  const nomUrl = new URL("https://nominatim.openstreetmap.org/search");
  nomUrl.searchParams.set("q", q);
  nomUrl.searchParams.set("format", "jsonv2");
  nomUrl.searchParams.set("limit", "6");
  nomUrl.searchParams.set("accept-language", "de,en");
  nomUrl.searchParams.set("addressdetails", "1");

  try {
    const r = await fetch(nomUrl.toString(), {
      headers: {
        "User-Agent": `Altbieratlas/1.0 (${contactEmail(env)})`,
        "Accept": "application/json",
      },
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    if (!r.ok) return json({ results: [] });
    const rows = await r.json();
    const results = rows.map((row) => {
      const addr = row.address || {};
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
      return {
        name: row.display_name,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lon),
        city,
        type: row.type,
        class: row.class,
        importance: row.importance,
      };
    }).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
    return json({ results });
  } catch (e) {
    return json({ results: [], error: "geocoder-unreachable" });
  }
}

// Formularfelder von Turnstile/reCAPTCHA/hCaptcha (Token, einmalig und wertlos)
const CAPTCHA_FIELD = /^(cf-turnstile-response|g-recaptcha-response|h-captcha-response)$/i;

// POST /api/contributions
// Body: { type, data, email?, submitterName?, turnstileToken? }
export async function postContribution(req, env, _params, ctx) {
  let body;
  try { body = await req.json(); }
  catch { return error(400, "invalid-json"); }

  // Turnstile: nur erzwingen wenn BEIDE Seiten konfiguriert sind —
  // Secret (Server) UND Site-Key (Frontend, rendert das Widget).
  const tsActive = turnstileActive(env);
  const tsResult = await verifyTurnstile(
    body.turnstileToken, tsActive ? env.TURNSTILE_SECRET_KEY : null, clientIp(req)
  );
  if (!tsResult.success) return error(403, "turnstile-failed", { reason: tsResult });

  // Rate-Limit: 20 Einreichungen pro IP pro Stunde
  const ip = clientIp(req);
  const hour = new Date().toISOString().slice(0, 13);
  const rl = await rateLimit(env.DB, `contrib:${ip}:${hour}`, 20, 3600);
  if (!rl.allowed) return error(429, "too-many-submissions");

  // Validierung
  const lang = body.lang === "en" ? "en" : "de";

  let type, data, email, submitterName;
  try {
    type = oneOf(body.type, ["price", "brewery", "style", "correction", "event", "offer"], { required: true, name: "type" });
    email = str(body.email, { max: 200, name: "email" });
    submitterName = str(body.submitterName, { max: 100, name: "submitterName" });
    if (!body.data || typeof body.data !== "object") throw new Error("data: required");
    // Turnstile-/Captcha-Felder, die das Formular mitschickt, nie in den Payload
    data = Object.fromEntries(Object.entries(body.data).filter(([k]) => !CAPTCHA_FIELD.test(k)));

    // Typ-spezifische Mindestvalidierung
    if (type === "price") {
      str(data.breweryId, { required: true, max: 80, name: "breweryId" });
      num(data.price, { min: 0, max: 100, required: true, name: "price" });
      str(data.size, { required: true, max: 20, name: "size" });
      str(data.date, { required: true, max: 20, name: "date" });
      str(data.styleId, { max: 80, name: "styleId" });
    } else if (type === "brewery") {
      str(data.name, { required: true, max: 200, name: "name" });
      str(data.city, { required: true, max: 200, name: "city" });
      oneOf(data.type, ["brewery", "brewpub", "taproom", "pub", "restaurant", "kiosk", "supermarket", "beverage_store"], { required: true, name: "type" });
      if (data.lat != null) num(data.lat, { min: -90, max: 90, name: "lat" });
      if (data.lng != null) num(data.lng, { min: -180, max: 180, name: "lng" });
    } else if (type === "event") {
      str(data.eventName, { required: true, max: 200, name: "eventName" });
      str(data.eventDate, { required: true, max: 20, name: "eventDate" });
      if (data.eventTime != null) str(data.eventTime, { max: 10, name: "eventTime" });
      if (data.eventLocation != null) str(data.eventLocation, { max: 300, name: "eventLocation" });
      if (data.eventUrl != null) str(data.eventUrl, { max: 500, name: "eventUrl" });
    } else if (type === "style") {
      str(data.styleName, { required: true, max: 200, name: "styleName" });
      str(data.breweryId, { required: true, max: 80, name: "breweryId" });
    } else if (type === "correction") {
      str(data.breweryId, { required: true, max: 80, name: "breweryId" });
      str(data.correction, { required: true, max: 4000, name: "correction" });
    } else if (type === "offer") {
      // Gleiche Regeln wie beim Anlegen im Admin; Coupons gibt es nur über den Admin
      normalizeOffer({
        brewery_id: data.breweryId, kind: "offer", title_de: data.offerTitle,
        description_de: data.offerDescription, weekdays: data.weekdays,
        time_from: data.timeFrom, time_to: data.timeTo, valid_until: data.validUntil,
      });
    }
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }

  // Brauerei-Name für Anzeige in E-Mails nachschlagen (für alle Typen mit breweryId)
  if (data.breweryId && ["price", "style", "correction", "event", "offer"].includes(type)) {
    try {
      const bRow = await env.DB.prepare("SELECT name, city FROM breweries WHERE id = ? LIMIT 1")
        .bind(data.breweryId).first();
      if (bRow) data._breweryName = `${bRow.name} · ${bRow.city}`;
    } catch {}
  }
  if (type === "price" && data.styleId) {
    try {
      const sRow = await env.DB.prepare("SELECT name FROM styles WHERE id = ? LIMIT 1").bind(data.styleId).first();
      if (sRow) data._styleName = sRow.name;
    } catch {}
  }

  // Auto-Geocoding: fehlende Koordinaten für neue Brauereien ableiten
  if (type === "brewery" && (data.lat == null || data.lng == null) && data.city) {
    const q = encodeURIComponent([data.name, data.city, data.country || "DE"].filter(Boolean).join(", "));
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=jsonv2&limit=1`, {
        headers: { "User-Agent": `Altbieratlas/1.0 (${contactEmail(env)})` },
        cf: { cacheTtl: 86400, cacheEverything: true },
      });
      if (geoRes.ok) {
        const rows = await geoRes.json();
        if (rows.length > 0) {
          data.lat = parseFloat(rows[0].lat);
          data.lng = parseFloat(rows[0].lon);
          data._geocoded = true;
        }
      }
    } catch {}
  }

  // Einreichung aus einer gültigen Admin-Sitzung → im Payload markieren; dafür
  // gibt es weder Sofort-Benachrichtigung noch Digest-Eintrag. Ein vom Client
  // mitgeschicktes _admin zählt nie.
  delete data._admin;
  if (parseCookies(req)["atlas_session"]) {
    const auth = await requireAdmin(req, env).catch(() => ({ ok: false }));
    if (auth.ok) data._admin = auth.username;
  }

  const id = uuid();
  await env.DB.prepare(
    "INSERT INTO contributions (id, type, payload, submitter_email, submitter_name, submitter_ip, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')"
  ).bind(id, type, JSON.stringify(data), email, submitterName, ip).run();

  // Bestätigungsmail wenn E-Mail angegeben — via waitUntil, damit CF den Fetch nicht abbricht
  if (email) {
    const mailPromise = sendConfirmationEmail(env, { to: email, type, id, data, ip, lang, submittedAt: new Date().toISOString() });
    if (ctx?.waitUntil) ctx.waitUntil(mailPromise);
  }
  // Admin sofort informieren — unabhängig davon, ob eine E-Mail angegeben wurde,
  // außer der Admin hat selbst eingereicht
  if (!data._admin) {
    const notifyPromise = sendAdminNotification(env, { type, id, data, email, submitterName });
    if (ctx?.waitUntil) ctx.waitUntil(notifyPromise);
  }

  return json({ ok: true, id, status: "pending" }, { status: 201 });
}

// ---- IP-Hash für Vote-Deduplication (SHA-256, keine rohen IPs gespeichert) ----
// Der Tag (UTC) fließt in den Hash ein: pro IP und Tag genau ein Hash, also eine Stimme.
// Stimmen verschiedener Tage lassen sich so auch nicht derselben IP zuordnen.
async function hashIp(ip, day) {
  const data = new TextEncoder().encode(ip + ":" + day + ":rival-vote-2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const RIVAL_CHOICES = ["alt", "kolsch", "neutral"];

// Enthaltungen ("neutral") zählen nicht in total, das bleibt die Basis der Alt/Kölsch-Prozente
function countRivalVotes(rows) {
  const counts = { alt: 0, kolsch: 0, neutral: 0 };
  for (const row of rows) {
    if (RIVAL_CHOICES.includes(row.choice)) counts[row.choice] = row.n;
  }
  return { ...counts, total: counts.alt + counts.kolsch };
}

// GET /api/rivals/votes
export async function getRivalVotes(req, env) {
  const res = await env.DB.prepare(
    "SELECT choice, COUNT(*) AS n FROM rival_votes GROUP BY choice"
  ).all();
  return json(countRivalVotes(res.results));
}

// POST /api/rivals/vote  { choice: "alt" | "kolsch" | "neutral" }
// Eine Stimme pro IP und Tag; ein zweiter Versuch am selben Tag liefert 429 "already-voted".
export async function postRivalVote(req, env) {
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  if (!RIVAL_CHOICES.includes(body.choice)) return error(400, "invalid-choice");
  const day = new Date().toISOString().slice(0, 10);
  const ipHash = await hashIp(clientIp(req), day);
  const ins = await env.DB.prepare(
    "INSERT INTO rival_votes (choice, ip_hash) VALUES (?, ?) ON CONFLICT(ip_hash) DO NOTHING"
  ).bind(body.choice, ipHash).run();
  const res = await env.DB.prepare(
    "SELECT choice, COUNT(*) AS n FROM rival_votes GROUP BY choice"
  ).all();
  if (!ins.meta?.changes) return error(429, "already-voted", countRivalVotes(res.results));
  return json({ ok: true, ...countRivalVotes(res.results) });
}

// ============================================================
//  KONTAKT (/kooperation)
// ============================================================

// POST /api/contact  { topic, name, email, organisation?, message, lang?, turnstileToken }
// Presse- und Kooperationsanfragen, per Resend an ADMIN_EMAIL. Rate-Limit 5/h je IP.
export async function postContact(req, env) {
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  const tsActive = turnstileActive(env);
  const ts = await verifyTurnstile(body.turnstileToken, tsActive ? env.TURNSTILE_SECRET_KEY : null, clientIp(req));
  if (!ts.success) return error(403, "turnstile-failed");
  let topic, name, email, organisation, message;
  try {
    topic        = oneOf(body.topic, Object.keys(CONTACT_TOPICS), { required: true, name: "topic" });
    name         = str(body.name,         { required: true, max: 100, name: "name" });
    email        = str(body.email,        { required: true, max: 200, name: "email" });
    organisation = str(body.organisation, { max: 150, name: "organisation" });
    message      = str(body.message,      { required: true, max: 4000, name: "message" });
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error(400, "invalid-email");
  const hour = new Date().toISOString().slice(0, 13);
  const rl = await rateLimit(env.DB, `contact:${clientIp(req)}:${hour}`, 5, 3600);
  if (!rl.allowed) return error(429, "too-many-requests");
  const r = await sendContactEmail(env, {
    topic, name, email, organisation, message, lang: body.lang === "en" ? "en" : "de",
  });
  if (!r.ok) return error(r.reason === "not-configured" ? 503 : 502, r.reason);
  return json({ ok: true });
}

// ============================================================
//  RHEINDERBY (Admin)
// ============================================================

// GET /api/admin/rivals → Stand inkl. Enthaltungen und Zeitraum
export async function adminRivalVotes(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const [counts, span] = await Promise.all([
    env.DB.prepare("SELECT choice, COUNT(*) AS n FROM rival_votes GROUP BY choice").all(),
    env.DB.prepare("SELECT MIN(created_at) AS first, MAX(created_at) AS last FROM rival_votes").first(),
  ]);
  return json({ ...countRivalVotes(counts.results), first: span?.first || null, last: span?.last || null });
}

// Bestätigungswort für das Zurücksetzen. Der Server prüft es selbst, damit kein
// versehentlicher Request (Doppelklick, Skript) die Stimmen löscht.
export const RIVAL_RESET_CONFIRM = "ZURÜCKSETZEN";

// POST /api/admin/rivals/reset  { confirm: "ZURÜCKSETZEN" } → löscht alle Stimmen
export async function adminResetRivalVotes(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (body?.confirm !== RIVAL_RESET_CONFIRM) return error(400, "confirm-required");
  const res = await env.DB.prepare("DELETE FROM rival_votes").run();
  console.log(`[rivals] ${auth.username} hat ${res.meta?.changes ?? 0} Stimmen zurückgesetzt`);
  return json({ ok: true, deleted: res.meta?.changes ?? 0 });
}

// ============================================================
//  DIGEST (Admin)
// ============================================================

// POST /api/admin/digest/send → Testversand aller offenen Einreichungen an ADMIN_EMAIL
export async function adminSendDigest(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const r = await sendAdminDigest(env, { test: true });
  if (!r?.ok) return error(r?.reason === "not-configured" ? 503 : 502, r?.reason || "digest-failed");
  return json({ ok: true, count: r.count ?? 0 });
}

// ============================================================
//  ADMIN-BENUTZER (Admin)
// ============================================================

// GET /api/admin/users
export async function adminListUsers(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const { results } = await env.DB.prepare(
    "SELECT username, email, created_at FROM admin_users ORDER BY username"
  ).all();
  return json({
    me: auth.username,
    users: results.map((u) => ({ username: u.username, email: u.email || null, createdAt: u.created_at })),
  });
}

// POST /api/admin/users  { username, password, email? }
export async function adminCreateUser(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  let username, password, email;
  try {
    username = str(body.username, { required: true, max: 50, name: "username" });
    password = str(body.password, { required: true, max: 200, trim: false, name: "password" });
    email    = str(body.email,    { max: 200, name: "email" });
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }
  if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(username)) return error(400, "invalid-username");
  if (password.length < 10) return error(400, "password-too-short");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error(400, "invalid-email");
  const exists = await env.DB.prepare("SELECT 1 AS n FROM admin_users WHERE username = ?").bind(username).first();
  if (exists) return error(409, "username-taken");
  await env.DB.prepare(
    "INSERT INTO admin_users (username, password_hash, email) VALUES (?, ?, ?)"
  ).bind(username, await hashPassword(password), email || null).run();
  return json({ ok: true, username }, { status: 201 });
}

// DELETE /api/admin/users/:username — nie sich selbst, nie den letzten Admin
export async function adminDeleteUser(req, env, { username }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  if (username === auth.username) return error(400, "cannot-delete-self");
  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM admin_users").first();
  if ((count?.n || 0) <= 1) return error(400, "last-admin");
  const res = await env.DB.batch([
    env.DB.prepare("DELETE FROM admin_sessions WHERE username = ?").bind(username),
    env.DB.prepare("DELETE FROM password_reset_tokens WHERE username = ?").bind(username),
    env.DB.prepare("DELETE FROM admin_users WHERE username = ?").bind(username),
  ]);
  if (!res[2]?.meta?.changes) return error(404, "not-found");
  return json({ ok: true });
}

// PUT /api/admin/users/me/password  { current, password }
// Beendet alle anderen Sessions des Benutzers, die aktuelle bleibt.
export async function adminChangePassword(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  const current = typeof body?.current === "string" ? body.current : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < 10) return error(400, "password-too-short");
  if (password.length > 200) return error(400, "password-too-long");
  const row = await env.DB.prepare("SELECT password_hash FROM admin_users WHERE username = ?")
    .bind(auth.username).first();
  if (!row || !(await verifyPassword(current, row.password_hash))) return error(401, "invalid-credentials");
  const token = parseCookies(req)["atlas_session"];
  await env.DB.batch([
    env.DB.prepare("UPDATE admin_users SET password_hash = ? WHERE username = ?")
      .bind(await hashPassword(password), auth.username),
    env.DB.prepare("DELETE FROM admin_sessions WHERE username = ? AND token != ?").bind(auth.username, token),
  ]);
  return json({ ok: true });
}

// POST /api/prices (Convenience — wrapt als Contribution vom Typ "price")
export async function postPrice(req, env, _params, ctx) {
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  return postContribution(new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({ type: "price", data: body, turnstileToken: body.turnstileToken, email: body.email }),
  }), env, {}, ctx);
}

// ============================================================
//  ADMIN
// ============================================================

// POST /api/admin/login  { username, password }
export async function adminLogin(req, env) {
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  const username = str(body.username, { max: 80 });
  const password = typeof body.password === "string" ? body.password : null;
  if (!username || !password) return error(400, "credentials-required");

  const ip = clientIp(req);

  // Turnstile: nur erzwingen wenn BEIDE Seiten konfiguriert sind —
  // Secret (Server) UND Site-Key (Frontend, rendert das Widget).
  // Fehlt der Site-Key, wird kein Widget angezeigt und kein Token gesendet.
  const tsActive = turnstileActive(env);
  const ts = await verifyTurnstile(body.turnstileToken, tsActive ? env.TURNSTILE_SECRET_KEY : null, ip);
  if (!ts.success) return error(403, "turnstile-failed", { reason: ts });

  // Rate-Limit Login (5 pro 5 min pro IP)
  const rl = await rateLimit(env.DB, `login:${ip}:${Math.floor(Date.now() / 300000)}`, 5, 300);
  if (!rl.allowed) return error(429, "too-many-attempts");

  const row = await env.DB.prepare(
    "SELECT username, password_hash FROM admin_users WHERE username = ?"
  ).bind(username).first();

  // Konstante Antwortzeit — auch bei nicht-existierendem User PBKDF2 ausführen
  const stored = row?.password_hash || "pbkdf2$120000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  const ok = await verifyPassword(password, stored);
  if (!row || !ok) return error(401, "invalid-credentials");

  const token = randomToken(32);
  const expires = new Date(Date.now() + 8 * 3600 * 1000); // 8h
  // Abgelaufene Sessions aufräumen (expires_at ist ein ISO-String wie unten)
  await env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at < ?").bind(new Date().toISOString()).run();
  await env.DB.prepare(
    "INSERT INTO admin_sessions (token, username, expires_at) VALUES (?, ?, ?)"
  ).bind(token, username, expires.toISOString()).run();

  const cookie = setCookieHeader("atlas_session", token, {
    maxAge: 8 * 3600, httpOnly: true, secure: true, sameSite: "Strict", path: "/",
  });
  return new Response(JSON.stringify({ ok: true, username, expiresAt: expires.toISOString() }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "set-cookie": cookie },
  });
}

// POST /api/admin/logout
export async function adminLogout(req, env) {
  const cookies = parseCookies(req);
  const token = cookies["atlas_session"];
  if (token) {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE token = ?").bind(token).run();
  }
  const cookie = setCookieHeader("atlas_session", "", { maxAge: 0, httpOnly: true, secure: true, sameSite: "Strict" });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "set-cookie": cookie },
  });
}

// GET /api/admin/me
export async function adminMe(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  return json({ username: auth.username });
}

// POST /api/admin/request-reset  { email }
// Generiert einen 1h-gültigen Reset-Token und sendet ihn per E-Mail.
// Gibt immer dieselbe Antwort zurück (kein User-Enumeration).
export async function adminRequestReset(req, env) {
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  const email = str(body.email, { max: 200 });
  if (!email) return error(400, "email-required");

  const ip = clientIp(req);
  const rl = await rateLimit(env.DB, `reset:${ip}:${Math.floor(Date.now() / 900000)}`, 3, 900);
  if (!rl.allowed) return error(429, "too-many-attempts");

  // Aufräumen abgelaufener Tokens
  await env.DB.prepare("DELETE FROM password_reset_tokens WHERE expires_at < datetime('now')").run();

  const row = await env.DB.prepare(
    "SELECT username FROM admin_users WHERE email = ?"
  ).bind(email).first();

  if (row) {
    const token = randomToken(32);
    const expires = new Date(Date.now() + 3600 * 1000).toISOString();
    await env.DB.prepare(
      "INSERT INTO password_reset_tokens (token, username, expires_at) VALUES (?, ?, ?)"
    ).bind(token, row.username, expires).run();

    const sc = siteConfig(env);
    const siteUrl = sc.siteUrl || "https://altbieratlas.de";
    const resetUrl = `${siteUrl}/admin.html?reset=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(env, { to: email, resetUrl });
  }

  return json({ ok: true });
}

// POST /api/admin/reset-password  { token, password }
export async function adminResetPassword(req, env) {
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  const token = typeof body.token === "string" ? body.token.trim() : null;
  const password = typeof body.password === "string" ? body.password : null;
  if (!token || !password) return error(400, "token-and-password-required");
  if (password.length < 10) return error(400, "password-too-short");

  const row = await env.DB.prepare(
    "SELECT username, expires_at FROM password_reset_tokens WHERE token = ?"
  ).bind(token).first();

  if (!row) return error(400, "invalid-or-expired-token");
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare("DELETE FROM password_reset_tokens WHERE token = ?").bind(token).run();
    return error(400, "invalid-or-expired-token");
  }

  const hash = await hashPassword(password);
  await env.DB.batch([
    env.DB.prepare("UPDATE admin_users SET password_hash = ? WHERE username = ?").bind(hash, row.username),
    env.DB.prepare("DELETE FROM password_reset_tokens WHERE token = ?").bind(token),
    env.DB.prepare("DELETE FROM admin_sessions WHERE username = ?").bind(row.username),
  ]);

  return json({ ok: true });
}

// GET /api/admin/contributions?status=pending
export async function adminListContributions(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "pending";
  const res = await env.DB.prepare(
    "SELECT * FROM contributions WHERE status = ? ORDER BY created_at DESC LIMIT 200"
  ).bind(status).all();
  return json({
    contributions: res.results.map((c) => ({
      id: c.id,
      type: c.type,
      payload: (() => { try { return JSON.parse(c.payload); } catch { return {}; } })(),
      submitterEmail: c.submitter_email,
      submitterName: c.submitter_name || null,
      status: c.status,
      adminNotes: c.admin_notes,
      createdAt: c.created_at,
      reviewedAt: c.reviewed_at,
      reviewedBy: c.reviewed_by,
    })),
  });
}

// POST /api/admin/contributions/:id/approve
export async function adminApprove(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;

  const c = await env.DB.prepare(
    "SELECT * FROM contributions WHERE id = ? AND status = 'pending'"
  ).bind(id).first();
  if (!c) return error(404, "not-found-or-already-reviewed");

  let payload;
  try { payload = JSON.parse(c.payload); }
  catch { return error(500, "invalid-payload"); }

  const nowIso = new Date().toISOString();
  // Neu angelegter Ort → das Admin-Panel stößt damit die Place-ID-Suche an
  let createdBreweryId = null;

  // Apply-Logik je Typ
  try {
    if (c.type === "price") {
      await env.DB.prepare(
        "INSERT INTO prices (brewery_id, date, size, price, source, notes, style_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')"
      ).bind(
        payload.breweryId,
        payload.date,
        payload.size,
        parseFloat(payload.price),
        payload.source || "Beitrag",
        payload.notes || null,
        await existingStyleId(env, payload.styleId),
      ).run();
    } else if (c.type === "brewery") {
      const newId = payload.id || (payload.name || "brew").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) + "-" + Math.random().toString(36).slice(2, 6);
      const lat = payload.lat != null ? parseFloat(payload.lat) : (payload.coords?.[0] ?? null);
      const lng = payload.lng != null ? parseFloat(payload.lng) : (payload.coords?.[1] ?? null);
      if (lat == null || lng == null) return error(400, "brewery-missing-coords");
      await env.DB.prepare(
        `INSERT INTO breweries (id, name, short_name, type, city, country, address, lat, lng, founded, website, description_de, description_en, verified, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'approved')`
      ).bind(
        newId, payload.name, payload.short || null, payload.type || "brewery",
        payload.city, payload.country || "DE", payload.address || null,
        lat, lng, payload.founded ? parseInt(payload.founded, 10) : null,
        payload.website || null, payload.description || null, payload.description_en || null,
      ).run();
      createdBreweryId = newId;
    } else if (c.type === "event") {
      await env.DB.prepare(
        `INSERT INTO events (id, title_de, title_en, brewery_id, date, time, location, url, description_de, description_en, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`
      ).bind(
        "ev_" + Math.random().toString(36).slice(2, 10),
        payload.eventName, payload.eventName, // en fallback
        payload.breweryId || null, payload.eventDate,
        payload.eventTime || null,
        payload.eventLocation || null,
        payload.eventUrl || null,
        payload.description || null, payload.description || null,
      ).run();
    } else if (c.type === "offer") {
      // Community-Text kommt in einer Sprache; EN bis zur Übersetzung gleich DE
      // (fehlende Übersetzungen zeigt das Dashboard)
      const o = normalizeOffer({
        brewery_id: payload.breweryId, kind: "offer",
        title_de: payload.offerTitle, title_en: payload.offerTitle,
        description_de: payload.offerDescription, description_en: payload.offerDescription,
        weekdays: payload.weekdays, time_from: payload.timeFrom, time_to: payload.timeTo,
        valid_until: payload.validUntil, status: "approved",
      });
      await insertOffer(env, o);
    } else if (c.type === "style") {
      const sid = "usr-" + (payload.styleName || "stil").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) + "-" + Math.random().toString(36).slice(2, 6);
      await env.DB.prepare(
        `INSERT OR IGNORE INTO styles (id, name, abv, ibu, color, tasting_de, tasting_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        sid, payload.styleName,
        payload.abv ? parseFloat(payload.abv) : null,
        payload.ibu ? parseInt(payload.ibu, 10) : null,
        "#8b4513", payload.tasting || null, payload.tasting || null,
      ).run();
      if (payload.breweryId) {
        await env.DB.prepare(
          "INSERT OR IGNORE INTO brewery_styles (brewery_id, style_id) VALUES (?, ?)"
        ).bind(payload.breweryId, sid).run();
      }
    }
    // Korrektur: wird nur als Hinweis angelegt — der Admin muss die Änderung manuell übernehmen.

    await env.DB.prepare(
      "UPDATE contributions SET status = 'approved', reviewed_at = ?, reviewed_by = ? WHERE id = ?"
    ).bind(nowIso, auth.username, id).run();

    return json({ ok: true, ...(createdBreweryId ? { breweryId: createdBreweryId } : {}) });
  } catch (e) {
    return error(500, "apply-failed", { detail: e.message });
  }
}

// POST /api/admin/contributions/:id/reject  { notes? }
export async function adminReject(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  const notes = str(body.notes, { max: 2000, name: "notes" });

  const res = await env.DB.prepare(
    "UPDATE contributions SET status = 'rejected', reviewed_at = ?, reviewed_by = ?, admin_notes = ? WHERE id = ? AND status = 'pending'"
  ).bind(new Date().toISOString(), auth.username, notes, id).run();
  if (!res.meta.changes) return error(404, "not-found-or-already-reviewed");
  return json({ ok: true });
}

// GET /api/admin/breweries  (inkl. pending)
export async function adminListBreweries(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare(
    `SELECT b.*, GROUP_CONCAT(bs.style_id) AS style_ids
     FROM breweries b
     LEFT JOIN brewery_styles bs ON bs.brewery_id = b.id
     GROUP BY b.id
     ORDER BY b.created_at DESC LIMIT 500`
  ).all();
  return json({
    breweries: res.results.map((r) => {
      const styles = r.style_ids ? r.style_ids.split(",").filter(Boolean) : [];
      return brewRow(r, styles);
    }),
  });
}

// PUT /api/admin/breweries/:id
export async function adminUpdateBrewery(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  // Optionale ID-Umbenennung
  let newId = null;
  if ("new_id" in body) {
    const candidate = str(body.new_id, { max: 80, name: "new_id" });
    if (candidate && candidate !== id) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(candidate)) return error(400, "invalid-id-format");
      const exists = await env.DB.prepare("SELECT id FROM breweries WHERE id = ?").bind(candidate).first();
      if (exists) return error(409, "id-already-exists");
      newId = candidate;
    }
  }

  if ("google_place_id" in body) {
    const pid = body.google_place_id == null ? "" : String(body.google_place_id).trim();
    if (pid && !/^[A-Za-z0-9_-]{10,300}$/.test(pid)) return error(400, "invalid-place-id");
    body.google_place_id = pid || null;
  }
  if ("untappd_id" in body) {
    const raw = body.untappd_id;
    const uid = raw == null || raw === "" ? null : Number(raw);
    if (uid != null && (!Number.isInteger(uid) || uid < 0)) return error(400, "invalid-untappd-id");
    body.untappd_id = uid;
  }
  if ("highlighted" in body) {
    // true/false aus der Checkbox oder eine Stufe als Zahl
    const lvl = typeof body.highlighted === "number" ? Math.max(0, Math.min(9, Math.trunc(body.highlighted))) : (body.highlighted ? 1 : 0);
    body.highlighted = lvl;
  }
  if ("highlighted_until" in body) {
    const d = body.highlighted_until || null;
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return error(400, "invalid-date");
    body.highlighted_until = d;
  }
  if ("opening_hours" in body) {
    try {
      const h = normalizeHours(body.opening_hours);
      body.opening_hours = h ? JSON.stringify(h) : null;
    } catch (e) {
      return error(400, "invalid-opening-hours", { detail: e.message });
    }
  }
  if ("opening_hours_checked" in body) {
    const d = body.opening_hours_checked || null;
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return error(400, "invalid-date");
    body.opening_hours_checked = d;
  }
  for (const k of ["opening_hours_note_de", "opening_hours_note_en"]) {
    if (k in body) body[k] = body[k] ? String(body[k]).trim().slice(0, 500) || null : null;
  }
  if ("is_historical" in body) {
    body.is_historical = body.is_historical ? 1 : 0;
    // Historische Orte bekommen keine Place ID (keine Bewertung für geschlossene Betriebe)
    if (body.is_historical) body.google_place_id = null;
  }

  const fields = [];
  const values = [];
  const allow = {
    name: "name", short: "short_name", type: "type", city: "city", country: "country",
    address: "address", maps_url: "maps_url", lat: "lat", lng: "lng", founded: "founded",
    website: "website", description_de: "description_de", description_en: "description_en",
    verified: "verified", status: "status", logo_key: "logo_key", is_historical: "is_historical",
    highlighted: "highlighted", highlighted_until: "highlighted_until",
    opening_hours: "opening_hours", opening_hours_note_de: "opening_hours_note_de",
    opening_hours_note_en: "opening_hours_note_en", opening_hours_checked: "opening_hours_checked",
    successor_id: "successor_id", google_place_id: "google_place_id", untappd_id: "untappd_id",
  };
  for (const [k, col] of Object.entries(allow)) {
    if (k in body) {
      fields.push(`${col} = ?`);
      values.push(body[k]);
    }
  }
  if (!fields.length && !("styles" in body) && !newId) return error(400, "no-fields");
  if ("successor_id" in body && body.successor_id != null) {
    if (body.successor_id === id) return error(400, "successor-self");
    const succ = await env.DB.prepare("SELECT id FROM breweries WHERE id = ?").bind(body.successor_id).first();
    if (!succ) return error(400, "successor-not-found");
  }

  const effectiveId = newId || id;

  if (newId) {
    // ID-Umbenennung: alle Felder + id in einem Batch
    const allFields = [...fields, "id = ?", "updated_at = datetime('now')"];
    const allValues = [...values, newId, id];
    const styleIds = "styles" in body
      ? (Array.isArray(body.styles) ? body.styles.filter((s) => s && typeof s === "string") : [])
      : null;
    const stmts = [
      // Defer FK checks to end of transaction so the PK rename doesn't
      // temporarily violate child-table FK constraints.
      env.DB.prepare("PRAGMA defer_foreign_keys = ON"),
      env.DB.prepare(`UPDATE breweries SET ${allFields.join(", ")} WHERE id = ?`).bind(...allValues),
      env.DB.prepare("UPDATE brewery_styles SET brewery_id = ? WHERE brewery_id = ?").bind(newId, id),
      env.DB.prepare("UPDATE prices SET brewery_id = ? WHERE brewery_id = ?").bind(newId, id),
      env.DB.prepare("UPDATE events SET brewery_id = ? WHERE brewery_id = ?").bind(newId, id),
      env.DB.prepare("UPDATE breweries SET successor_id = ? WHERE successor_id = ?").bind(newId, id),
      env.DB.prepare("UPDATE styles SET primary_brewery_id = ? WHERE primary_brewery_id = ?").bind(newId, id),
      // Untappd-Cache hängt an der Orts-ID: alten Eintrag verwerfen, der neue entsteht beim nächsten Abruf
      env.DB.prepare("DELETE FROM untappd_cache WHERE atlas_id = ?").bind(id),
    ];
    if (styleIds !== null) {
      stmts.push(env.DB.prepare("DELETE FROM brewery_styles WHERE brewery_id = ?").bind(newId));
      for (const sid of styleIds) {
        stmts.push(env.DB.prepare("INSERT OR IGNORE INTO brewery_styles (brewery_id, style_id) VALUES (?, ?)").bind(newId, sid));
      }
    }
    await env.DB.batch(stmts);
    return json({ ok: true, new_id: newId });
  }

  if (fields.length) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await env.DB.prepare(
      `UPDATE breweries SET ${fields.join(", ")} WHERE id = ?`
    ).bind(...values).run();
  }
  // Geänderte Untappd-Zuordnung sofort wirksam machen statt 24 h Cache abzuwarten
  if ("untappd_id" in body) {
    await env.DB.prepare("DELETE FROM untappd_cache WHERE atlas_id = ?").bind(id).run();
  }
  if ("styles" in body) {
    const styleIds = Array.isArray(body.styles) ? body.styles.filter((s) => s && typeof s === "string") : [];
    await env.DB.prepare("DELETE FROM brewery_styles WHERE brewery_id = ?").bind(effectiveId).run();
    for (const sid of styleIds) {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO brewery_styles (brewery_id, style_id) VALUES (?, ?)"
      ).bind(effectiveId, sid).run();
    }
  }
  return json({ ok: true });
}

// DELETE /api/admin/breweries/:id/untappd-cache
// Verwirft den gecachten Untappd-Treffer; der nächste Abruf fragt Untappd neu.
export async function adminClearUntappdCache(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  await env.DB.prepare("DELETE FROM untappd_cache WHERE atlas_id = ?").bind(id).run();
  return json({ ok: true });
}

// GET /api/admin/translation-gaps
// Alle Objekte, bei denen ein Sprachfeld in DE oder EN fehlt (NULL oder leer).
// Abgelehnte Einträge zählen nicht.
export async function adminTranslationGaps(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const blank = (c) => `NULLIF(TRIM(${c}), '') IS NULL`;
  // [Art, SQL für id/label, Feldpaare]
  const sources = [
    ["brewery", "SELECT id, name AS label, %F FROM breweries WHERE status != 'rejected'", [["description", "description_de", "description_en"]]],
    ["style", "SELECT id, name AS label, %F FROM styles", [["tasting", "tasting_de", "tasting_en"]]],
    ["event", "SELECT id, COALESCE(title_de, title_en, id) AS label, %F FROM events WHERE status != 'rejected'",
      [["title", "title_de", "title_en"], ["description", "description_de", "description_en"]]],
    ["eventBeer", "SELECT event_id AS id, COALESCE(name_de, name_en, '') AS label, %F FROM event_beers", [["name", "name_de", "name_en"]]],
    ["glossary", "SELECT term AS id, term AS label, %F FROM glossary", [["definition", "definition_de", "definition_en"]]],
    ["offer", "SELECT id, COALESCE(title_de, title_en, '') AS label, %F FROM offers WHERE status != 'rejected'", [["title", "title_de", "title_en"]]],
    ["venueType", "SELECT id, COALESCE(name_de, name_en, id) AS label, %F FROM venue_types",
      [["name", "name_de", "name_en"], ["header", "header_de", "header_en"]]],
  ];
  const stmts = sources.map(([, sql, pairs]) => {
    const cols = pairs.flatMap(([f, de, en]) => [`${blank(de)} AS ${f}_no_de`, `${blank(en)} AS ${f}_no_en`]);
    const where = pairs.map(([, de, en]) => `${blank(de)} OR ${blank(en)}`).join(" OR ");
    const q = sql.replace("%F", cols.join(", "));
    return env.DB.prepare(`${q} ${q.includes(" WHERE ") ? "AND" : "WHERE"} (${where})`);
  });
  const results = await env.DB.batch(stmts);
  const gaps = [];
  results.forEach((res, i) => {
    const [kind, , pairs] = sources[i];
    for (const r of res.results || []) {
      for (const [f] of pairs) {
        const noDe = !!r[`${f}_no_de`], noEn = !!r[`${f}_no_en`];
        if (noDe || noEn) gaps.push({ kind, id: r.id, label: r.label, field: f, missing: noDe && noEn ? "both" : noDe ? "de" : "en" });
      }
    }
  });
  return json({ gaps });
}

// GET /api/admin/breweries/:id/place-search
// Sucht den Ort bei Google (Places API New) und liefert die Treffer mit
// Entfernung und Status. Speichert nichts — übernommen wird erst per PUT
// nach Bestätigung im Admin-Panel.
export async function adminPlaceSearch(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  if (!env.GOOGLE_PLACES_KEY) return error(503, "places-not-configured");
  const row = await env.DB.prepare(
    "SELECT id, name, address, city, lat, lng, is_historical, google_place_id FROM breweries WHERE id = ?"
  ).bind(id).first();
  if (!row) return error(404, "not-found");
  if (row.is_historical) return error(400, "historical-no-place-id");
  // Ohne Adresse wenigstens die Stadt mitschicken, sonst sucht Google bundesweit
  const address = row.address || row.city;
  try {
    const result = await searchPlace(env.GOOGLE_PLACES_KEY, { name: row.name, address, lat: row.lat, lng: row.lng });
    return json({ ok: true, current: row.google_place_id || null, ...result });
  } catch (e) {
    return error(502, "places-search-failed", { detail: String(e?.message || e) });
  }
}

// POST /api/admin/google-ratings/refresh  { limit? }
// Manueller Bewertungsabruf, eine Portion (max. 40 Orte) pro Aufruf: alles,
// was in der letzten Stunde nicht abgerufen wurde. Das Admin-Panel ruft so
// lange erneut auf, bis `remaining` 0 ist oder eine Portion nichts mehr schafft.
export async function adminRefreshGoogleRatings(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  if (!env.GOOGLE_PLACES_KEY) return error(503, "places-not-configured");
  const body = await req.json().catch(() => ({}));
  const summary = await refreshRatings(env, { limit: body?.limit, minAgeHours: 1, delayMs: 50 });
  return json({ ok: true, ...summary });
}

// GET /api/admin/google-places/pin-check
// Abstand zwischen DB-Pin und Googles Koordinaten für alle Orte mit Place ID,
// größter zuerst. Liest nur den Cache (kein Google-Aufruf); Orte, deren Cache
// noch keine Koordinaten hat, zählt `missing` – „Google-Bewertungen abrufen“
// füllt sie nach. `shared` = so viele Orte teilen sich diese Place ID.
export async function adminPinCheck(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const { results } = await env.DB.prepare(
    `SELECT b.id, b.name, b.city, b.address, b.status, b.lat, b.lng, b.google_place_id,
            c.lat AS g_lat, c.lng AS g_lng, c.fetched_at, sh.n AS shared
     FROM breweries b
     LEFT JOIN google_places_cache c ON c.place_id = b.google_place_id
     JOIN (SELECT google_place_id, COUNT(*) AS n FROM breweries
           WHERE google_place_id IS NOT NULL GROUP BY google_place_id) sh
       ON sh.google_place_id = b.google_place_id
     WHERE b.google_place_id IS NOT NULL AND b.google_place_id != '' AND b.is_historical = 0`
  ).all();
  const items = [];
  let missing = 0;
  for (const r of results) {
    if (r.g_lat == null || r.g_lng == null) { missing++; continue; }
    items.push({
      id: r.id, name: r.name, city: r.city, address: r.address, status: r.status,
      placeId: r.google_place_id, shared: r.shared, fetchedAt: r.fetched_at,
      lat: r.lat, lng: r.lng, googleLat: r.g_lat, googleLng: r.g_lng,
      distance: Math.round(haversine(r.lat, r.lng, r.g_lat, r.g_lng)),
    });
  }
  items.sort((a, b) => b.distance - a.distance);
  return json({ ok: true, threshold: PIN_CHECK_DISTANCE_M, missing, items });
}

// POST /api/admin/google-places/backfill  { after?, limit? }
// Probelauf für alle Orte ohne Place ID, portionsweise (max. 40 pro Aufruf,
// wegen des Subrequest-Limits). Speichert nichts.
export async function adminPlacesBackfill(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  if (!env.GOOGLE_PLACES_KEY) return error(503, "places-not-configured");
  const body = await req.json().catch(() => ({}));
  const res = await backfillBatch(env, { after: body?.after || "", limit: body?.limit || 20 });
  return json({ ok: true, ...res });
}

// POST /api/admin/google-places/apply  { items: [{ id, placeId }] }
// Schreibt die im Panel bestätigten Place IDs. Nur für Orte, die noch keine
// haben und nicht historisch sind; bestehende IDs werden nie überschrieben.
export async function adminPlacesApply(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : null;
  if (!items || !items.length) return error(400, "no-items");
  if (items.length > 500) return error(400, "too-many-items");
  const stmts = [];
  for (const it of items) {
    const id = typeof it?.id === "string" ? it.id : "";
    const pid = typeof it?.placeId === "string" ? it.placeId.trim() : "";
    if (!id || !/^[A-Za-z0-9_-]{10,300}$/.test(pid)) return error(400, "invalid-item", { id });
    stmts.push(env.DB.prepare(
      `UPDATE breweries SET google_place_id = ?, updated_at = datetime('now')
       WHERE id = ? AND google_place_id IS NULL AND is_historical = 0`
    ).bind(pid, id));
  }
  const res = await env.DB.batch(stmts);
  const updated = res.reduce((n, r) => n + (r?.meta?.changes || 0), 0);
  return json({ ok: true, updated, skipped: items.length - updated });
}

// DELETE /api/admin/breweries/:id
export async function adminDeleteBrewery(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  await env.DB.prepare("DELETE FROM breweries WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// POST /api/admin/breweries/:id/photo  (multipart/form-data, field: photo)
export async function adminUploadBreweryPhoto(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  if (!env.LOGOS) return error(503, "r2-not-configured");

  const brewery = await env.DB.prepare("SELECT id, photo_key FROM breweries WHERE id = ?").bind(id).first();
  if (!brewery) return error(404, "not-found");

  let formData;
  try { formData = await req.formData(); } catch { return error(400, "multipart-required"); }
  const file = formData.get("photo");
  if (!file || typeof file.arrayBuffer !== "function") return error(400, "photo-field-required");

  const mimeType = file.type || "application/octet-stream";
  if (!mimeType.startsWith("image/")) return error(400, "image-required");

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024) return error(400, "file-too-large", { maxBytes: 5242880 });

  const extMap = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
  const ext = extMap[mimeType] || "jpg";
  const filename = `${id}.${ext}`;
  const r2Key = `orte/fotos/${filename}`;

  if (brewery.photo_key && brewery.photo_key !== filename) {
    await env.LOGOS.delete(`orte/fotos/${brewery.photo_key}`).catch(() => {});
  }

  await env.LOGOS.put(r2Key, bytes, { httpMetadata: { contentType: mimeType } });
  await env.DB.prepare("UPDATE breweries SET photo_key = ?, updated_at = datetime('now') WHERE id = ?").bind(filename, id).run();
  return json({ ok: true, photoKey: filename, photoUrl: `/photos/${filename}` });
}

// DELETE /api/admin/breweries/:id/photo
export async function adminDeleteBreweryPhoto(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;

  const brewery = await env.DB.prepare("SELECT id, photo_key FROM breweries WHERE id = ?").bind(id).first();
  if (!brewery) return error(404, "not-found");
  if (brewery.photo_key && env.LOGOS) {
    await env.LOGOS.delete(`orte/fotos/${brewery.photo_key}`).catch(() => {});
  }
  await env.DB.prepare("UPDATE breweries SET photo_key = NULL, updated_at = datetime('now') WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// POST /api/admin/breweries/:id/logo  (multipart/form-data, field: logo)
export async function adminUploadBreweryLogo(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  if (!env.LOGOS) return error(503, "r2-not-configured");

  const brewery = await env.DB.prepare("SELECT id, logo_key FROM breweries WHERE id = ?").bind(id).first();
  if (!brewery) return error(404, "not-found");

  let formData;
  try { formData = await req.formData(); } catch { return error(400, "multipart-required"); }
  const file = formData.get("logo");
  if (!file || typeof file.arrayBuffer !== "function") return error(400, "logo-field-required");

  const mimeType = file.type || "application/octet-stream";
  if (!mimeType.startsWith("image/")) return error(400, "image-required");

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > 2 * 1024 * 1024) return error(400, "file-too-large", { maxBytes: 2097152 });

  const extMap = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "image/gif": "gif" };
  const ext = extMap[mimeType] || "png";
  const filename = `${id}.${ext}`;
  const r2Key = `orte/logos/${filename}`;

  // Altes Logo nur löschen, wenn kein anderer Ort es (aus der Bibliothek) verwendet
  if (brewery.logo_key && brewery.logo_key !== filename) {
    const shared = await env.DB.prepare("SELECT 1 FROM breweries WHERE logo_key = ? AND id != ? LIMIT 1").bind(brewery.logo_key, id).first();
    if (!shared) await env.LOGOS.delete(`orte/logos/${brewery.logo_key}`).catch(() => {});
  }

  await env.LOGOS.put(r2Key, bytes, { httpMetadata: { contentType: mimeType } });
  await env.DB.prepare("UPDATE breweries SET logo_key = ?, updated_at = datetime('now') WHERE id = ?").bind(filename, id).run();
  return json({ ok: true, logoKey: filename, logoUrl: `/logos/orte/${filename}` });
}

// DELETE /api/admin/breweries/:id/logo  — entfernt nur die DB-Referenz, löscht R2-Objekt nicht
export async function adminDeleteBreweryLogo(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;

  const brewery = await env.DB.prepare("SELECT id FROM breweries WHERE id = ?").bind(id).first();
  if (!brewery) return error(404, "not-found");
  await env.DB.prepare("UPDATE breweries SET logo_key = NULL, updated_at = datetime('now') WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// GET /api/admin/ort-logos
export async function adminListBreweryLogos(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  if (!env.LOGOS) return json({ logos: [] });
  const listed = await env.LOGOS.list({ prefix: "orte/logos/" });
  const logos = listed.objects
    .map((obj) => ({
      key: obj.key.slice("orte/logos/".length),
      url: `/logos/${obj.key}`,
      size: obj.size,
    }))
    .filter((l) => l.key && !l.key.endsWith("/"));
  return json({ logos });
}

// DELETE /api/admin/ort-logos/:key
export async function adminDeleteBreweryLogoFile(req, env, { key }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  if (!env.LOGOS) return error(503, "r2-not-configured");
  await env.LOGOS.delete(`orte/logos/${key}`).catch(() => {});
  await env.DB.prepare("UPDATE breweries SET logo_key = NULL, updated_at = datetime('now') WHERE logo_key = ?").bind(key).run();
  return json({ ok: true });
}

// GET /api/admin/events
export async function adminListEvents(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare(
    `SELECT e.id, e.title_de, e.title_en, e.brewery_id, b.name AS brewery_name,
            e.date, e.time, e.end_date, e.end_time,
            e.location, e.url, e.description_de, e.description_en, e.status, e.created_at
     FROM events e LEFT JOIN breweries b ON b.id = e.brewery_id
     ORDER BY e.date ASC, e.created_at DESC LIMIT 200`
  ).all();
  return json({
    events: res.results.map((r) => ({
      id: r.id, titleDe: r.title_de, titleEn: r.title_en,
      breweryId: r.brewery_id, breweryName: r.brewery_name,
      date: r.date, time: r.time, endDate: r.end_date, endTime: r.end_time,
      location: r.location, url: r.url,
      descriptionDe: r.description_de, descriptionEn: r.description_en,
      status: r.status, createdAt: r.created_at,
    })),
  });
}

// DELETE /api/admin/events/:id
export async function adminDeleteEvent(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
  if (!res.meta.changes) return error(404, "not-found");
  return json({ ok: true });
}

// PUT /api/admin/events/:id
export async function adminUpdateEvent(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  // Optionale ID-Umbenennung
  let newId = null;
  if ("new_id" in body) {
    const candidate = str(body.new_id, { max: 100, name: "new_id" });
    if (candidate && candidate !== id) {
      const exists = await env.DB.prepare("SELECT id FROM events WHERE id = ?").bind(candidate).first();
      if (exists) return error(409, "id-already-exists");
      newId = candidate;
    }
  }

  const fields = [];
  const values = [];
  const allow = {
    title_de: "title_de", title_en: "title_en", brewery_id: "brewery_id",
    date: "date", time: "time", end_date: "end_date", end_time: "end_time",
    location: "location", url: "url",
    description_de: "description_de", description_en: "description_en", status: "status",
  };
  for (const [k, col] of Object.entries(allow)) {
    if (k in body) { fields.push(`${col} = ?`); values.push(body[k]); }
  }

  if (newId) fields.push("id = ?"), values.push(newId);
  if (!fields.length) return error(400, "no-fields");
  values.push(id);
  await env.DB.prepare(`UPDATE events SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  return json({ ok: true, new_id: newId || undefined });
}

// Belegen zwei Preismeldungen denselben Platz in „jüngster Preis je Größe und Sorte“?
// Gleiche Größe und gleiche Sorte, oder eine der beiden ohne Sorte: Dann verdrängt die
// neuere Meldung die ältere, statt dass eine alte Meldung ohne Sorte daneben stehen bleibt.
export function sameSlot(sizeA, styleA, sizeB, styleB) {
  if (sizeA == null || sizeB == null || Math.abs(sizeA - sizeB) >= 0.001) return false;
  return !styleA || !styleB || styleA === styleB;
}

// Sorten-ID nur übernehmen, wenn es die Sorte gibt (FK auf styles); sonst NULL.
async function existingStyleId(env, styleId) {
  if (!styleId || typeof styleId !== "string") return null;
  const row = await env.DB.prepare("SELECT id FROM styles WHERE id = ?").bind(styleId).first();
  return row ? row.id : null;
}

// GET /api/admin/prices
export async function adminListPrices(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare(
    `SELECT p.id, p.brewery_id, b.name AS brewery_name, p.date, p.size, p.price, p.source, p.notes, p.status, p.created_at,
            p.style_id, s.name AS style_name
     FROM prices p LEFT JOIN breweries b ON b.id = p.brewery_id
     LEFT JOIN styles s ON s.id = p.style_id
     ORDER BY p.date DESC, p.created_at DESC LIMIT 500`
  ).all();
  return json({
    prices: res.results.map((r) => ({
      id: r.id, breweryId: r.brewery_id, breweryName: r.brewery_name,
      date: r.date, size: r.size, price: r.price,
      source: r.source, notes: r.notes, status: r.status, createdAt: r.created_at,
      styleId: r.style_id || null, styleName: r.style_name || null,
    })),
  });
}

// POST /api/admin/prices  { breweryId, date, size, price, source?, notes?, styleId? }
export async function adminAddPrice(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  let breweryId, date, size, priceVal, source, notes, styleId;
  try {
    breweryId = str(body.breweryId, { required: true, max: 80, name: "breweryId" });
    date      = str(body.date,      { required: true, max: 20, name: "date" });
    size      = str(body.size,      { required: true, max: 20, name: "size" });
    priceVal  = num(body.price,     { min: 0, max: 100, required: true, name: "price" });
    source    = str(body.source,    { max: 100, name: "source" });
    notes     = str(body.notes,     { max: 1000, name: "notes" });
    styleId   = str(body.styleId,   { max: 80, name: "styleId" });
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }

  const brewery = await env.DB.prepare("SELECT id FROM breweries WHERE id = ?").bind(breweryId).first();
  if (!brewery) return error(404, "brewery-not-found");
  if (styleId && !(await existingStyleId(env, styleId))) return error(404, "style-not-found");

  await env.DB.prepare(
    "INSERT INTO prices (brewery_id, date, size, price, source, notes, style_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')"
  ).bind(breweryId, date, size, priceVal, source, notes, styleId || null).run();

  return json({ ok: true }, { status: 201 });
}

// DELETE /api/admin/prices/:id
export async function adminDeletePrice(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare("DELETE FROM prices WHERE id = ?").bind(parseInt(id, 10)).run();
  if (!res.meta.changes) return error(404, "not-found");
  return json({ ok: true });
}

// PUT /api/admin/prices/:id
export async function adminUpdatePrice(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  const fields = [];
  const values = [];
  const strAllow = { brewery_id: "brewery_id", date: "date", size: "size", source: "source", notes: "notes", status: "status" };
  for (const [k, col] of Object.entries(strAllow)) {
    if (k in body) { fields.push(`${col} = ?`); values.push(body[k]); }
  }
  if ("style_id" in body) {
    const sid = body.style_id || null;
    if (sid && !(await existingStyleId(env, sid))) return error(404, "style-not-found");
    fields.push("style_id = ?");
    values.push(sid);
  }
  if ("price" in body) {
    try {
      const priceVal = num(body.price, { min: 0, max: 100, required: true, name: "price" });
      fields.push("price = ?");
      values.push(priceVal);
    } catch (e) {
      return error(400, "validation-failed", { detail: e.message });
    }
  }
  if (!fields.length) return error(400, "no-fields");
  values.push(parseInt(id, 10));
  await env.DB.prepare(`UPDATE prices SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  return json({ ok: true });
}

// GET /api/admin/styles
export async function adminListStyles(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare(
    `SELECT s.*, b.name AS primary_brewery_name, bs.brewery_ids
     FROM styles s
     LEFT JOIN breweries b ON b.id = s.primary_brewery_id
     -- Einmal gruppieren statt je Sorte: brewery_styles hat keinen Index auf style_id
     LEFT JOIN (SELECT style_id, GROUP_CONCAT(brewery_id) AS brewery_ids
                FROM brewery_styles GROUP BY style_id) bs ON bs.style_id = s.id
     ORDER BY s.name`
  ).all();
  return json({
    styles: res.results.map((s) => ({
      id: s.id, name: s.name, abv: s.abv, ibu: s.ibu, color: s.color,
      tasting: { de: s.tasting_de, en: s.tasting_en },
      logoKey: s.logo_key || null,
      logoUrl: s.logo_key ? `/logos/${s.logo_key}` : null,
      primaryBreweryId: s.primary_brewery_id || null,
      primaryBreweryName: s.primary_brewery_name || null,
      breweryIds: s.brewery_ids ? s.brewery_ids.split(",").filter(Boolean) : [],
    })),
  });
}

// POST /api/admin/styles
export async function adminCreateStyle(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  let styleId, name, abv, ibu, color, tasting_de, tasting_en;
  try {
    styleId    = str(body.id,         { required: true, max: 80,   name: "id" });
    name       = str(body.name,       { required: true, max: 200,  name: "name" });
    abv        = body.abv  != null ? num(body.abv,  { min: 0, max: 100,  name: "abv" })  : null;
    ibu        = body.ibu  != null ? num(body.ibu,  { min: 0, max: 1000, name: "ibu" })  : null;
    color      = str(body.color,      { max: 20,   name: "color" });
    tasting_de = str(body.tasting_de, { max: 2000, name: "tasting_de" });
    tasting_en = str(body.tasting_en, { max: 2000, name: "tasting_en" });
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(styleId)) return error(400, "invalid-id-format");
  const existing = await env.DB.prepare("SELECT id FROM styles WHERE id = ?").bind(styleId).first();
  if (existing) return error(409, "id-already-exists");
  await env.DB.prepare(
    "INSERT INTO styles (id, name, abv, ibu, color, tasting_de, tasting_en) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(styleId, name, abv, ibu, color, tasting_de, tasting_en).run();
  return json({ ok: true }, { status: 201 });
}

// PUT /api/admin/styles/:id
export async function adminUpdateStyle(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  // Validate new ID if provided
  const doRename = "id" in body && body.id !== id;
  let newId = id;
  if (doRename) {
    try { newId = str(body.id, { required: true, max: 80, name: "id" }); } catch (e) {
      return error(400, "validation-failed", { detail: e.message });
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(newId)) return error(400, "invalid-id-format");
    const clash = await env.DB.prepare("SELECT id FROM styles WHERE id = ?").bind(newId).first();
    if (clash) return error(409, "id-already-exists");
  }

  const fields = [];
  const values = [];
  try {
    if ("name"       in body) { fields.push("name = ?");       values.push(str(body.name,       { max: 200,  name: "name" })); }
    if ("color"      in body) { fields.push("color = ?");      values.push(str(body.color,      { max: 20,   name: "color" })); }
    if ("tasting_de" in body) { fields.push("tasting_de = ?"); values.push(str(body.tasting_de, { max: 2000, name: "tasting_de" })); }
    if ("tasting_en" in body) { fields.push("tasting_en = ?"); values.push(str(body.tasting_en, { max: 2000, name: "tasting_en" })); }
    if ("abv"        in body) { fields.push("abv = ?");        values.push(body.abv != null ? num(body.abv, { min: 0, max: 100,  name: "abv" })  : null); }
    if ("ibu"        in body) { fields.push("ibu = ?");        values.push(body.ibu != null ? num(body.ibu, { min: 0, max: 1000, name: "ibu" })  : null); }
    if ("logo_key"           in body) { fields.push("logo_key = ?");           values.push(body.logo_key || null); }
    if ("primary_brewery_id" in body) { fields.push("primary_brewery_id = ?"); values.push(body.primary_brewery_id || null); }
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }

  // Ausschankorte der Sorte ersetzen (brewery_styles), unbekannte IDs ignorieren
  const locStmts = (sid) => {
    if (!("brewery_ids" in body)) return [];
    const ids = Array.isArray(body.brewery_ids)
      ? [...new Set(body.brewery_ids.filter((b) => b && typeof b === "string"))] : [];
    return [
      env.DB.prepare("DELETE FROM brewery_styles WHERE style_id = ?").bind(sid),
      ...ids.map((bid) => env.DB.prepare(
        "INSERT OR IGNORE INTO brewery_styles (brewery_id, style_id) SELECT id, ? FROM breweries WHERE id = ?"
      ).bind(sid, bid)),
    ];
  };

  if (doRename) {
    const stmts = [];
    if (fields.length) {
      // Apply field updates to old row first, then rename via INSERT+DELETE
      stmts.push(env.DB.prepare(`UPDATE styles SET ${fields.join(", ")} WHERE id = ?`).bind(...values, id));
    }
    stmts.push(
      env.DB.prepare("INSERT INTO styles (id,name,abv,ibu,color,tasting_de,tasting_en,logo_key,primary_brewery_id) SELECT ?,name,abv,ibu,color,tasting_de,tasting_en,logo_key,primary_brewery_id FROM styles WHERE id=?").bind(newId, id),
      env.DB.prepare("UPDATE brewery_styles SET style_id=? WHERE style_id=?").bind(newId, id),
      // Sonst setzt der FK (ON DELETE SET NULL) die Sorte an allen Preisen zurück
      env.DB.prepare("UPDATE prices SET style_id=? WHERE style_id=?").bind(newId, id),
      env.DB.prepare("DELETE FROM styles WHERE id=?").bind(id),
      ...locStmts(newId),
    );
    await env.DB.batch(stmts);
    return json({ ok: true, newId });
  }

  const loc = locStmts(id);
  if (!fields.length && !loc.length) return error(400, "no-fields");
  const stmts = [...loc];
  if (fields.length) {
    values.push(id);
    stmts.unshift(env.DB.prepare(`UPDATE styles SET ${fields.join(", ")} WHERE id = ?`).bind(...values));
  }
  await env.DB.batch(stmts);
  return json({ ok: true });
}

// GET /api/admin/logos
export async function adminListLogos(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  if (!env.LOGOS) return json({ logos: [] });
  const [orteList, stileList] = await Promise.all([
    env.LOGOS.list({ prefix: "orte/logos/" }),
    env.LOGOS.list({ prefix: "stile/" }),
  ]);
  const logos = [
    ...orteList.objects.map((obj) => ({ key: obj.key, url: `/logos/${obj.key}`, size: obj.size, folder: "orte" })),
    ...stileList.objects.map((obj) => ({ key: obj.key, url: `/logos/${obj.key}`, size: obj.size, folder: "stile" })),
  ];
  return json({ logos });
}

// DELETE /api/admin/logos/:key
export async function adminDeleteLogo(req, env, { key }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  if (!env.LOGOS) return error(503, "r2-not-configured");
  await env.LOGOS.delete(key).catch(() => {});
  await env.DB.prepare("UPDATE styles SET logo_key = NULL WHERE logo_key = ?").bind(key).run();
  return json({ ok: true });
}

// DELETE /api/admin/styles/:id
export async function adminDeleteStyle(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare("DELETE FROM styles WHERE id = ?").bind(id).run();
  if (!res.meta.changes) return error(404, "not-found");
  return json({ ok: true });
}

// POST /api/admin/styles/:id/logo  (multipart/form-data, field: logo)
export async function adminUploadStyleLogo(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  if (!env.LOGOS) return error(503, "r2-not-configured");

  const style = await env.DB.prepare("SELECT id, logo_key FROM styles WHERE id = ?").bind(id).first();
  if (!style) return error(404, "not-found");

  let formData;
  try { formData = await req.formData(); } catch { return error(400, "multipart-required"); }
  const file = formData.get("logo");
  if (!file || typeof file.arrayBuffer !== "function") return error(400, "logo-field-required");

  const mimeType = file.type || "application/octet-stream";
  if (!mimeType.startsWith("image/")) return error(400, "image-required");

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > 2 * 1024 * 1024) return error(400, "file-too-large", { maxBytes: 2097152 });

  const extMap = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "image/gif": "gif" };
  const ext = extMap[mimeType] || "png";
  const key = `stile/${id}.${ext}`;

  if (style.logo_key && style.logo_key !== key) {
    await env.LOGOS.delete(style.logo_key).catch(() => {});
  }

  await env.LOGOS.put(key, bytes, { httpMetadata: { contentType: mimeType } });
  await env.DB.prepare("UPDATE styles SET logo_key = ? WHERE id = ?").bind(key, id).run();
  return json({ ok: true, logoKey: key, logoUrl: `/logos/${key}` });
}

// DELETE /api/admin/styles/:id/logo  — entfernt nur die DB-Referenz, löscht R2-Objekt nicht
export async function adminDeleteStyleLogo(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;

  const style = await env.DB.prepare("SELECT id FROM styles WHERE id = ?").bind(id).first();
  if (!style) return error(404, "not-found");
  await env.DB.prepare("UPDATE styles SET logo_key = NULL WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// GET /api/admin/glossary
export async function adminListGlossary(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare("SELECT * FROM glossary ORDER BY term").all();
  return json({
    glossary: res.results.map((g) => ({
      term: g.term,
      definition: { de: g.definition_de, en: g.definition_en },
    })),
  });
}

// POST /api/admin/glossary  { term, definition_de, definition_en? }
export async function adminCreateGlossary(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  let term, definition_de, definition_en;
  try {
    term          = str(body.term,          { required: true, max: 200,  name: "term" });
    definition_de = str(body.definition_de, { required: true, max: 4000, name: "definition_de" });
    definition_en = str(body.definition_en, { max: 4000, name: "definition_en" });
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }
  const existing = await env.DB.prepare("SELECT term FROM glossary WHERE term = ?").bind(term).first();
  if (existing) return error(409, "term-already-exists");
  await env.DB.prepare(
    "INSERT INTO glossary (term, definition_de, definition_en) VALUES (?, ?, ?)"
  ).bind(term, definition_de, definition_en || null).run();
  return json({ ok: true }, { status: 201 });
}

// PUT /api/admin/glossary/:term
export async function adminUpdateGlossary(req, env, { term }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  const fields = [];
  const values = [];
  try {
    if ("definition_de" in body) { fields.push("definition_de = ?"); values.push(str(body.definition_de, { max: 4000, name: "definition_de" })); }
    if ("definition_en" in body) { fields.push("definition_en = ?"); values.push(str(body.definition_en, { max: 4000, name: "definition_en" }) || null); }
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }
  if (!fields.length) return error(400, "no-fields");
  values.push(term);
  const res = await env.DB.prepare(`UPDATE glossary SET ${fields.join(", ")} WHERE term = ?`).bind(...values).run();
  if (!res.meta.changes) return error(404, "not-found");
  return json({ ok: true });
}

// DELETE /api/admin/glossary/:term
export async function adminDeleteGlossary(req, env, { term }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare("DELETE FROM glossary WHERE term = ?").bind(term).run();
  if (!res.meta.changes) return error(404, "not-found");
  return json({ ok: true });
}

// ============================================================
//  VENUE TYPES (Admin)
// ============================================================

// GET /api/admin/venue-types
export async function adminListVenueTypes(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare("SELECT * FROM venue_types ORDER BY id").all();
  return json({
    venueTypes: res.results.map((r) => ({
      id: r.id, nameDe: r.name_de, nameEn: r.name_en,
      headerDe: r.header_de, headerEn: r.header_en,
      isProducer: !!r.is_producer,
    })),
  });
}

// POST /api/admin/venue-types  { id, name_de, name_en?, header_de?, header_en? }
export async function adminCreateVenueType(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  let id, name_de, name_en, header_de, header_en;
  try {
    id        = str(body.id,        { required: true, max: 50,   name: "id" });
    name_de   = str(body.name_de,   { required: true, max: 200,  name: "name_de" });
    name_en   = str(body.name_en,   { max: 200,  name: "name_en" });
    header_de = str(body.header_de, { max: 1000, name: "header_de" });
    header_en = str(body.header_en, { max: 1000, name: "header_en" });
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return error(400, "invalid-id-format");
  const exists = await env.DB.prepare("SELECT id FROM venue_types WHERE id = ?").bind(id).first();
  if (exists) return error(409, "id-already-exists");
  await env.DB.prepare(
    "INSERT INTO venue_types (id, name_de, name_en, header_de, header_en, is_producer) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id, name_de, name_en || null, header_de || null, header_en || null, body.is_producer ? 1 : 0).run();
  return json({ ok: true }, { status: 201 });
}

// PUT /api/admin/venue-types/:id
export async function adminUpdateVenueType(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  const fields = [];
  const values = [];
  try {
    if ("name_de"   in body) { fields.push("name_de = ?");   values.push(str(body.name_de,   { required: true, max: 200,  name: "name_de" })); }
    if ("name_en"   in body) { fields.push("name_en = ?");   values.push(str(body.name_en,   { max: 200,  name: "name_en" }) || null); }
    if ("header_de" in body) { fields.push("header_de = ?"); values.push(str(body.header_de, { max: 1000, name: "header_de" }) || null); }
    if ("header_en" in body) { fields.push("header_en = ?"); values.push(str(body.header_en, { max: 1000, name: "header_en" }) || null); }
    if ("is_producer" in body) { fields.push("is_producer = ?"); values.push(body.is_producer ? 1 : 0); }
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }
  if (!fields.length) return error(400, "no-fields");
  values.push(id);
  const res = await env.DB.prepare(`UPDATE venue_types SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  if (!res.meta.changes) return error(404, "not-found");
  return json({ ok: true });
}

// DELETE /api/admin/venue-types/:id
export async function adminDeleteVenueType(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const inUse = await env.DB.prepare("SELECT COUNT(*) AS n FROM breweries WHERE type = ?").bind(id).first();
  if (inUse?.n > 0) return error(409, "type-in-use", { count: inUse.n });
  const res = await env.DB.prepare("DELETE FROM venue_types WHERE id = ?").bind(id).run();
  if (!res.meta.changes) return error(404, "not-found");
  return json({ ok: true });
}

// ============================================================
//  BREWERY CREATE (Admin)
// ============================================================

// POST /api/admin/breweries
export async function adminCreateBrewery(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  let id, name, shortName, type, city, country, address, mapsUrl, lat, lng, founded, website, descDe, descEn, successorId;
  try {
    id        = str(body.id,             { required: true, max: 80,   name: "id" });
    name      = str(body.name,           { required: true, max: 200,  name: "name" });
    shortName = str(body.short,          { max: 100,  name: "short" });
    type      = str(body.type,           { required: true, max: 50,   name: "type" });
    city      = str(body.city,           { required: true, max: 100,  name: "city" });
    country   = str(body.country,        { max: 5,    name: "country" }) || "DE";
    address   = str(body.address,        { max: 300,  name: "address" });
    mapsUrl   = str(body.maps_url,       { max: 1000, name: "maps_url" });
    lat       = num(body.lat,            { required: true, min: -90,  max: 90,  name: "lat" });
    lng       = num(body.lng,            { required: true, min: -180, max: 180, name: "lng" });
    founded   = body.founded != null && body.founded !== "" ? parseInt(body.founded, 10) : null;
    website   = str(body.website,        { max: 500,  name: "website" });
    descDe    = str(body.description_de, { max: 2000, name: "description_de" });
    descEn    = str(body.description_en, { max: 2000, name: "description_en" });
    successorId = str(body.successor_id, { max: 80,  name: "successor_id" });
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }
  const isHistorical = body.is_historical ? 1 : 0;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return error(400, "invalid-id-format");
  const exists = await env.DB.prepare("SELECT id FROM breweries WHERE id = ?").bind(id).first();
  if (exists) return error(409, "id-already-exists");
  if (successorId) {
    if (successorId === id) return error(400, "successor-self");
    const succ = await env.DB.prepare("SELECT id FROM breweries WHERE id = ?").bind(successorId).first();
    if (!succ) return error(400, "successor-not-found");
  }

  await env.DB.prepare(
    `INSERT INTO breweries
       (id, name, short_name, type, city, country, address, maps_url, lat, lng,
        founded, website, description_de, description_en, is_historical, successor_id, verified, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'approved')`
  ).bind(id, name, shortName || null, type, city, country, address || null, mapsUrl || null,
         lat, lng, founded, website || null, descDe || null, descEn || null,
         isHistorical, successorId || null).run();
  return json({ ok: true, id }, { status: 201 });
}

// ============================================================
//  EVENT CREATE (Admin)
// ============================================================

// POST /api/admin/events  { id, title_de, title_en?, brewery_id?, date, time?, location?, url?, description_de?, description_en?, status? }
export async function adminCreateEvent(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  let id, titleDe, titleEn, breweryId, date, time, endDate, endTime, location, url, descDe, descEn, status;
  try {
    id        = str(body.id,             { required: true, max: 100,  name: "id" });
    titleDe   = str(body.title_de,       { required: true, max: 200,  name: "title_de" });
    titleEn   = str(body.title_en,       { max: 200,  name: "title_en" });
    breweryId = str(body.brewery_id,     { max: 80,   name: "brewery_id" });
    date      = str(body.date,           { required: true, max: 20,   name: "date" });
    time      = str(body.time,           { max: 10,   name: "time" });
    endDate   = str(body.end_date,       { max: 20,   name: "end_date" });
    endTime   = str(body.end_time,       { max: 10,   name: "end_time" });
    location  = str(body.location,       { max: 300,  name: "location" });
    url       = str(body.url,            { max: 500,  name: "url" });
    descDe    = str(body.description_de, { max: 2000, name: "description_de" });
    descEn    = str(body.description_en, { max: 2000, name: "description_en" });
    status    = oneOf(body.status, ["pending", "approved", "rejected"]) || "approved";
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }
  const exists = await env.DB.prepare("SELECT id FROM events WHERE id = ?").bind(id).first();
  if (exists) return error(409, "id-already-exists");

  await env.DB.prepare(
    `INSERT INTO events
       (id, title_de, title_en, brewery_id, date, time, end_date, end_time,
        location, url, description_de, description_en, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, titleDe, titleEn || titleDe, breweryId || null, date,
    time || null, endDate || null, endTime || null,
    location || null, url || null,
    descDe || null, descEn || null, status,
  ).run();
  return json({ ok: true, id }, { status: 201 });
}

// GET /api/admin/events/:id/beers
export async function adminListEventBeers(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const exists = await env.DB.prepare("SELECT id FROM events WHERE id = ?").bind(id).first();
  if (!exists) return error(404, "event-not-found");
  const res = await env.DB.prepare(
    "SELECT * FROM event_beers WHERE event_id = ? ORDER BY id"
  ).bind(id).all();
  return json({
    beers: res.results.map((b) => ({
      id: b.id, eventId: b.event_id,
      name: { de: b.name_de, en: b.name_en },
      size: b.size, price: b.price, notes: b.notes, createdAt: b.created_at,
    })),
  });
}

// POST /api/admin/events/:id/beers  { name_de?, name_en?, size, price?, notes? }
export async function adminAddEventBeer(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  let nameDe, nameEn, size, priceVal, notes;
  try {
    nameDe   = str(body.name_de, { max: 200, name: "name_de" });
    nameEn   = str(body.name_en, { max: 200, name: "name_en" });
    size     = str(body.size,    { required: true, max: 20, name: "size" });
    priceVal = body.price != null ? num(body.price, { min: 0, max: 100, name: "price" }) : null;
    notes    = str(body.notes,   { max: 500, name: "notes" });
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }
  const event = await env.DB.prepare("SELECT id FROM events WHERE id = ?").bind(id).first();
  if (!event) return error(404, "event-not-found");

  const res = await env.DB.prepare(
    "INSERT INTO event_beers (event_id, name_de, name_en, size, price, notes) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id, nameDe || null, nameEn || null, size, priceVal, notes || null).run();
  return json({ ok: true, id: res.meta.last_row_id }, { status: 201 });
}

// PUT /api/admin/events/:id/beers/:beerId
export async function adminUpdateEventBeer(req, env, { id, beerId }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  const fields = [];
  const values = [];
  if ("name_de" in body) { fields.push("name_de = ?"); values.push(body.name_de || null); }
  if ("name_en" in body) { fields.push("name_en = ?"); values.push(body.name_en || null); }
  if ("size"    in body) { fields.push("size = ?");    values.push(body.size); }
  if ("notes"   in body) { fields.push("notes = ?");   values.push(body.notes || null); }
  if ("price"   in body) {
    try {
      const priceVal = body.price != null ? num(body.price, { min: 0, max: 100, name: "price" }) : null;
      fields.push("price = ?"); values.push(priceVal);
    } catch (e) {
      return error(400, "validation-failed", { detail: e.message });
    }
  }
  if (!fields.length) return error(400, "no-fields");
  values.push(parseInt(beerId, 10), id);
  const res = await env.DB.prepare(
    `UPDATE event_beers SET ${fields.join(", ")} WHERE id = ? AND event_id = ?`
  ).bind(...values).run();
  if (!res.meta.changes) return error(404, "not-found");
  return json({ ok: true });
}

// DELETE /api/admin/events/:id/beers/:beerId
export async function adminDeleteEventBeer(req, env, { id, beerId }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare(
    "DELETE FROM event_beers WHERE id = ? AND event_id = ?"
  ).bind(parseInt(beerId, 10), id).run();
  if (!res.meta.changes) return error(404, "not-found");
  return json({ ok: true });
}

// GET /api/admin/stats
export async function adminStats(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const [pending, approved, rejected, breweries, prices] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM contributions WHERE status='pending'").first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM contributions WHERE status='approved'").first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM contributions WHERE status='rejected'").first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM breweries").first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM prices").first(),
  ]);
  return json({
    pending: pending?.n ?? 0,
    approved: approved?.n ?? 0,
    rejected: rejected?.n ?? 0,
    breweries: breweries?.n ?? 0,
    prices: prices?.n ?? 0,
  });
}

// ============================================================
//  UNTAPPD (öffentlich, gecacht)
// ============================================================
// GET /api/untappd/brewery/:id
// Proxy + 24h-D1-Cache für Untappd-Brauereisuchergebnisse.
// Nur aktiv, wenn UNTAPPD_CLIENT_ID + UNTAPPD_CLIENT_SECRET gesetzt sind.
export async function getUntappdBrewery(req, env, { id }) {
  const clientId = env.UNTAPPD_CLIENT_ID;
  const clientSecret = env.UNTAPPD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return json({ available: false });

  // Cache prüfen (24h TTL)
  const cached = await env.DB.prepare(
    "SELECT data, cached_at FROM untappd_cache WHERE atlas_id = ?"
  ).bind(id).first();
  if (cached && (Date.now() - new Date(cached.cached_at).getTime()) < 86400000) {
    return json({ available: true, cached: true, ...JSON.parse(cached.data) });
  }

  // Brauereiname und ggf. feste Untappd-ID aus DB holen
  const brewery = await env.DB.prepare(
    "SELECT name, untappd_id FROM breweries WHERE id = ? AND status = 'approved'"
  ).bind(id).first();
  if (!brewery) return json({ available: false });
  // 0 = im Admin bewusst ausgeblendet (kein passender Untappd-Eintrag)
  if (brewery.untappd_id === 0) return json({ available: true, found: false, disabled: true });

  try {
    const auth = `client_id=${clientId}&client_secret=${clientSecret}`;
    // Feste ID → direkt die Brauerei abrufen, sonst erster Treffer der Namenssuche
    const apiUrl = brewery.untappd_id
      ? `https://api.untappd.com/v4/brewery/info/${brewery.untappd_id}?compact=true&${auth}`
      : `https://api.untappd.com/v4/search/brewery?q=${encodeURIComponent(brewery.name)}&${auth}&limit=3`;
    const r = await fetch(apiUrl, {
      headers: { "User-Agent": "Altbieratlas/1.0" },
      cf: { cacheTtl: 3600 },
    });
    if (!r.ok) return json({ available: false });

    const d = await r.json();
    const b = brewery.untappd_id
      ? d.response?.brewery
      : d.response?.brewery?.items?.[0]?.brewery;
    let data;
    if (!b) {
      data = { found: false };
    } else {
      data = {
        found: true,
        untappdId: b.brewery_id,
        name: b.brewery_name,
        slug: b.brewery_slug,
        rating: b.rating?.rating_score ?? null,
        beerCount: b.beer_count ?? null,
        label: b.brewery_label || null,
      };
    }

    await env.DB.prepare(
      "INSERT OR REPLACE INTO untappd_cache (atlas_id, data, cached_at) VALUES (?, ?, datetime('now'))"
    ).bind(id, JSON.stringify(data)).run();

    return json({ available: true, cached: false, ...data });
  } catch (e) {
    return json({ available: false });
  }
}

// ============================================================
//  SITEMAP (öffentlich)
// ============================================================
// Letztes inhaltliches Änderungsdatum pro Seite (Sitemap-lastmod, JSON-LD).
// Bei jeder inhaltlichen Änderung an einer Seite dieses Datum aktualisieren.
// / und /ranglisten erhalten zusätzlich das DB-lastMod-Datum, falls neuer.
export const PAGE_DATES = {
  "/":           "2026-10-26",
  "/ranglisten": "2026-10-26",
  "/wissen":     "2026-10-26",
  "/sorten":     "2026-10-26",
  "/rivalen":    "2026-10-26",
  "/beitragen":  "2026-10-26",
  "/staedte":    "2026-10-26",
  "/kooperation": "2026-10-26",
};

// GET /sitemap.xml — wird direkt vom Worker (nicht unter /api) serviert.
export async function sitemap(req, env) {
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
                              .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
                              .replace(/'/g, "&apos;");
  // /impressum fehlt bewusst: die Seite ist noindex, und noindex-URLs in der
  // Sitemap meldet die Search Console als Fehler.
  const staticPaths = ["/", "/ranglisten", "/wissen", "/sorten", "/rivalen", "/beitragen", "/staedte", "/kooperation"];
  let breweryIds = [];
  let eventIds = [];
  let lastMod = null;
  const today = new Date().toISOString().slice(0, 10);
  const cities = await cityIndex(env);
  try {
    const [bRes, eRes] = await Promise.all([
      env.DB.prepare(
        "SELECT id, updated_at FROM breweries WHERE status = 'approved' ORDER BY updated_at DESC LIMIT 5000"
      ).all(),
      env.DB.prepare(
        "SELECT id, created_at FROM events WHERE status = 'approved'" +
        " AND COALESCE(end_date, date) >= ? ORDER BY date ASC LIMIT 500"
      ).bind(today).all(),
    ]);
    breweryIds = bRes.results.map((x) => ({ id: x.id, lastmod: x.updated_at }));
    lastMod = bRes.results[0]?.updated_at || null;
    eventIds = eRes.results.map((x) => ({ id: x.id, lastmod: x.created_at }));
  } catch { /* keine DB → nur statische Seiten */ }

  const entries = [
    ...staticPaths.map((p) => {
      const pageDate = PAGE_DATES[p] || today;
      // Datengetriebene Seiten: aktuelleres von PAGE_DATE und DB-lastMod verwenden
      const dbDate = lastMod ? lastMod.slice(0, 10) : null;
      const useDate = (p === "/" || p === "/ranglisten") && dbDate && dbDate > pageDate
        ? dbDate
        : pageDate;
      const priority = p === "/" ? "1.0" : "0.7";
      return `
  <url>
    <loc>${esc(base + p)}</loc>
    <lastmod>${useDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
    }),
    ...Object.keys(cities).map((slug) => `
  <url>
    <loc>${esc(base + "/stadt/" + slug)}</loc>
    <lastmod>${lastMod ? lastMod.slice(0, 10) : today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`),
    ...breweryIds.map((b) => `
  <url>
    <loc>${esc(base + "/ort/" + encodeURIComponent(b.id))}</loc>
    <lastmod>${(b.lastmod || today).slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`),
    ...eventIds.map((e) => `
  <url>
    <loc>${esc(base + "/event?id=" + e.id)}</loc>
    <lastmod>${(e.lastmod || today).slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`),
  ].join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}
</urlset>`;
  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

// GET /api/admin/settings
export async function adminGetSettings(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const rows = await env.DB.prepare("SELECT key, value FROM site_settings").all();
  const settings = {};
  for (const r of rows.results) {
    try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
  }
  return json({ settings });
}

// PUT /api/admin/settings  { key: value, ... }
export async function adminUpdateSettings(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  if (!body || typeof body !== "object") return error(400, "invalid-body");

  const allowed = [
    "impressum.owner", "impressum.address", "impressum.email",
    "banner.text_de", "banner.text_en", "banner.enabled",
    "author.name", "author.github", "author.linkedin", "author.website",
    "author.instagram", "author.mastodon", "author.kofi", "author.beer",
  ];
  const stmts = [];
  for (const key of allowed) {
    if (!(key in body)) continue;
    const val = body[key] == null ? "" : String(body[key]).trim();
    stmts.push(
      env.DB.prepare(
        "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
      ).bind(key, JSON.stringify(val))
    );
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true });
}

// Preis/Größe/Datum serverseitig deutsch formatieren (Client nutzt i18n.js).
export function fmtPriceDe(n) {
  return Number(n).toFixed(2).replace(".", ",");
}
export function fmtSizeDe(s) {
  const num = parseFloat(String(s ?? "").replace(",", ".").replace(/\s*l$/i, ""));
  if (isNaN(num)) return String(s ?? "");
  return num.toFixed(3).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",") + " l";
}
export function sizeNum(s) {
  const num = parseFloat(String(s ?? "").replace(",", ".").replace(/\s*l$/i, ""));
  return isNaN(num) ? null : num;
}
// Titel ab ~60 Zeichen schneidet Google ab, SEO-Crawler melden sie als zu lang.
// Kandidaten vom ausführlichsten zum knappsten: der erste, der passt, gewinnt;
// passt keiner, wird der letzte an einer Wortgrenze gekürzt.
export const TITLE_MAX = 60;
export function fitTitle(...candidates) {
  const list = candidates.filter(Boolean);
  const fit = list.find((t) => t.length <= TITLE_MAX);
  if (fit) return fit;
  const last = list[list.length - 1] || "";
  return last.slice(0, TITLE_MAX - 1).replace(/\s+\S*$/, "").replace(/[\s,;:.·–-]+$/, "") + "…";
}
export function fmtDateDe(d) {
  if (!d) return "";
  const [y, m, day] = String(d).slice(0, 10).split("-");
  return y && m && day ? `${day}.${m}.${y}` : String(d);
}

// Venue-Typ → schema.org-Typ. Genauere Typen helfen Suchmaschinen und
// KI-Assistenten, einen Ort richtig einzuordnen („Brauerei“ statt „Kneipe“).
const SCHEMA_TYPE = {
  brewery: "Brewery", brewpub: "Brewery",
  taproom: "BarOrPub", pub: "BarOrPub", restaurant: "Restaurant",
  beverage_store: "LiquorStore", supermarket: "GroceryStore", kiosk: "ConvenienceStore",
};

// GET /ort/<slug> — SSR: Meta-Tags, JSON-LD UND Seiteninhalt aus D1.
// Ohne Server-Rendering sehen Crawler auf Ortsseiten nur "Lade…" — der
// gesamte Long-Tail ("Uerige Preis", "Füchschen Altbier") bliebe unsichtbar.
export async function serveOrt(req, env, params = {}) {
  const url = new URL(req.url);
  const id = params.id || url.searchParams.get("id");

  const staticFile = () => {
    const assetUrl = new URL(req.url);
    assetUrl.pathname = "/ort.html";
    return env.ASSETS.fetch(new Request(assetUrl.toString(), req));
  };

  // Ohne ID: statische Datei direkt ausliefern (kein SSR nötig)
  if (!id) return staticFile();

  // Brauerei + Preise + Stile parallel aus D1 laden
  let row, prices = [], styles = [];
  try {
    const [bRes, pRes, sRes] = await Promise.all([
      env.DB.prepare(
        `SELECT b.*, COALESCE(v.name_de, b.type) AS type_label, g.opening_hours AS g_opening_hours
         FROM breweries b LEFT JOIN venue_types v ON v.id = b.type
         LEFT JOIN google_places_cache g ON g.place_id = b.google_place_id AND b.is_historical = 0
           AND g.fetched_at >= datetime('now', '-${CACHE_MAX_AGE_DAYS} days')
         WHERE b.id = ? AND b.status = 'approved'`
      ).bind(id).first(),
      env.DB.prepare(
        `SELECT p.date, p.size, p.price, p.source, s.name AS style_name
         FROM prices p LEFT JOIN styles s ON s.id = p.style_id
         WHERE p.brewery_id = ? AND p.status = 'approved' ORDER BY p.date DESC, p.price ASC LIMIT 20`
      ).bind(id).all(),
      env.DB.prepare(
        `SELECT s.id, s.name, s.abv, s.ibu, s.tasting_de
         FROM brewery_styles bs JOIN styles s ON s.id = bs.style_id
         WHERE bs.brewery_id = ? ORDER BY s.name`
      ).bind(id).all(),
    ]);
    row = bRes;
    prices = pRes?.results || [];
    styles = sRes?.results || [];
  } catch { /* D1 nicht verfügbar — Fallback auf statische Datei */ }

  // Brauerei nicht gefunden oder DB-Fehler: statische Datei ausliefern
  if (!row) return staticFile();

  const assetRes = await staticFile();
  if (!assetRes.ok) return assetRes;

  const pageUrl = `https://altbieratlas.de/ort/${encodeURIComponent(row.id)}`;
  const ogImageUrl = `https://altbieratlas.de/api/og/ort?id=${encodeURIComponent(row.id)}`;
  const slug = citySlug(row.city);
  const cityUrl = slug ? `https://altbieratlas.de/stadt/${slug}` : null;

  // Jüngste Meldung je Größe und Sorte — das ist der Preis, der für Besucher zählt.
  // Eine Meldung ohne Sorte zählt für jede Sorte derselben Größe (siehe sameSlot).
  const latestBySize = [];
  for (const p of prices) {
    const n = sizeNum(p.size);
    if (latestBySize.some((x) => sameSlot(sizeNum(x.size), x.style_name, n, p.style_name))) continue;
    latestBySize.push(p);
  }
  latestBySize.sort((a, b) => (sizeNum(a.size) ?? 0) - (sizeNum(b.size) ?? 0)
    || String(a.style_name || "").localeCompare(String(b.style_name || "")));
  // 0,25 l, sonst die kleinste Größe — identisch zur Preisbox in public/ort.html.
  // Mehrere Sorten in 0,25 l: die jüngste Meldung, bei gleichem Datum die günstigste
  // (dieselbe Reihenfolge wie die Preisabfrage der Ortsseite: date DESC, price ASC).
  const hero = prices.find((p) => sizeNum(p.size) === 0.25)
            || latestBySize[0];

  // Preis in den Titel: Bei Namenssuchen ("kürzer flingern") steht die offizielle
  // Website darüber, der Preis ist das, was nur der Atlas im Snippet bietet.
  // Laut Search Console lag die CTR mit dem reinen Namens-Titel bei Position 9 unter 0,2 %.
  const priceTitle = hero && !row.is_historical
    ? `Altbier ${fmtSizeDe(hero.size)} für ${fmtPriceDe(hero.price)} €` : "";
  const title = priceTitle
    ? fitTitle(`${row.name}: ${priceTitle} · ${row.city}`, `${row.name}: ${priceTitle}`,
        `${row.name}: Alt ${fmtSizeDe(hero.size)} für ${fmtPriceDe(hero.price)} €`)
    : fitTitle(`${row.name} · Altbier in ${row.city} · Altbieratlas`,
        `${row.name} · Altbier in ${row.city}`, `${row.name} · Altbier`);

  // Preis und Adresse vorne in die Meta-Description: Preis ist die Frage, mit der
  // Leute suchen, und Straßensuchen ("kürzer fichtenstraße") werden fett markiert.
  // Gesamtlänge ~160 Zeichen, sonst schneidet Google die Beschreibung ab.
  // Schenkt der Ort mehrere Sorten aus, steht die Sorte statt „Alt“ im Snippet,
  // damit der Preis nicht für jede seiner Sorten gelesen wird.
  const multiStyle = styles.length > 1
    || new Set(prices.map((p) => p.style_name).filter(Boolean)).size > 1;
  const heroBeer = multiStyle && hero?.style_name ? hero.style_name : "Alt";
  const priceBit = hero
    ? `${fmtSizeDe(hero.size)} ${heroBeer} für ${fmtPriceDe(hero.price)} € (Stand ${fmtDateDe(hero.date)}). `
    : "";
  const addrBit = row.address && !row.is_historical ? `${row.address}. ` : "";
  const head = priceBit + addrBit;
  const room = Math.max(60, 160 - head.length);
  const rawDesc = (row.description_de || row.description_en || "").trim();
  const desc = rawDesc.length > room
    ? rawDesc.slice(0, room).replace(/\s+\S*$/, "").replace(/[\s,;:.–-]+$/, "") + "…"
    : rawDesc;
  const metaDesc = head + (desc
    || `${row.name} in ${row.city}: Adresse, Altbier-Sorten und aktuelle Preise im Altbieratlas.`);

  // Öffnungszeiten: eigene (auch ins JSON-LD), sonst Googles aus dem Cache (nur Anzeige)
  const parseHours = (v) => { try { return v ? JSON.parse(v) : null; } catch { return null; } };
  const ownHours = row.is_historical ? null : parseHours(row.opening_hours);
  const shownHours = ownHours || (row.is_historical ? null : parseHours(row.g_opening_hours));
  const hoursSpec = schemaOrgHours(ownHours);

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": row.is_historical ? "Place" : (SCHEMA_TYPE[row.type] || "BarOrPub"),
        ...(hoursSpec.length ? { "openingHoursSpecification": hoursSpec } : {}),
        "@id": pageUrl + "#business",
        "name": row.name,
        "url": pageUrl,
        "image": ogImageUrl,
        "description": metaDesc,
        ...(row.address ? { "address": { "@type": "PostalAddress", "streetAddress": row.address, "addressLocality": row.city, "addressCountry": row.country || "DE" } } : {}),
        ...(row.lat && row.lng ? { "geo": { "@type": "GeoCoordinates", "latitude": row.lat, "longitude": row.lng } } : {}),
        ...(row.website ? { "sameAs": [row.website] } : {}),
        ...(!row.is_historical && mapsLink(row) ? { "hasMap": mapsLink(row) } : {}),
        ...(row.founded ? { "foundingDate": String(row.founded) } : {}),
        ...(latestBySize.length ? {
          "hasMenu": {
            "@type": "Menu",
            "hasMenuSection": {
              "@type": "MenuSection",
              "name": "Altbier",
              "hasMenuItem": latestBySize.map((p) => ({
                "@type": "MenuItem",
                "name": `${p.style_name || "Altbier"} ${fmtSizeDe(p.size)}`,
                "offers": {
                  "@type": "Offer",
                  "price": Number(p.price).toFixed(2),
                  "priceCurrency": "EUR",
                },
              })),
            },
          },
        } : {}),
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Altbieratlas", "item": "https://altbieratlas.de/" },
          ...(cityUrl ? [{ "@type": "ListItem", "position": 2, "name": `Altbier in ${row.city}`, "item": cityUrl }] : []),
          { "@type": "ListItem", "position": cityUrl ? 3 : 2, "name": row.name, "item": pageUrl },
        ],
      },
    ],
  });

  // ---- Server-gerenderter Seiteninhalt -------------------------------
  // Crawler (und Besucher ohne JS) sehen damit echten Text statt „Lade…".
  // Das Client-Script ersetzt den Block anschließend durch die interaktive
  // Fassung mit identischem Inhalt.
  const initials = (str) => {
    const words = (String(str || "").match(/\p{L}+/gu)) || [];
    if (!words.length) return "?";
    return (words.length >= 2 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
  };
  // Logo → Avatar, Foto → eigenes Bild im „Über"-Block (Foto ist kein Logo)
  const logoUrl  = row.logo_key  ? `/logos/orte/${row.logo_key}` : null;
  const photoUrl = row.photo_key ? `/photos/${row.photo_key}` : null;

  const bodyHtml = `
    <section class="brewery-hero">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Karte</a><span>›</span>
          ${cityUrl ? `<a href="/stadt/${escHtml(slug)}">${escHtml(row.city)}</a>` : `<span>${escHtml(row.city)}</span>`}
          <span>›</span> <span>${escHtml(row.name)}</span>
        </nav>
        <div class="brewery-head">
          <div class="ort-photo-wrap">
            <div class="ort-avatar${logoUrl ? " has-logo" : ""}">${
              logoUrl
                ? `<img src="${escHtml(logoUrl)}" alt="Logo ${escHtml(row.name)}" width="96" height="96" loading="eager" decoding="async">`
                : `<span class="initials">${escHtml(initials(row.short_name || row.name))}</span>`
            }</div>
            <div class="ort-title-wrap">
              <h1 class="brewery-title">${escHtml(row.name)}</h1>
              <div class="brewery-meta">
                <span>${escHtml(row.type_label || row.type)}</span>
                ${!row.is_historical && isHighlighted(row) ? `<span class="tag" style="color:#a0702c;border-color:#d9a35b;font-size:11px">Partner</span>` : ""}
                <span class="dot"></span>
                <span>${escHtml(row.city)}${row.country && row.country !== "DE" ? " · " + escHtml(row.country) : ""}</span>
                ${row.founded ? `<span class="dot"></span><span>seit ${escHtml(row.founded)}</span>` : ""}
                ${row.website ? `<span class="dot"></span><a href="${escHtml(row.website)}" target="_blank" rel="noopener">Website →</a>` : ""}
              </div>
            </div>
          </div>
          ${hero ? `
            <div class="price-hero">
              <div class="label">Aktuell ${escHtml(fmtSizeDe(hero.size))}</div>
              <div class="big">€ ${escHtml(fmtPriceDe(hero.price))}</div>
              <div class="small">gemeldet ${escHtml(fmtDateDe(hero.date))}</div>
            </div>` : ""}
        </div>
      </div>
    </section>

    <section class="container grid-2col">
      <div class="about card">
        ${photoUrl ? `<img class="ort-photo" src="${escHtml(photoUrl)}" alt="${escHtml(row.name)}" loading="lazy" decoding="async">` : ""}
        <h2>Über ${escHtml(row.name)}</h2>
        <p>${escHtml(row.description_de || row.description_en || `${row.name} ist als ${row.type_label || row.type} in ${row.city} im Altbieratlas verzeichnet.`)}</p>
        ${row.address ? `<p style="font-family:var(--font-mono);font-size:13px;color:var(--ink-muted)">${escHtml(row.address)}</p>` : ""}
        ${shownHours ? `
        <div class="ort-hours">
          <h3>Öffnungszeiten</h3>
          <table>${hoursLinesDe(shownHours).map(([d, v]) => `<tr><th>${d}</th><td>${escHtml(v)}</td></tr>`).join("")}</table>
          ${ownHours && row.opening_hours_note_de ? `<p>${escHtml(row.opening_hours_note_de)}</p>` : ""}
          <p class="hours-src">${ownHours
            ? (row.opening_hours_checked ? `Stand ${escHtml(fmtDateDe(row.opening_hours_checked))}` : "")
            : "laut Google"}</p>
        </div>` : ""}
      </div>
      <div><div class="detail-map" id="detail-map"></div></div>
    </section>

    ${styles.length ? `
    <section class="container" style="padding-bottom:40px">
      <h2>Altbier-Sorten</h2>
      <ul>
        ${styles.map((s) => `<li><strong>${escHtml(s.name)}</strong>${
          s.abv != null ? ` — ${escHtml(String(s.abv).replace(".", ","))} % vol` : ""
        }${s.tasting_de ? `: ${escHtml(s.tasting_de)}` : ""}</li>`).join("")}
      </ul>
    </section>` : ""}

    <section class="container price-history">
      <h2>Altbier-Preise bei ${escHtml(row.name)}</h2>
      ${latestBySize.length ? `
      <table class="ssr-price-table">
        <thead><tr><th>Größe</th><th>Preis</th><th>gemeldet am</th></tr></thead>
        <tbody>
          ${latestBySize.map((p) => `<tr><td>${escHtml(fmtSizeDe(p.size))}${p.style_name ? ` · ${escHtml(p.style_name)}` : ""}</td><td>€ ${escHtml(fmtPriceDe(p.price))}</td><td>${escHtml(fmtDateDe(p.date))}</td></tr>`).join("")}
        </tbody>
      </table>` : `<p>Für ${escHtml(row.name)} liegt noch keine Preismeldung vor.</p>`}
      <p><a class="btn btn-primary" href="/beitragen?typ=preis&brauerei=${escHtml(encodeURIComponent(row.id))}">Preis melden</a></p>
    </section>`;

  let html = await assetRes.text();

  // Hinweis: überall Funktions-Replacements, damit "$" in Daten nicht als
  // Ersetzungsmuster interpretiert wird.
  html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escHtml(title)}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, (m, a, b) => `${a}${escHtml(metaDesc)}${b}`);

  // canonical + OG/Twitter über die id-Attribute in ort.html adressieren
  const swap = (attr, idAttr, value) => {
    const re = new RegExp(`(<[^>]*${attr}=")[^"]*(" id="${idAttr}")`);
    html = html.replace(re, (m, a, b) => `${a}${escHtml(value)}${b}`);
  };
  swap("href", "meta-canonical", pageUrl);
  swap("content", "meta-og-title", title);
  swap("content", "meta-og-desc", metaDesc);
  swap("content", "meta-og-url", pageUrl);
  swap("content", "meta-tw-title", title);
  swap("content", "meta-tw-desc", metaDesc);
  swap("content", "meta-og-img-alt", `${row.name} — Altbieratlas`);
  html = html.replace(/(<meta property="og:image" content=")[^"]*(")/, (m, a, b) => `${a}${escHtml(ogImageUrl)}${b}`);
  html = html.replace(/(<meta name="twitter:image" content=")[^"]*(")/, (m, a, b) => `${a}${escHtml(ogImageUrl)}${b}`);

  // Inhalt in <main id="brewery-root"> rendern
  html = html.replace(
    /<main id="brewery-root"[^>]*>[\s\S]*?<\/main>/,
    () => `<main id="brewery-root" data-ssr="1">${bodyHtml}</main>`,
  );

  // JSON-LD + hreflang-Alternates vor </head> einfügen
  const hreflang =
    `<link rel="alternate" hreflang="de" href="${escHtml(pageUrl)}" />\n` +
    `<link rel="alternate" hreflang="en" href="${escHtml(pageUrl + "?lang=en")}" />\n` +
    `<link rel="alternate" hreflang="x-default" href="${escHtml(pageUrl)}" />\n`;
  html = html.replace(
    "</head>",
    `${hreflang}<script type="application/ld+json">${ld}</script>\n</head>`,
  );

  const headers = new Headers(assetRes.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=300, stale-while-revalidate=3600");

  return new Response(html, { status: 200, headers });
}
export function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// GET /api/og/ort?id=<brewery_id>
// Liefert ein dynamisch generiertes 1200×630-PNG als og:image
export async function serveOgBrewery(req, env) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return new Response("missing id", { status: 400 });

  // Aus D1 holen
  let row;
  try {
    row = await env.DB.prepare(
      "SELECT id, name, city, type FROM breweries WHERE id = ? AND status = 'approved'"
    ).bind(id).first();
  } catch { /* DB-Fehler → 404 */ }

  if (!row) return new Response("not found", { status: 404 });

  // Preise: Durchschnitt je Größe. Über die normalisierte Größe gruppieren —
  // sonst erscheinen "0.25" und "0.25l" als zwei getrennte Zeilen im Bild.
  let prices = [];
  try {
    const res = await env.DB.prepare(
      `SELECT ${sizeNumSql()} AS size, AVG(price) AS avg_price, COUNT(*) AS n
       FROM prices WHERE brewery_id = ? AND status = 'approved'
       GROUP BY ${sizeNumSql()} ORDER BY n DESC, size ASC LIMIT 5`
    ).bind(id).all();
    prices = res.results || [];
  } catch { /* ignorieren — Bild wird ohne Preis gerendert */ }

  let png;
  try {
    png = await generateOgImage({
      name:   row.name,
      city:   row.city,
      type:   row.type,
      prices,
    });
  } catch (e) {
    console.error("[og] generateOgImage failed:", e?.message);
    // Fallback: statisches Bild weiterleiten
    return Response.redirect(
      new URL("/og-image.png", url.origin).toString(), 302
    );
  }

  return new Response(png, {
    status: 200,
    headers: {
      "content-type":  "image/png",
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      "x-og-brewery":  row.id,
    },
  });
}

// "2026-10-20" → "20.10.2026"; mit Enddatum "20.–22.08.2027" bzw. "30.07.–02.08.2027".
export function fmtEventRangeDe(start, end) {
  const a = fmtDateDe(start);
  if (!end || String(end).slice(0, 10) === String(start).slice(0, 10)) return a;
  const b = fmtDateDe(end);
  const [ad, am, ay] = a.split(".");
  const [, bm, by] = b.split(".");
  if (ay !== by) return `${a}–${b}`;
  if (am !== bm) return `${ad}.${am}.–${b}`;
  return `${ad}.–${b}`;
}

export async function serveEvent(req, env) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    const assetUrl = new URL(req.url);
    assetUrl.pathname = "/event.html";
    return env.ASSETS.fetch(new Request(assetUrl.toString(), req));
  }

  let row;
  try {
    row = await env.DB.prepare(
      `SELECT e.id, e.title_de, e.title_en, e.date, e.time, e.end_date, e.end_time,
              e.location, e.url, e.description_de, e.description_en,
              b.id AS brewery_id, b.name AS brewery_name, b.city AS brewery_city,
              b.address AS brewery_address, b.country AS brewery_country
       FROM events e LEFT JOIN breweries b ON b.id = e.brewery_id
       WHERE e.id = ? AND e.status = 'approved'`
    ).bind(id).first();
  } catch { /* D1 nicht verfügbar */ }

  if (!row) {
    const assetUrl = new URL(req.url);
    assetUrl.pathname = "/event.html";
    return env.ASSETS.fetch(new Request(assetUrl.toString(), req));
  }

  const assetUrl = new URL(req.url);
  assetUrl.pathname = "/event.html";
  const assetRes = await env.ASSETS.fetch(new Request(assetUrl.toString(), req));
  if (!assetRes.ok) return assetRes;

  const pageUrl = `https://altbieratlas.de/event?id=${row.id}`;
  const titleDe = row.title_de || row.title_en || "Event";
  // Termin (mit Jahr) und Ort in den Titel: gesucht wird "bierbörse benrath 2026"
  // oder "latzenbier termine 2026", nicht nur der Eventname.
  const where = !row.brewery_id && row.location
      && !titleDe.toLowerCase().includes(row.location.toLowerCase())
    ? ` ${row.location}` : "";
  const when = fmtEventRangeDe(row.date, row.end_date);
  const title = fitTitle(
    `${titleDe}${where}${when ? ` – Termin ${when}` : ""} · Altbieratlas`,
    `${titleDe}${where}${when ? ` – Termin ${when}` : ""}`,
    `${titleDe}${when ? ` – ${when}` : ""}`);
  const rawDesc = row.description_de || row.description_en || "";
  const metaDesc = rawDesc
    ? (rawDesc.length > 155 ? rawDesc.slice(0, 155).replace(/\s+\S*$/, "") + "…" : rawDesc)
    : `${titleDe} — Altbier-Event im Altbieratlas.`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": titleDe,
    "url": pageUrl,
    "image": "https://altbieratlas.de/og-image.png",
    "startDate": row.date + (row.time ? ("T" + row.time) : ""),
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "description": metaDesc,
    "organizer": { "@type": "Organization", "name": "Altbieratlas", "url": "https://altbieratlas.de/" },
  };
  if (row.end_date) ld.endDate = row.end_date + (row.end_time ? ("T" + row.end_time) : "");
  const locName = row.brewery_name
    ? row.brewery_name + (row.brewery_city ? ", " + row.brewery_city : "")
    : row.location;
  if (locName) {
    // Google verlangt für Event-Rich-Results eine Adresse am Veranstaltungsort.
    ld.location = {
      "@type": "Place",
      "name": locName,
      ...(row.brewery_id ? { "url": `https://altbieratlas.de/ort/${encodeURIComponent(row.brewery_id)}` } : {}),
      "address": row.brewery_city
        ? {
            "@type": "PostalAddress",
            ...(row.brewery_address ? { "streetAddress": row.brewery_address } : {}),
            "addressLocality": row.brewery_city,
            "addressCountry": row.brewery_country || "DE",
          }
        : locName,
    };
  }

  let html = await assetRes.text();

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escHtml(title)}</title>`);
  html = html.replace(
    /(<meta name="description" content=")[^"]*(")/,
    `$1${escHtml(metaDesc)}$2`,
  );
  html = html.replace(
    /(<link rel="canonical" href=")[^"]*(" id="meta-canonical")/,
    `$1${escHtml(pageUrl)}$2`,
  );
  html = html.replace(
    /(<meta property="og:title" content=")[^"]*(" id="meta-og-title")/,
    `$1${escHtml(title)}$2`,
  );
  html = html.replace(
    /(<meta property="og:description" content=")[^"]*(" id="meta-og-desc")/,
    `$1${escHtml(metaDesc)}$2`,
  );
  html = html.replace(
    /(<meta property="og:url" content=")[^"]*(" id="meta-og-url")/,
    `$1${escHtml(pageUrl)}$2`,
  );
  html = html.replace(
    /(<meta name="twitter:title" content=")[^"]*(" id="meta-tw-title")/,
    `$1${escHtml(title)}$2`,
  );
  html = html.replace(
    /(<meta name="twitter:description" content=")[^"]*(" id="meta-tw-desc")/,
    `$1${escHtml(metaDesc)}$2`,
  );
  const hreflang =
    `<link rel="alternate" hreflang="de" href="${escHtml(pageUrl)}" />\n` +
    `<link rel="alternate" hreflang="en" href="${escHtml(pageUrl + "&lang=en")}" />\n` +
    `<link rel="alternate" hreflang="x-default" href="${escHtml(pageUrl)}" />\n`;
  html = html.replace(
    "</head>",
    `${hreflang}<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`,
  );

  const headers = new Headers(assetRes.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=300, stale-while-revalidate=3600");

  return new Response(html, { status: 200, headers });
}

// ============================================================
//  STADT-LANDINGPAGES (SSR)
// ============================================================
// GET /stadt/<slug> — Pilot: nur Düsseldorf.
// Whitelist hier erweitern, um weitere Städte freizuschalten.
// ---------- Stadt-Landingpages ----------
// Städte bekommen ihre Slugs aus der Datenbank, damit jede Stadt mit einem
// freigegebenen Ort automatisch eine eigene, indexierbare Seite hat.
export function citySlug(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Slug → { city, total, current } für alle Städte mit freigegebenen Orten.
export async function cityIndex(env) {
  const out = {};
  try {
    const res = await env.DB.prepare(
      `SELECT city, COUNT(*) AS total,
              SUM(CASE WHEN is_historical = 0 THEN 1 ELSE 0 END) AS current
       FROM breweries WHERE status = 'approved' AND verified = 1
       GROUP BY city ORDER BY current DESC, total DESC, city ASC`
    ).all();
    for (const r of res.results || []) {
      const slug = citySlug(r.city);
      if (slug) out[slug] = { city: r.city, total: r.total, current: r.current };
    }
  } catch { /* keine DB → keine Stadt-Seiten */ }
  return out;
}

export async function serveCity(req, env) {
  const url = new URL(req.url);
  const slug = (url.pathname.split("/")[2] || "").toLowerCase();
  const index = await cityIndex(env);
  const entry = index[slug];
  if (!entry) {
    // Leerer Index = D1 nicht erreichbar. Dann die statische Seite ausliefern
    // und clientseitig rendern lassen, statt eine existierende Stadt zu 404en.
    if (Object.keys(index).length === 0) {
      const assetUrl = new URL(req.url);
      assetUrl.pathname = "/stadt.html";
      return env.ASSETS.fetch(new Request(assetUrl.toString(), req));
    }
    return new Response("Not found", { status: 404 });
  }
  const city = entry.city;

  let rows = [];
  let priceRows = [];
  try {
    const [bRes, pRes] = await Promise.all([
      env.DB.prepare(
        "SELECT id, name, type, is_historical, highlighted, highlighted_until FROM breweries WHERE status = 'approved' AND verified = 1 AND LOWER(city) = LOWER(?) ORDER BY is_historical ASC, name ASC"
      ).bind(city).all(),
      // Alle Meldungen der Orte dieser Stadt, neueste zuerst
      env.DB.prepare(
        `SELECT p.brewery_id, p.price, p.date, p.size
         FROM prices p JOIN breweries b ON b.id = p.brewery_id
         WHERE p.status = 'approved' AND b.status = 'approved' AND b.verified = 1 AND LOWER(b.city) = LOWER(?)
         ORDER BY p.date DESC`
      ).bind(city).all(),
    ]);
    rows = bRes.results || [];
    priceRows = pRes.results || [];
  } catch { /* D1 nicht verfügbar — statische Datei mit Client-Rendering ausliefern */ }

  // Karte: jüngster Preis der kleinsten gemeldeten Größe (nicht jeder Ort hat 0,25 l).
  // Durchschnitt: nur 0,25 l, nur aktuelle Orte mit Ausschank, damit er vergleichbar bleibt.
  const averaged = new Set(rows.filter((r) => !r.is_historical && inComparisons(r)).map((r) => r.id));
  const priceByBrewery = new Map();
  const quarterByBrewery = new Map();
  for (const p of priceRows) {
    const n = sizeNum(p.size);
    if (n == null) continue;
    const prev = priceByBrewery.get(p.brewery_id);
    if (!prev || n < sizeNum(prev.size) - 0.001) priceByBrewery.set(p.brewery_id, p);
    if (Math.abs(n - 0.25) < 0.001 && averaged.has(p.brewery_id) && !quarterByBrewery.has(p.brewery_id)) {
      quarterByBrewery.set(p.brewery_id, p);
    }
  }
  const priceVals = [...quarterByBrewery.values()].map((p) => Number(p.price));
  const avgPrice = priceVals.length
    ? priceVals.reduce((a, b) => a + b, 0) / priceVals.length
    : null;

  const assetUrl = new URL(req.url);
  assetUrl.pathname = "/stadt.html";
  const assetRes = await env.ASSETS.fetch(new Request(assetUrl.toString(), req));
  if (!assetRes.ok) return assetRes;

  const pageUrl = `https://altbieratlas.de/stadt/${slug}`;
  const current = rows.filter((r) => !r.is_historical);
  const historical = rows.filter((r) => r.is_historical);
  const title = fitTitle(`Altbier in ${city}: Brauereien, Kneipen & Preise`,
    `Altbier in ${city}: Kneipen & Preise`, `Altbier in ${city}`);
  // Als Frage formuliert: "was kostet ein altbier in düsseldorf" ist laut
  // Bing/Search Console eine der häufigsten Suchen ohne passende Seite.
  const metaDesc = avgPrice
    ? `Was kostet ein Altbier in ${city}? 0,25 l im Schnitt ${fmtPriceDe(avgPrice)} € (${priceVals.length} Orte). Alle ${current.length} Brauereien, Kneipen und Händler mit aktuellen Preisen.`
    : `Altbier in ${city}: ${rows.length} Brauereien, Ausschankorte und Händler mit aktuellen Preisen im Altbieratlas.`;

  const TYPE_DE = {
    brewpub: "Brauereien & Ausschank", brewery: "Brauereien & Ausschank", taproom: "Brauereien & Ausschank",
    pub: "Gastronomie", restaurant: "Gastronomie", gastronomie: "Gastronomie",
    kiosk: "Handel", supermarket: "Handel", beverage_store: "Handel", handel: "Handel",
  };
  const cardHtml = (r) => {
    const p = priceByBrewery.get(r.id);
    const hl = !r.is_historical && isHighlighted(r);
    return `<a class="city-card${r.is_historical ? " historical" : ""}${hl ? " highlighted" : ""}" href="/ort/${escHtml(encodeURIComponent(r.id))}">` +
      (hl ? `<span class="cc-partner">Partner</span>` : "") +
      `<span class="cc-name">${escHtml(r.name)}</span>` +
      `<span class="cc-type">${escHtml(TYPE_DE[r.type] || r.type || "")}</span>` +
      (p ? `<span class="cc-price">€ ${escHtml(fmtPriceDe(p.price))} <span style="opacity:.55;font-size:11px">/ ${escHtml(fmtSizeDe(p.size))}</span></span>` : "") +
      `</a>`;
  };
  // Hervorgehobene (gekennzeichnete) Partner zuerst, sonst alphabetisch wie gehabt
  const venuesHtml = current.length
    ? [...current].sort((a, b) => isHighlighted(b) - isHighlighted(a)).map(cardHtml).join("")
    : `<p class="city-empty">Noch keine aktiven Orte in ${escHtml(city)} im Atlas. <a href="/beitragen?typ=ort">Ort eintragen →</a></p>`;
  const historicalHtml = historical.map(cardHtml).join("");

  // Querverlinkung: ohne interne Links bleiben Stadtseiten verwaiste Seiten.
  const otherCities = Object.entries(index)
    .filter(([s]) => s !== slug)
    .map(([s, e]) => `<a href="/stadt/${escHtml(s)}">Altbier in ${escHtml(e.city)}</a>`)
    .join("");

  const lede = `Alle Brauereien, Ausschankorte und Händler mit Altbier in ${city}` +
    (avgPrice
      ? ` — im Schnitt kostet ein 0,25 l Alt hier ${fmtPriceDe(avgPrice)} €.`
      : ".") +
    ` Die Preise stammen aus Meldungen der Community und werden laufend aktualisiert.`;

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": pageUrl + "#page",
        "url": pageUrl,
        "name": `Altbier in ${city}`,
        "description": metaDesc,
        "inLanguage": "de",
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Altbieratlas", "item": "https://altbieratlas.de/" },
          { "@type": "ListItem", "position": 2, "name": "Städte", "item": "https://altbieratlas.de/staedte" },
          { "@type": "ListItem", "position": 3, "name": `Altbier in ${city}`, "item": pageUrl },
        ],
      },
      {
        "@type": "ItemList",
        "itemListElement": current.map((r, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": `https://altbieratlas.de/ort/${encodeURIComponent(r.id)}`,
          "name": r.name,
        })),
      },
    ],
  });

  let html = await assetRes.text();
  html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escHtml(title)}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, (m, a, b) => `${a}${escHtml(metaDesc)}${b}`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(" id="meta-canonical")/, (m, a, b) => `${a}${escHtml(pageUrl)}${b}`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(" id="meta-og-title")/, (m, a, b) => `${a}${escHtml(title)}${b}`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(" id="meta-og-desc")/, (m, a, b) => `${a}${escHtml(metaDesc)}${b}`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(" id="meta-og-url")/, (m, a, b) => `${a}${escHtml(pageUrl)}${b}`);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(" id="meta-tw-title")/, (m, a, b) => `${a}${escHtml(title)}${b}`);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(" id="meta-tw-desc")/, (m, a, b) => `${a}${escHtml(metaDesc)}${b}`);
  // H1, Lede und server-gerenderte Listen
  html = html.replace(/<h1 id="city-h1">[^<]*<\/h1>/, () => `<h1 id="city-h1">${escHtml("Altbier in " + city)}</h1>`);
  html = html.replace(/<p class="lede" id="city-lede"><\/p>/, () => `<p class="lede" id="city-lede">${escHtml(lede)}</p>`);
  html = html.replace(
    /<div class="city-grid" id="city-venues" data-ssr="0">[\s\S]*?<\/div>/,
    () => `<div class="city-grid" id="city-venues" data-ssr="1">${venuesHtml}</div>`,
  );
  if (historical.length) {
    html = html.replace(
      /<section class="city-section" id="city-historical-section" hidden>/,
      () => `<section class="city-section" id="city-historical-section">`,
    );
    html = html.replace(
      /<div class="city-grid" id="city-historical"><\/div>/,
      () => `<div class="city-grid" id="city-historical">${historicalHtml}</div>`,
    );
  }
  if (otherCities) {
    html = html.replace(
      /<div class="city-links" id="city-other"><\/div>/,
      () => `<div class="city-links" id="city-other">${otherCities}</div>`,
    );
  }
  // Stadtname für das Client-Script hinterlegen (kein hartkodierter Slug mehr)
  html = html.replace(
    /<body>/,
    () => `<body data-city="${escHtml(city)}" data-city-slug="${escHtml(slug)}">`,
  );

  const hreflang =
    `<link rel="alternate" hreflang="de" href="${escHtml(pageUrl)}" />\n` +
    `<link rel="alternate" hreflang="en" href="${escHtml(pageUrl + "?lang=en")}" />\n` +
    `<link rel="alternate" hreflang="x-default" href="${escHtml(pageUrl)}" />\n`;
  html = html.replace("</head>", `${hreflang}<script type="application/ld+json">${ld}</script>\n</head>`);

  const headers = new Headers(assetRes.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=300, stale-while-revalidate=3600");
  return new Response(html, { status: 200, headers });
}

// GET /staedte — Übersicht aller Städte mit eigener Landingpage (SSR-Liste)
export async function serveCities(req, env) {
  const index = await cityIndex(env);
  const assetUrl = new URL(req.url);
  assetUrl.pathname = "/staedte.html";
  const assetRes = await env.ASSETS.fetch(new Request(assetUrl.toString(), req));
  if (!assetRes.ok) return assetRes;

  const entries = Object.entries(index);
  let html = await assetRes.text();
  if (entries.length) {
    const cards = entries.map(([slug, e]) =>
      `<a class="city-card" href="/stadt/${escHtml(slug)}">` +
      `<span class="cc-name">${escHtml(e.city)}</span>` +
      `<span class="cc-type">${e.current === 0 ? "nur historisch" : e.current === 1 ? "1 Ort im Atlas" : `${escHtml(String(e.current))} Orte im Atlas`}</span></a>`
    ).join("");
    html = html.replace(
      /<div class="city-grid" id="cities-list" data-ssr="0">[\s\S]*?<\/div>/,
      () => `<div class="city-grid" id="cities-list" data-ssr="1">${cards}</div>`,
    );
  }
  const pageUrl = "https://altbieratlas.de/staedte";
  const withCurrent = entries.filter(([, e]) => e.current > 0);
  if (withCurrent.length) {
    const venueCount = withCurrent.reduce((n, [, e]) => n + e.current, 0);
    const desc = escHtml(`Altbier in ${withCurrent.length} Städten: ${venueCount} Brauereien, ` +
      "Ausschankorte und Händler im Altbieratlas, nach Stadt sortiert und mit aktuellen Preisen.");
    for (const re of [/(<meta name="description" content=")[^"]*(")/,
      /(<meta property="og:description" content=")[^"]*(")/,
      /(<meta name="twitter:description" content=")[^"]*(")/]) {
      html = html.replace(re, (m, a, b) => `${a}${desc}${b}`);
    }
  }
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Altbieratlas", "item": "https://altbieratlas.de/" },
          { "@type": "ListItem", "position": 2, "name": "Städte", "item": pageUrl },
        ],
      },
      {
        "@type": "ItemList",
        "itemListElement": entries.map(([slug, e], i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": `https://altbieratlas.de/stadt/${slug}`,
          "name": `Altbier in ${e.city}`,
        })),
      },
    ],
  });
  const hreflang =
    `<link rel="alternate" hreflang="de" href="${pageUrl}" />\n` +
    `<link rel="alternate" hreflang="en" href="${pageUrl}?lang=en" />\n` +
    `<link rel="alternate" hreflang="x-default" href="${pageUrl}" />\n`;
  html = html.replace("</head>", `${hreflang}<script type="application/ld+json">${ld}</script>\n</head>`);

  const headers = new Headers(assetRes.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=300, stale-while-revalidate=3600");
  return new Response(html, { status: 200, headers });
}

// GET /impressum.html
// Liefert die statische Seite, ergänzt um einen serverseitig eingebetteten
// <script>-Block mit den Impressum-Daten (Quelle: D1 site_settings).
export async function serveImpressum(req, env) {
  const assetRes = await env.ASSETS.fetch(req);
  if (!assetRes.ok) return assetRes;

  const v  = (x) => (x && String(x).trim().length > 0 ? String(x).trim() : "");

  // Impressum: einzige Quelle ist D1 (Admin-Panel).
  const impr = {};
  try {
    const rows = await env.DB.prepare(
      "SELECT key, value FROM site_settings WHERE key IN ('impressum.owner','impressum.address','impressum.email')"
    ).all();
    for (const r of rows.results) {
      const k = r.key.replace("impressum.", "");
      try { impr[k] = JSON.parse(r.value); } catch { impr[k] = r.value; }
    }
  } catch { /* Tabelle fehlt bei alten Instanzen — ignorieren */ }

  const emailVal = v(impr.email);
  const parts = [];
  if (v(impr.owner))   parts.push(`i.owner=${JSON.stringify(v(impr.owner))};`);
  if (v(impr.address)) parts.push(`i.address=${JSON.stringify(v(impr.address))};`);
  if (emailVal)        parts.push(`i.email=${JSON.stringify(emailVal)};`);

  const html = await assetRes.text();
  const patched = parts.length
    ? html.replace(
        '<script src="config.js"></script>',
        `<script src="config.js"></script>\n` +
          `<script>(function(){var i=window.ATLAS_CONFIG.impressum=window.ATLAS_CONFIG.impressum||{};` +
          parts.join("") +
          `}());</script>`,
      )
    : html;

  const headers = new Headers(assetRes.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");

  return new Response(patched, { status: 200, headers });
}
