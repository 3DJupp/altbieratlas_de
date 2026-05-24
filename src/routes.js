// ============================================================
// Altbieratlas — Routen (öffentliche & Admin-API)
// ============================================================
import { generateOgImage } from "./og.js";
import {
  APP_VERSION,
  json, error, parseCookies, setCookieHeader,
  hashPassword, verifyPassword, uuid, randomToken,
  verifyTurnstile, rateLimit, str, num, oneOf,
  clientIp, brewRow, sendConfirmationEmail, sendPasswordResetEmail,
} from "./utils.js";

// Liest SITE_CONFIG JSON (falls gesetzt), fällt sonst auf {} zurück
function siteConfig(env) {
  try { return env.SITE_CONFIG ? JSON.parse(env.SITE_CONFIG) : {}; } catch { return {}; }
}
// Nominatim-User-Agent-E-Mail aus SITE_CONFIG.contactEmail
function contactEmail(env) {
  return siteConfig(env).contactEmail || "";
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
// Primärquelle: SITE_CONFIG (JSON-String). Fallback: Einzelvariablen (Legacy).
export async function getPublicConfig(req, env) {
  const v = (x) => (x && String(x).trim().length > 0 ? String(x).trim() : null);

  const sc = siteConfig(env);

  const siteKey = v(sc.turnstileSiteKey);
  const ga      = v(sc.ga4MeasurementId);

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

  const scAuthor = sc.author || {};
  const author = {
    name:      v(dbSettings["author.name"]      ?? scAuthor.name),
    github:    v(dbSettings["author.github"]    ?? scAuthor.github),
    linkedin:  v(dbSettings["author.linkedin"]  ?? scAuthor.linkedin),
    website:   v(dbSettings["author.website"]   ?? scAuthor.website),
    instagram: v(dbSettings["author.instagram"] ?? scAuthor.instagram),
    mastodon:  v(dbSettings["author.mastodon"]  ?? scAuthor.mastodon),
    kofi:      v(dbSettings["author.kofi"]      ?? scAuthor.kofi),
  };

  const banner = (dbSettings["banner.text_de"] || dbSettings["banner.text_en"])
    ? {
        text_de:  dbSettings["banner.text_de"]  || null,
        text_en:  dbSettings["banner.text_en"]  || null,
        enabled:  dbSettings["banner.enabled"] === "true",
      }
    : (sc.banner || null);

  return json({
    version: APP_VERSION,
    priceSizes,
    highlightedSizes,
    turnstileSiteKey: siteKey,
    turnstileEnabled: !!siteKey && !siteKey.includes("PLACEHOLDER"),
    ga4MeasurementId: ga && ga !== "G-XXXXXXXXXX" ? ga : null,
    author,
    banner,
    requireModeration: sc.requireModeration !== false,
  });
}

// GET /api/stats
export async function getStats(req, env) {
  const [brewCount, priceCount, avgRow] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM breweries WHERE status = 'approved'").first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM prices WHERE status = 'approved'").first(),
    env.DB.prepare("SELECT AVG(price) AS avg FROM prices WHERE status = 'approved' AND size = '0.25l'").first(),
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
  return json({
    breweries: breweriesRes.results.map((r) => brewRow(r, stylesByBrewery[r.id] || [])),
  });
}

// GET /api/breweries/:id
export async function getBrewery(req, env, { id }) {
  const row = await env.DB.prepare(
    "SELECT * FROM breweries WHERE id = ? AND status = 'approved'"
  ).bind(id).first();
  if (!row) return error(404, "not-found");
  const styles = await env.DB.prepare(
    "SELECT style_id FROM brewery_styles WHERE brewery_id = ?"
  ).bind(id).all();
  const prices = await env.DB.prepare(
    "SELECT date, size, price, source, notes FROM prices WHERE brewery_id = ? AND status = 'approved' ORDER BY date DESC"
  ).bind(id).all();
  return json({
    brewery: brewRow(row, styles.results.map((s) => s.style_id)),
    prices: prices.results.map((p) => ({
      breweryId: id, date: p.date, size: p.size, price: p.price, source: p.source, notes: p.notes,
    })),
  });
}

