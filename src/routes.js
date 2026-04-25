// ============================================================
// Altbieratlas — Routen (öffentliche & Admin-API)
// ============================================================
import {
  json, error, parseCookies, setCookieHeader,
  hashPassword, verifyPassword, uuid, randomToken,
  verifyTurnstile, rateLimit, str, num, oneOf,
  clientIp, brewRow, sendConfirmationEmail,
} from "./utils.js";

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
// Quelle der Wahrheit sind die [vars] aus wrangler.toml bzw. Dashboard-Overrides.
export async function getPublicConfig(req, env) {
  const v = (x) => (x && String(x).trim().length > 0 ? String(x).trim() : null);
  const siteKey = v(env.TURNSTILE_SITE_KEY);
  const ga = v(env.GA4_MEASUREMENT_ID);
  return json({
    // Turnstile
    turnstileSiteKey: siteKey,
    turnstileEnabled: !!siteKey && !siteKey.includes("PLACEHOLDER"),
    // Analytics
    ga4MeasurementId: ga && !ga.startsWith("G-X") ? ga : null,
    // Author / Social
    author: {
      name:     v(env.AUTHOR_NAME),
      github:   v(env.AUTHOR_GITHUB),
      linkedin: v(env.AUTHOR_LINKEDIN),
      website:  v(env.AUTHOR_WEBSITE),
    },
    // Impressum
    impressum: {
      owner:   v(env.IMPRESSUM_OWNER),
      address: v(env.IMPRESSUM_ADDRESS),
      email:   v(env.IMPRESSUM_EMAIL),
    },
    //
    requireModeration: true,
  });
}

// GET /api/stats
export async function getStats(req, env) {
  const [brewCount, priceCount, avgRow] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM breweries WHERE status = 'approved'").first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM prices WHERE status = 'approved'").first(),
    env.DB.prepare("SELECT AVG(price) AS avg FROM prices WHERE status = 'approved' AND size = '0,25l'").first(),
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
  const res = await env.DB.prepare("SELECT * FROM styles ORDER BY name").all();
  return json({
    styles: res.results.map((s) => ({
      id: s.id, name: s.name, abv: s.abv, ibu: s.ibu, color: s.color,
      tasting: { de: s.tasting_de, en: s.tasting_en },
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
    "SELECT * FROM events WHERE status = 'approved' ORDER BY date ASC"
  ).all();
  return json({
    events: res.results.map((e) => ({
      id: e.id,
      title: { de: e.title_de, en: e.title_en },
      breweryId: e.brewery_id,
      date: e.date,
      description: { de: e.description_de, en: e.description_en },
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
        "User-Agent": `Altbieratlas/1.0 (${env.CONTACT_EMAIL || "admin@example.com"})`,
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
export async function postContribution(req, env) {
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
      oneOf(data.type, ["hausbrauerei", "gastronomie", "shop"], { required: true, name: "type" });
      if (data.lat != null) num(data.lat, { min: -90, max: 90, name: "lat" });
      if (data.lng != null) num(data.lng, { min: -180, max: 180, name: "lng" });
    } else if (type === "event") {
      str(data.eventName, { required: true, max: 200, name: "eventName" });
      str(data.eventDate, { required: true, max: 20, name: "eventDate" });
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

  // Auto-Geocoding: fehlende Koordinaten für neue Brauereien ableiten
  if (type === "brewery" && (data.lat == null || data.lng == null) && data.city) {
    const q = encodeURIComponent([data.name, data.city, data.country || "DE"].filter(Boolean).join(", "));
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=jsonv2&limit=1`, {
        headers: { "User-Agent": `Altbieratlas/1.0 (${env.CONTACT_EMAIL || "admin@example.com"})` },
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

  // Bestätigungsmail wenn E-Mail angegeben — fire & forget
  if (email) sendConfirmationEmail(env, { to: email, type, id, data, ip, lang, submittedAt: new Date().toISOString() });

  return json({ ok: true, id, status: "pending" }, { status: 201 });
}

// POST /api/prices (Convenience — wrapt als Contribution vom Typ "price")
export async function postPrice(req, env) {
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  return postContribution(new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({ type: "price", data: body, turnstileToken: body.turnstileToken, email: body.email }),
  }), env);
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

  // Turnstile: schützt vor Brute-Force. Wird übersprungen, wenn kein
  // Secret gesetzt ist (Dev-Modus).
  const ts = await verifyTurnstile(body.turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
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
        newId, payload.name, payload.short || null, payload.type || "hausbrauerei",
        payload.city, payload.country || "DE", payload.address || null,
        lat, lng, payload.founded ? parseInt(payload.founded, 10) : null,
        payload.website || null, payload.description || null, payload.description_en || null,
      ).run();
    } else if (c.type === "event") {
      await env.DB.prepare(
        `INSERT INTO events (id, title_de, title_en, brewery_id, date, description_de, description_en, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')`
      ).bind(
        "ev_" + Math.random().toString(36).slice(2, 10),
        payload.eventName, payload.eventName, // en fallback
        payload.breweryId || null, payload.eventDate,
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
    "SELECT * FROM breweries ORDER BY created_at DESC LIMIT 500"
  ).all();
  return json({ breweries: res.results.map((r) => brewRow(r, [])) });
}

// PUT /api/admin/breweries/:id
export async function adminUpdateBrewery(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");

  const fields = [];
  const values = [];
  const allow = {
    name: "name", short: "short_name", type: "type", city: "city", country: "country",
    address: "address", lat: "lat", lng: "lng", founded: "founded", website: "website",
    description_de: "description_de", description_en: "description_en",
    verified: "verified", status: "status",
  };
  for (const [k, col] of Object.entries(allow)) {
    if (k in body) {
      fields.push(`${col} = ?`);
      values.push(body[k]);
    }
  }
  if (!fields.length) return error(400, "no-fields");
  fields.push("updated_at = datetime('now')");
  values.push(id);
  await env.DB.prepare(
    `UPDATE breweries SET ${fields.join(", ")} WHERE id = ?`
  ).bind(...values).run();
  return json({ ok: true });
}

// DELETE /api/admin/breweries/:id
export async function adminDeleteBrewery(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  await env.DB.prepare("DELETE FROM breweries WHERE id = ?").bind(id).run();
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
  const staticPaths = ["/", "/index.html", "/ranglisten.html", "/wissen.html",
                       "/beitragen.html"];
  let breweryIds = [];
  let lastMod = null;
  try {
    const r = await env.DB.prepare(
      "SELECT id, updated_at FROM breweries WHERE status = 'approved' ORDER BY updated_at DESC LIMIT 5000"
    ).all();
    breweryIds = r.results.map((x) => ({ id: x.id, lastmod: x.updated_at }));
    lastMod = r.results[0]?.updated_at || null;
  } catch { /* keine DB → nur statische Seiten */ }

  const nowIso = new Date().toISOString().slice(0, 10);
  const today = nowIso;
  const entries = [
    ...staticPaths.map((p) => `
  <url>
    <loc>${esc(base + p)}</loc>
    <lastmod>${lastMod ? lastMod.slice(0, 10) : today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p === "/" || p === "/index.html" ? "1.0" : "0.7"}</priority>
  </url>`),
    ...breweryIds.map((b) => `
  <url>
    <loc>${esc(base + "/brauerei.html?id=" + b.id)}</loc>
    <lastmod>${(b.lastmod || today).slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
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
