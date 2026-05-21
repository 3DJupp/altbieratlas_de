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
    if (srv.version)                                              cfg.version             = srv.version;
    if (srv.author && typeof srv.author === "object") {
      cfg.author = cfg.author || {};
      for (const k of ["name", "github", "linkedin", "website", "instagram", "mastodon", "kofi"]) {
        if (srv.author[k]) cfg.author[k] = srv.author[k];
      }
    }
    if (srv.banner) cfg.banner = srv.banner;
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
          type: c.data.type || "brewpub",
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
    async getEvent(id) {
      const ev = (window.ATLAS_DATA.events || []).find((e) => e.id === id);
      if (!ev) return { error: "not-found" };
      return { event: { ...ev, breweryName: null, breweryCity: null }, beers: [] };
    },
    async listGlossary() { return { glossary: window.ATLAS_DATA.glossary }; },
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

  async function upload(path, file, fieldName = "logo") {
    const fd = new FormData();
    fd.append(fieldName, file);
    const r = await fetch(`${base}${path}`, { method: "POST", credentials: "same-origin", body: fd });
    const text = await r.text();
    let parsed = {};
    try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
    if (!r.ok) {
      const err = new Error(parsed.error || `http-${r.status}`);
      err.status = r.status;
      err.detail = parsed;
      throw err;
    }
    return parsed;
  }

  const LIVE = {
    getConfig:        () => req("/config"),
    getStats:         () => req("/stats"),
    listBreweries:    () => req("/breweries"),
    getBrewery:       (id) => req(`/breweries/${encodeURIComponent(id)}`),
    listStyles:       () => req("/styles"),
    listPrices:       () => req("/prices"),
    listEvents:       () => req("/events"),
    getEvent:         (id) => req(`/events/${encodeURIComponent(id)}`),
    listGlossary:     () => req("/glossary"),
    geocode:          async (q) => { try { return await req(`/geocode?q=${encodeURIComponent(q)}`); } catch { return { results: [] }; } },
    submitContribution: (body) => req("/contributions", { method: "POST", body }),
    // Admin
    admin: {
      login:          (username, password, turnstileToken) => req("/admin/login", { method: "POST", body: { username, password, turnstileToken } }),
      logout:         () => req("/admin/logout", { method: "POST" }),
      me:             () => req("/admin/me"),
      stats:          () => req("/admin/stats"),
      listContribs:   (status = "pending") => req(`/admin/contributions?status=${encodeURIComponent(status)}`),
      approve:        (id) => req(`/admin/contributions/${encodeURIComponent(id)}/approve`, { method: "POST" }),
      reject:         (id, notes) => req(`/admin/contributions/${encodeURIComponent(id)}/reject`, { method: "POST", body: { notes } }),
      listBreweries:        () => req("/admin/breweries"),
      updateBrewery:        (id, patch) => req(`/admin/breweries/${encodeURIComponent(id)}`, { method: "PUT", body: patch }),
      deleteBrewery:        (id) => req(`/admin/breweries/${encodeURIComponent(id)}`, { method: "DELETE" }),
      uploadBreweryPhoto:   (id, file) => upload(`/admin/breweries/${encodeURIComponent(id)}/photo`, file, "photo"),
      deleteBreweryPhoto:   (id) => req(`/admin/breweries/${encodeURIComponent(id)}/photo`, { method: "DELETE" }),
      requestReset:   (email) => req("/admin/request-reset", { method: "POST", body: { email } }),
      resetPassword:  (token, password) => req("/admin/reset-password", { method: "POST", body: { token, password } }),
      listEvents:        () => req("/admin/events"),
      updateEvent:       (id, patch) => req(`/admin/events/${encodeURIComponent(id)}`, { method: "PUT", body: patch }),
      deleteEvent:       (id) => req(`/admin/events/${encodeURIComponent(id)}`, { method: "DELETE" }),
      listEventBeers:    (id) => req(`/admin/events/${encodeURIComponent(id)}/beers`),
      addEventBeer:      (id, body) => req(`/admin/events/${encodeURIComponent(id)}/beers`, { method: "POST", body }),
      updateEventBeer:   (id, beerId, body) => req(`/admin/events/${encodeURIComponent(id)}/beers/${encodeURIComponent(beerId)}`, { method: "PUT", body }),
      deleteEventBeer:   (id, beerId) => req(`/admin/events/${encodeURIComponent(id)}/beers/${encodeURIComponent(beerId)}`, { method: "DELETE" }),
      listPrices:     () => req("/admin/prices"),
      addPrice:       (body) => req("/admin/prices", { method: "POST", body }),
      updatePrice:    (id, patch) => req(`/admin/prices/${encodeURIComponent(id)}`, { method: "PUT", body: patch }),
      deletePrice:    (id) => req(`/admin/prices/${encodeURIComponent(id)}`, { method: "DELETE" }),
      listStyles:     () => req("/admin/styles"),
      createStyle:    (body) => req("/admin/styles", { method: "POST", body }),
      updateStyle:    (id, patch) => req(`/admin/styles/${encodeURIComponent(id)}`, { method: "PUT", body: patch }),
      deleteStyle:    (id) => req(`/admin/styles/${encodeURIComponent(id)}`, { method: "DELETE" }),
      uploadStyleLogo: (id, file) => upload(`/admin/styles/${encodeURIComponent(id)}/logo`, file),
      deleteStyleLogo: (id) => req(`/admin/styles/${encodeURIComponent(id)}/logo`, { method: "DELETE" }),
      listLogos:      () => req("/admin/logos"),
      deleteLogo:     (key) => req(`/admin/logos/${encodeURIComponent(key)}`, { method: "DELETE" }),
      listGlossary:        () => req("/admin/glossary"),
      createGlossaryTerm:  (body) => req("/admin/glossary", { method: "POST", body }),
      updateGlossaryTerm:  (term, patch) => req(`/admin/glossary/${encodeURIComponent(term)}`, { method: "PUT", body: patch }),
      deleteGlossaryTerm:  (term) => req(`/admin/glossary/${encodeURIComponent(term)}`, { method: "DELETE" }),
      createBrewery:       (body) => req("/admin/breweries", { method: "POST", body }),
      createEvent:         (body) => req("/admin/events", { method: "POST", body }),
      listVenueTypes:      () => req("/admin/venue-types"),
      createVenueType:     (body) => req("/admin/venue-types", { method: "POST", body }),
      updateVenueType:     (id, patch) => req(`/admin/venue-types/${encodeURIComponent(id)}`, { method: "PUT", body: patch }),
      deleteVenueType:     (id) => req(`/admin/venue-types/${encodeURIComponent(id)}`, { method: "DELETE" }),
      getSettings:         () => req("/admin/settings"),
      updateSettings:      (body) => req("/admin/settings", { method: "PUT", body }),
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
    getEvent:           (id) => call("getEvent", id),
    listGlossary:       () => call("listGlossary"),
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
      login:          (u, p, t) => window.AtlasAPI.admin._gate("login", u, p, t),
      logout:         () => window.AtlasAPI.admin._gate("logout"),
      me:             () => window.AtlasAPI.admin._gate("me"),
      stats:          () => window.AtlasAPI.admin._gate("stats"),
      listContribs:   (s) => window.AtlasAPI.admin._gate("listContribs", s),
      approve:        (id) => window.AtlasAPI.admin._gate("approve", id),
      reject:         (id, n) => window.AtlasAPI.admin._gate("reject", id, n),
      listBreweries:      () => window.AtlasAPI.admin._gate("listBreweries"),
      updateBrewery:      (id, p) => window.AtlasAPI.admin._gate("updateBrewery", id, p),
      deleteBrewery:      (id) => window.AtlasAPI.admin._gate("deleteBrewery", id),
      uploadBreweryPhoto: (id, f) => window.AtlasAPI.admin._gate("uploadBreweryPhoto", id, f),
      deleteBreweryPhoto: (id) => window.AtlasAPI.admin._gate("deleteBreweryPhoto", id),
      listEvents:     () => window.AtlasAPI.admin._gate("listEvents"),
      updateEvent:    (id, p) => window.AtlasAPI.admin._gate("updateEvent", id, p),
      deleteEvent:    (id) => window.AtlasAPI.admin._gate("deleteEvent", id),
      listPrices:     () => window.AtlasAPI.admin._gate("listPrices"),
      addPrice:       (b) => window.AtlasAPI.admin._gate("addPrice", b),
      updatePrice:    (id, p) => window.AtlasAPI.admin._gate("updatePrice", id, p),
      deletePrice:    (id) => window.AtlasAPI.admin._gate("deletePrice", id),
      listStyles:     () => window.AtlasAPI.admin._gate("listStyles"),
      createStyle:    (b) => window.AtlasAPI.admin._gate("createStyle", b),
      updateStyle:    (id, p) => window.AtlasAPI.admin._gate("updateStyle", id, p),
      deleteStyle:    (id) => window.AtlasAPI.admin._gate("deleteStyle", id),
      uploadStyleLogo: (id, f) => window.AtlasAPI.admin._gate("uploadStyleLogo", id, f),
      deleteStyleLogo: (id) => window.AtlasAPI.admin._gate("deleteStyleLogo", id),
      listLogos:       () => window.AtlasAPI.admin._gate("listLogos"),
      deleteLogo:      (key) => window.AtlasAPI.admin._gate("deleteLogo", key),
      listGlossary:        () => window.AtlasAPI.admin._gate("listGlossary"),
      createGlossaryTerm:  (b) => window.AtlasAPI.admin._gate("createGlossaryTerm", b),
      updateGlossaryTerm:  (t, p) => window.AtlasAPI.admin._gate("updateGlossaryTerm", t, p),
      deleteGlossaryTerm:  (t) => window.AtlasAPI.admin._gate("deleteGlossaryTerm", t),
      createBrewery:       (b) => window.AtlasAPI.admin._gate("createBrewery", b),
      createEvent:         (b) => window.AtlasAPI.admin._gate("createEvent", b),
      listEventBeers:      (id) => window.AtlasAPI.admin._gate("listEventBeers", id),
      addEventBeer:        (id, b) => window.AtlasAPI.admin._gate("addEventBeer", id, b),
      updateEventBeer:     (id, bid, b) => window.AtlasAPI.admin._gate("updateEventBeer", id, bid, b),
      deleteEventBeer:     (id, bid) => window.AtlasAPI.admin._gate("deleteEventBeer", id, bid),
      listVenueTypes:      () => window.AtlasAPI.admin._gate("listVenueTypes"),
      createVenueType:     (b) => window.AtlasAPI.admin._gate("createVenueType", b),
      updateVenueType:     (id, p) => window.AtlasAPI.admin._gate("updateVenueType", id, p),
      deleteVenueType:     (id) => window.AtlasAPI.admin._gate("deleteVenueType", id),
      getSettings:         () => window.AtlasAPI.admin._gate("getSettings"),
      updateSettings:      (b) => window.AtlasAPI.admin._gate("updateSettings", b),
    },
  };

  // Kick off probe so that the resolved mode is ready early
  probe();
})();
