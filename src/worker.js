// ============================================================
// Altbieratlas — Worker-Entrypoint
// ============================================================
// - /api/*      → JSON-API (siehe routes.js)
// - alles andere → ASSETS-Binding (statische Dateien aus /public)
// ============================================================

import * as R from "./routes.js";
import { error, hashPassword, sendAdminDigest } from "./utils.js";

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
async function bootstrapInitialAdmin(env) {
  if (!env.INITIAL_ADMIN) return;
  let cfg;
  try { cfg = JSON.parse(env.INITIAL_ADMIN); } catch { return; }
  if (!cfg.username || !cfg.password || String(cfg.password).length < 10) return;
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM admin_users").first();
  if (row?.n > 0) return;
  const hash = await hashPassword(String(cfg.password));
  await env.DB.prepare(
    "INSERT OR IGNORE INTO admin_users (username, password_hash, email) VALUES (?, ?, ?)"
  ).bind(String(cfg.username), hash, cfg.email ? String(cfg.email) : null).run();
  console.log(`[bootstrap] Initialer Admin '${cfg.username}' angelegt.`);
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
  ["GET",    "/api/events/:id/calendar.ics",              R.eventIcs],
  ["GET",    "/api/glossary",                              R.listGlossary],
  ["GET",    "/api/geocode",                               R.geocode],
  ["POST",   "/api/contributions",                         R.postContribution],
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
  ["GET",    "/api/admin/events",                          R.adminListEvents],
  ["POST",   "/api/admin/events",                          R.adminCreateEvent],
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
  ["GET",    "/api/admin/glossary",                        R.adminListGlossary],
  ["POST",   "/api/admin/glossary",                        R.adminCreateGlossary],
  ["PUT",    "/api/admin/glossary/:term",                  R.adminUpdateGlossary],
  ["DELETE", "/api/admin/glossary/:term",                  R.adminDeleteGlossary],
];

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendAdminDigest(env));
  },

  async fetch(request, env, ctx) {
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

    // Dynamische Sitemap (außerhalb /api, damit Crawler sie unter /sitemap.xml finden)
    if (url.pathname === "/sitemap.xml" && request.method === "GET") {
      try {
        return await R.sitemap(request, env, {});
      } catch (e) {
        console.error("[worker] sitemap threw:", e?.stack || e);
        return new Response("sitemap error", { status: 500 });
      }
    }

    // Impressum: Daten serverseitig ins HTML eingebettet (nicht via JSON-API)
    if (url.pathname === "/impressum.html" && request.method === "GET" && env.ASSETS) {
      try {
        return await R.serveImpressum(request, env);
      } catch (e) {
        console.error("[worker] impressum threw:", e?.stack || e);
        // bei Fehler: statische Datei unverändert ausliefern
      }
    }

    // Statische Dateien über ASSETS-Binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not found", { status: 404 });
  },
};
