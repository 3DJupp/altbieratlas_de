// ============================================================
// Altbieratlas — API-Client
// ============================================================
// Einheitliche Schnittstelle für alle Seiten. Entscheidet automatisch
// zwischen Live-API (Worker + D1) und Mock-Fallback (window.ATLAS_DATA
// + LocalStorage), damit die Seiten sowohl lokal als auch deployed
// funktionieren.
//
// Modus (siehe config.js → apiMode):
//   "auto" → probiert Live (/api/stats), fällt bei Fehler auf Mock
//   "live" → nur Live
//   "mock" → nur Mock
// ============================================================

(function () {
  const cfg = window.ATLAS_CONFIG;
  const base = cfg.apiBaseUrl.replace(/\/$/, "");

  // ---- Mode detection ----
  const modeHint = cfg.apiMode || "auto";
  let resolvedMode = modeHint === "auto" ? null : modeHint; // wird per probe gesetzt
  let configReady = false;

  // Merged die Server-Config in window.ATLAS_CONFIG (nur nicht-null Werte).
  // Ermöglicht, Werte per wrangler.toml [vars] bzw. Dashboard-Override zu
  // pflegen, statt sie im Frontend-Bundle zu hinterlegen.
  function mergeServerConfig(srv) {
    if (!srv || typeof srv !== "object") return;
    if (srv.turnstileSiteKey)                                      cfg.turnstileSiteKey    = srv.turnstileSiteKey;
    if (typeof srv.turnstileEnabled === "boolean")                 cfg.turnstileEnabled    = srv.turnstileEnabled;
    if (srv.ga4MeasurementId)                                      cfg.ga4MeasurementId    = srv.ga4MeasurementId;
    if (Array.isArray(srv.priceSizes) && srv.priceSizes.length)    cfg.priceSizes          = srv.priceSizes;
    if (Array.isArray(srv.highlightedSizes))                       cfg.highlightedSizes    = srv.highlightedSizes;
    if (typeof srv.requireModeration === "boolean")                cfg.requireModeration   = srv.requireModeration;
    if (srv.author && typeof srv.author === "object") {
      cfg.author = cfg.author || {};
      for (const k of ["name", "github", "linkedin", "website"]) {
        if (srv.author[k]) cfg.author[k] = srv.author[k];
      }
    }
    if (srv.currency) cfg.currency = srv.currency;
  }

  async function probe() {
    if (resolvedMode && configReady) return resolvedMode;
    try {
      // /api/config liefert sowohl einen Lebens-Ping (→ live) als auch
      // die komplette Site-Config.
      const r = await fetch(`${base}/config`, { method: "GET" });
      if (r.ok) {
        const srv = await r.json();
        mergeServerConfig(srv);
        resolvedMode = "live";
        console.info("[atlas] API live.");
      } else {
        resolvedMode = "mock";
        console.info("[atlas] API nicht OK — Mock-Fallback.");
      }
    } catch {
      resolvedMode = "mock";
      console.info("[atlas] API nicht erreichbar — Mock-Fallback.");
    }
    configReady = true;
    window.ATLAS_MODE = resolvedMode;
    document.dispatchEvent(new CustomEvent("atlas:mode-ready", { detail: resolvedMode }));
    document.dispatchEvent(new CustomEvent("atlas:config-ready", { detail: cfg }));
    return resolvedMode;
  }

  // ---- Mock-Implementierung (Seed + LocalStorage) ----
  const MOCK = {
    _userContribs() {
      try { return JSON.parse(localStorage.getItem("atlas-contributions") || "[]"); }
      catch { return []; }
    },
    _pushUserContrib(c) {
      const all = this._userContribs();
      all.unshift({ ...c, id: "c_" + Date.now(), status: "pending", createdAt: new Date().toISOString() });
      localStorage.setItem("atlas-contributions", JSON.stringify(all));
    },
    async getConfig() {
      return {
        turnstileSiteKey:  cfg.turnstileSiteKey,
        turnstileEnabled:  cfg.turnstileEnabled,
        priceSizes:        cfg.priceSizes,
        highlightedSizes:  cfg.highlightedSizes,
        requireModeration: cfg.requireModeration ?? true,
      };
    },
    async getStats() {
      const d = window.ATLAS_DATA;
      const list = d.prices.filter((p) => p.size === "0,25l");
      const avg = list.length ? list.reduce((a, b) => a + b.price, 0) / list.length : null;
      return { breweryCount: d.breweries.length, priceCount: d.prices.length, avgPrice025: avg };
    },
    async listBreweries() {
      const d = window.ATLAS_DATA;
      // Ergänze eingereichte Brauereien aus LocalStorage, markiert als pending
      const userBrews = this._userContribs()
        .filter((c) => c.type === "brewery" && c.data && (c.data.coords || (c.data.lat && c.data.lng)))
        .map((c) => ({
          id: c.id,
          name: c.data.name,
          short: c.data.name,
          type: c.data.type || "hausbrauerei",
          city: c.data.city || "",
          country: c.data.country || "DE",
          address: c.data.address || "",
          coords: c.data.coords || [parseFloat(c.data.lat), parseFloat(c.data.lng)],
          founded: null,
          website: c.data.website || null,
          description: { de: c.data.description || "", en: c.data.description || "" },
          styles: [],
          verified: false,
          status: "pending",
          pending: true,
        }));
      return { breweries: [...d.breweries, ...userBrews] };
    },
    async getBrewery(id) {
      const d = window.ATLAS_DATA;
      const b = d.breweries.find((x) => x.id === id);
      if (!b) return { error: "not-found" };
      const prices = d.prices.filter((p) => p.breweryId === id)
        .slice().sort((a, b) => b.date.localeCompare(a.date));
      return { brewery: b, prices };
    },
    async listStyles() { return { styles: window.ATLAS_DATA.styles }; },
    async listPrices() { return { prices: window.ATLAS_DATA.prices }; },
    async listEvents() { return { events: window.ATLAS_DATA.events }; },
    async listGlossary() { return { glossary: window.ATLAS_DATA.glossary }; },
    async listVenueTypes() {
      return { venueTypes: [
        { id: "brewery", label: { de: "Hausbrauerei", en: "Brewpub" } },
        { id: "pub",     label: { de: "Gastronomie",  en: "Bar / Restaurant" } },
        { id: "shop",    label: { de: "Handel",       en: "Retail" } },
      ]};
    },
    async geocode(q) {
      if (!q || q.length < 2) return { results: [] };
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(q)}`,
          { headers: { "Accept": "application/json" } },
        );
        if (!r.ok) return { results: [] };
        const rows = await r.json();
        return {
          results: rows.map((x) => {
            const addr = x.address || {};
            return {
              name: x.display_name,
              lat: parseFloat(x.lat),
              lng: parseFloat(x.lon),
              city: addr.city || addr.town || addr.village || addr.municipality || "",
              type: x.type,
              class: x.class,
            };
          }),
        };
      } catch {
        return { results: [] };
      }
    },
    async submitContribution(body) {
      this._pushUserContrib({ type: body.type, data: body.data });
      return { ok: true, status: "pending", mock: true };
    },
  };

  // ---- Live-Implementierung (HTTP) ----
  async function req(path, { method = "GET", body, credentials = "same-origin" } = {}) {
    const init = { method, credentials, headers: {} };
    if (body != null) {
      init.headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const r = await fetch(`${base}${path}`, init);
    const text = await r.text();
    let json = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (!r.ok) {
      const err = new Error(json.error || `http-${r.status}`);
      err.status = r.status;
      err.detail = json;
      throw err;
    }
    return json;
  }

  const LIVE = {
    getConfig:        () => req("/config"),
    getStats:         () => req("/stats"),
    listBreweries:    () => req("/breweries"),
    getBrewery:       (id) => req(`/breweries/${encodeURIComponent(id)}`),
    listStyles:       () => req("/styles"),
    listPrices:       () => req("/prices"),
    listEvents:       () => req("/events"),
    listGlossary:     () => req("/glossary"),
    listVenueTypes:   () => req("/venue-types"),
    geocode:          async (q) => { try { return await req(`/geocode?q=${encodeURIComponent(q)}`); } catch { return { results: [] }; } },
    submitContribution: (body) => req("/contributions", { method: "POST", body }),
    // Admin
    admin: {
      login:            (username, password, turnstileToken) => req("/admin/login", { method: "POST", body: { username, password, turnstileToken } }),
      logout:           () => req("/admin/logout", { method: "POST" }),
      me:               () => req("/admin/me"),
      stats:            () => req("/admin/stats"),
      listContribs:     (status = "pending") => req(`/admin/contributions?status=${encodeURIComponent(status)}`),
      approve:          (id) => req(`/admin/contributions/${encodeURIComponent(id)}/approve`, { method: "POST" }),
      reject:           (id, notes) => req(`/admin/contributions/${encodeURIComponent(id)}/reject`, { method: "POST", body: { notes } }),
      listBreweries:    () => req("/admin/breweries"),
      updateBrewery:    (id, patch) => req(`/admin/breweries/${encodeURIComponent(id)}`, { method: "PUT", body: patch }),
      deleteBrewery:    (id) => req(`/admin/breweries/${encodeURIComponent(id)}`, { method: "DELETE" }),
      requestReset:     (email) => req("/admin/request-reset", { method: "POST", body: { email } }),
      resetPassword:    (token, password) => req("/admin/reset-password", { method: "POST", body: { token, password } }),
      listVenueTypes:   () => req("/venue-types"),
      updateVenueType:  (id, patch) => req(`/admin/venue-types/${encodeURIComponent(id)}`, { method: "PUT", body: patch }),
      listStyles:       () => req("/admin/styles"),
      createStyle:      (data) => req("/admin/styles", { method: "POST", body: data }),
      updateStyle:      (id, patch) => req(`/admin/styles/${encodeURIComponent(id)}`, { method: "PUT", body: patch }),
      deleteStyle:      (id) => req(`/admin/styles/${encodeURIComponent(id)}`, { method: "DELETE" }),
      getBrewery:       (id) => req(`/admin/breweries/${encodeURIComponent(id)}`),
      listEvents:       (status) => req(`/admin/events${status ? "?status=" + encodeURIComponent(status) : ""}`),
      createEvent:      (data) => req("/admin/events", { method: "POST", body: data }),
      updateEvent:      (id, patch) => req(`/admin/events/${encodeURIComponent(id)}`, { method: "PUT", body: patch }),
      deleteEvent:      (id) => req(`/admin/events/${encodeURIComponent(id)}`, { method: "DELETE" }),
      listPrices:       (breweryId) => req(`/admin/prices${breweryId ? "?brewery_id=" + encodeURIComponent(breweryId) : ""}`),
      updatePrice:      (id, patch) => req(`/admin/prices/${encodeURIComponent(id)}`, { method: "PUT", body: patch }),
      deletePrice:      (id) => req(`/admin/prices/${encodeURIComponent(id)}`, { method: "DELETE" }),
    },
  };

  // ---- Öffentliche API: window.AtlasAPI ----
  async function call(method, ...args) {
    const mode = await probe();
    const impl = mode === "live" ? LIVE : MOCK;
    const fn = impl[method];
    if (!fn) throw new Error(`No ${mode} impl for '${method}'`);
    return fn.apply(impl, args);
  }

  window.AtlasAPI = {
    ready: probe,
    mode:  () => resolvedMode,

    getConfig:          () => call("getConfig"),
    getStats:           () => call("getStats"),
    listBreweries:      () => call("listBreweries"),
    getBrewery:         (id) => call("getBrewery", id),
    listStyles:         () => call("listStyles"),
    listPrices:         () => call("listPrices"),
    listEvents:         () => call("listEvents"),
    listGlossary:       () => call("listGlossary"),
    listVenueTypes:     () => call("listVenueTypes"),
    geocode:            (q) => call("geocode", q),
    submitContribution: (body) => call("submitContribution", body),

    // Admin-Endpunkte funktionieren nur live — im Mock immer 401
    admin: {
      async _gate(fn, ...args) {
        const mode = await probe();
        if (mode !== "live") {
          const e = new Error("admin-requires-live-api");
          e.status = 501;
          throw e;
        }
        return LIVE.admin[fn].apply(LIVE.admin, args);
      },
      login:           (u, p, t) => window.AtlasAPI.admin._gate("login", u, p, t),
      logout:          () => window.AtlasAPI.admin._gate("logout"),
      me:              () => window.AtlasAPI.admin._gate("me"),
      stats:           () => window.AtlasAPI.admin._gate("stats"),
      listContribs:    (s) => window.AtlasAPI.admin._gate("listContribs", s),
      approve:         (id) => window.AtlasAPI.admin._gate("approve", id),
      reject:          (id, n) => window.AtlasAPI.admin._gate("reject", id, n),
      listBreweries:   () => window.AtlasAPI.admin._gate("listBreweries"),
      updateBrewery:   (id, p) => window.AtlasAPI.admin._gate("updateBrewery", id, p),
      deleteBrewery:   (id) => window.AtlasAPI.admin._gate("deleteBrewery", id),
      // Passwort-Reset benötigt keine Session — direkt an LIVE delegieren
      requestReset:    (email) => LIVE.admin.requestReset(email),
      resetPassword:   (token, pw) => LIVE.admin.resetPassword(token, pw),
      // Venue types + styles (erfordern Session)
      listVenueTypes:  () => window.AtlasAPI.admin._gate("listVenueTypes"),
      updateVenueType: (id, p) => window.AtlasAPI.admin._gate("updateVenueType", id, p),
      listStyles:      () => window.AtlasAPI.admin._gate("listStyles"),
      createStyle:     (d) => window.AtlasAPI.admin._gate("createStyle", d),
      updateStyle:     (id, p) => window.AtlasAPI.admin._gate("updateStyle", id, p),
      deleteStyle:     (id) => window.AtlasAPI.admin._gate("deleteStyle", id),
      getBrewery:      (id) => window.AtlasAPI.admin._gate("getBrewery", id),
      listEvents:      (s) => window.AtlasAPI.admin._gate("listEvents", s),
      createEvent:     (d) => window.AtlasAPI.admin._gate("createEvent", d),
      updateEvent:     (id, p) => window.AtlasAPI.admin._gate("updateEvent", id, p),
      deleteEvent:     (id) => window.AtlasAPI.admin._gate("deleteEvent", id),
      listPrices:      (bid) => window.AtlasAPI.admin._gate("listPrices", bid),
      updatePrice:     (id, p) => window.AtlasAPI.admin._gate("updatePrice", id, p),
      deletePrice:     (id) => window.AtlasAPI.admin._gate("deletePrice", id),
    },
  };

  // Kick off probe so that the resolved mode is ready early
  probe();
})();
