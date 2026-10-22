// ============================================================
// Altbieratlas — Öffnungszeiten
// ============================================================
// Format (breweries.opening_hours und google_places_cache.opening_hours, JSON):
//   { "mo": [["11:00","23:00"]], "tu": [], "fr": [["17:00","01:00"]], … }
// Fehlender Tag = unbekannt, leere Liste = Ruhetag. Endet ein Zeitfenster vor
// seinem Beginn, geht es über Mitternacht. "24:00" ist als Ende erlaubt.
// Gegenstück im Browser: window.atlasHours in public/shell.js.
// ============================================================

export const DAYS = ["mo", "tu", "we", "th", "fr", "sa", "su"];
const SCHEMA_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DE_DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

// Prüft und vereinheitlicht ein Öffnungszeiten-Objekt. null/leer → null.
// Wirft bei ungültigen Angaben (Aufrufer gibt 400 zurück).
export function normalizeHours(input) {
  if (input == null || input === "") return null;
  const obj = typeof input === "string" ? JSON.parse(input) : input;
  if (typeof obj !== "object" || Array.isArray(obj)) throw new Error("opening_hours: object expected");
  const out = {};
  for (const [day, ranges] of Object.entries(obj)) {
    if (!DAYS.includes(day)) throw new Error(`opening_hours: unknown day ${day}`);
    if (!Array.isArray(ranges) || ranges.length > 4) throw new Error(`opening_hours.${day}: list of max. 4 ranges expected`);
    out[day] = ranges.map((r) => {
      if (!Array.isArray(r) || r.length !== 2 || !TIME.test(r[0]) || !TIME.test(r[1]) || r[0] === "24:00") {
        throw new Error(`opening_hours.${day}: ranges like ["11:00","23:00"] expected`);
      }
      return [r[0], r[1]];
    });
  }
  return Object.keys(out).length ? out : null;
}

const pad = (n) => String(n).padStart(2, "0");

// Google regularOpeningHours.periods → eigenes Format. Google zählt Tage ab
// Sonntag (0). Ein Zeitraum ohne close heißt „rund um die Uhr“.
export function fromGooglePeriods(periods) {
  if (!Array.isArray(periods) || !periods.length) return null;
  const out = Object.fromEntries(DAYS.map((d) => [d, []]));
  for (const p of periods) {
    if (!p?.open) continue;
    const day = DAYS[(p.open.day + 6) % 7];
    if (!p.close) { DAYS.forEach((d) => { out[d] = [["00:00", "24:00"]]; }); return out; }
    const open = `${pad(p.open.hour ?? 0)}:${pad(p.open.minute ?? 0)}`;
    let close = `${pad(p.close.hour ?? 0)}:${pad(p.close.minute ?? 0)}`;
    // Schluss um Mitternacht am Folgetag bleibt als 24:00 lesbar
    if (close === "00:00" && p.close.day !== p.open.day) close = "24:00";
    out[day].push([open, close]);
  }
  return out;
}

// schema.org openingHoursSpecification (nur für selbst gepflegte Zeiten).
// Ruhetage nach Google-Empfehlung als opens = closes = 00:00.
export function schemaOrgHours(hours) {
  if (!hours) return [];
  const spec = [];
  DAYS.forEach((d, i) => {
    if (!(d in hours)) return;
    const dayOfWeek = `https://schema.org/${SCHEMA_DAYS[i]}`;
    if (!hours[d].length) {
      spec.push({ "@type": "OpeningHoursSpecification", dayOfWeek, opens: "00:00", closes: "00:00" });
      return;
    }
    for (const [opens, closes] of hours[d]) {
      spec.push({ "@type": "OpeningHoursSpecification", dayOfWeek, opens, closes: closes === "24:00" ? "23:59" : closes });
    }
  });
  return spec;
}

// Zeilen für die SSR-Ausgabe: [["Mo", "11:00–23:00"], ["Di", "Ruhetag"], …]
export function hoursLinesDe(hours) {
  if (!hours) return [];
  return DAYS.filter((d) => d in hours).map((d) => [
    DE_DAYS[DAYS.indexOf(d)],
    hours[d].length ? hours[d].map(([a, b]) => `${a}–${b}`).join(", ") : "Ruhetag",
  ]);
}
