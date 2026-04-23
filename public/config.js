// ============================================================
// Altbieratlas — Statische Konfiguration
// ============================================================
// Diese Datei kann per Deployment/Build-Step überschrieben werden.
// Sensible Werte (Turnstile-Secret, Admin-Passwörter) gehören NICHT
// hierher — die laufen als Worker-Secrets (siehe wrangler.toml).
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
  // "auto": versucht zuerst die Live-API (/api/stats), fällt bei 404 auf Mock zurück.
  // "mock": zwingt Mock (LocalStorage + Seed aus data.js).
  // "live": zwingt Live (schlägt fehl, wenn keine API erreichbar ist).
  apiMode: "auto",
  apiBaseUrl: "/api",

  // --- Analytics (Google Analytics 4) ---
  // Platzhalter — vor dem Deploy durch echte Measurement-ID ersetzen.
  ga4MeasurementId: "G-QLZ3NS6FNN",
  analyticsEnabled: true, // wird nach Cookie-Consent auf true gesetzt

  // --- Spam/Bot-Schutz (Cloudflare Turnstile) ---
  // Der Site-Key ist öffentlich. Der Secret-Key liegt als Worker-Secret.
  // Wird zur Laufzeit auch aus /api/config geladen (Server ist die Quelle
  // der Wahrheit) — dieser Wert ist ein Fallback für Mock-/Dev-Modus.
  turnstileSiteKey: "0x4AAAAAADANKhOfPfuzPK0H",
  turnstileEnabled: true,

  // --- Karte ---
  map: {
    defaultCenter: [51.2277, 6.7735], // Düsseldorf Altstadt
    defaultZoom: 13,
    minZoom: 3,
    maxZoom: 18,
    tileUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    tileAttribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    // Wenn keine Brauerei zur Sucheingabe passt, werden Städte/Orte über
    // den Geocoder nachgeschlagen (Proxy-Endpoint /api/geocode → Nominatim).
    geocodeEnabled: true,
    geocodeZoom: 13, // Zoomstufe nach Treffer
  },

  // --- Feature-Flags ---
  features: {
    contributions: true,
    reviews: false,
    events: true,
    priceHistory: true,
    admin: true, // zeigt Admin-Link im Footer, wenn eingeloggt
  },

  // --- Währung ---
  currency: "EUR",
  priceSizes: ["0,2l", "0,25l", "0,33l", "0,4l", "0,5l"],

  // --- Moderation ---
  requireModeration: true,

  // --- Autor / Social ---
  // Werden im Footer verlinkt. Leerlassen = kein Link.
  author: {
    name: "Dominic Spatz",
    github: "https://github.com/DEIN_USER",
    linkedin: "https://www.linkedin.com/in/DEIN_PROFIL/",
    website: "",
  },

  // --- Legal ---
  impressum: {
    owner: "Dominic Spatz",
    address: "Max Schmeling Str. 2, 40597 Düsseldorf",
    email: "kontakt@altbieratlas.de",
  },
};
