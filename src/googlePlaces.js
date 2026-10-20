// ============================================================
// Google Places (API „Places API (New)")
// ============================================================
// Gemeinsame Logik für Worker (Admin-Suche, Bewertungs-Cron) und das
// lokale Backfill-Skript (scripts/backfill-place-ids.mjs). Kein Import
// aus dem Worker-Kontext, damit Node das Modul direkt laden kann.
//
// Der Schlüssel kommt immer als Parameter (Worker: env.GOOGLE_PLACES_KEY,
// Skript: process.env.GOOGLE_PLACES_KEY) und wird nie geloggt.
//
// Google-Bedingungen: dauerhaft speichern darf man nur die Place ID.
// Bewertung und Anzahl landen höchstens 30 Tage in google_places_cache.

const API = "https://places.googleapis.com/v1";

// Treffer gilt als sicher: näher als SAFE_DISTANCE_M UND Hausnummer passt
export const SAFE_DISTANCE_M = 75;
// Bewertungen älter als das werden weder angezeigt noch behalten
export const CACHE_MAX_AGE_DAYS = 30;

export const STATUS = { SAFE: "sicher", CHECK: "prüfen", NONE: "kein Treffer" };

// Entfernung zweier Koordinaten in Metern (Haversine)
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Hausnummern aus dem Straßenteil der DB-Adresse („Bolkerstraße 41-47, 40213 …"
// → ["41", "47"]). Postleitzahlen stehen hinter dem ersten Komma und fallen weg.
export function houseNumbers(address) {
  const street = String(address || "").split(",")[0];
  return (street.match(/\d+\s*[a-z]?\b/gi) || []).map((n) => n.replace(/\s+/g, "").toLowerCase());
}

// Kommt eine der Hausnummern als eigenes Token in der Google-Adresse vor?
export function houseNumberMatches(address, formattedAddress) {
  const nums = houseNumbers(address);
  if (!nums.length || !formattedAddress) return false;
  const street = String(formattedAddress).split(",")[0].toLowerCase().replace(/(\d)\s+([a-z])\b/g, "$1$2");
  return nums.some((n) => new RegExp(`(^|[^0-9a-z])${n}([^0-9a-z]|$)`).test(street));
}

// Status eines einzelnen Treffers
export function classify(candidate, address) {
  if (!candidate) return STATUS.NONE;
  return candidate.distance != null && candidate.distance < SAFE_DISTANCE_M && candidate.houseNumberMatch
    ? STATUS.SAFE
    : STATUS.CHECK;
}

// Textsuche nach einem Ort. Liefert { status, best, candidates } — best ist
// der nächstgelegene Treffer. Wirft bei HTTP-Fehlern (Aufrufer fängt ab).
export async function searchPlace(apiKey, { name, address, lat, lng }, fetchImpl = fetch) {
  if (!apiKey) throw new Error("GOOGLE_PLACES_KEY fehlt");
  const textQuery = [name, address].filter(Boolean).join(", ");
  const body = { textQuery, languageCode: "de", regionCode: "DE" };
  if (lat != null && lng != null) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 100 } };
  }
  const res = await fetchImpl(`${API}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Places searchText HTTP ${res.status}`);
  const data = await res.json();

  const candidates = (data.places || []).map((p) => {
    const pLat = p.location?.latitude;
    const pLng = p.location?.longitude;
    const distance = pLat != null && lat != null ? Math.round(haversine(lat, lng, pLat, pLng)) : null;
    const c = {
      placeId: p.id,
      name: p.displayName?.text || "",
      address: p.formattedAddress || "",
      lat: pLat ?? null,
      lng: pLng ?? null,
      distance,
      houseNumberMatch: houseNumberMatches(address, p.formattedAddress),
    };
    c.status = classify(c, address);
    return c;
  }).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  // Ein sicherer Treffer schlägt einen näheren unsicheren
  const best = candidates.find((c) => c.status === STATUS.SAFE) || candidates[0] || null;
  return { status: best ? best.status : STATUS.NONE, best, candidates };
}

// Bewertung + Anzahl für eine Place ID. Wirft bei HTTP-Fehlern.
export async function fetchRating(apiKey, placeId, fetchImpl = fetch) {
  if (!apiKey) throw new Error("GOOGLE_PLACES_KEY fehlt");
  const res = await fetchImpl(`${API}/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "rating,userRatingCount" },
  });
  if (!res.ok) throw new Error(`Places details HTTP ${res.status}`);
  const d = await res.json();
  return { rating: d.rating ?? null, userRatingCount: d.userRatingCount ?? null };
}

// Einheitlicher Maps-Link für einen Ort (DB-Zeile oder API-Shape).
// Place ID → offizielles Maps-URLs-Format, öffnet direkt den Ort.
// Sonst gepflegte maps_url, sonst Koordinaten.
export function mapsLink(b) {
  if (!b) return null;
  const placeId = b.google_place_id ?? b.googlePlaceId;
  const lat = b.lat ?? b.coords?.[0];
  const lng = b.lng ?? b.coords?.[1];
  if (placeId) {
    const q = [b.name, b.address].filter(Boolean).join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}&query_place_id=${encodeURIComponent(placeId)}`;
  }
  const raw = b.maps_url ?? b.rawMapsUrl;
  if (raw) return raw;
  if (lat != null && lng != null) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return null;
}

// Wöchentlicher (oder manueller) Abruf: Cache für alle Orte mit Place ID
// auffrischen und Einträge > 30 Tage löschen. Fehler je Ort werden gezählt,
// nicht geworfen. Liefert eine Zusammenfassung ohne Schlüsseldaten.
export async function refreshRatings(env, { delayMs = 100 } = {}) {
  const apiKey = env.GOOGLE_PLACES_KEY;
  const summary = { total: 0, updated: 0, failed: 0, purged: 0, errors: [] };
  if (!apiKey) return { ...summary, skipped: "GOOGLE_PLACES_KEY fehlt" };

  const { results } = await env.DB.prepare(
    `SELECT DISTINCT google_place_id AS place_id FROM breweries
     WHERE google_place_id IS NOT NULL AND google_place_id != '' AND status = 'approved' AND is_historical = 0`
  ).all();
  summary.total = results.length;

  for (const { place_id } of results) {
    try {
      const r = await fetchRating(apiKey, place_id);
      await env.DB.prepare(
        `INSERT INTO google_places_cache (place_id, rating, user_rating_count, fetched_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(place_id) DO UPDATE SET rating = excluded.rating,
           user_rating_count = excluded.user_rating_count, fetched_at = excluded.fetched_at`
      ).bind(place_id, r.rating, r.userRatingCount).run();
      summary.updated++;
    } catch (e) {
      summary.failed++;
      if (summary.errors.length < 10) summary.errors.push({ placeId: place_id, error: String(e?.message || e) });
    }
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  }

  const del = await env.DB.prepare(
    `DELETE FROM google_places_cache WHERE fetched_at < datetime('now', '-${CACHE_MAX_AGE_DAYS} days')`
  ).run();
  summary.purged = del?.meta?.changes ?? 0;
  return summary;
}
