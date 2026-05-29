// ============================================================
// Altbieratlas — Worker-Utilities
// ============================================================

export const APP_VERSION = "0.9.1";

export const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { ...JSON_HEADERS, ...(init.headers ?? {}) },
  });
}

export function error(status, message, extra = {}) {
  return json({ error: message, ...extra }, { status });
}

// ---- CORS (nur falls später extern aufgerufen; bei gleichem Origin nicht nötig) ----
export function corsHeaders(origin = "*") {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-credentials": "true",
  };
}

// ---- Cookie-Parser ----
export function parseCookies(req) {
  const h = req.headers.get("cookie") || "";
  const out = {};
  h.split(/;\s*/).forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = decodeURIComponent(pair.slice(idx + 1).trim());
    if (k) out[k] = v;
  });
  return out;
}

export function setCookieHeader(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  else parts.push("Path=/");
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  if (opts.secure !== false) parts.push("Secure");
  parts.push(`SameSite=${opts.sameSite || "Strict"}`);
  return parts.join("; ");
}

// ---- PBKDF2 Password Hashing ----
const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function b64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64decode(s) {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password),
    { name: "PBKDF2" }, false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key, HASH_BYTES * 8,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(bits)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split("$");
    if (scheme !== "pbkdf2") return false;
    const iterations = parseInt(iterStr, 10);
    const salt = b64decode(saltB64);
    const expected = b64decode(hashB64);
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password),
      { name: "PBKDF2" }, false, ["deriveBits"],
    );
    const bits = new Uint8Array(await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      key, expected.length * 8,
    ));
    // Constant-time compare
    if (bits.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

// ---- UUID / Token ----
export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0,4).join("")}-${h.slice(4,6).join("")}-${h.slice(6,8).join("")}-${h.slice(8,10).join("")}-${h.slice(10,16).join("")}`;
}

export function randomToken(bytes = 32) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return b64(b).replace(/[+/]/g, (c) => (c === "+" ? "-" : "_")).replace(/=+$/, "");
}

// ---- Turnstile-Verifikation ----
export async function verifyTurnstile(token, secret, remoteIp) {
  if (!secret || secret.includes("PLACEHOLDER") || secret === "TURNSTILE_SECRET_UNSET") {
    // Dev/PoC-Modus: wenn kein Secret gesetzt ist, Verifikation überspringen
    console.warn("[turnstile] Kein Secret gesetzt — Verifikation übersprungen.");
    return { success: true, dev: true };
  }
  if (!token) return { success: false, error: "missing-token" };
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body,
    });
    const j = await r.json();
    return j;
  } catch (e) {
    return { success: false, error: "fetch-failed" };
  }
}

// ---- Rate-Limiting (simpel, D1-basiert) ----
export async function rateLimit(db, bucket, max, windowSeconds) {
  const now = Date.now();
  const expires = new Date(now + windowSeconds * 1000).toISOString();

  // Aufräumen alter Buckets (probabilistisch ~10 %)
  if (Math.random() < 0.1) {
    await db.prepare("DELETE FROM rate_limits WHERE expires_at < datetime('now')").run();
  }

  const row = await db.prepare("SELECT counter, expires_at FROM rate_limits WHERE bucket = ?").bind(bucket).first();
  if (!row) {
    await db.prepare("INSERT INTO rate_limits (bucket, counter, expires_at) VALUES (?, 1, ?)").bind(bucket, expires).run();
    return { allowed: true, remaining: max - 1 };
  }
  if (new Date(row.expires_at).getTime() < now) {
    await db.prepare("UPDATE rate_limits SET counter = 1, expires_at = ? WHERE bucket = ?").bind(expires, bucket).run();
    return { allowed: true, remaining: max - 1 };
  }
  if (row.counter >= max) {
    return { allowed: false, remaining: 0 };
  }
  await db.prepare("UPDATE rate_limits SET counter = counter + 1 WHERE bucket = ?").bind(bucket).run();
  return { allowed: true, remaining: max - row.counter - 1 };
}

// ---- Input-Validierung ----
export function str(v, { max = 500, trim = true, required = false, name = "field" } = {}) {
  if (v == null) {
    if (required) throw new Error(`${name}: required`);
    return null;
  }
  let s = String(v);
  if (trim) s = s.trim();
  if (s.length === 0 && required) throw new Error(`${name}: empty`);
  if (s.length > max) throw new Error(`${name}: too long (max ${max})`);
  return s || null;
}
export function num(v, { min, max, required = false, name = "field" } = {}) {
  if (v == null || v === "") {
    if (required) throw new Error(`${name}: required`);
    return null;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${name}: not a number`);
  if (min != null && n < min) throw new Error(`${name}: below min ${min}`);
  if (max != null && n > max) throw new Error(`${name}: above max ${max}`);
  return n;
}
export function oneOf(v, options, { required = false, name = "field" } = {}) {
  if (v == null) {
    if (required) throw new Error(`${name}: required`);
    return null;
  }
  if (!options.includes(v)) throw new Error(`${name}: invalid value`);
  return v;
}