// GET /api/styles
export async function listStyles(req, env) {
  const res = await env.DB.prepare(
    `SELECT s.*, b.name AS primary_brewery_name
     FROM styles s
     LEFT JOIN breweries b ON b.id = s.primary_brewery_id AND b.status = 'approved'
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
export async function listPrices(req, env) {
  const res = await env.DB.prepare(
    "SELECT brewery_id, date, size, price, source FROM prices WHERE status = 'approved' ORDER BY date DESC LIMIT 2000"
  ).all();
  return json({
    prices: res.results.map((r) => ({
      breweryId: r.brewery_id, date: r.date, size: r.size, price: r.price, source: r.source,
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
     WHERE e.status = 'approved' AND e.date >= date('now')
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
     WHERE e.status = 'approved' AND e.date >= date('now', '-7 days')
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

// POST /api/contributions
// Body: { type, data, email?, turnstileToken? }
export async function postContribution(req, env, _params, ctx) {
  let body;
  try { body = await req.json(); }
  catch { return error(400, "invalid-json"); }

  // Turnstile (wenn konfiguriert)
  const tsResult = await verifyTurnstile(
    body.turnstileToken, env.TURNSTILE_SECRET_KEY, clientIp(req)
  );
  if (!tsResult.success) return error(403, "turnstile-failed", { reason: tsResult });

  // Rate-Limit: 20 Einreichungen pro IP pro Stunde
  const ip = clientIp(req);
  const hour = new Date().toISOString().slice(0, 13);
  const rl = await rateLimit(env.DB, `contrib:${ip}:${hour}`, 20, 3600);
  if (!rl.allowed) return error(429, "too-many-submissions");

  // Validierung
  const lang = body.lang === "en" ? "en" : "de";

  let type, data, email;
  try {
    type = oneOf(body.type, ["price", "brewery", "style", "correction", "event"], { required: true, name: "type" });
    email = str(body.email, { max: 200, name: "email" });
    if (!body.data || typeof body.data !== "object") throw new Error("data: required");
    data = body.data;

    // Typ-spezifische Mindestvalidierung
    if (type === "price") {
      str(data.breweryId, { required: true, max: 80, name: "breweryId" });
      num(data.price, { min: 0, max: 100, required: true, name: "price" });
      str(data.size, { required: true, max: 20, name: "size" });
      str(data.date, { required: true, max: 20, name: "date" });
    } else if (type === "brewery") {
      str(data.name, { required: true, max: 200, name: "name" });
      str(data.city, { required: true, max: 200, name: "city" });
      oneOf(data.type, ["brewery", "brewpub", "pub", "restaurant", "kiosk", "supermarket", "beverage_store"], { required: true, name: "type" });
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
    }
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }

  // Brauerei-Name für Anzeige in E-Mails nachschlagen (für alle Typen mit breweryId)
  if (data.breweryId && ["price", "style", "correction", "event"].includes(type)) {
    try {
      const bRow = await env.DB.prepare("SELECT name, city FROM breweries WHERE id = ? LIMIT 1")
        .bind(data.breweryId).first();
      if (bRow) data._breweryName = `${bRow.name} · ${bRow.city}`;
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

  const id = uuid();
  await env.DB.prepare(
    "INSERT INTO contributions (id, type, payload, submitter_email, submitter_ip, status) VALUES (?, ?, ?, ?, ?, 'pending')"
  ).bind(id, type, JSON.stringify(data), email, ip).run();

  // Bestätigungsmail wenn E-Mail angegeben — via waitUntil, damit CF den Fetch nicht abbricht
  if (email) {
    const mailPromise = sendConfirmationEmail(env, { to: email, type, id, data, ip, lang, submittedAt: new Date().toISOString() });
    if (ctx?.waitUntil) ctx.waitUntil(mailPromise);
  }

  return json({ ok: true, id, status: "pending" }, { status: 201 });
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
  const loginSc = siteConfig(env);
  const tsSiteKey = loginSc.turnstileSiteKey;
  const tsActive = tsSiteKey && !String(tsSiteKey).includes("PLACEHOLDER");
  const ts = await verifyTurnstile(body.turnstileToken, tsActive ? env.TURNSTILE_SECRET_KEY : null, ip);
  if (!ts.success) return error(403, "turnstile-failed");

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

    const sc = (() => { try { return env.SITE_CONFIG ? JSON.parse(env.SITE_CONFIG) : {}; } catch { return {}; } })();
    const siteUrl = sc.siteUrl || env.SITE_URL || "https://altbieratlas.de";
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

  // Apply-Logik je Typ
  try {
    if (c.type === "price") {
      await env.DB.prepare(
        "INSERT INTO prices (brewery_id, date, size, price, source, notes, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')"
      ).bind(
        payload.breweryId,
        payload.date,
        payload.size,
        parseFloat(payload.price),
        payload.source || "Beitrag",
        payload.notes || null,
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

    return json({ ok: true });
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

  const fields = [];
  const values = [];
  const allow = {
    name: "name", short: "short_name", type: "type", city: "city", country: "country",
    address: "address", maps_url: "maps_url", lat: "lat", lng: "lng", founded: "founded",
    website: "website", description_de: "description_de", description_en: "description_en",
    verified: "verified", status: "status",
  };
  for (const [k, col] of Object.entries(allow)) {
    if (k in body) {
      fields.push(`${col} = ?`);
      values.push(body[k]);
    }
  }
  if (!fields.length && !("styles" in body) && !newId) return error(400, "no-fields");

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
  const r2Key = `photos/${filename}`;

  if (brewery.photo_key && brewery.photo_key !== filename) {
    await env.LOGOS.delete(`photos/${brewery.photo_key}`).catch(() => {});
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
    await env.LOGOS.delete(`photos/${brewery.photo_key}`).catch(() => {});
  }
  await env.DB.prepare("UPDATE breweries SET photo_key = NULL, updated_at = datetime('now') WHERE id = ?").bind(id).run();
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

// GET /api/admin/prices
export async function adminListPrices(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare(
    `SELECT p.id, p.brewery_id, b.name AS brewery_name, p.date, p.size, p.price, p.source, p.notes, p.status, p.created_at
     FROM prices p LEFT JOIN breweries b ON b.id = p.brewery_id
     ORDER BY p.date DESC, p.created_at DESC LIMIT 500`
  ).all();
  return json({
    prices: res.results.map((r) => ({
      id: r.id, breweryId: r.brewery_id, breweryName: r.brewery_name,
      date: r.date, size: r.size, price: r.price,
      source: r.source, notes: r.notes, status: r.status, createdAt: r.created_at,
    })),
  });
}

// POST /api/admin/prices  { breweryId, date, size, price, source?, notes? }
export async function adminAddPrice(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  let breweryId, date, size, priceVal, source, notes;
  try {
    breweryId = str(body.breweryId, { required: true, max: 80, name: "breweryId" });
    date      = str(body.date,      { required: true, max: 20, name: "date" });
    size      = str(body.size,      { required: true, max: 20, name: "size" });
    priceVal  = num(body.price,     { min: 0, max: 100, required: true, name: "price" });
    source    = str(body.source,    { max: 100, name: "source" });
    notes     = str(body.notes,     { max: 1000, name: "notes" });
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }

  const brewery = await env.DB.prepare("SELECT id FROM breweries WHERE id = ?").bind(breweryId).first();
  if (!brewery) return error(404, "brewery-not-found");

  await env.DB.prepare(
    "INSERT INTO prices (brewery_id, date, size, price, source, notes, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')"
  ).bind(breweryId, date, size, priceVal, source, notes).run();

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
    `SELECT s.*, b.name AS primary_brewery_name
     FROM styles s
     LEFT JOIN breweries b ON b.id = s.primary_brewery_id
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

  if (doRename) {
    const stmts = [];
    if (fields.length) {
      // Apply field updates to old row first, then rename via INSERT+DELETE
      stmts.push(env.DB.prepare(`UPDATE styles SET ${fields.join(", ")} WHERE id = ?`).bind(...values, id));
    }
    stmts.push(
      env.DB.prepare("INSERT INTO styles (id,name,abv,ibu,color,tasting_de,tasting_en,logo_key,primary_brewery_id) SELECT ?,name,abv,ibu,color,tasting_de,tasting_en,logo_key,primary_brewery_id FROM styles WHERE id=?").bind(newId, id),
      env.DB.prepare("UPDATE brewery_styles SET style_id=? WHERE style_id=?").bind(newId, id),
      env.DB.prepare("DELETE FROM styles WHERE id=?").bind(id),
    );
    await env.DB.batch(stmts);
    return json({ ok: true, newId });
  }

  if (!fields.length) return error(400, "no-fields");
  values.push(id);
  await env.DB.prepare(`UPDATE styles SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  return json({ ok: true });
}

// GET /api/admin/logos
export async function adminListLogos(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  if (!env.LOGOS) return json({ logos: [] });
  const listed = await env.LOGOS.list();
  const logos = listed.objects.map((obj) => ({ key: obj.key, url: `/logos/${obj.key}`, size: obj.size }));
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
  const key = `${id}.${ext}`;

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

  let id, name, shortName, type, city, country, address, mapsUrl, lat, lng, founded, website, descDe, descEn;
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
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return error(400, "invalid-id-format");
  const exists = await env.DB.prepare("SELECT id FROM breweries WHERE id = ?").bind(id).first();
  if (exists) return error(409, "id-already-exists");

  await env.DB.prepare(
    `INSERT INTO breweries
       (id, name, short_name, type, city, country, address, maps_url, lat, lng,
        founded, website, description_de, description_en, verified, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'approved')`
  ).bind(id, name, shortName || null, type, city, country, address || null, mapsUrl || null,
         lat, lng, founded, website || null, descDe || null, descEn || null).run();
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
  const sc = siteConfig(env);
  const clientId = sc.untappdClientId || env.UNTAPPD_CLIENT_ID;
  const clientSecret = env.UNTAPPD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return json({ available: false });

  // Cache prüfen (24h TTL)
  const cached = await env.DB.prepare(
    "SELECT data, cached_at FROM untappd_cache WHERE atlas_id = ?"
  ).bind(id).first();
  if (cached && (Date.now() - new Date(cached.cached_at).getTime()) < 86400000) {
    return json({ available: true, cached: true, ...JSON.parse(cached.data) });
  }

  // Brauereiname aus DB holen
  const brewery = await env.DB.prepare(
    "SELECT name FROM breweries WHERE id = ? AND status = 'approved'"
  ).bind(id).first();
  if (!brewery) return json({ available: false });

  try {
    const searchUrl = `https://api.untappd.com/v4/search/brewery`
      + `?q=${encodeURIComponent(brewery.name)}`
      + `&client_id=${clientId}&client_secret=${clientSecret}&limit=3`;
    const r = await fetch(searchUrl, {
      headers: { "User-Agent": "Altbieratlas/1.0" },
      cf: { cacheTtl: 3600 },
    });
    if (!r.ok) return json({ available: false });

    const d = await r.json();
    const items = (d.response?.brewery?.items) || [];
    let data;
    if (!items.length) {
      data = { found: false };
    } else {
      const b = items[0].brewery;
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
// GET /sitemap.xml — wird direkt vom Worker (nicht unter /api) serviert.
export async function sitemap(req, env) {
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
                              .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
                              .replace(/'/g, "&apos;");
  const staticPaths = ["/", "/ranglisten", "/wissen", "/beitragen"];
  let breweryIds = [];
  let eventIds = [];
  let lastMod = null;
  const today = new Date().toISOString().slice(0, 10);
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
    ...staticPaths.map((p) => `
  <url>
    <loc>${esc(base + p)}</loc>
    <lastmod>${lastMod ? lastMod.slice(0, 10) : today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p === "/" ? "1.0" : "0.7"}</priority>
  </url>`),
    ...breweryIds.map((b) => `
  <url>
    <loc>${esc(base + "/ort?id=" + b.id)}</loc>
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
    "author.instagram", "author.mastodon", "author.kofi",
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

// GET /impressum.html
// Liefert die statische Seite, ergänzt um ein serverseitig eingebettetes
// <script>-Block mit den Impressum-Daten. D1 hat Vorrang vor SITE_CONFIG.
// GET /ort?id=... — SSR: title + meta tags mit echten Brauerei-Daten befüllen,
// damit Google und andere Crawler den richtigen Seitentitel sehen (nicht "Ort"
// oder den rohen i18n-Key "title.location").
export async function serveOrt(req, env) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  // Ohne ID: statische Datei direkt ausliefern (kein SSR nötig)
  if (!id) {
    const assetUrl = new URL(req.url);
    assetUrl.pathname = "/ort.html";
    return env.ASSETS.fetch(new Request(assetUrl.toString(), req));
  }

  // Brauerei aus D1 laden
  let row;
  try {
    row = await env.DB.prepare(
      "SELECT id, name, city, country, type, description_de, description_en, lat, lng, address, website FROM breweries WHERE id = ? AND status = 'approved'"
    ).bind(id).first();
  } catch { /* D1 nicht verfügbar — Fallback auf statische Datei */ }

  // Brauerei nicht gefunden oder DB-Fehler: statische Datei ausliefern
  if (!row) {
    const assetUrl = new URL(req.url);
    assetUrl.pathname = "/ort.html";
    return env.ASSETS.fetch(new Request(assetUrl.toString(), req));
  }

  const assetUrl = new URL(req.url);
  assetUrl.pathname = "/ort.html";
  const assetRes = await env.ASSETS.fetch(new Request(assetUrl.toString(), req));
  if (!assetRes.ok) return assetRes;

  const pageUrl = `https://altbieratlas.de/ort?id=${row.id}`;
  const ogImageUrl = `https://altbieratlas.de/api/og/ort?id=${row.id}`;
  const title = `${row.name} · Altbieratlas`;
  const desc = (row.description_de || row.description_en || "")
    .slice(0, 155).replace(/\s+\S*$/, "").trim();
  const metaDesc = desc
    ? desc + "…"
    : `${row.name} — Altbier in ${row.city} im Altbieratlas.`;

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": row.name,
    "url": pageUrl,
    ...(row.address ? { "address": { "@type": "PostalAddress", "streetAddress": row.address, "addressLocality": row.city, "addressCountry": row.country || "DE" } } : {}),
    ...(row.lat && row.lng ? { "geo": { "@type": "GeoCoordinates", "latitude": row.lat, "longitude": row.lng } } : {}),
    ...(row.website ? { "sameAs": row.website } : {}),
  });

  let html = await assetRes.text();

  // <title>
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escHtml(title)}</title>`,
  );
  // meta description
  html = html.replace(
    /(<meta name="description" content=")[^"]*(")/,
    `$1${escHtml(metaDesc)}$2`,
  );
  // canonical
  html = html.replace(
    /(<link rel="canonical" href=")[^"]*(" id="meta-canonical")/,
    `$1${escHtml(pageUrl)}$2`,
  );
  // og:title
  html = html.replace(
    /(<meta property="og:title" content=")[^"]*(" id="meta-og-title")/,
    `$1${escHtml(title)}$2`,
  );
  // og:description
  html = html.replace(
    /(<meta property="og:description" content=")[^"]*(" id="meta-og-desc")/,
    `$1${escHtml(metaDesc)}$2`,
  );
  // og:url
  html = html.replace(
    /(<meta property="og:url" content=")[^"]*(" id="meta-og-url")/,
    `$1${escHtml(pageUrl)}$2`,
  );
  // twitter:title
  html = html.replace(
    /(<meta name="twitter:title" content=")[^"]*(" id="meta-tw-title")/,
    `$1${escHtml(title)}$2`,
  );
  // twitter:description
  html = html.replace(
    /(<meta name="twitter:description" content=")[^"]*(" id="meta-tw-desc")/,
    `$1${escHtml(metaDesc)}$2`,
  );
  // og:image + twitter:image dynamisch
  html = html.replace(
    /(<meta property="og:image" content=")[^"]*(")/,
    `$1${escHtml(ogImageUrl)}$2`,
  );
  html = html.replace(
    /(<meta name="twitter:image" content=")[^"]*(")/,
    `$1${escHtml(ogImageUrl)}$2`,
  );
  // JSON-LD vor </head> einfügen
  html = html.replace(
    "</head>",
    `<script type="application/ld+json">${ld}</script>\n</head>`,
  );

  const headers = new Headers(assetRes.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=300, stale-while-revalidate=3600");

  return new Response(html, { status: 200, headers });
}

function escHtml(s) {
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

  // Preise: Durchschnitt pro Größe, absteigend nach Anzahl der Einträge
  let prices = [];
  try {
    const res = await env.DB.prepare(
      `SELECT size, AVG(price) AS avg_price, COUNT(*) AS n
       FROM prices WHERE brewery_id = ? AND status = 'approved'
       GROUP BY size ORDER BY n DESC, size ASC LIMIT 5`
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
              b.name AS brewery_name, b.city AS brewery_city
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
  const title = `${titleDe} · Altbieratlas`;
  const rawDesc = row.description_de || row.description_en || "";
  const metaDesc = rawDesc
    ? (rawDesc.length > 155 ? rawDesc.slice(0, 155).replace(/\s+\S*$/, "") + "…" : rawDesc)
    : `${titleDe} — Altbier-Event im Altbieratlas.`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": titleDe,
    "url": pageUrl,
    "startDate": row.date + (row.time ? ("T" + row.time) : ""),
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  };
  if (row.end_date) ld.endDate = row.end_date + (row.end_time ? ("T" + row.end_time) : "");
  const locName = row.brewery_name
    ? row.brewery_name + (row.brewery_city ? ", " + row.brewery_city : "")
    : row.location;
  if (locName) ld.location = { "@type": "Place", "name": locName };

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
  html = html.replace(
    "</head>",
    `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`,
  );

  const headers = new Headers(assetRes.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=300, stale-while-revalidate=3600");

  return new Response(html, { status: 200, headers });
}

export async function serveImpressum(req, env) {
  const assetRes = await env.ASSETS.fetch(req);
  if (!assetRes.ok) return assetRes;

  const sc = siteConfig(env);
  const v  = (x) => (x && String(x).trim().length > 0 ? String(x).trim() : "");

  // D1-Werte laden (Vorrang vor SITE_CONFIG)
  const dbImpr = {};
  try {
    const rows = await env.DB.prepare(
      "SELECT key, value FROM site_settings WHERE key IN ('impressum.owner','impressum.address','impressum.email')"
    ).all();
    for (const r of rows.results) {
      const k = r.key.replace("impressum.", "");
      try { dbImpr[k] = JSON.parse(r.value); } catch { dbImpr[k] = r.value; }
    }
  } catch { /* Tabelle fehlt bei alten Instanzen — ignorieren */ }

  const impr = { ...(sc.impressum || {}), ...dbImpr };
  const emailVal = v(impr.email) || v(sc.contactEmail);
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
