// Magazin: Freischalten darf keine toten Links erzeugen, in keiner Richtung.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeDB } from "./d1.mjs";
import * as P from "../src/posts.js";

let env;
const TOKEN = "t".repeat(64);
const req = (method, body) => new Request("https://altbieratlas.de/api/admin/posts", {
  method, headers: { cookie: `atlas_session=${TOKEN}`, "content-type": "application/json" },
  body: body ? JSON.stringify(body) : undefined,
});
const call = async (fn, method, body, params = {}) => {
  const res = await fn(req(method, body), env, params);
  return { status: res.status, body: await res.json() };
};
const post = (id, over = {}) => ({
  id, title_de: id, title_en: id, body_de: "Text", body_en: "Text",
  published_at: "2026-11-01", status: "approved", ...over,
});
const insertPost = (p) => env.DB.raw.prepare(
  `INSERT INTO posts (id, title_de, title_en, body_de, body_en, published_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
).run(p.id, p.title_de, p.title_en, p.body_de, p.body_en, p.published_at, p.status);

beforeEach(() => {
  env = { DB: makeDB() };
  const db = env.DB.raw;
  db.prepare("INSERT INTO admin_users (username, password_hash) VALUES ('admin', 'x')").run();
  db.prepare("INSERT INTO admin_sessions (token, username, expires_at) VALUES (?, 'admin', ?)")
    .run(TOKEN, new Date(Date.now() + 3600e3).toISOString());
  db.exec(`INSERT INTO venue_types (id, name_de, name_en) VALUES ('brewpub', 'Hausbrauerei', 'Brewpub')`);
  db.exec(`INSERT INTO breweries (id, name, city, lat, lng, type, status) VALUES
    ('live', 'Live', 'X', 51, 6, 'brewpub', 'approved'),
    ('wait', 'Wait', 'X', 51, 6, 'brewpub', 'pending')`);
  db.exec(`INSERT INTO events (id, title_de, title_en, date, description_de, description_en, status) VALUES
    ('fest', 'Fest', 'Fair', '2026-07-01', 'd', 'e', 'approved'),
    ('idee', 'Idee', 'Idea', '2026-07-01', 'd', 'e', 'pending')`);
});

test("Entwurf mit toten Links lässt sich speichern", async () => {
  const r = await call(P.adminCreatePost, "POST", post("a", { status: "pending", body_de: "[x](/ort/fehlt)" }));
  assert.equal(r.status, 201);
});

test("Freischalten scheitert an nicht freigegebenem Ort, Termin oder Artikel", async () => {
  insertPost(post("spaeter", { published_at: "2027-04-01" }));
  const r = await call(P.adminCreatePost, "POST", post("a", {
    body_de: "[a](/ort/live) [b](/ort/wait) [c](/event?id=fest) [d](/event?id=idee)",
    body_en: "[e](/ort/fehlt) [f](/magazin/spaeter) [g](/wissen#jahreslauf) [h](https://example.org)",
  }));
  assert.equal(r.status, 400);
  assert.equal(r.body.error, "dead-links");
  assert.deepEqual(r.body.links.sort(), ["/event?id=idee", "/magazin/spaeter", "/ort/fehlt", "/ort/wait"]);
});

test("Link auf einen eingeplanten Artikel ist ab dessen Datum erlaubt", async () => {
  insertPost(post("rk", { published_at: "2027-04-01" }));
  const body = "[rk](/magazin/rk)";
  assert.equal((await call(P.adminCreatePost, "POST", post("frueh", { body_de: body }))).status, 400);
  assert.equal((await call(P.adminCreatePost, "POST", post("spaet", { body_de: body, published_at: "2027-04-01" }))).status, 201);
});

test("Datum vorziehen prüft gegen das neue Datum", async () => {
  insertPost(post("rk", { published_at: "2027-04-01" }));
  insertPost(post("vf", { published_at: "2027-06-01", body_de: "[rk](/magazin/rk)" }));
  const r = await call(P.adminUpdatePost, "PUT", { published_at: "2026-11-25" }, { id: "vf" });
  assert.equal(r.status, 400);
  assert.deepEqual(r.body.links, ["/magazin/rk"]);
});

test("Zurückziehen, später Datieren und Löschen scheitern, solange jemand verlinkt", async () => {
  insertPost(post("ziel", { published_at: "2026-11-01" }));
  insertPost(post("quelle", { published_at: "2026-11-11", body_de: "[z](/magazin/ziel)" }));
  for (const patch of [{ status: "pending" }, { published_at: "2026-12-01" }]) {
    const r = await call(P.adminUpdatePost, "PUT", patch, { id: "ziel" });
    assert.equal(r.status, 409, JSON.stringify(patch));
    assert.deepEqual(r.body.posts, ["quelle"]);
  }
  assert.equal((await call(P.adminDeletePost, "DELETE", null, { id: "ziel" })).status, 409);
  // auf ein Datum vor dem verlinkenden Artikel verschieben ist in Ordnung
  assert.equal((await call(P.adminUpdatePost, "PUT", { published_at: "2026-10-01" }, { id: "ziel" })).status, 200);
});

test("Umbenennen zieht Links anderer Artikel mit", async () => {
  insertPost(post("alt"));
  insertPost(post("quelle", { body_de: "[z](/magazin/alt)", body_en: "[z](/magazin/alt)" }));
  const r = await call(P.adminUpdatePost, "PUT", { new_id: "neu" }, { id: "alt" });
  assert.equal(r.status, 200);
  const q = env.DB.raw.prepare("SELECT body_de, body_en FROM posts WHERE id = 'quelle'").get();
  assert.equal(q.body_de, "[z](/magazin/neu)");
  assert.equal(q.body_en, "[z](/magazin/neu)");
});
