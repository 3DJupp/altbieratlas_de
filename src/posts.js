// ============================================================
// Altbieratlas — Magazin (Tabelle posts)
// ============================================================
// Redaktionelle Artikel: saisonale Leitfäden, größere Veränderungen,
// Auswertungen aus den eigenen Daten. Nur der Admin schreibt sie.
//
// Öffentlich ist ein Artikel bei status = 'approved' und published_at <= heute
// (ein späteres Datum plant ihn also ein). Entwürfe (pending) sieht nur, wer
// eine Admin-Sitzung hat: dann mit noindex und Entwurfs-Hinweis. Mit Cookie
// greift der Edge-Cache nicht (cache.js), ein Entwurf landet also nie im Cache.
//
// Text-Format (body_*): kein HTML, sondern eine kleine Auszeichnung, die
// renderMarkup() serverseitig in sicheres HTML übersetzt:
//   Leerzeile        neuer Absatz
//   ## Titel         Zwischenüberschrift (### für die Ebene darunter)
//   - Punkt          Aufzählung (jede Zeile des Blocks)
//   **fett**         Hervorhebung
//   [Text](/ort/x)   Link: Seitenpfad (/…) oder http(s)-Adresse
// Links auf /ort/<id> und /event?id=<id> verknüpfen den Artikel mit dem Ort
// bzw. Termin: deren Seiten zeigen ihn dann unter „Im Magazin“. Wird eine
// Orts- oder Event-ID umbenannt, zieht renameLinkStmts() die Links mit.
// ============================================================

import { json, error, str, oneOf, safeHref, assertNoMarkup } from "./utils.js";
import { requireAdmin, escHtml } from "./routes.js";

const SITE = "https://altbieratlas.de";
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const POST_PUBLIC_SQL = "status = 'approved' AND published_at <= date('now')";

// ---------- Auszeichnung → HTML ----------

const LINK_RE = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

function inline(text) {
  let out = "", last = 0, m;
  const plain = (s) => escHtml(s).replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text))) {
    out += plain(text.slice(last, m.index));
    const [, label, target] = m;
    if (/^\/(?!\/)/.test(target)) {
      out += `<a href="${escHtml(target)}">${plain(label)}</a>`;
    } else {
      const href = /^https?:\/\//i.test(target) ? safeHref(target) : null;
      out += href ? `<a href="${escHtml(href)}" target="_blank" rel="noopener">${plain(label)}</a>` : plain(label);
    }
    last = m.index + m[0].length;
  }
  return out + plain(text.slice(last));
}

export function renderMarkup(src) {
  const blocks = String(src || "").replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  const html = [];
  for (const raw of blocks) {
    const lines = raw.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
    if (!lines.length) continue;
    const h = /^(#{2,3})\s+(.+)$/.exec(lines[0]);
    if (h) {
      const tag = h[1].length === 2 ? "h2" : "h3";
      html.push(`<${tag}>${inline(h[2].trim())}</${tag}>`);
      lines.shift();
      if (!lines.length) continue;
    }
    if (lines.every((l) => /^\s*-\s+/.test(l))) {
      html.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*-\s+/, ""))}</li>`).join("")}</ul>`);
    } else {
      html.push(`<p>${lines.map((l) => inline(l.trim())).join("<br>")}</p>`);
    }
  }
  return html.join("\n");
}

