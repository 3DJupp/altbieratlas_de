// ============================================================
// Altbieratlas — D1-Zähler
// ============================================================
// Umhüllt das DB-Binding pro Request und zählt Abfragen sowie gelesene
// Zeilen (meta.rows_read). worker.js schreibt danach eine Logzeile
//   [d1] GET /ranglisten q=4 rows=97
// in die Worker-Logs (Observability). So lässt sich im Dashboard nach
// „[d1]“ filtern und sehen, welche Pfade das Lese-Kontingent verbrauchen.
// Requests ohne D1-Zugriff (Cache-Treffer, statische Dateien) loggen nichts.
// ============================================================

export function meterEnv(env) {
  if (!env.DB) return { env, stats: { queries: 0, rowsRead: 0, failed: 0 } };
  // failed: Abfragen, die geworfen haben. Viele Handler fangen D1-Fehler ab
  // und liefern eine statische Fallback-Seite mit Status 200 — die darf
  // nicht im Edge-Cache landen.
  const stats = { queries: 0, rowsRead: 0, failed: 0 };
  const record = (meta) => {
    stats.queries++;
    stats.rowsRead += meta?.rows_read ?? 0;
  };
  const guard = async (p) => {
    try { return await p; } catch (e) { stats.failed++; throw e; }
  };
  const db = env.DB;
  const wrap = (stmt) => ({
    _stmt: stmt,
    bind: (...args) => wrap(stmt.bind(...args)),
    all: async () => { const r = await guard(stmt.all()); record(r.meta); return r; },
    run: async () => { const r = await guard(stmt.run()); record(r.meta); return r; },
    raw: (opts) => { record(null); return guard(stmt.raw(opts)); },
    // first() liefert kein meta → über all() gehen (D1 hängt bei first()
    // ohnehin kein LIMIT an, die gelesenen Zeilen sind identisch)
    first: async (col) => {
      const r = await guard(stmt.all());
      record(r.meta);
      const row = r.results?.[0] ?? null;
      return col ? (row?.[col] ?? null) : row;
    },
  });
  const DB = {
    prepare: (sql) => wrap(db.prepare(sql)),
    batch: async (stmts) => {
      const res = await guard(db.batch(stmts.map((s) => s._stmt || s)));
      for (const r of res) record(r.meta);
      return res;
    },
    exec: (sql) => { record(null); return guard(db.exec(sql)); },
    dump: () => db.dump(),
  };
  // Prototyp-Kette statt Spread: alle übrigen Bindings bleiben unverändert erreichbar
  return { env: Object.create(env, { DB: { value: DB } }), stats };
}
