#!/usr/bin/env node
// Tote interne Links auf der veröffentlichten Seite finden.
//
//   npm run check:links                          # Produktion
//   npm run check:links -- https://<branch>.dev.altbieratlas.de
//
// Lädt alle Seiten aus der sitemap.xml, sammelt jeden internen Link (href="/…")
// und ruft jedes Ziel einmal ab. Alles außer 2xx/3xx ist ein toter Link.
// Ergänzt die Prüfung beim Freischalten (deadLinks() in src/posts.js), denn
// Daten, die direkt in die D1 geschrieben werden, laufen an der API vorbei.
// Exit-Code 1 bei mindestens einem toten Link.

const base = (process.argv[2] || "https://altbieratlas.de").replace(/\/+$/, "");
const origin = new URL(base).origin;
const SKIP = /^\/(api|admin|photos|logos)(\/|$)|\.(css|js|svg|png|jpe?g|webp|ico|xml|txt|ics|json)$/i;
const CONCURRENCY = 6;

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "altbieratlas-check-links" } });
      return { status: res.status, text: await res.text() };
    } catch (e) {
      if (attempt === 2) return { status: 0, text: "", err: e.message };
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}

async function pool(items, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) { const n = i++; out[n] = await fn(items[n]); }
  }));
  return out;
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const sitemap = await get(`${base}/sitemap.xml`);
if (sitemap.status !== 200) {
  console.error(`sitemap.xml: HTTP ${sitemap.status} ${sitemap.err || ""}`);
  process.exit(2);
}
const pages = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => new URL(m[1]))
  .map((u) => base + u.pathname + u.search);
console.log(`${pages.length} Seiten aus der Sitemap von ${base}`);

// Ziel → Seiten, die darauf verlinken (die Sitemap-Seiten selbst zählen mit)
const targets = new Map();
const link = (to, from) => (targets.get(to) || targets.set(to, new Set()).get(to)).add(from);
for (const page of pages) link(page.slice(base.length) || "/", "sitemap.xml");
await pool(pages, async (page) => {
  const { status, text } = await get(page);
  if (status === 0 || status >= 300) return; // wird unten als Ziel gemeldet
  // Inline-Skripte enthalten Vorlagen wie href="/ort/${id}": keine echten Links
  const html = text.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  for (const m of html.matchAll(/href\s*=\s*"([^"]+)"/g)) {
    let href = decode(m[1]);
    if (href.startsWith(origin)) href = href.slice(origin.length);
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    href = href.replace(/#.*$/, "") || "/";
    if (SKIP.test(href.replace(/\?.*$/, ""))) continue;
    link(href, page.slice(base.length) || "/");
  }
});

const list = [...targets.keys()];
const results = await pool(list, async (path) => ({ path, ...(await get(base + path)) }));
const dead = results.filter((r) => r.status === 0 || r.status >= 400);

console.log(`${list.length} interne Ziele geprüft, ${dead.length} tot`);
for (const r of dead) {
  console.log(`\n✗ ${r.path}  (HTTP ${r.status || r.err})`);
  const from = [...targets.get(r.path)];
  for (const f of from.slice(0, 5)) console.log(`    verlinkt von ${f}`);
  if (from.length > 5) console.log(`    … und ${from.length - 5} weiteren`);
}
process.exit(dead.length ? 1 : 0);