// ---- Client-IP ----
export function clientIp(req) {
  return req.headers.get("cf-connecting-ip")
      || req.headers.get("x-forwarded-for")?.split(",")[0].trim()
      || "0.0.0.0";
}

function getSiteConfig(env) {
  try { return env.SITE_CONFIG ? JSON.parse(env.SITE_CONFIG) : {}; } catch { return {}; }
}

// ---- E-Mail-Bestätigung via Resend API ----
// Benötigt env.RESEND_API_KEY (Secret) und optional SITE_CONFIG.resendFrom / SITE_CONFIG.siteUrl.
// Sendet lokalisiert (lang: "de"|"en"), fire & forget, wirft nie.
export async function sendConfirmationEmail(env, { to, type, id, data = {}, ip = "–", lang = "de", submittedAt }) {
  if (!env.RESEND_API_KEY || !to) return;

  const sc = getSiteConfig(env);
  const de = lang !== "en";
  const siteUrl = sc.siteUrl || env.SITE_URL || "https://altbieratlas.de";
  const typeLabels = {
    de: { price: "Preismeldung", brewery: "Brauerei-Eintrag", style: "Sorten-Ergänzung", correction: "Korrektur", event: "Event-Meldung" },
    en: { price: "Price Report", brewery: "Brewery Entry", style: "Beer Style", correction: "Correction", event: "Event" },
  };
  const label = (de ? typeLabels.de : typeLabels.en)[type] || type;
  const ts = submittedAt || new Date().toISOString();
  let dateStr = ts;
  try {
    dateStr = new Date(ts).toLocaleString(de ? "de-DE" : "en-GB", {
      timeZone: "Europe/Berlin", dateStyle: "long", timeStyle: "short",
    });
  } catch {}

  const anonIp = String(ip).replace(/\.(\d+)$/, ".xxx").replace(/:[\da-f]+$/i, ":xxxx");

  const rows = _emailDataRows(type, data, de);
  const tableText = rows.map(([k, v]) => `  ${k}: ${v}`).join("\n");
  const tableHtml = rows.map(([k, v]) =>
    `<tr style="border-bottom:1px solid #efe8e0">` +
    `<td style="padding:9px 20px 9px 0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#b57a3a;white-space:nowrap;font-family:'Courier New',monospace;vertical-align:top">${_esc(k)}</td>` +
    `<td style="padding:9px 0;font-size:14px;color:#333;vertical-align:top">${_esc(String(v))}</td></tr>`
  ).join("");

  const subject = de ? `Altbieratlas: Beitrag eingegangen` : `Altbieratlas: Contribution received`;
  const labelRcvd = de ? "Eingegangen" : "Received";
  const noReply   = de ? "Diese Adresse wird nicht überwacht." : "This mailbox is not monitored.";

  const text = [
    de ? `Altbieratlas: ${label} eingegangen` : `Altbieratlas: ${label} received`,
    "",
    de ? "Vielen Dank! Dein Beitrag wird geprüft und nach der Freigabe auf dem Atlas veröffentlicht." : "Thank you! Your contribution is under review and will be published once approved.",
    "",
    tableText,
    "",
    de ? `Wir melden uns nur bei Rückfragen.\nDas Altbieratlas-Team\n${siteUrl}` : `We will only reach out if we have questions.\nThe Altbieratlas Team\n${siteUrl}`,
    "",
    `${labelRcvd}: ${dateStr}`,
    `IP: ${anonIp}`,
    noReply,
  ].join("\n");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no"></head>
<body style="margin:0;padding:0;background:#f9f5f0;font-family:system-ui,-apple-system,sans-serif;color:#222">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

  <tr><td style="background:#fff;border:1px solid #e4d8cc;border-bottom:none;border-radius:8px 8px 0 0;padding:18px 28px">
    <a href="${siteUrl}" style="text-decoration:none;display:inline-block">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#b57a3a;color:#fff;font-family:Georgia,'Times New Roman',serif;font-size:13px;font-weight:700;width:28px;height:28px;text-align:center;border-radius:3px;line-height:28px">A</td>
      <td style="padding-left:10px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#1a1410;font-weight:600;vertical-align:middle">Altbieratlas</td>
    </tr></table>
    </a>
  </td></tr>

  <tr><td style="background:#b57a3a;height:3px;border-left:1px solid #e4d8cc;border-right:1px solid #e4d8cc"></td></tr>

  <tr><td style="background:#fff;border:1px solid #e4d8cc;border-top:none;border-radius:0 0 8px 8px;padding:28px 28px 24px">
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b57a3a;font-family:'Courier New',monospace">${_esc(label)}</p>
    <h2 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:500;color:#1a1410;line-height:1.2">${de ? "Beitrag eingegangen" : "Contribution received"}</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.65">${de ? "Vielen Dank! Dein Beitrag wird geprüft und nach der Freigabe auf dem Atlas veröffentlicht." : "Thank you! Your contribution is under review and will be published once approved."}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4d8cc;margin-bottom:20px">${tableHtml}</table>
    <p style="margin:0 0 24px;font-size:13px;color:#888;line-height:1.6">${de ? "Wir melden uns nur bei Rückfragen." : "We will only reach out if we have questions."}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4d8cc"><tr><td style="padding-top:16px">
      <a href="${siteUrl}" style="font-size:12px;color:#b57a3a;text-decoration:none">${siteUrl}</a>
      <table cellpadding="0" cellspacing="0" style="margin-top:10px">
        <tr><td style="padding:2px 20px 2px 0;font-size:11px;color:#bbb;white-space:nowrap">${_esc(labelRcvd)}</td><td style="padding:2px 0;font-size:11px;color:#888">${_esc(dateStr)}</td></tr>
        <tr><td style="padding:2px 20px 2px 0;font-size:11px;color:#bbb">IP</td><td style="padding:2px 0;font-size:11px;color:#888;font-family:'Courier New',monospace">${_esc(anonIp)}</td></tr>
      </table>
      <p style="margin:10px 0 0;font-size:11px;color:#bbb">${_esc(noReply)}</p>
    </td></tr></table>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: sc.resendFrom || env.RESEND_FROM || "Altbieratlas <noreply@altbieratlas.de>",
        to, subject, text, html,
      }),
    });
  } catch {}
}