// Reiner Text (Meta-Description, llms.txt): Auszeichnung entfernen
export function plainText(src) {
  return String(src || "")
    .replace(LINK_RE, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/^#{2,3}\s+/gm, "")
    .replace(/^\s*-\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Im Text verlinkte Orte und Termine
export function linkedRefs(...bodies) {
  const breweries = new Set(), events = new Set();
  for (const b of bodies) {
    for (const m of String(b || "").matchAll(/\]\(\/ort\/([^)\s/?#]+)\)/g)) breweries.add(m[1]);
    for (const m of String(b || "").matchAll(/\]\(\/event\?id=([^)\s&#]+)\)/g)) events.add(m[1]);
  }
  return { breweries: [...breweries], events: [...events] };
}

// Links mitziehen, wenn eine Orts- oder Event-ID umbenannt wird
export function renameLinkStmts(env, kind, oldId, newId) {
  const prefix = kind === "brewery" ? "(/ort/" : "(/event?id=";
  const from = `${prefix}${oldId})`, to = `${prefix}${newId})`;
  return [env.DB.prepare(
    `UPDATE posts SET body_de = replace(body_de, ?1, ?2), body_en = replace(COALESCE(body_en, ''), ?1, ?2)
     WHERE instr(body_de, ?1) > 0 OR instr(COALESCE(body_en, ''), ?1) > 0`
  ).bind(from, to)];
}

// Öffentliche Artikel, die einen Ort bzw. Termin verlinken (für „Im Magazin“)
export async function postsLinking(env, kind, id) {
  const needle = kind === "brewery" ? `(/ort/${id})` : `(/event?id=${id})`;
  const res = await env.DB.prepare(
    `SELECT id, title_de, title_en, published_at FROM posts
     WHERE ${POST_PUBLIC_SQL} AND (instr(body_de, ?1) > 0 OR instr(COALESCE(body_en, ''), ?1) > 0)
     ORDER BY published_at DESC LIMIT 3`
  ).bind(needle).all();
  return (res.results || []).map((p) => ({
    id: p.id, title: { de: p.title_de, en: p.title_en || p.title_de }, publishedAt: p.published_at,
  }));
}

// SSR-Fassung der Box „Im Magazin“ (Client: window.atlasPostLinks in shell.js)
const RELATED_PH = /<section id="mag-related" class="container mag-related" hidden><\/section>/;
export function fillRelatedBox(html, posts) {
  if (!posts || !posts.length) return html;
  return html.replace(RELATED_PH, () => `<section id="mag-related" class="container mag-related">`
    + `<h2>Im Magazin</h2><ul>`
    + posts.map((p) => `<li><a href="/magazin/${escHtml(encodeURIComponent(p.id))}">${escHtml(p.title.de)}</a></li>`).join("")
    + `</ul></section>`);
}

// ---------- Datensatz ----------

function summary(r) {
  return {
    id: r.id,
    title: { de: r.title_de, en: r.title_en || r.title_de },
    teaser: { de: r.teaser_de || "", en: r.teaser_en || r.teaser_de || "" },
    publishedAt: r.published_at,
    updatedAt: String(r.updated_at || "").slice(0, 10),
  };
}

async function loadRelated(env, row) {
  const refs = linkedRefs(row.body_de, row.body_en);
  const q = (sql, ids) => ids.length
    ? env.DB.prepare(sql.replace("?", ids.map(() => "?").join(","))).bind(...ids).all().then((r) => r.results || [])
    : Promise.resolve([]);
  const [b, e] = await Promise.all([
    q("SELECT id, name, city FROM breweries WHERE status = 'approved' AND id IN (?)", refs.breweries.slice(0, 20)),
    q("SELECT id, title_de, title_en, date, end_date FROM events WHERE status = 'approved' AND id IN (?)", refs.events.slice(0, 20)),
  ]);
  // Reihenfolge wie im Text
  const order = (ids) => (a, z) => ids.indexOf(a.id) - ids.indexOf(z.id);
  return {
    breweries: b.sort(order(refs.breweries)).map((x) => ({ id: x.id, name: x.name, city: x.city })),
    events: e.sort(order(refs.events)).map((x) => ({
      id: x.id, title: { de: x.title_de, en: x.title_en || x.title_de }, date: x.date, endDate: x.end_date || null,
    })),
  };
}

// Artikel laden: öffentlich oder (mit Admin-Sitzung) auch als Entwurf
async function loadPost(req, env, id) {
  const row = await env.DB.prepare("SELECT *, published_at <= date('now') AS live FROM posts WHERE id = ?").bind(id).first();
  if (!row) return null;
  const isPublic = row.status === "approved" && row.live;
  if (!isPublic) {
    const auth = await requireAdmin(req, env);
    if (!auth.ok) return null;
  }
  return { row, isPublic };
}

// ---------- Öffentliche API ----------

// GET /api/posts
export async function listPosts(req, env) {
  const res = await env.DB.prepare(
    `SELECT id, title_de, title_en, teaser_de, teaser_en, published_at, updated_at
     FROM posts WHERE ${POST_PUBLIC_SQL} ORDER BY published_at DESC, id LIMIT 200`
  ).all();
  return json({ posts: (res.results || []).map(summary) });
}

// GET /api/posts/:id
export async function getPost(req, env, { id }) {
  const found = await loadPost(req, env, id);
  if (!found) return error(404, "not-found");
  const { row, isPublic } = found;
  const related = await loadRelated(env, row);
  return json({
    post: {
      ...summary(row),
      draft: !isPublic,
      html: { de: renderMarkup(row.body_de), en: renderMarkup(row.body_en || row.body_de) },
      ...related,
    },
  });
}

// ---------- Admin ----------

function validate(body, { partial = false } = {}) {
  const out = {};
  const has = (k) => !partial || k in body;
  if (has("title_de")) out.title_de = str(body.title_de, { required: true, max: 200, name: "title_de" });
  if (has("title_en")) out.title_en = str(body.title_en, { max: 200, name: "title_en" });
  if (has("teaser_de")) out.teaser_de = str(body.teaser_de, { max: 400, name: "teaser_de" });
  if (has("teaser_en")) out.teaser_en = str(body.teaser_en, { max: 400, name: "teaser_en" });
  if (has("body_de")) out.body_de = str(body.body_de, { required: true, max: 40000, trim: false, name: "body_de" });
  if (has("body_en")) out.body_en = str(body.body_en, { max: 40000, trim: false, name: "body_en" });
  if (has("published_at")) {
    out.published_at = str(body.published_at, { required: true, max: 10, name: "published_at" });
    if (!DATE.test(out.published_at)) throw new Error("published_at: YYYY-MM-DD expected");
  }
  if ("status" in body) out.status = oneOf(body.status, ["pending", "approved", "rejected"], { name: "status" });
  assertNoMarkup(out, "post");
  return out;
}

function adminRow(r) {
  return {
    id: r.id, titleDe: r.title_de, titleEn: r.title_en, teaserDe: r.teaser_de, teaserEn: r.teaser_en,
    bodyDe: r.body_de, bodyEn: r.body_en, publishedAt: r.published_at, status: r.status,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

// GET /api/admin/posts
export async function adminListPosts(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare("SELECT * FROM posts ORDER BY published_at DESC, id LIMIT 500").all();
  return json({ posts: (res.results || []).map(adminRow) });
}

// POST /api/admin/posts
export async function adminCreatePost(req, env) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  let id, p;
  try {
    id = str(body.id, { required: true, max: 100, name: "id" });
    if (!ID.test(id)) throw new Error("id: lowercase slug expected (a-z, 0-9, -)");
    p = validate(body);
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }
  if (await env.DB.prepare("SELECT id FROM posts WHERE id = ?").bind(id).first()) return error(409, "id-already-exists");
  await env.DB.prepare(
    `INSERT INTO posts (id, title_de, title_en, teaser_de, teaser_en, body_de, body_en, published_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, p.title_de, p.title_en || null, p.teaser_de || null, p.teaser_en || null,
    p.body_de, p.body_en || null, p.published_at, p.status || "pending").run();
  return json({ ok: true, id }, { status: 201 });
}

// PUT /api/admin/posts/:id
export async function adminUpdatePost(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body) return error(400, "invalid-json");
  let p, newId = null;
  try {
    p = validate(body, { partial: true });
    if ("new_id" in body) {
      const c = str(body.new_id, { max: 100, name: "new_id" });
      if (c && c !== id) {
        if (!ID.test(c)) throw new Error("new_id: lowercase slug expected (a-z, 0-9, -)");
        newId = c;
      }
    }
  } catch (e) {
    return error(400, "validation-failed", { detail: e.message });
  }
  if (newId && await env.DB.prepare("SELECT id FROM posts WHERE id = ?").bind(newId).first()) {
    return error(409, "id-already-exists");
  }
  const fields = Object.keys(p).map((k) => `${k} = ?`);
  const values = Object.values(p);
  // Auch beim Freischalten: IndexNow meldet, was im Fenster geändert wurde.
  // Die Seite zeigt „aktualisiert am“ erst, wenn der Tag nach published_at liegt.
  if (fields.length) fields.push("updated_at = datetime('now')");
  if (newId) { fields.push("id = ?"); values.push(newId); }
  if (!fields.length) return error(400, "no-fields");
  const res = await env.DB.prepare(`UPDATE posts SET ${fields.join(", ")} WHERE id = ?`).bind(...values, id).run();
  if (!res.meta.changes) return error(404, "not-found");
  return json({ ok: true, new_id: newId || undefined });
}

// DELETE /api/admin/posts/:id
export async function adminDeletePost(req, env, { id }) {
  const auth = await requireAdmin(req, env);
  if (!auth.ok) return auth.res;
  const res = await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  if (!res.meta.changes) return error(404, "not-found");
  return json({ ok: true });
}

// ---------- SSR ----------

const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
  "August", "September", "Oktober", "November", "Dezember"];
export function dateLongDe(d) {
  const [y, m, day] = String(d || "").slice(0, 10).split("-").map(Number);
  return y && m && day ? `${day}. ${MONTHS_DE[m - 1]} ${y}` : String(d || "");
}

function metaDesc(row) {
  const s = plainText(row.teaser_de || row.body_de);
  return s.length > 155 ? s.slice(0, 155).replace(/\s+\S*$/, "") + "…" : s;
}

const ORG = { "@type": "Organization", "name": "Altbieratlas", "url": `${SITE}/` };

function ldScript(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
}

function setMeta(html, { title, desc, url }) {
  const t = escHtml(title), d = escHtml(desc), u = escHtml(url);
  const rep = (re, v) => { html = html.replace(re, (m, a, b) => `${a}${v}${b}`); };
  rep(/(<title>)[^<]*(<\/title>)/, t);
  rep(/(<meta name="description" content=")[^"]*(")/, d);
  rep(/(<meta property="og:description" content=")[^"]*(")/, d);
  rep(/(<meta name="twitter:description" content=")[^"]*(")/, d);
  rep(/(<meta property="og:title" content=")[^"]*(")/, t);
  rep(/(<meta name="twitter:title" content=")[^"]*(")/, t);
  if (url) {
    rep(/(<link rel="canonical" href=")[^"]*(")/, u);
    rep(/(<meta property="og:url" content=")[^"]*(")/, u);
  }
  return html;
}

async function asset(req, env, pathname) {
  const u = new URL(req.url);
  u.pathname = pathname;
  u.search = "";
  return env.ASSETS.fetch(new Request(u.toString(), req));
}

function htmlRes(html, assetRes, { noStore = false } = {}) {
  const headers = new Headers(assetRes.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", noStore ? "private, no-store" : "public, max-age=300, stale-while-revalidate=3600");
  return new Response(html, { status: 200, headers });
}

export function postListItemHtml(p) {
  return `<li class="mag-item"><a href="/magazin/${escHtml(encodeURIComponent(p.id))}">`
    + `<span class="mag-date">${escHtml(dateLongDe(p.published_at))}</span>`
    + `<span class="mag-title">${escHtml(p.title_de)}</span>`
    + (p.teaser_de ? `<span class="mag-teaser">${escHtml(p.teaser_de)}</span>` : "")
    + `</a></li>`;
}

// GET /magazin
export async function serveMagazin(req, env, pageDate) {
  const assetRes = await asset(req, env, "/magazin.html");
  if (!assetRes.ok) return assetRes;
  const res = await env.DB.prepare(
    `SELECT id, title_de, teaser_de, published_at, updated_at FROM posts
     WHERE ${POST_PUBLIC_SQL} ORDER BY published_at DESC, id LIMIT 200`
  ).all();
  const posts = res.results || [];
  let html = await assetRes.text();
  if (posts.length) {
    html = html.replace(/(<ul class="mag-list" id="mag-list">)[\s\S]*?(<\/ul>)/,
      (m, a, b) => a + posts.map(postListItemHtml).join("") + b);
  }
  const pageUrl = `${SITE}/magazin`;
  const newest = posts.reduce((d, p) => (String(p.updated_at || "").slice(0, 10) > d ? String(p.updated_at).slice(0, 10) : d), pageDate || "");
  html = html.replace("</head>", () => ldScript({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Altbieratlas", "item": `${SITE}/` },
          { "@type": "ListItem", "position": 2, "name": "Magazin", "item": pageUrl },
        ],
      },
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#page`,
        "url": pageUrl,
        "name": "Altbier-Magazin",
        "inLanguage": "de",
        ...(newest ? { "dateModified": newest } : {}),
        "mainEntity": {
          "@type": "ItemList",
          "itemListElement": posts.map((p, i) => ({
            "@type": "ListItem", "position": i + 1, "url": `${SITE}/magazin/${encodeURIComponent(p.id)}`, "name": p.title_de,
          })),
        },
      },
    ],
  }) + "\n</head>");
  return htmlRes(html, assetRes);
}

// GET /magazin/<id> — 404-Antwort ohne Body, der Worker liefert dann die Fehlerseite
export async function servePost(req, env, { id }) {
  const found = await loadPost(req, env, id);
  if (!found) return new Response("Not found", { status: 404 });
  const { row, isPublic } = found;
  const assetRes = await asset(req, env, "/artikel.html");
  if (!assetRes.ok) return assetRes;
  const related = await loadRelated(env, row).catch(() => ({ breweries: [], events: [] }));

  const pageUrl = `${SITE}/magazin/${encodeURIComponent(row.id)}`;
  const desc = metaDesc(row);
  const updated = String(row.updated_at || "").slice(0, 10);
  let html = setMeta(await assetRes.text(), { title: `${row.title_de} · Altbieratlas`, desc, url: pageUrl });
  if (!isPublic) {
    html = html.replace("</head>", '<meta name="robots" content="noindex, nofollow" />\n</head>');
  }

  const sub = (re, fn) => { html = html.replace(re, fn); };
  sub(/(<h1 class="art-title" id="art-title">)[\s\S]*?(<\/h1>)/, (m, a, b) => a + escHtml(row.title_de) + b);
  sub(/(<span id="bc-title">)[\s\S]*?(<\/span>)/, (m, a, b) => a + escHtml(row.title_de) + b);
  sub(/(<div class="art-meta" id="art-meta">)(<\/div>)/, (m, a, b) => a
    + `<time datetime="${escHtml(row.published_at)}">${escHtml(dateLongDe(row.published_at))}</time>`
    + (updated > row.published_at ? ` <span>· aktualisiert am ${escHtml(dateLongDe(updated))}</span>` : "")
    + (!isPublic ? ` <span class="art-draft">Entwurf, nicht öffentlich</span>` : "") + b);
  if (row.teaser_de) sub(/(<p class="art-teaser" id="art-teaser"[^>]*>)(<\/p>)/, (m, a, b) => a.replace(" hidden", "") + escHtml(row.teaser_de) + b);
  sub(/(<div class="art-body" id="art-body">)(<\/div>)/, (m, a, b) => a + renderMarkup(row.body_de) + b);
  if (related.breweries.length || related.events.length) {
    const items = [
      ...related.breweries.map((x) => `<li><a href="/ort/${escHtml(encodeURIComponent(x.id))}">${escHtml(x.name)}</a>${x.city ? ` · ${escHtml(x.city)}` : ""}</li>`),
      ...related.events.map((x) => `<li><a href="/event?id=${escHtml(encodeURIComponent(x.id))}">${escHtml(x.title.de)}</a> · ${escHtml(dateLongDe(x.date))}</li>`),
    ].join("");
    sub(/(<aside class="art-related" id="art-related") hidden(>[\s\S]*?<ul id="art-related-list">)(<\/ul>)/, (m, a, mid, b) => a + mid + items + b);
  }

  if (isPublic) {
    html = html.replace("</head>", () => ldScript({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Altbieratlas", "item": `${SITE}/` },
            { "@type": "ListItem", "position": 2, "name": "Magazin", "item": `${SITE}/magazin` },
            { "@type": "ListItem", "position": 3, "name": row.title_de, "item": pageUrl },
          ],
        },
        {
          "@type": "Article",
          "@id": `${pageUrl}#article`,
          "headline": row.title_de.slice(0, 110),
          "description": desc,
          "url": pageUrl,
          "mainEntityOfPage": pageUrl,
          "inLanguage": "de",
          "image": `${SITE}/og-image.png`,
          "datePublished": row.published_at,
          "dateModified": updated > row.published_at ? updated : row.published_at,
          "author": ORG,
          "publisher": ORG,
        },
      ],
    }) + "\n</head>");
  }
  return htmlRes(html, assetRes, { noStore: !isPublic });
}
