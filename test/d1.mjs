// Minimaler D1-Ersatz auf node:sqlite (prepare/bind/first/all/run/batch),
// mit dem Schema aus migrations/0001_schema.sql.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) { return new Stmt(this.db, this.sql, args); }
  #params() {
    // D1 erlaubt ?1, ?2 …: node:sqlite bindet die als benannte Parameter
    if (/\?\d/.test(this.sql)) return [Object.fromEntries(this.args.map((v, i) => [`?${i + 1}`, v ?? null]))];
    return this.args.map((v) => v ?? null);
  }
  async first(col) { const r = this.db.prepare(this.sql).get(...this.#params()); return r ? (col ? r[col] : { ...r }) : null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.#params()).map((r) => ({ ...r })) }; }
  async run() { const r = this.db.prepare(this.sql).run(...this.#params()); return { meta: { changes: Number(r.changes) } }; }
}

export function makeDB() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../migrations/0001_schema.sql", import.meta.url), "utf8"));
  return {
    raw: db,
    prepare: (sql) => new Stmt(db, sql),
    async batch(stmts) {
      db.exec("BEGIN");
      try { const out = []; for (const s of stmts) out.push(await s.run()); db.exec("COMMIT"); return out; }
      catch (e) { db.exec("ROLLBACK"); throw e; }
    },
  };
}
