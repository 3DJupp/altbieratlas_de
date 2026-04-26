// ============================================================
// Altbieratlas — Worker-Utilities
// ============================================================

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
const PBKDF2_ITERATIONS = 120000;
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

// ---- E-Mail-Bestätigung via Resend API ----
// Benötigt env.RESEND_API_KEY (Secret) und optional env.RESEND_FROM.
// Sendet lokalisiert (lang: "de"|"en"), fire & forget, wirft nie.
export async function sendConfirmationEmail(env, { to, type, id, data = {}, ip = "–", lang = "de", submittedAt }) {
  if (!env.RESEND_API_KEY || !to) return;

  const de = lang !== "en";
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

  // Last octet / group anonymisiert
  const anonIp = String(ip).replace(/\.(\d+)$/, ".xxx").replace(/:[\da-f]+$/i, ":xxxx");

  const rows = _emailDataRows(type, data, de);
  const tableText = rows.map(([k, v]) => `  ${k}: ${v}`).join("\n");
  const tableHtml = rows.map(([k, v]) =>
    `<tr><td style="padding:3px 16px 3px 0;color:#999;white-space:nowrap;font-size:13px">${_esc(k)}</td>` +
    `<td style="padding:3px 0;font-size:13px">${_esc(String(v))}</td></tr>`
  ).join("");

  const subject = de
    ? `Dein Beitrag ist eingegangen — Altbieratlas`
    : `Your contribution has been received — Altbieratlas`;

  const greeting   = de ? "Hallo," : "Hello,";
  const intro      = de ? `vielen Dank! Wir haben folgende ${label} erhalten:` : `thank you! We have received the following ${label}:`;
  const body2      = de ? "Dein Beitrag wird nun geprüft. Nach der Freigabe erscheint er auf dem Altbieratlas.\nWir melden uns nur bei Rückfragen." : "Your contribution is now under review. Once approved it will appear on Altbieratlas.\nWe will only reach out if we have questions.";
  const thanks     = de ? "Vielen Dank fürs Mitmachen!\n— Das Altbieratlas-Team" : "Thanks for contributing!\n— The Altbieratlas Team";
  const noReply    = de ? "Diese Adresse wird nicht überwacht." : "This mailbox is not monitored.";
  const labelId    = de ? "Beitrags-ID" : "Contribution ID";
  const labelRcvd  = de ? "Eingegangen" : "Received";

  const text = [greeting, "", intro, "", tableText, "", body2, "", thanks, "",
    "─".repeat(40), `${labelId}: ${id}`, `${labelRcvd}: ${dateStr}`, `IP: ${anonIp}`, "", noReply,
  ].join("\n");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px;background:#f9f5f0">
<div style="background:#b57a3a;color:#fff;padding:14px 20px;border-radius:8px 8px 0 0;font-size:18px;font-weight:600">Altbieratlas</div>
<div style="background:#fff;border:1px solid #e4d8cc;border-top:none;padding:24px 28px;border-radius:0 0 8px 8px">
  <h2 style="margin:0 0 10px;font-size:16px;font-weight:600">${de ? "Dein Beitrag ist eingegangen" : "Your contribution has been received"}</h2>
  <p style="color:#555;margin:0 0 18px;font-size:14px">${de ? `Vielen Dank! Wir haben folgende <strong>${_esc(label)}</strong> erhalten:` : `Thank you! We received the following <strong>${_esc(label)}</strong>:`}</p>
  <table style="border-collapse:collapse;width:100%;margin-bottom:20px">${tableHtml}</table>
  <p style="color:#555;font-size:13px;line-height:1.5">${de ? "Dein Beitrag wird nun geprüft. Nach der Freigabe erscheint er auf dem Altbieratlas.<br>Wir melden uns nur bei Rückfragen." : "Your contribution is now under review. Once approved it will appear on Altbieratlas.<br>We will only reach out if we have questions."}</p>
  <hr style="border:none;border-top:1px solid #e4d8cc;margin:20px 0">
  <table style="border-collapse:collapse;font-size:11px;color:#bbb">
    <tr><td style="padding:2px 16px 2px 0">${_esc(labelId)}</td><td>${_esc(id)}</td></tr>
    <tr><td style="padding:2px 16px 2px 0">${_esc(labelRcvd)}</td><td>${_esc(dateStr)}</td></tr>
    <tr><td style="padding:2px 16px 2px 0">IP</td><td>${_esc(anonIp)}</td></tr>
  </table>
  <p style="font-size:11px;color:#bbb;margin-top:10px">${_esc(noReply)}</p>
</div>
</body></html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.RESEND_FROM || "Altbieratlas <noreply@altbieratlas.de>",
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
    ...f(de ? "Brauerei-ID" : "Brewery ID", data.breweryId),
    ...f(de ? "Preis" : "Price", data.price != null ? `${data.price} €` : null),
    ...f(de ? "Größe" : "Size", data.size),
    ...f(de ? "Datum" : "Date", data.date),
    ...f(de ? "Hinweis" : "Notes", data.notes),
  ];
  if (type === "brewery") return [
    ...f("Name", data.name),
    ...f(de ? "Stadt" : "City", data.city),
    ...f("Typ / Type", data.type),
    ...f(de ? "Adresse" : "Address", data.address),
    ...f("Website", data.website),
    ...f(de ? "Koordinaten" : "Coordinates", data.lat != null && data.lng != null ? `${Number(data.lat).toFixed(4)}, ${Number(data.lng).toFixed(4)}` : null),
    ...f(de ? "Beschreibung" : "Description", data.description),
  ];
  if (type === "event") return [
    ...f("Name", data.eventName),
    ...f(de ? "Datum" : "Date", data.eventDate),
    ...f(de ? "Ort" : "Location", data.eventLocation),
    ...f(de ? "Brauerei" : "Brewery", data.breweryId),
    ...f(de ? "Beschreibung" : "Description", data.description),
  ];
  if (type === "style") return [
    ...f(de ? "Brauerei" : "Brewery", data.breweryId),
    ...f(de ? "Sorte" : "Style", data.styleName),
    ...f("ABV", data.abv != null ? `${data.abv} %` : null),
    ...f("IBU", data.ibu),
    ...f(de ? "Beschreibung" : "Tasting", data.tasting),
  ];
  if (type === "correction") return [
    ...f(de ? "Brauerei" : "Brewery", data.breweryId),
    ...f(de ? "Feld" : "Target", data.target),
    ...f(de ? "Korrektur" : "Correction", data.correction),
  ];
  return Object.entries(data).filter(([k, v]) => v != null && v !== "" && !k.startsWith("_")).map(([k, v]) => [k, v]);
}

