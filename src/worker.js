// ============================================================
// Altbieratlas — Worker-Entrypoint
// ============================================================
// - /api/*      → JSON-API (siehe routes.js)
// - alles andere → ASSETS-Binding (statische Dateien aus /public)
// ============================================================

import * as R from "./routes.js";
import * as SEO from "./seo.js";
import { error, hashPassword, sendAdminDigest } from "./utils.js";
import { meterEnv } from "./d1meter.js";
import { isCacheable, withEdgeCache, bumpGeneration, purge } from "./cache.js";

// Minimaler Router mit Pfad-Parameter-Matching (/x/:id)
function match(pattern, path) {
  const pParts = pattern.split("/").filter(Boolean);
  const uParts = path.split("/").filter(Boolean);
  if (pParts.length !== uParts.length) return null;
  const params = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(":")) {
      params[pParts[i].slice(1)] = decodeURIComponent(uParts[i]);
    } else if (pParts[i] !== uParts[i]) {
      return null;
    }
  }
  return params;
}

// Legt den ersten Admin-User aus dem INITIAL_ADMIN-Secret an,
// falls noch keine Admin-User existieren.
// Secret-Format (JSON): {"username":"...","password":"...","email":"..."}
// Nach dem ersten Login sollte das Secret im Dashboard entfernt werden.
// Pro Isolate nur so lange prüfen, bis ein Admin existiert — sonst kostet
// ein vergessenes INITIAL_ADMIN-Secret bei jedem Request eine D1-Abfrage.
let adminExists = false;
async function bootstrapInitialAdmin(env) {
  if (!env.INITIAL_ADMIN || adminExists) return;
  let cfg;
  try { cfg = JSON.parse(env.INITIAL_ADMIN); } catch { return; }
  if (!cfg.username || !cfg.password || String(cfg.password).length < 10) return;
  const row = await env.DB.prepare("SELECT 1 AS n FROM admin_users LIMIT 1").first();
  if (row) { adminExists = true; return; }
  const hash = await hashPassword(String(cfg.password));
  await env.DB.prepare(
    "INSERT OR IGNORE INTO admin_users (username, password_hash, email) VALUES (?, ?, ?)"
  ).bind(String(cfg.username), hash, cfg.email ? String(cfg.email) : null).run();
  console.log(`[bootstrap] Initialer Admin '${cfg.username}' angelegt.`);
}

// Kanonische Ziel-URL einer Ortsseite: /ort/<slug> bzw. /ort ohne ID.
// Wird von allen Legacy-Weiterleitungen genutzt, damit keine Redirect-Ketten
// entstehen (/brauerei.html?id=x → /ort?id=x → /ort/x kostet zwei Hops).
function ortUrl(request) {
  const dest = new URL(request.url);
  const id = dest.searchParams.get("id");
  dest.pathname = id ? `/ort/${encodeURIComponent(id)}` : "/ort";
  dest.searchParams.delete("id");
  return dest.toString();
}

