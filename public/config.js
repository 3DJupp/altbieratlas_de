// ============================================================
// Altbieratlas — Statische Konfiguration
// ============================================================
// Die meisten Werte hier sind **nur Fallback** für den Mock-Modus
// (lokales Testen ohne Backend). Im Live-Betrieb überschreibt
// der Worker sie mit den Werten aus wrangler.toml [vars] bzw.
// aus dem Cloudflare-Dashboard — siehe api-client.js.
// ============================================================

window.ATLAS_CONFIG = {
  // --- Site ---
  siteName: "Altbieratlas",
  siteTagline: {
    de: "Die interaktive Karte des Altbiers",
    en: "The interactive atlas of Altbier",
  },
  defaultLang: "de", // "de" | "en"

  // --- Backend ---
  apiMode: "auto", // "auto" | "live" | "mock"
  apiBaseUrl: "/api",

  // --- Karte ---
  map: {
    defaultCenter: [51.2277, 6.7735], // Düsseldorf Altstadt
    defaultZoom: 13,
    minZoom: 3,
    maxZoom: 18,
    tileUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    tileAttribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    geocodeEnabled: true,
    geocodeZoom: 13,
  },

  // --- Feature-Flags ---
  features: {
    contributions: true,
    reviews: false,
    events: true,
    priceHistory: true,
    admin: true,
  },

  // --- Währung ---
  currency: "EUR",
  // Dezimalzahlen ohne Einheit; UI formatiert locale-aware mit "l"
  priceSizes: [0.2, 0.25, 0.4, 0.5],
  // Teilmenge von priceSizes, die in Ranglisten hervorgehoben wird (leer = keine Hervorhebung)
  highlightedSizes: [0.25],
  requireModeration: true,

  // ============================================================
  // Ab hier: Werte, die der Server via /api/config überschreibt.
  // Diese Datei-Defaults greifen nur im Mock-Modus.
  // ============================================================

  // Analytics (Google Analytics 4)
  ga4MeasurementId: null,
  analyticsEnabled: false,

  // Cloudflare Turnstile (Site-Key ist öffentlich)
  turnstileSiteKey: null,
  turnstileEnabled: false,

  // Autor / Social
  author: {
    name: null,
    github: null,
    linkedin: null,
    website: null,
    instagram: null,
    mastodon: null,
    kofi: null,
  },

  // Banner (null = deaktiviert)
  banner: null,

  // ============================================================
  // Impressum-Daten — Fallback für lokale Entwicklung (Mock-Modus).
  // Im Deployment injiziert der Worker die Werte aus SITE_CONFIG
  // direkt als Inline-Skript in /impressum.html — sie werden NICHT
  // über die JSON-API übertragen.
  // ============================================================
  impressum: {
    owner: "Altbieratlas",
    address: "",
    email: "kontakt@altbieratlas.example",
  },
};