// ---- Täglicher Admin-Digest via Resend API ----
// Wird vom scheduled()-Handler aufgerufen (Cron: einmal täglich).
// Benötigt env.RESEND_API_KEY (Secret) + env.ADMIN_EMAIL (Secret).
// Sendet nur, wenn in den letzten 24 h neue Beiträge eingegangen sind.
export async function sendAdminDigest(env) {
  if (!env.RESEND_API_KEY || !env.ADMIN_EMAIL) return;

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
    const anonIp = String(r.submitter_ip || "–").replace(/\.(\d+)$/, ".xxx").replace(/:[\da-f]+$/i, ":xxxx");
    const ts = (() => {
      try { return new Date(r.created_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" }); }
      catch { return r.created_at; }
    })();
    const summary = data.name || data.breweryId || data.eventName || "–";
    const email = r.submitter_email ? _esc(r.submitter_email) : "–";
    return `<tr style="border-bottom:1px solid #e4d8cc">
      <td style="padding:8px 12px 8px 0;font-size:13px;color:#b57a3a;white-space:nowrap">${_esc(label)}</td>
      <td style="padding:8px 12px 8px 0;font-size:13px">${_esc(summary)}</td>
      <td style="padding:8px 12px 8px 0;font-size:12px;color:#999">${email}</td>
      <td style="padding:8px 0;font-size:12px;color:#999;white-space:nowrap">${ts}</td>
    </tr>`;
  }).join("");

  const rowsText = rows.map((r) => {
    let data = {};
    try { data = JSON.parse(r.payload); } catch {}
    const label = typeLabels[r.type] || r.type;
    const summary = data.name || data.breweryId || data.eventName || "–";
    return `  [${label}] ${summary} — ${r.submitter_email || "anonym"}`;
  }).join("\n");

  const n = rows.length;
  const subject = `[Altbieratlas] ${n} neue Einreichung${n > 1 ? "en" : ""} (Tagesübersicht)`;
  const adminUrl = "https://altbieratlas.de/admin.html";

  const text = [
    `${n} neue Einreichung${n > 1 ? "en" : ""} in den letzten 24 Stunden:`,
    "", rowsText, "",
    `Admin-Bereich: ${adminUrl}`,
  ].join("\n");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px;background:#f9f5f0">
<div style="background:#b57a3a;color:#fff;padding:14px 20px;border-radius:8px 8px 0 0;font-size:18px;font-weight:600">Altbieratlas · Admin-Digest</div>
<div style="background:#fff;border:1px solid #e4d8cc;border-top:none;padding:24px 28px;border-radius:0 0 8px 8px">
  <p style="margin:0 0 16px;font-size:14px;color:#555">${n} neue Einreichung${n > 1 ? "en" : ""} in den letzten 24 Stunden:</p>
  <table style="border-collapse:collapse;width:100%;margin-bottom:20px">
    <thead><tr style="border-bottom:2px solid #e4d8cc">
      <th style="padding:6px 12px 6px 0;font-size:11px;text-align:left;color:#999;text-transform:uppercase;letter-spacing:.06em">Typ</th>
      <th style="padding:6px 12px 6px 0;font-size:11px;text-align:left;color:#999;text-transform:uppercase;letter-spacing:.06em">Inhalt</th>
      <th style="padding:6px 12px 6px 0;font-size:11px;text-align:left;color:#999;text-transform:uppercase;letter-spacing:.06em">E-Mail</th>
      <th style="padding:6px 0;font-size:11px;text-align:left;color:#999;text-transform:uppercase;letter-spacing:.06em">Uhrzeit</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <a href="${adminUrl}" style="display:inline-block;background:#b57a3a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500">Admin-Bereich öffnen</a>
</div>
</body></html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.RESEND_FROM || "Altbieratlas <noreply@altbieratlas.de>",
        to: env.ADMIN_EMAIL,
        subject, text, html,
      }),
    });
  } catch (e) {
    console.error("[digest] Resend-Fehler:", e);
  }
}

// ---- Brewery-Assembler (wandelt DB-Zeile in API-Shape) ----
export function brewRow(r, styles = []) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    short: r.short_name,
    type: r.type,
    city: r.city,
    country: r.country,
    address: r.address,
    coords: [r.lat, r.lng],
    founded: r.founded,
    website: r.website,
    description: { de: r.description_de, en: r.description_en },
    styles,
    verified: !!r.verified,
    status: r.status,
  };
}