// Eigene 404-Seite (public/404.html) mit korrektem Status ausliefern.
async function notFoundPage(env, request) {
  if (!env.ASSETS) return new Response("Not found", { status: 404 });
  const assetUrl = new URL(request.url);
  assetUrl.pathname = "/404.html";
  const res = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  if (!res.ok) return new Response("Not found", { status: 404 });
  return new Response(res.body, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

const ROUTES = [
  // --- Public ---
  ["GET",    "/api/config",                                R.getPublicConfig],
  ["GET",    "/api/stats",                                 R.getStats],
  ["GET",    "/api/breweries",                             R.listBreweries],
  ["GET",    "/api/breweries/:id",                         R.getBrewery],
  ["GET",    "/api/styles",                                R.listStyles],
  ["GET",    "/api/prices",                                R.listPrices],
  ["POST",   "/api/prices",                                R.postPrice],
  ["GET",    "/api/events",                                R.listEvents],
  ["GET",    "/api/events/calendar.ics",                  R.eventsIcs],
  ["GET",    "/api/events/feed.xml",                      R.eventsAtom],
  ["GET",    "/api/events/:id/calendar.ics",              R.eventIcs],
  ["GET",    "/api/events/:id",                           R.getEvent],
  ["GET",    "/api/rivals/votes",                           R.getRivalVotes],
  ["POST",   "/api/rivals/vote",                            R.postRivalVote],
  ["GET",    "/api/venue-types",                            R.listVenueTypes],
  ["GET",    "/api/glossary",                              R.listGlossary],
  ["GET",    "/api/geocode",                               R.geocode],
  ["POST",   "/api/contributions",                         R.postContribution],
  // --- OG-Image ---
  ["GET",    "/api/og/ort",                                R.serveOgBrewery],
  // --- Untappd ---
  ["GET",    "/api/untappd/brewery/:id",                   R.getUntappdBrewery],
  // --- Admin ---
  ["POST",   "/api/admin/login",                           R.adminLogin],
  ["POST",   "/api/admin/logout",                          R.adminLogout],
  ["GET",    "/api/admin/me",                              R.adminMe],
  ["POST",   "/api/admin/request-reset",                   R.adminRequestReset],
  ["POST",   "/api/admin/reset-password",                  R.adminResetPassword],
  ["GET",    "/api/admin/stats",                           R.adminStats],
  ["GET",    "/api/admin/contributions",                   R.adminListContributions],
  ["POST",   "/api/admin/contributions/:id/approve",       R.adminApprove],
  ["POST",   "/api/admin/contributions/:id/reject",        R.adminReject],
  ["GET",    "/api/admin/breweries",                       R.adminListBreweries],
  ["POST",   "/api/admin/breweries",                       R.adminCreateBrewery],
  ["PUT",    "/api/admin/breweries/:id",                   R.adminUpdateBrewery],
  ["DELETE", "/api/admin/breweries/:id",                   R.adminDeleteBrewery],
  ["POST",   "/api/admin/breweries/:id/photo",             R.adminUploadBreweryPhoto],
  ["DELETE", "/api/admin/breweries/:id/photo",             R.adminDeleteBreweryPhoto],
  ["GET",    "/api/admin/events",                          R.adminListEvents],
  ["POST",   "/api/admin/events",                          R.adminCreateEvent],
  ["GET",    "/api/admin/events/:id/beers",               R.adminListEventBeers],
  ["POST",   "/api/admin/events/:id/beers",               R.adminAddEventBeer],
  ["PUT",    "/api/admin/events/:id/beers/:beerId",        R.adminUpdateEventBeer],
  ["DELETE", "/api/admin/events/:id/beers/:beerId",        R.adminDeleteEventBeer],
  ["PUT",    "/api/admin/events/:id",                      R.adminUpdateEvent],
  ["DELETE", "/api/admin/events/:id",                      R.adminDeleteEvent],
  ["GET",    "/api/admin/venue-types",                     R.adminListVenueTypes],
  ["POST",   "/api/admin/venue-types",                     R.adminCreateVenueType],
  ["PUT",    "/api/admin/venue-types/:id",                 R.adminUpdateVenueType],
  ["DELETE", "/api/admin/venue-types/:id",                 R.adminDeleteVenueType],
  ["GET",    "/api/admin/prices",                          R.adminListPrices],
  ["POST",   "/api/admin/prices",                          R.adminAddPrice],
  ["PUT",    "/api/admin/prices/:id",                      R.adminUpdatePrice],
  ["DELETE", "/api/admin/prices/:id",                      R.adminDeletePrice],
  ["GET",    "/api/admin/styles",                          R.adminListStyles],
  ["POST",   "/api/admin/styles",                          R.adminCreateStyle],
  ["PUT",    "/api/admin/styles/:id",                      R.adminUpdateStyle],
  ["DELETE", "/api/admin/styles/:id",                      R.adminDeleteStyle],
  ["POST",   "/api/admin/styles/:id/logo",                 R.adminUploadStyleLogo],
  ["DELETE", "/api/admin/styles/:id/logo",                 R.adminDeleteStyleLogo],
  ["GET",    "/api/admin/logos",                           R.adminListLogos],
  ["DELETE", "/api/admin/logos/:key",                      R.adminDeleteLogo],
  ["POST",   "/api/admin/breweries/:id/logo",              R.adminUploadBreweryLogo],
  ["DELETE", "/api/admin/breweries/:id/logo",              R.adminDeleteBreweryLogo],
  ["GET",    "/api/admin/ort-logos",                       R.adminListBreweryLogos],
  ["DELETE", "/api/admin/ort-logos/:key",                  R.adminDeleteBreweryLogoFile],
  ["GET",    "/api/admin/glossary",                        R.adminListGlossary],
  ["POST",   "/api/admin/glossary",                        R.adminCreateGlossary],
  ["PUT",    "/api/admin/glossary/:term",                  R.adminUpdateGlossary],
  ["DELETE", "/api/admin/glossary/:term",                  R.adminDeleteGlossary],
  ["GET",    "/api/admin/settings",                        R.adminGetSettings],
  ["PUT",    "/api/admin/settings",                        R.adminUpdateSettings],
];

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendAdminDigest(env));
  },

  async fetch(request, rawEnv, ctx) {
    const { env, stats } = meterEnv(rawEnv);
    const url = new URL(request.url);
    const path = url.pathname;
    const render = async () => {
      const res = await handle(request, env, ctx);
      // Sprachvariante vor dem Cachen anwenden → ?lang=en wird als eigene,
      // fertig umgeschriebene Antwort abgelegt
      return request.method === "GET" && !path.startsWith("/api/")
        ? SEO.applyLangVariant(request, res)
        : res;
    };
    const res = isCacheable(request, url)
      ? await withEdgeCache(request, url, ctx, render, () => stats.failed > 0)
      : await render();
    if (stats.queries) console.log(`[d1] ${request.method} ${path} q=${stats.queries} rows=${stats.rowsRead}`);

    // Admin-Änderung erfolgreich → Edge-Cache dieser Colo verwerfen und
    // geänderte Seiten per IndexNow melden
    if (request.method !== "GET" && path.startsWith("/api/admin/") && res.ok
        && !path.startsWith("/api/admin/log") && !path.includes("reset")) {
      bumpGeneration(ctx);
      ctx.waitUntil(SEO.pingIndexNow(env, request));
    }
    // Neue Stimme → Abstimmungsstand nicht erst nach Ablauf der TTL zeigen
    if (request.method === "POST" && path === "/api/rivals/vote" && res.ok) {
      ctx.waitUntil(purge(`${url.origin}/api/rivals/votes`, ctx));
    }
    return res;
  },
};