function _esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function _emailDataRows(type, data, de) {
  const f = (k, v) => (v != null && v !== "" && v !== null) ? [[k, v]] : [];
  if (type === "price") return [
    ...f(de ? "Brauerei" : "Brewery", data._breweryName || data.breweryId),
    ...f(de ? "Preis" : "Price", data.price != null ? `${Number(data.price).toFixed(2)} €` : null),
    ...f(de ? "Größe" : "Size", data.size),
    ...f(de ? "Datum" : "Date", data.date),
    ...f(de ? "Hinweis" : "Notes", data.notes),
  ];
  if (type === "brewery") {
    const brewTypeMap = {
      brewery: { de: "Hausbrauerei", en: "Brewpub" },
      pub:     { de: "Gastronomie",  en: "Bar / Restaurant" },
      shop:    { de: "Handel",       en: "Retail" },
    };
    const brewTypeLabel = data.type
      ? (brewTypeMap[data.type]?.[de ? "de" : "en"] || data.type.charAt(0).toUpperCase() + data.type.slice(1))
      : null;
    return [
      ...f("Name", data.name),
      ...f(de ? "Stadt" : "City", data.city),
      ...f(de ? "Typ" : "Type", brewTypeLabel),
      ...f(de ? "Adresse" : "Address", data.address),
      ...f("Website", data.website),
      ...f(de ? "Beschreibung" : "Description", data.description),
    ];
  }
  if (type === "event") return [
    ...f("Name", data.eventName),
    ...f(de ? "Datum" : "Date", data.eventDate),
    ...f(de ? "Ort" : "Location", data.eventLocation),
    ...f(de ? "Brauerei" : "Brewery", data._breweryName || data.breweryId),
    ...f(de ? "Beschreibung" : "Description", data.description),
  ];
  if (type === "style") return [
    ...f(de ? "Brauerei" : "Brewery", data._breweryName || data.breweryId),
    ...f(de ? "Sorte" : "Style", data.styleName),
    ...f("ABV", data.abv != null ? `${data.abv} %` : null),
    ...f("IBU", data.ibu),
    ...f(de ? "Beschreibung" : "Tasting", data.tasting),
  ];
  if (type === "correction") {
    const corrTargetMap = {
      address:     { de: "Adresse / Koordinaten", en: "Address / coordinates" },
      website:     { de: "Website",               en: "Website" },
      description: { de: "Beschreibung",          en: "Description" },
      price:       { de: "Preis",                 en: "Price" },
      style:       { de: "Sorte / Stil-Info",     en: "Style / style info" },
      other:       { de: "Sonstiges",             en: "Other" },
    };
    const targetLabel = corrTargetMap[data.target]?.[de ? "de" : "en"] || data.target;
    return [
      ...f(de ? "Brauerei" : "Brewery", data._breweryName || data.breweryId),
      ...f(de ? "Feld" : "Target", targetLabel),
      ...f(de ? "Korrektur" : "Correction", data.correction),
    ];
  }
  return Object.entries(data).filter(([k, v]) => v != null && v !== "" && !k.startsWith("_")).map(([k, v]) => [k, v]);
}

