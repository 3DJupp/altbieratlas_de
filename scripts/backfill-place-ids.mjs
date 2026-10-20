#!/usr/bin/env node
// ============================================================
// Altbieratlas — Google Place IDs nachtragen (Backfill)
// ============================================================
// Sucht für alle aktuellen Orte ohne Place ID (is_historical = 0 AND
// google_place_id IS NULL) den Treffer bei Google (Places API New) und
// bewertet ihn wie das Admin-Panel (src/googlePlaces.js):
//   sicher        < 75 m UND Hausnummer der DB-Adresse in Googles Adresse
//   prüfen        Treffer, aber eine der Bedingungen fehlt
//   kein Treffer  Google liefert nichts
//
// Standard ist ein Dry-Run: Tabelle auf stdout, UPDATE-SQL nur für die
// sicheren Treffer in --out, alle Ergebnisse als JSON in --report.
// Erst mit --apply wird das SQL per wrangler gegen die Remote-D1 ausgeführt.
//
// Verwendung:
//   GOOGLE_PLACES_KEY=… node scripts/backfill-place-ids.mjs [Optionen]
//
// Optionen:
//   --db=<name>        D1-Name (Standard: $D1_DATABASE_NAME oder d1-altbieratlas)
//   --rows=<datei>     Orte aus JSON-Datei statt per wrangler lesen
//                      (Array von {id,name,address,city,lat,lng})
//   --out=<datei>      SQL-Datei (Standard: place-ids-backfill.sql)
//   --report=<datei>   JSON-Bericht (Standard: place-ids-backfill.json)
//   --delay=<ms>       Pause zwischen Requests (Standard: 250)
//   --apply            SQL nach dem Lauf remote ausführen
// ============================================================
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { searchPlace, STATUS } from "../src/googlePlaces.js";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (!m) { console.error(`Unbekanntes Argument: ${a}`); process.exit(1); }
  return [m[1], m[2] ?? true];
}));
const DB = args.db || process.env.D1_DATABASE_NAME || "d1-altbieratlas";
const OUT = args.out || "place-ids-backfill.sql";
const REPORT = args.report || "place-ids-backfill.json";
const DELAY = Number(args.delay ?? 250);
const APPLY = !!args.apply;

const apiKey = process.env.GOOGLE_PLACES_KEY;
if (!apiKey) {
  console.error("GOOGLE_PLACES_KEY ist nicht gesetzt.");
  process.exit(1);
}

const QUERY = `SELECT id, name, address, city, lat, lng FROM breweries
  WHERE is_historical = 0 AND google_place_id IS NULL ORDER BY id`;

function wrangler(...a) {
  return execFileSync("npx", ["wrangler", "d1", "execute", DB, "--remote", ...a], {
    encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "inherit"],
  });
}

function loadRows() {
  if (args.rows) return JSON.parse(readFileSync(args.rows, "utf8"));
  // Nur lesend: SELECT über wrangler, Ausgabe als JSON
  const out = JSON.parse(wrangler("--json", "--command", QUERY.replace(/\s+/g, " ")));
  return out[0]?.results || [];
}

const sqlStr = (v) => `'${String(v).replace(/'/g, "''")}'`;
const pad = (v, n) => {
  const s = String(v ?? "");
  return s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n);
};

const rows = loadRows();
console.log(`${rows.length} Orte ohne Place ID (nicht historisch) · DB ${DB} · ${APPLY ? "APPLY" : "Dry-Run"}\n`);

const results = [];
for (const [i, r] of rows.entries()) {
  const entry = { id: r.id, dbName: r.name, dbAddress: r.address, status: STATUS.NONE };
  try {
    const res = await searchPlace(apiKey, {
      name: r.name, address: r.address || r.city, lat: r.lat, lng: r.lng,
    });
    entry.status = res.status;
    if (res.best) {
      Object.assign(entry, {
        placeId: res.best.placeId,
        googleName: res.best.name,
        googleAddress: res.best.address,
        distance: res.best.distance,
        houseNumberMatch: res.best.houseNumberMatch,
      });
    }
    entry.candidates = res.candidates.length;
  } catch (e) {
    entry.status = "Fehler";
    entry.error = String(e?.message || e);
  }
  results.push(entry);
  if (i < rows.length - 1) await new Promise((res) => setTimeout(res, DELAY));
}

// Tabelle
const head = `${pad("id", 28)} ${pad("Name (DB)", 30)} ${pad("Name (Google)", 30)} ${pad("Adresse (Google)", 48)} ${pad("Entf.", 7)} Status`;
console.log(head);
console.log("-".repeat(head.length + 6));
for (const e of results) {
  console.log(`${pad(e.id, 28)} ${pad(e.dbName, 30)} ${pad(e.googleName, 30)} ${pad(e.googleAddress, 48)} ${pad(e.distance != null ? `${e.distance} m` : "", 7)} ${e.status}${e.error ? ` (${e.error})` : ""}`);
}

const safe = results.filter((e) => e.status === STATUS.SAFE);
const count = (st) => results.filter((e) => e.status === st).length;
console.log(`\nsicher: ${safe.length} · prüfen: ${count(STATUS.CHECK)} · kein Treffer: ${count(STATUS.NONE)} · Fehler: ${count("Fehler")}`);

// SQL nur für sichere Treffer; "IS NULL" schützt vor dem Überschreiben
// zwischenzeitlich im Admin-Panel gesetzter IDs
const sql = [
  `-- Google Place IDs (Backfill ${new Date().toISOString()}), nur Status "sicher"`,
  ...safe.map((e) => `UPDATE breweries SET google_place_id = ${sqlStr(e.placeId)}, updated_at = datetime('now') WHERE id = ${sqlStr(e.id)} AND google_place_id IS NULL AND is_historical = 0;`),
  "",
].join("\n");
writeFileSync(OUT, sql);
writeFileSync(REPORT, JSON.stringify(results, null, 2) + "\n");
console.log(`SQL: ${OUT} (${safe.length} UPDATEs) · Bericht: ${REPORT}`);

if (APPLY) {
  if (!safe.length) {
    console.log("Nichts anzuwenden.");
  } else {
    console.log(`\nWende ${safe.length} UPDATEs auf ${DB} (remote) an …`);
    wrangler("--yes", `--file=${OUT}`);
    console.log("Fertig.");
  }
} else {
  console.log("Dry-Run: nichts geschrieben. Zum Anwenden mit --apply erneut starten.");
}