async function handle(request, env, ctx) {
  const url = new URL(request.url);

  // Initialen Admin aus Secret anlegen (nur solange INITIAL_ADMIN gesetzt und keine User existieren)
  if (env.INITIAL_ADMIN) await bootstrapInitialAdmin(env);

  // API-Routen
  if (url.pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": request.headers.get("origin") || "*",
          "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-allow-credentials": "true",
        },
      });
    }
    for (const [method, pattern, handler] of ROUTES) {
      if (method !== request.method) continue;
      const params = match(pattern, url.pathname);
      if (params) {
        try {
          return await handler(request, env, params, ctx);
        } catch (e) {
          console.error("[worker] handler threw:", e?.stack || e);
          return error(500, "internal-error", { detail: String(e?.message || e) });
        }
      }
    }
    return error(404, "api-route-not-found", { path: url.pathname });
  }

  // Foto-Auslieferung aus R2 (Brauerei-/Ortfotos, kein Fallback)
  if (url.pathname.startsWith("/photos/") && request.method === "GET") {
    const filename = url.pathname.slice(8); // strip "/photos/"
    if (filename && !filename.includes("..") && env.LOGOS) {
      const obj = await env.LOGOS.get(`orte/fotos/${filename}`);
      if (obj) {
        const headers = new Headers();
        headers.set("Content-Type", obj.httpMetadata?.contentType || "image/jpeg");
        headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
        return new Response(obj.body, { headers });
      }
    }
    return new Response("Not found", { status: 404 });
  }

  // Logo-Auslieferung aus R2 (mit Fallback auf SVG-Platzhalter)
  if (url.pathname.startsWith("/logos/") && request.method === "GET") {
    const key = url.pathname.slice(7); // strip "/logos/"
    if (key && !key.includes("..") && env.LOGOS) {
      const obj = await env.LOGOS.get(key);
      if (obj) {
        const headers = new Headers();
        headers.set("Content-Type", obj.httpMetadata?.contentType || "image/png");
        headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
        return new Response(obj.body, { headers });
      }
    }
    // Fallback: SVG-Platzhalter aus public/images/
    if (env.ASSETS) {
      const fallback = new URL(request.url);
      fallback.pathname = "/images/logo-fallback.svg";
      return env.ASSETS.fetch(new Request(fallback.toString(), request));
    }
    return new Response("Not found", { status: 404 });
  }

  // Dynamische Sitemap (außerhalb /api, damit Crawler sie unter /sitemap.xml finden)
  if (url.pathname === "/sitemap.xml" && request.method === "GET") {
    try {
      return await R.sitemap(request, env, {});
    } catch (e) {
      console.error("[worker] sitemap threw:", e?.stack || e);
      return new Response("sitemap error", { status: 500 });
    }
  }

  // llms.txt (Überblick) und llms-full.txt (Volltext) für Sprachmodelle
  if ((request.method === "GET" || request.method === "HEAD")
      && (url.pathname === "/llms.txt" || url.pathname === "/llms-full.txt")) {
    try {
      return url.pathname === "/llms.txt"
        ? await SEO.llmsTxt(request, env)
        : await SEO.llmsFullTxt(request, env);
    } catch (e) {
      console.error("[worker] llms threw:", e?.stack || e);
      return new Response("llms.txt error", { status: 500 });
    }
  }

  // IndexNow-Schlüsseldatei (/<INDEXNOW_KEY>.txt), nur wenn das Secret gesetzt ist
  if (request.method === "GET" && url.pathname.endsWith(".txt")) {
    const keyRes = SEO.serveIndexNowKey(env, url.pathname);
    if (keyRes) return keyRes;
  }

  // /<page>.html → /<page>  (301, kanonische Clean URLs)
  // /index.html  → /
  const ALL_PAGES = ["ranglisten", "wissen", "beitragen", "rivalen", "impressum", "admin", "ort", "brauerei", "event"];
  if (request.method === "GET" && url.pathname.endsWith(".html")) {
    const name = url.pathname.slice(1, -5); // strip leading / and trailing .html
    if (name === "index") {
      const dest = new URL(request.url);
      dest.pathname = "/";
      return Response.redirect(dest.toString(), 301);
    }
    // Legacy: /brauerei.html → /ort/<slug> (canonical rename)
    if (name === "brauerei" || name === "ort") {
      return Response.redirect(ortUrl(request), 301);
    }
    if (ALL_PAGES.includes(name)) {
      const dest = new URL(request.url);
      dest.pathname = `/${name}`;
      return Response.redirect(dest.toString(), 301);
    }
  }

  // Startseite: / → index.html (html_handling=none deaktiviert Auto-Index)
  if (request.method === "GET" && (url.pathname === "/" || url.pathname === "") && env.ASSETS) {
    // SSR: Kennzahlen und Preis-Top-5 direkt im HTML (Fallback: statisch)
    if (env.DB) {
      try {
        return await SEO.serveIndex(request, env);
      } catch (e) {
        console.error("[worker] serveIndex threw:", e?.stack || e);
      }
    }
    const assetUrl = new URL(request.url);
    assetUrl.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  }

  // Legacy-Redirect: /brauerei → /ort/<slug> (kanonische URL-Umbenennung)
  // und /ort?id=<slug> → /ort/<slug> (sprechende URL statt Query-Parameter).
  if (request.method === "GET"
      && (url.pathname === "/brauerei"
          || (url.pathname === "/ort" && url.searchParams.get("id")))) {
    return Response.redirect(ortUrl(request), 301);
  }

  // Trailing Slash auf Ortsseiten vereinheitlichen: /ort/<slug>/ → /ort/<slug>
  if (request.method === "GET" && /^\/ort\/.+\/$/.test(url.pathname)) {
    const dest = new URL(request.url);
    dest.pathname = dest.pathname.replace(/\/+$/, "");
    return Response.redirect(dest.toString(), 301);
  }

  // /ort/<slug> und /ort — SSR: Meta-Tags, JSON-LD und Seiteninhalt aus D1
  if (request.method === "GET" && (url.pathname === "/ort" || url.pathname.startsWith("/ort/"))
      && env.ASSETS && env.DB) {
    const slug = url.pathname.startsWith("/ort/")
      ? decodeURIComponent(url.pathname.slice(5)).replace(/\/+$/, "")
      : "";
    if (!slug.includes("/")) {
      try {
        return await R.serveOrt(request, env, slug ? { id: slug } : {});
      } catch (e) {
        console.error("[worker] serveOrt threw:", e?.stack || e);
        // Fallback: statische Datei ohne SSR ausliefern
      }
    }
  }

  // Impressum: SSI-Block muss VOR dem PAGES-Block liegen, damit serveImpressum() greift
  if (url.pathname === "/impressum" && request.method === "GET" && env.ASSETS) {
    try {
      const assetReq = new Request(request.url.replace("/impressum", "/impressum.html"), request);
      return await R.serveImpressum(assetReq, env);
    } catch (e) {
      console.error("[worker] impressum threw:", e?.stack || e);
      // Fallback: statische Datei ohne SSI ausliefern
    }
  }

  // /event?id=... — SSR: title + meta tags mit echten Event-Daten befüllen
  if (url.pathname === "/event" && request.method === "GET" && env.ASSETS && env.DB) {
    try {
      return await R.serveEvent(request, env);
    } catch (e) {
      console.error("[worker] serveEvent threw:", e?.stack || e);
      // Fallback: statische Datei ohne SSR ausliefern
    }
  }

  // /stadt/<slug> — SSR Stadt-Landingpage (Meta + JSON-LD + server-gerenderte Liste)
  if (url.pathname.startsWith("/stadt/") && request.method === "GET" && env.ASSETS) {
    try {
      const res = await R.serveCity(request, env);
      if (res.status === 404) return notFoundPage(env, request);
      return res;
    } catch (e) {
      console.error("[worker] serveCity threw:", e?.stack || e);
      return notFoundPage(env, request);
    }
  }

  // /ranglisten und /wissen — SSR: Daten, die sonst erst per JS kommen,
  // stehen für Crawler direkt im HTML (Fallback: statische Datei)
  if (request.method === "GET" && (url.pathname === "/ranglisten" || url.pathname === "/wissen")
      && env.ASSETS && env.DB) {
    try {
      return url.pathname === "/ranglisten"
        ? await SEO.serveRanglisten(request, env)
        : await SEO.serveWissen(request, env);
    } catch (e) {
      console.error("[worker] SSR threw:", e?.stack || e);
    }
  }

  // Extensionless URL → .html direkt servieren (kein Redirect, vermeidet Loop mit ASSETS)
  // impressum ausgenommen — wird oben mit SSI bedient
  // brauerei ausgenommen — wird oben auf /ort weitergeleitet
  const PAGES = ["ranglisten", "wissen", "beitragen", "rivalen", "admin", "ort", "event"];
  if (request.method === "GET" && !url.pathname.includes(".") && env.ASSETS) {
    const bare = url.pathname.replace(/\/$/, "");
    const name = bare.slice(1); // strip leading /
    if (bare && PAGES.includes(name)) {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = `/${name}.html`;
      return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
    }
    // /ort/<slug> ohne D1 (oder nach SSR-Fehler): Seite clientseitig rendern lassen
    if (bare.startsWith("/ort/")) {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = "/ort.html";
      return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
    }
  }

  // Statische Dateien über ASSETS-Binding
  if (env.ASSETS) {
    const res = await env.ASSETS.fetch(request);
    // Eigene 404-Seite statt der nackten Default-Antwort — hält Besucher,
    // die auf einem toten Link landen, statt sie zurückspringen zu lassen.
    if (res.status === 404 && request.method === "GET" && !url.pathname.includes(".")) {
      return notFoundPage(env, request);
    }
    return res;
  }
  return new Response("Not found", { status: 404 });
}
