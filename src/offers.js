// ============================================================
// Altbieratlas — Aktionen und Coupons (Tabelle offers)
// ============================================================
// kind = 'offer':  Aktion des Orts, z. B. „Mittwoch 2 für 1“ (Admin oder
//                  Community-Meldung, die über die Moderation läuft)
// kind = 'coupon': Atlas-Coupon aus einer Kooperation mit dem Ort, optional
//                  mit Code; nur der Admin legt ihn an, die Seite kennzeichnet
//                  ihn als Partner-Aktion.
// weekdays: "mo,we" (Kürzel wie in src/hours.js), NULL = jeden Tag.
// time_from/time_to: "HH:MM", NULL = ganztags; Ende vor Beginn = über Mitternacht.
// valid_from/valid_until: YYYY-MM-DD, NULL = offen. Abgelaufene Aktionen
// liefert die öffentliche API nicht mehr aus; Wochentag und Uhrzeit filtert der
// Browser in Europe/Berlin (window.atlasHours), weil Antworten im Edge-Cache liegen.
// ============================================================

import { str, oneOf } from "./utils.js";
import { DAYS } from "./hours.js";

export const OFFER_KINDS = ["offer", "coupon"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Wochentage aus Liste oder "mo,we" → "mo,we" in fester Reihenfolge, leer → null
function weekdaysOf(v) {
  if (v == null || v === "") return null;
  const list = (Array.isArray(v) ? v : String(v).split(",")).map((d) => String(d).trim()).filter(Boolean);
  for (const d of list) if (!DAYS.includes(d)) throw new Error(`weekdays: unknown day ${d}`);
  const set = new Set(list);
  return set.size && set.size < 7 ? DAYS.filter((d) => set.has(d)).join(",") : null;
}

function timeOf(v, name) {
  if (v == null || v === "") return null;
  if (!TIME.test(v)) throw new Error(`${name}: HH:MM expected`);
  return v;
}

function dateOf(v, name) {
  if (v == null || v === "") return null;
  if (!DATE.test(v)) throw new Error(`${name}: YYYY-MM-DD expected`);
  return v;
}

// Prüft eine Aktion aus Admin-Formular oder Beitrag (Feldnamen wie die Spalten).
// partial = true: nur übergebene Felder (PUT). Wirft bei ungültigen Angaben.
export function normalizeOffer(body, { partial = false } = {}) {
  const out = {};
  const has = (k) => !partial || k in body;
  if (has("brewery_id")) out.brewery_id = str(body.brewery_id, { required: true, max: 80, name: "brewery_id" });
  if (has("kind")) out.kind = oneOf(body.kind || "offer", OFFER_KINDS, { name: "kind" });
  if (has("title_de")) out.title_de = str(body.title_de, { required: true, max: 120, name: "title_de" });
  if (has("title_en")) out.title_en = str(body.title_en, { max: 120, name: "title_en" });
  if (has("description_de")) out.description_de = str(body.description_de, { max: 500, name: "description_de" });
  if (has("description_en")) out.description_en = str(body.description_en, { max: 500, name: "description_en" });
  if (has("weekdays")) out.weekdays = weekdaysOf(body.weekdays);
  if (has("time_from")) out.time_from = timeOf(body.time_from, "time_from");
  if (has("time_to")) out.time_to = timeOf(body.time_to, "time_to");
  if (has("valid_from")) out.valid_from = dateOf(body.valid_from, "valid_from");
  if (has("valid_until")) out.valid_until = dateOf(body.valid_until, "valid_until");
  if (has("code")) out.code = str(body.code, { max: 40, name: "code" });
  if (has("status")) out.status = oneOf(body.status || "approved", ["pending", "approved", "rejected"], { name: "status" });
  if ((out.time_from == null) !== (out.time_to == null) && (!partial || ("time_from" in body && "time_to" in body))) {
    throw new Error("time_from/time_to: both or neither");
  }
  if (out.valid_from && out.valid_until && out.valid_until < out.valid_from) {
    throw new Error("valid_until: before valid_from");
  }
  return out;
}

// Öffentliche Form einer Zeile (offerRow) — Code nur bei Coupons
export function offerRow(r) {
  return {
    id: r.id,
    breweryId: r.brewery_id,
    kind: r.kind,
    title: { de: r.title_de, en: r.title_en || r.title_de },
    description: r.description_de || r.description_en
      ? { de: r.description_de || null, en: r.description_en || r.description_de || null } : null,
    weekdays: r.weekdays ? r.weekdays.split(",") : null,
    timeFrom: r.time_from || null,
    timeTo: r.time_to || null,
    validFrom: r.valid_from || null,
    validUntil: r.valid_until || null,
    code: r.kind === "coupon" ? r.code || null : null,
  };
}

// SQL-Bedingung für öffentlich sichtbare Aktionen (Alias o, Ort b): freigegeben,
// Ort freigegeben und nicht historisch, nicht abgelaufen (Datum in Berlin ist
// höchstens einen Tag früher als UTC — der Browser filtert ohnehin genau).
export const OFFER_PUBLIC_SQL = `o.status = 'approved' AND b.status = 'approved' AND b.is_historical = 0
  AND (o.valid_until IS NULL OR o.valid_until >= date('now', '-1 day'))`;