// ---- Passwort-Reset-E-Mail via Resend API ----
export async function sendPasswordResetEmail(env, { to, resetUrl }) {
  if (!env.RESEND_API_KEY || !to) return;
  const sc = getSiteConfig(env);
  const siteUrl = sc.siteUrl || env.SITE_URL || "https://altbieratlas.de";

  const subject = "Altbieratlas: Passwort zurücksetzen";
  const text = [
    "Passwort zurücksetzen",
    "",
    "Jemand hat eine Passwort-Rücksetzung für deinen Altbieratlas-Account angefordert.",
    "Klicke auf den folgenden Link, um ein neues Passwort zu setzen (gültig für 1 Stunde):",
    "",
    resetUrl,
    "",
    "Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.",
    "Dein Passwort bleibt unverändert.",
    "",
    `Das Altbieratlas-Team\n${siteUrl}`,
  ].join("\n");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no"></head>
<body style="margin:0;padding:0;background:#f9f5f0;font-family:system-ui,-apple-system,sans-serif;color:#222">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

  <tr><td style="background:#fff;border:1px solid #e4d8cc;border-bottom:none;border-radius:8px 8px 0 0;padding:18px 28px">
    <a href="${siteUrl}" style="text-decoration:none;display:inline-block">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#b57a3a;color:#fff;font-family:Georgia,'Times New Roman',serif;font-size:13px;font-weight:700;width:28px;height:28px;text-align:center;border-radius:3px;line-height:28px">A</td>
      <td style="padding-left:10px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#1a1410;font-weight:600;vertical-align:middle">Altbieratlas</td>
    </tr></table>
    </a>
  </td></tr>

  <tr><td style="background:#b57a3a;height:3px;border-left:1px solid #e4d8cc;border-right:1px solid #e4d8cc"></td></tr>

  <tr><td style="background:#fff;border:1px solid #e4d8cc;border-top:none;border-radius:0 0 8px 8px;padding:28px 28px 24px">
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b57a3a;font-family:'Courier New',monospace">Account</p>
    <h2 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:500;color:#1a1410;line-height:1.2">Passwort zurücksetzen</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.65">Jemand hat eine Passwort-Rücksetzung für deinen Altbieratlas-Account angefordert. Klicke auf den Button, um ein neues Passwort zu setzen. Der Link ist <strong>1 Stunde</strong> gültig.</p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr>
      <td style="background:#b57a3a;border-radius:6px">
        <a href="${_esc(resetUrl)}" style="display:inline-block;padding:12px 24px;color:#fff;font-size:14px;font-weight:500;text-decoration:none;font-family:system-ui,sans-serif">Neues Passwort setzen</a>
      </td>
    </tr></table>
    <p style="margin:0 0 8px;font-size:12px;color:#aaa;line-height:1.5">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
    <p style="margin:0 0 20px;font-size:11px;color:#b57a3a;word-break:break-all;font-family:'Courier New',monospace">${_esc(resetUrl)}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4d8cc"><tr><td style="padding-top:16px">
      <p style="margin:0;font-size:12px;color:#bbb">Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt unverändert.</p>
    </td></tr></table>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: sc.resendFrom || env.RESEND_FROM || "Altbieratlas <noreply@altbieratlas.de>",
        to, subject, text, html,
      }),
    });
  } catch {}
}

