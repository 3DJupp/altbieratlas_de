// ============================================================
// Altbieratlas — Edge-Cache für öffentliche GET-Antworten
// ============================================================
// Die Daten ändern sich selten (Admin-Pflege), gelesen wird ständig
// (Besucher, Crawler, KI-Bots). Fertige Antworten landen deshalb für
// EDGE_CACHE_TTL Sekunden im Cache der jeweiligen Cloudflare-Colo
// (caches.default). Ein Treffer kostet keine einzige D1-Abfrage.
//
// Invalidierung: Jede Colo führt eine Cache-Generation, die selbst als
// winziger Eintrag im Cache liegt und Teil jedes Cache-Keys ist. Nach einer
// erfolgreichen Admin-Mutation setzt bumpGeneration() eine neue Generation
// → in dieser Colo (die des Admins) sind sofort alle Einträge veraltet.
// Andere Colos holen sich die Änderung spätestens nach Ablauf der TTL.
// ============================================================

// Lebensdauer im Edge-Cache (Sekunden). Einzige Stelle für die TTL.
export const EDGE_CACHE_TTL = 600;

// Interne URL der Generations-Marke. Hostname ist frei gewählt, der Eintrag
// verlässt den Cache nie. Er lebt deutlich länger als die Inhalte.
const GEN_KEY = "https://edge-cache.altbieratlas.internal/generation";
const GEN_TTL = 7 * 24 * 3600;

// Öffentliche GET-Pfade, deren Antwort nur von der URL abhängt.
// Bewusst NICHT dabei: /api/admin/*, /api/geocode und /api/untappd/*
// (eigene Logik bzw. eigener Cache), statische Dateien (ASSETS cached selbst).
const EXACT = new Set([
  "/", "/ranglisten", "/wissen", "/ort", "/event", "/impressum",
  "/sitemap.xml", "/llms.txt", "/llms-full.txt",
  "/api/config", "/api/stats", "/api/breweries", "/api/styles", "/api/prices",
  "/api/events", "/api/venue-types", "/api/glossary", "/api/rivals/votes",
  "/api/og/ort",
]);
const PREFIXES = ["/ort/", "/stadt/", "/api/breweries/", "/api/events/"];

// Tracking-Parameter ändern die Antwort nicht → nicht in den Key, sonst
// erzeugt jeder geteilte Link mit utm_* einen eigenen Cache-Eintrag.
const IGNORED_PARAMS = /^(utm_[a-z]+|fbclid|gclid|msclkid|mc_[a-z]+)$/i;

export function isCacheable(request, url) {
  if (request.method !== "GET") return false;
  // Eingeloggte Admins sehen immer den Live-Stand und füllen den Cache nicht
  if (/(?:^|;\s*)atlas_session=/.test(request.headers.get("cookie") || "")) return false;
  return EXACT.has(url.pathname) || PREFIXES.some((p) => url.pathname.startsWith(p));
}

async function currentGeneration(cache, ctx) {
  const hit = await cache.match(GEN_KEY);
  if (hit) return hit.text();
  // Marke fehlt (erster Request der Colo oder verdrängt): neu anlegen.
  // Eine neue Generation macht höchstens alte Einträge unerreichbar —
  // das kostet ein paar Cache-Misses, liefert aber nie Veraltetes aus.
  return writeGeneration(cache, ctx);
}

function writeGeneration(cache, ctx) {
  const gen = Date.now().toString(36);
  const put = cache.put(GEN_KEY, new Response(gen, {
    headers: { "cache-control": `max-age=${GEN_TTL}` },
  }));
  ctx.waitUntil(put);
  return gen;
}

// Nach Admin-Mutationen: alle Einträge dieser Colo auf einen Schlag verwerfen.
export function bumpGeneration(ctx) {
  writeGeneration(caches.default, ctx);
}

function keyFor(url, gen) {
  const k = new URL(url.origin + url.pathname);
  const params = [...url.searchParams].filter(([n]) => !IGNORED_PARAMS.test(n));
  params.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [n, v] of params) k.searchParams.append(n, v);
  k.searchParams.set("__gen", gen);
  return new Request(k.toString(), { method: "GET" });
}

// Einzelnen Eintrag der aktuellen Generation löschen (z. B. Abstimmungsstand
// nach einer neuen Stimme), ohne gleich die ganze Colo zu invalidieren.
export async function purge(urlString, ctx) {
  const cache = caches.default;
  const gen = await currentGeneration(cache, ctx);
  await cache.delete(keyFor(new URL(urlString), gen));
}

// Liefert die gecachte Antwort oder erzeugt sie mit render() und legt sie ab.
// render() muss die fertige Antwort liefern (inkl. ?lang=en-Umschreibung).
// degraded() meldet, ob beim Rendern D1-Fehler abgefangen wurden.
export async function withEdgeCache(request, url, ctx, render, degraded = () => false) {
  const cache = caches.default;
  let key;
  try {
    key = keyFor(url, await currentGeneration(cache, ctx));
    const hit = await cache.match(key);
    if (hit) return restoreClientHeaders(hit, "HIT");
  } catch (e) {
    // Cache-Störung darf die Seite nie blockieren
    console.error("[cache] match failed:", e?.message || e);
  }

  const res = await render();
  // Nur saubere Erfolgsantworten ohne Cookie ablegen
  if (!key || res.status !== 200 || res.headers.has("set-cookie") || degraded()) return res;

  const headers = new Headers(res.headers);
  // Browser-Caching bleibt wie vom Handler vorgesehen; der Edge-Cache
  // bekommt eine eigene Lebensdauer, das Original wird mitgespeichert.
  headers.set("x-client-cache-control", res.headers.get("cache-control") || "");
  headers.set("cache-control", `public, max-age=${EDGE_CACHE_TTL}`);
  const [toClient, toCache] = res.body ? res.body.tee() : [null, null];
  ctx.waitUntil(
    cache.put(key, new Response(toCache, { status: 200, headers }))
      .catch((e) => console.error("[cache] put failed:", e?.message || e)),
  );
  const out = new Response(toClient, { status: res.status, statusText: res.statusText, headers: res.headers });
  out.headers.set("x-edge-cache", "MISS");
  return out;
}

function restoreClientHeaders(hit, state) {
  const res = new Response(hit.body, hit);
  const orig = res.headers.get("x-client-cache-control");
  res.headers.delete("x-client-cache-control");
  if (orig) res.headers.set("cache-control", orig);
  else res.headers.delete("cache-control");
  res.headers.set("x-edge-cache", state);
  return res;
}
