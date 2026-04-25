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
// Sendet still — wirft nie eine Exception nach außen.
export async function sendConfirmationEmail(env, { to, type, id }) {
  if (!env.RESEND_API_KEY || !to) return;
  const labels = {
    price: "Preismeldung", brewery: "Brauerei-Eintrag",
    style: "Sorten-Ergänzung", correction: "Korrektur", event: "Event-Meldung",
  };
  const label = labels[type] || type;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM || "Altbieratlas <noreply@altbieratlas.de>",
        to,
        subject: "Dein Beitrag ist eingegangen — Altbieratlas",
        text: [
          `Hallo,`,
          ``,
          `deine ${label} (ID: ${id}) ist beim Altbieratlas eingegangen`,
          `und wird nun redaktionell geprüft.`,
          ``,
          `Nach der Freigabe erscheint sie automatisch auf dem Atlas.`,
          `Wir melden uns ausschließlich bei Rückfragen.`,
          ``,
          `Vielen Dank fürs Mitmachen!`,
          `— Das Altbieratlas-Team`,
        ].join("\n"),
      }),
    });
  } catch {}
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
