// Seiten dürfen keine globalen Helfer aus den gemeinsamen Skripten überschreiben.
// Eine Top-Level-Funktion im <script> einer Seite ersetzt window.<name>: so rief
// formatEuro() (i18n.js) die formatPrice() von event.html auf, die wieder
// formatEuro() aufrief, und jedes Event mit Bierpreis zeigte „Event nicht gefunden“.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../public/", import.meta.url);
const SHARED = ["config.js", "i18n.js", "shell.js", "api-client.js"];

const shared = new Map();
for (const f of SHARED) {
  const src = readFileSync(new URL(f, dir), "utf8");
  for (const m of src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) shared.set(m[1], f);
  for (const m of src.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) shared.set(m[1], f);
}

test("gemeinsame Skripte definieren globale Helfer", () => {
  for (const name of ["formatEuro", "formatPrice", "formatDate", "formatSize", "atlasMapsLink"]) {
    assert.ok(shared.has(name), name);
  }
});

for (const page of readdirSync(dir).filter((f) => f.endsWith(".html"))) {
  test(`${page}: keine Top-Level-Deklaration überschreibt einen globalen Helfer`, () => {
    const html = readFileSync(new URL(page, dir), "utf8");
    const clashes = [];
    // nur klassische Inline-Skripte: Module und externe Dateien haben eigenen Scope
    for (const m of html.matchAll(/<script(?![^>]*\b(?:src|type\s*=\s*["']?(?:module|application\/ld\+json)))[^>]*>([\s\S]*?)<\/script>/gi)) {
      for (const d of m[1].matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:var|let|const)\s+([A-Za-z_$][\w$]*)/gm)) {
        const name = d[1] || d[2];
        if (shared.has(name)) clashes.push(`${name} (aus ${shared.get(name)})`);
      }
    }
    assert.deepEqual(clashes, []);
  });
}
