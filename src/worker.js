// ============================================================
// Altbieratlas — Worker-Entrypoint
// ============================================================
// - /api/*      → JSON-API (siehe routes.js)
// - alles andere → ASSETS-Binding (statische Dateien aus /public)
// ============================================================

import * as R from "./routes.js";
import { error } from "./utils.js";

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
  ["GET",    "/api/glossary",                              R.listGlossary],
  ["GET",    "/api/geocode",                               R.geocode],
  ["POST",   "/api/contributions",                         R.postContribution],
  // --- Admin ---
  ["POST",   "/api/admin/login",                           R.adminLogin],
  ["POST",   "/api/admin/logout",                          R.adminLogout],
  ["GET",    "/api/admin/me",                              R.adminMe],
  ["GET",    "/api/admin/stats",                           R.adminStats],
  ["GET",    "/api/admin/contributions",                   R.adminListContributions],
  ["POST",   "/api/admin/contributions/:id/approve",       R.adminApprove],
  ["POST",   "/api/admin/contributions/:id/reject",        R.adminReject],
  ["GET",    "/api/admin/breweries",                       R.adminListBreweries],
  ["PUT",    "/api/admin/breweries/:id",                   R.adminUpdateBrewery],
  ["DELETE", "/api/admin/breweries/:id",                   R.adminDeleteBrewery],
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

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
            return await handler(request, env, params);
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

    // Statische Dateien über ASSETS-Binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not found", { status: 404 });
  },
};