// ---- Täglicher Admin-Digest via Resend API ----
// Wird vom scheduled()-Handler aufgerufen (Cron: einmal täglich).
// Benötigt env.RESEND_API_KEY (Secret) + env.ADMIN_EMAIL (Secret).
// Sendet nur, wenn in den letzten 24 h neue Beiträge eingegangen sind.
export async function sendAdminDigest(env) {
  if (!env.RESEND_API_KEY || !env.ADMIN_EMAIL) return;

  const sc = getSiteConfig(env);
  const siteUrl = sc.siteUrl || env.SITE_URL || "https://altbieratlas.de";
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let rows;
  try {
    ({ results: rows } = await env.DB.prepare(
      "SELECT id, type, payload, submitter_email, submitter_ip, created_at FROM contributions WHERE created_at >= ? AND status = 'pending' ORDER BY created_at DESC"
    ).bind(since).all());
  } catch (e) {
    console.error("[digest] DB-Fehler:", e);
    return;
  }
  if (!rows || !rows.length) return;

  const typeLabels = {
    price: "Preismeldung", brewery: "Brauerei", style: "Sorte",
    correction: "Korrektur", event: "Event",
  };

  const rowsHtml = rows.map((r) => {
    let data = {};
    try { data = JSON.parse(r.payload); } catch {}
    const label = typeLabels[r.type] || r.type;
    const ts = (() => {
      try { return new Date(r.created_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" }); }
      catch { return r.created_at; }
    })();
    const summary = data.name || data.breweryId || data.eventName || "?";
    const email = r.submitter_email ? _esc(r.submitter_email) : "anonym";
    return `<tr style="border-bottom:1px solid #efe8e0">
      <td style="padding:9px 14px 9px 0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#b57a3a;white-space:nowrap;font-family:'Courier New',monospace;vertical-align:top">${_esc(label)}</td>
      <td style="padding:9px 14px 9px 0;font-size:14px;color:#222;vertical-align:top">${_esc(summary)}</td>
      <td style="padding:9px 14px 9px 0;font-size:12px;color:#888;vertical-align:top">${email}</td>
      <td style="padding:9px 0;font-size:12px;color:#888;white-space:nowrap;vertical-align:top">${ts}</td>
    </tr>`;
  }).join("");

  const rowsText = rows.map((r) => {
    let data = {};
    try { data = JSON.parse(r.payload); } catch {}
    const label = typeLabels[r.type] || r.type;
    const summary = data.name || data.breweryId || data.eventName || "?";
    return `  [${label}] ${summary} (${r.submitter_email || "anonym"})`;
  }).join("\n");

  const n = rows.length;
  const subject = `Altbieratlas Digest: ${n} neue Einreichung${n > 1 ? "en" : ""}`;
  const adminUrl = siteUrl + "/admin.html";

  const text = [
    `${n} neue Einreichung${n > 1 ? "en" : ""} in den letzten 24 Stunden:`,
    "", rowsText, "",
    `Admin: ${adminUrl}`,
  ].join("\n");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no"></head>
<body style="margin:0;padding:0;background:#f9f5f0;font-family:system-ui,-apple-system,sans-serif;color:#222">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

  <tr><td style="background:#fff;border:1px solid #e4d8cc;border-bottom:none;border-radius:8px 8px 0 0;padding:18px 28px">
    <a href="${siteUrl}" style="text-decoration:none;display:inline-block">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#b57a3a;color:#fff;font-family:Georgia,'Times New Roman',serif;font-size:13px;font-weight:700;width:28px;height:28px;text-align:center;border-radius:3px;line-height:28px">A</td>
      <td style="padding-left:10px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#1a1410;font-weight:600;vertical-align:middle">Altbieratlas</td>
      <td style="padding-left:16px;font-size:11px;color:#b57a3a;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:.1em;vertical-align:middle">Admin Digest</td>
    </tr></table>
    </a>
  </td></tr>

  <tr><td style="background:#b57a3a;height:3px;border-left:1px solid #e4d8cc;border-right:1px solid #e4d8cc"></td></tr>

  <tr><td style="background:#fff;border:1px solid #e4d8cc;border-top:none;border-radius:0 0 8px 8px;padding:28px 28px 24px">
    <h2 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:500;color:#1a1410">${n} neue Einreichung${n > 1 ? "en" : ""}</h2>
    <p style="margin:0 0 22px;font-size:13px;color:#888">Letzte 24 Stunden</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4d8cc;margin-bottom:24px">
      <thead><tr style="border-bottom:1px solid #e4d8cc">
        <th style="padding:8px 14px 8px 0;font-size:10px;text-align:left;color:#bbb;text-transform:uppercase;letter-spacing:.08em;font-family:'Courier New',monospace;font-weight:400">Typ</th>
        <th style="padding:8px 14px 8px 0;font-size:10px;text-align:left;color:#bbb;text-transform:uppercase;letter-spacing:.08em;font-family:'Courier New',monospace;font-weight:400">Inhalt</th>
        <th style="padding:8px 14px 8px 0;font-size:10px;text-align:left;color:#bbb;text-transform:uppercase;letter-spacing:.08em;font-family:'Courier New',monospace;font-weight:400">E-Mail</th>
        <th style="padding:8px 0;font-size:10px;text-align:left;color:#bbb;text-transform:uppercase;letter-spacing:.08em;font-family:'Courier New',monospace;font-weight:400">Zeit</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <a href="${adminUrl}" style="display:inline-block;background:#b57a3a;color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500">Admin-Bereich</a>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: sc.resendFrom || env.RESEND_FROM || "Altbieratlas <noreply@altbieratlas.de>",
        to: env.ADMIN_EMAIL,
        subject, text, html,
      }),
    });
  } catch (e) {
    console.error("[digest] Resend-Fehler:", e);
  }
}

// ---- Brewery-Assembler (wandelt DB-Zeile in API-Shape) ----
// No legacy type mapping needed — types are now canonical IDs (brewpub, brewery, pub, etc.)
const LEGACY_TYPE = {};

export function brewRow(r, styles = []) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    short: r.short_name,
    type: LEGACY_TYPE[r.type] || r.type,
    city: r.city,
    country: r.country,
    address: r.address,
    mapsUrl: r.maps_url || null,
    coords: [r.lat, r.lng],
    founded: r.founded,
    website: r.website,
    description: { de: r.description_de, en: r.description_en },
    styles,
    verified: !!r.verified,
    isHistorical: !!r.is_historical,
    status: r.status,
    photoKey: r.photo_key || null,
    photoUrl: r.photo_key ? `/photos/${r.photo_key}` : null,
  };
}
