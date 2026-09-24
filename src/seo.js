// ============================================================
// Altbieratlas — SEO & Auffindbarkeit
// ============================================================
// - /llms.txt, /llms-full.txt  → Überblick bzw. Volltext für LLMs/KI-Suche
// - SSR für /, /ranglisten, /wissen → Crawler sehen echte Daten statt „Lade…"
// - ?lang=en                   → <html lang>, canonical & og:locale passend
// - IndexNow                   → Bing/Yandex (und damit u. a. ChatGPT-Suche)
//                                 zeitnah über geänderte Seiten informieren
// ============================================================

import {
  escHtml, fmtPriceDe, fmtSizeDe, fmtDateDe, sizeNum,
  citySlug, cityIndex, PAGE_DATES,
} from "./routes.js";

const SITE = "https://altbieratlas.de";
const ORG_REF = { "@id": `${SITE}/#organization` };

// ---------- Datenbasis ----------------------------------------
// Ein gemeinsamer Loader für alle SSR-/LLM-Ausgaben: freigegebene Orte,
// jüngste Preismeldung je Ort und Größe, Sorten.
async function loadVenues(env) {
  const [bRes, pRes, bsRes] = await Promise.all([
    env.DB.prepare(
      `SELECT b.id, b.name, b.short_name, b.type, b.city, b.country, b.address,
              b.founded, b.website, b.description_de, b.is_historical, b.updated_at,
              COALESCE(v.name_de, b.type) AS type_label
       FROM breweries b LEFT JOIN venue_types v ON v.id = b.type
       WHERE b.status = 'approved' ORDER BY b.city, b.is_historical, b.name`
    ).all(),
    env.DB.prepare(
      "SELECT brewery_id, date, size, price FROM prices WHERE status = 'approved' ORDER BY date DESC LIMIT 5000"
    ).all(),
    env.DB.prepare(
      `SELECT bs.brewery_id, s.name, s.abv
       FROM brewery_styles bs JOIN styles s ON s.id = bs.style_id ORDER BY s.name`
    ).all(),
  ]);
  const venues = bRes.results || [];
  const byId = new Map(venues.map((v) => [v.id, { ...v, latest: [], styles: [] }]));
  const priceCount = (pRes.results || []).filter((p) => byId.has(p.brewery_id)).length;
  // Preise kommen absteigend nach Datum → erste Meldung je Größe ist die jüngste
  for (const p of pRes.results || []) {
    const v = byId.get(p.brewery_id);
    const n = sizeNum(p.size);
    if (!v || n == null || v.latest.some((x) => Math.abs(x.size - n) < 0.001)) continue;
    v.latest.push({ size: n, price: Number(p.price), date: p.date });
  }
  for (const v of byId.values()) v.latest.sort((a, b) => a.size - b.size);
  for (const s of bsRes.results || []) byId.get(s.brewery_id)?.styles.push(s);
  return { venues: [...byId.values()], priceCount };
}

// Jüngste Meldung je Ort für eine Größe (Standard 0,25 l), aufsteigend nach Preis
function pricedAt(venues, size = 0.25) {
  return venues
    .map((v) => ({ v, p: v.latest.find((x) => Math.abs(x.size - size) < 0.001) }))
    .filter((x) => x.p)
    .sort((a, b) => a.p.price - b.p.price);
}

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// Klartext aus Beschreibungen: keine Zeilenumbrüche in Markdown-Listen
const oneLine = (s) => String(s || "").replace(/\s+/g, " ").trim();

async function fetchAsset(req, env, pathname) {
  const assetUrl = new URL(req.url);
  assetUrl.pathname = pathname;
  assetUrl.search = "";
  return env.ASSETS.fetch(new Request(assetUrl.toString(), req));
}

function htmlResponse(html, assetRes) {
  const headers = new Headers(assetRes.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=300, stale-while-revalidate=3600");
  return new Response(html, { status: 200, headers });
}

function setMetaDescription(html, desc) {
  const e = escHtml(desc);
  return html
    .replace(/(<meta name="description" content=")[^"]*(")/, (m, a, b) => `${a}${e}${b}`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, (m, a, b) => `${a}${e}${b}`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, (m, a, b) => `${a}${e}${b}`);
}

function injectLd(html, ld) {
  // "</" im JSON escapen, damit Daten das <script> nicht beenden können
  const s = JSON.stringify(ld).replace(/<\//g, "<\\/");
  return html.replace("</head>", () => `<script type="application/ld+json">${s}</script>\n</head>`);
}

function breadcrumb(items) {
  return {
    "@type": "BreadcrumbList",
    "itemListElement": items.map(([name, url], i) => ({
      "@type": "ListItem", "position": i + 1, "name": name, "item": url,
    })),
  };
}

// ============================================================
//  llms.txt  (https://llmstxt.org)
// ============================================================
// GET /llms.txt — kompakter, verlinkter Überblick für Sprachmodelle.
export async function llmsTxt(req, env) {
  const base = new URL(req.url).origin;
  let venues = [], priceCount = 0, cities = {};
  try {
    ({ venues, priceCount } = await loadVenues(env));
    cities = await cityIndex(env);
  } catch { /* ohne DB: nur statischer Teil */ }

  const current = venues.filter((v) => !v.is_historical);
  const avg025 = avg(pricedAt(current).map((x) => x.p.price));
  const today = new Date().toISOString().slice(0, 10);

  const cityLines = Object.entries(cities).map(([slug, c]) =>
    `- [Altbier in ${c.city}](${base}/stadt/${slug}): ` +
    [c.current ? `${c.current} ${c.current == 1 ? "aktiver Ort" : "aktive Orte"}` : null,
     c.total > c.current ? `${c.total - c.current} ${c.total - c.current == 1 ? "historischer" : "historische"}` : null]
      .filter(Boolean).join(", "));

  const txt = `# Altbieratlas

> Der Altbieratlas (altbieratlas.de) ist die gemeinschaftlich gepflegte, interaktive Karte des Altbiers: Brauereien, Hausbrauereien, Kneipen und Händler mit Altbier, aktuelle Bierpreise aus Community-Meldungen, Termine und Hintergrundwissen. Schwerpunkt sind Düsseldorf und der Niederrhein.

Altbier ist ein obergäriges, bernsteinfarbenes bis dunkles Bier aus dem Rheinland. „Alt“ bezieht sich auf die alte, obergärige Brauweise, nicht auf das Alter des Bieres. Klassisch wird es in 0,25-l-Gläsern vom Köbes (Kellner) in Hausbrauereien ausgeschenkt.

Stand ${today}${venues.length ? ` · ${current.length} aktive Orte in ${Object.keys(cities).length} Städten · ${priceCount} Preismeldungen` : ""}${avg025 ? ` · 0,25 l Alt kostet im Schnitt ${fmtPriceDe(avg025)} €` : ""}.

Preise sind Meldungen der Community mit Datum und können veralten. Beim Zitieren bitte „Altbieratlas (altbieratlas.de)“ und das Meldedatum nennen.

English: Altbieratlas is a community-maintained map of Altbier, the top-fermented beer style from Düsseldorf and the Lower Rhine, with venues, current prices, events and background knowledge. Content is German; append \`?lang=en\` to any page for the English interface.

## Seiten

- [Karte](${base}/): Interaktive Karte aller Altbier-Orte mit Preis-Schnellübersicht und kommenden Terminen
- [Ranglisten](${base}/ranglisten): Wo Altbier am günstigsten und am teuersten ist, Preisvergleich je Glasgröße
- [Wissen](${base}/wissen): Geschichte des Altbiers, Sorten mit Alkoholgehalt und Bittere, Köbes-Kultur, Glossar
- [Alt vs. Kölsch](${base}/rivalen): Das Rheinderby zwischen Düsseldorf und Köln, Fakten und Abstimmung
- [Beitragen](${base}/beitragen): Preise melden, Orte eintragen, Korrekturen und Termine einreichen

## Altbier nach Stadt

${cityLines.join("\n") || "- (derzeit nicht verfügbar)"}

## Daten

- [Vollständiger Datenauszug](${base}/llms-full.txt): Alle Orte mit Adresse, Sorten und jüngsten Preisen, dazu Sorten, Glossar und Termine als Markdown
- [Termine als Atom-Feed](${base}/api/events/feed.xml)
- [Termine als iCalendar](${base}/api/events/calendar.ics)
- [Sitemap](${base}/sitemap.xml): Alle Orts-, Stadt- und Terminseiten

## Optional

- [Impressum & Datenschutz](${base}/impressum)
`;
  return textResponse(txt);
}

// GET /llms-full.txt — alle öffentlichen Inhalte als ein Markdown-Dokument.
export async function llmsFullTxt(req, env) {
  const base = new URL(req.url).origin;
  const today = new Date().toISOString().slice(0, 10);
  let venues = [], priceCount = 0, styles = [], glossary = [], events = [];
  try {
    const [data, sRes, gRes, eRes] = await Promise.all([
      loadVenues(env),
      env.DB.prepare(
        `SELECT s.name, s.abv, s.ibu, s.tasting_de, b.id AS bid, b.name AS bname
         FROM styles s LEFT JOIN breweries b ON b.id = s.primary_brewery_id AND b.status = 'approved'
         ORDER BY s.name`
      ).all(),
      env.DB.prepare("SELECT term, definition_de FROM glossary ORDER BY term").all(),
      env.DB.prepare(
        `SELECT e.id, e.title_de, e.date, e.time, e.end_date, e.location, e.description_de,
                b.name AS bname, b.city AS bcity
         FROM events e LEFT JOIN breweries b ON b.id = e.brewery_id
         WHERE e.status = 'approved' AND COALESCE(e.end_date, e.date) >= ?
         ORDER BY e.date LIMIT 100`
      ).bind(today).all(),
    ]);
    ({ venues, priceCount } = data);
    styles = sRes.results || [];
    glossary = gRes.results || [];
    events = eRes.results || [];
  } catch { /* ohne DB: nur statischer Teil */ }

  const out = [];
  const current = venues.filter((v) => !v.is_historical);
  const priced = pricedAt(current);
  const avg025 = avg(priced.map((x) => x.p.price));

  out.push(`# Altbieratlas — vollständiger Datenauszug

> Gemeinschaftlich gepflegte Karte des Altbiers mit Orten, Preisen, Sorten, Glossar und Terminen. Quelle: ${base}/ · Stand: ${today}

Preise sind Meldungen der Community mit Datum und können veralten. Beim Zitieren bitte „Altbieratlas (altbieratlas.de)“ und das Meldedatum nennen. Detailseite je Ort: ${base}/ort/<id>, Übersicht je Stadt: ${base}/stadt/<slug>.

## Was ist Altbier?

Die Bezeichnung Altbier meint nicht das Alter des Bieres, sondern die Art, es zu brauen: obergärig, mit Hefe, die bei wärmeren Temperaturen oben auf dem Sud arbeitet. Das ist die alte Brauart, im Gegensatz zu den später aufgekommenen, untergärigen Lagerbieren.

Im Rheinland, besonders in Düsseldorf und am Niederrhein, hat sich diese Tradition gehalten. Während der Rest Deutschlands im 19. Jahrhundert auf Pils und Export umstellte, blieben die Düsseldorfer bei ihrem dunkel-bernsteinfarbenen, würzig-herben Alt. Die klassischen Düsseldorfer Hausbrauereien sind Uerige, Füchschen und Schlüssel in der Altstadt sowie Schumacher an der Oststraße; 2010 kam Kürzer in der Altstadt dazu.

Ausgeschenkt wird Altbier traditionell in 0,25-l-Gläsern vom Köbes, dem Kellner der Hausbrauerei. Ein leeres Glas wird ungefragt ersetzt, bis man einen Bierdeckel darauflegt; jedes Glas wird als Strich auf dem Deckel notiert. Kölsch aus dem 47 km entfernten Köln ist ebenfalls obergärig, aber hell. Die Rivalität beider Städte ist sprichwörtlich (${base}/rivalen).

## Kennzahlen

- Aktive Orte: ${current.length}
- Historische (geschlossene) Orte: ${venues.length - current.length}
- Preismeldungen gesamt: ${priceCount}
${avg025 ? `- Durchschnittspreis 0,25 l (jüngste Meldung je Ort): ${fmtPriceDe(avg025)} €` : ""}
${priced.length ? `- Günstigstes 0,25 l: ${priced[0].v.name} (${priced[0].v.city}), ${fmtPriceDe(priced[0].p.price)} €, gemeldet ${fmtDateDe(priced[0].p.date)}` : ""}
${priced.length ? `- Teuerstes 0,25 l: ${priced.at(-1).v.name} (${priced.at(-1).v.city}), ${fmtPriceDe(priced.at(-1).p.price)} €, gemeldet ${fmtDateDe(priced.at(-1).p.date)}` : ""}`
    .replace(/\n{3,}/g, "\n\n").replace(/\n+$/, ""));

  // ---- Orte nach Stadt ----
  const byCity = new Map();
  for (const v of venues) {
    if (!byCity.has(v.city)) byCity.set(v.city, []);
    byCity.get(v.city).push(v);
  }
  const cityOrder = [...byCity.entries()].sort((a, b) =>
    b[1].filter((v) => !v.is_historical).length - a[1].filter((v) => !v.is_historical).length
    || a[0].localeCompare(b[0], "de"));
  if (cityOrder.length) out.push("## Orte nach Stadt");
  for (const [city, list] of cityOrder) {
    const cAvg = avg(pricedAt(list.filter((v) => !v.is_historical)).map((x) => x.p.price));
    const slug = citySlug(city);
    out.push(`### ${city}\n\n` +
      (slug ? `Übersicht: ${base}/stadt/${slug}` : "") +
      (cAvg ? `\nDurchschnitt 0,25 l: ${fmtPriceDe(cAvg)} €` : ""));
    for (const v of list) {
      const lines = [`#### ${v.name}${v.is_historical ? " (historisch, nicht mehr in Betrieb)" : ""}`, ""];
      lines.push(`- Art: ${v.type_label}`);
      lines.push(`- Seite: ${base}/ort/${encodeURIComponent(v.id)}`);
      if (v.address) lines.push(`- Adresse: ${oneLine(v.address)}${v.address.includes(v.city) ? "" : ", " + v.city}`);
      if (v.founded) lines.push(`- Gegründet: ${v.founded}`);
      if (v.website) lines.push(`- Website: ${v.website}`);
      if (v.styles.length) {
        lines.push(`- Sorten: ${v.styles.map((s) =>
          s.name + (s.abv != null ? ` (${String(s.abv).replace(".", ",")} % vol)` : "")).join(", ")}`);
      }
      if (v.latest.length) {
        lines.push(`- Jüngste Preise: ${v.latest.map((p) =>
          `${fmtSizeDe(p.size)} ${fmtPriceDe(p.price)} € (${fmtDateDe(p.date)})`).join("; ")}`);
      }
      if (v.description_de) lines.push("", oneLine(v.description_de));
      out.push(lines.join("\n"));
    }
  }

  if (styles.length) {
    out.push("## Sorten\n\n" + styles.map((s) => {
      const facts = [
        s.abv != null ? `${String(s.abv).replace(".", ",")} % vol` : null,
        s.ibu != null ? `${s.ibu} IBU` : null,
        s.bname ? `Brauerei: ${s.bname} (${base}/ort/${encodeURIComponent(s.bid)})` : null,
      ].filter(Boolean).join(", ");
      return `- **${s.name}**${facts ? ` (${facts})` : ""}${s.tasting_de ? `: ${oneLine(s.tasting_de)}` : ""}`;
    }).join("\n"));
  }

  if (glossary.length) {
    out.push("## Glossar\n\n" + glossary.map((g) =>
      `- **${g.term}**: ${oneLine(g.definition_de)}`).join("\n"));
  }

  if (events.length) {
    out.push("## Kommende Termine\n\n" + events.map((e) => {
      const when = fmtDateDe(e.date) + (e.time ? `, ${e.time.slice(0, 5)} Uhr` : "") +
        (e.end_date && e.end_date !== e.date ? ` bis ${fmtDateDe(e.end_date)}` : "");
      const where = e.bname ? `${e.bname}${e.bcity ? ", " + e.bcity : ""}` : (e.location || "");
      return `- **${e.title_de}** — ${when}${where ? ` — ${oneLine(where)}` : ""} — ${base}/event?id=${encodeURIComponent(e.id)}` +
        (e.description_de ? `\n  ${oneLine(e.description_de)}` : "");
    }).join("\n"));
  }

  return textResponse(out.join("\n\n") + "\n");
}

function textResponse(txt) {
  return new Response(txt, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-robots-tag": "noindex",
    },
  });
}

// ============================================================
//  SSR: Startseite
// ============================================================
// Karte und Schnellübersicht werden im Browser gerendert; Crawler und
// KI-Bots ohne JavaScript sahen bisher nur „—". Jetzt stehen Kennzahlen und
// die Preis-Top-5 schon im HTML, das Client-Script überschreibt sie.
export async function serveIndex(req, env) {
  const [assetRes, data] = await Promise.all([
    fetchAsset(req, env, "/index.html"),
    loadVenues(env),
  ]);
  if (!assetRes.ok) return assetRes;
  const { venues, priceCount } = data;
  const priced = pricedAt(venues);
  const avg025 = avg(priced.map((x) => x.p.price));

  const li = ({ v, p }, i) => `
      <li>
        <span class="pos">${String(i + 1).padStart(2, "0")}</span>
        <span class="name">
          <a href="/ort/${escHtml(encodeURIComponent(v.id))}">${escHtml(v.short_name || v.name)}</a>
          <span class="city">${escHtml(v.city)}</span>
        </span>
        <span class="price">€ ${escHtml(fmtPriceDe(p.price))}</span>
      </li>`;

  let html = await assetRes.text();
  const fill = (id, items) => {
    html = html.replace(
      new RegExp(`<ol id="${id}" class="rank-list"></ol>`),
      () => `<ol id="${id}" class="rank-list">${items.map(li).join("")}</ol>`,
    );
  };
  fill("rank-cheapest", priced.slice(0, 5));
  fill("rank-priciest", [...priced].reverse().slice(0, 5));

  if (avg025) {
    html = html.replace(/(<div class="ticker-value mono" id="avg-price">)—(<\/div>)/,
      (m, a, b) => `${a}€ ${escHtml(fmtPriceDe(avg025))}${b}`);
  }
  html = html.replace(/(<span id="data-points">)—(<\/span>)/, (m, a, b) => `${a}${priceCount}${b}`);
  html = html.replace(/(<span id="brewery-count">)—(<\/span>)/, (m, a, b) => `${a}${venues.length}${b}`);

  if (avg025) {
    const current = venues.filter((v) => !v.is_historical);
    const cityCount = new Set(current.map((v) => v.city)).size;
    html = setMetaDescription(html,
      `Interaktive Karte des Altbiers: ${current.length} Brauereien, Kneipen und Händler in ${cityCount} Städten, ` +
      `aktuelle Preise (0,25 l im Schnitt ${fmtPriceDe(avg025)} €), Termine und Wissen. Gemeinschaftlich gepflegt.`);
  }
  return htmlResponse(html, assetRes);
}

// ============================================================
//  SSR: Ranglisten
// ============================================================
export async function serveRanglisten(req, env) {
  const [assetRes, data] = await Promise.all([
    fetchAsset(req, env, "/ranglisten.html"),
    loadVenues(env),
  ]);
  if (!assetRes.ok) return assetRes;
  const { venues, priceCount } = data;
  const priced = pricedAt(venues);
  const avg025 = avg(priced.map((x) => x.p.price));
  const pageUrl = `${SITE}/ranglisten`;

  const rows = priced.slice(0, 10).map(({ v, p }) => {
    const d = new Date(p.date);
    const my = isNaN(d) ? "" : `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    return `
      <div class="rank-row">
        <span class="nm">
          <a href="/ort/${escHtml(encodeURIComponent(v.id))}">${escHtml(v.name)}</a>
          <div class="sub">${escHtml([v.type_label, v.city].filter(Boolean).join(" · "))}</div>
        </span>
        <span class="pr-cell">
          <span class="pr">€ ${escHtml(fmtPriceDe(p.price))}</span>
          ${my ? `<span class="dt">${my}</span>` : ""}
        </span>
      </div>`;
  }).join("");

  let html = await assetRes.text();
  if (rows) {
    html = html.replace(/<div id="rank-body">[\s\S]*?<\/div>/, () => `<div id="rank-body">${rows}</div>`);
  }
  html = html.replace(/(<div class="val" id="st-br">)—(<\/div>)/, (m, a, b) => `${a}${venues.length}${b}`);
  html = html.replace(/(<div class="val" id="st-pr">)—(<\/div>)/, (m, a, b) => `${a}${priceCount}${b}`);

  if (priced.length) {
    html = setMetaDescription(html,
      `Wo ist Altbier am günstigsten? ${priced.length} Orte im Preisvergleich: 0,25 l Alt ab ` +
      `${fmtPriceDe(priced[0].p.price)} € bei ${priced[0].v.name}, im Schnitt ${fmtPriceDe(avg025)} €. ` +
      `Aktuelle Preise aus Community-Meldungen.`);
  }

  const dates = priced.map((x) => x.p.date).sort();
  html = injectLd(html, {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb([["Altbieratlas", `${SITE}/`], ["Ranglisten", pageUrl]]),
      {
        "@type": "ItemList",
        "name": "Günstigstes Altbier (0,25 l)",
        "itemListOrder": "https://schema.org/ItemListOrderAscending",
        "numberOfItems": priced.length,
        "itemListElement": priced.map(({ v }, i) => ({
          "@type": "ListItem", "position": i + 1, "name": v.name,
          "url": `${SITE}/ort/${encodeURIComponent(v.id)}`,
        })),
      },
      {
        "@type": "Dataset",
        "@id": `${pageUrl}#dataset`,
        "name": "Altbier-Preise im Altbieratlas",
        "description": "Gemeinschaftlich gemeldete Preise für Altbier in Brauereien, Kneipen und Handel, " +
          "je Ort und Glasgröße mit Meldedatum. Schwerpunkt Düsseldorf und Niederrhein.",
        "url": pageUrl,
        "inLanguage": "de",
        "isAccessibleForFree": true,
        "keywords": ["Altbier", "Bierpreise", "Düsseldorf", "Niederrhein", "Brauereien"],
        "creator": ORG_REF,
        "spatialCoverage": { "@type": "Place", "name": "Deutschland" },
        ...(dates.length ? { "temporalCoverage": `${dates[0].slice(0, 10)}/${dates.at(-1).slice(0, 10)}` } : {}),
        "variableMeasured": "Preis pro Glas Altbier in Euro",
        "distribution": {
          "@type": "DataDownload", "encodingFormat": "text/markdown", "contentUrl": `${SITE}/llms-full.txt`,
        },
      },
    ],
  });
  return htmlResponse(html, assetRes);
}

// ============================================================
//  SSR: Wissen
// ============================================================
export async function serveWissen(req, env) {
  const [assetRes, sRes, gRes] = await Promise.all([
    fetchAsset(req, env, "/wissen.html"),
    env.DB.prepare(
      `SELECT s.name, s.abv, s.ibu, s.color, s.tasting_de, s.logo_key,
              b.id AS bid, b.name AS bname
       FROM styles s LEFT JOIN breweries b ON b.id = s.primary_brewery_id AND b.status = 'approved'
       ORDER BY s.name`
    ).all(),
    env.DB.prepare("SELECT term, definition_de FROM glossary ORDER BY term").all(),
  ]);
  if (!assetRes.ok) return assetRes;
  const styles = sRes.results || [];
  const glossary = gRes.results || [];
  const pageUrl = `${SITE}/wissen`;
  // Farbe landet in einem style-Attribut → nur Hex-Werte zulassen
  const color = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || "") ? c : "#8b4513");

  let html = await assetRes.text();
  if (styles.length) {
    const cards = styles.map((s) => `
    <article class="spec-card">
      <div class="spec-head" style="background: linear-gradient(135deg, ${color(s.color)}, ${color(s.color)}cc)">
        <h3>${escHtml(s.name)}</h3>
        ${s.logo_key ? `<img src="/logos/${escHtml(s.logo_key)}" alt="" class="spec-logo">` : ""}
      </div>
      <div class="spec-body">
        ${s.abv != null ? `<div class="spec-row"><span class="k">ABV</span><span class="v">${escHtml(Number(s.abv).toFixed(1).replace(".", ","))} %</span></div>` : ""}
        ${s.ibu != null ? `<div class="spec-row"><span class="k">IBU</span><span class="v">${escHtml(s.ibu)}</span></div>` : ""}
        <p class="spec-tasting">${escHtml(s.tasting_de || "")}</p>
        ${s.bid ? `<a href="/ort/${escHtml(encodeURIComponent(s.bid))}" style="display:inline-block;margin-top:8px;font-family:var(--font-mono);font-size:11px;color:var(--copper);text-decoration:none;border:none;letter-spacing:0.04em">→ ${escHtml(s.bname)}</a>` : ""}
      </div>
    </article>`).join("");
    html = html.replace(
      /(<div class="style-spec-grid" id="style-grid">)[\s\S]*?(<\/div>)/,
      (m, a, b) => `${a}${cards}${b}`,
    );
  }
  if (glossary.length) {
    const items = glossary.map((g) => `
    <div class="gloss-item">
      <h3>${escHtml(g.term)}</h3>
      <p>${escHtml(g.definition_de || "")}</p>
    </div>`).join("");
    html = html.replace(
      /(<div class="glossary-grid" id="gloss-grid"[^>]*>)[\s\S]*?(<\/div>)/,
      (m, a, b) => `${a}${items}${b}`,
    );
  }

  html = injectLd(html, {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb([["Altbieratlas", `${SITE}/`], ["Wissen", pageUrl]]),
      {
        "@type": "Article",
        "@id": `${pageUrl}#article`,
        "headline": "Altbier: Geschichte, Sorten, Köbes-Kultur und Glossar",
        "description": "Alles über Altbier: warum es „Alt“ heißt, welche Sorten es gibt, wie der Köbes ausschenkt und die wichtigsten Begriffe.",
        "url": pageUrl,
        "inLanguage": "de",
        "image": `${SITE}/og-image.png`,
        "dateModified": PAGE_DATES["/wissen"],
        "author": ORG_REF,
        "publisher": ORG_REF,
        "about": { "@type": "Thing", "name": "Altbier", "sameAs": "https://de.wikipedia.org/wiki/Altbier" },
        "mainEntityOfPage": pageUrl,
      },
      ...(glossary.length ? [{
        "@type": "DefinedTermSet",
        "@id": `${pageUrl}#glossar`,
        "name": "Altbier-Glossar",
        "url": `${pageUrl}#glossar`,
        "hasDefinedTerm": glossary.map((g) => ({
          "@type": "DefinedTerm",
          "name": g.term,
          "description": g.definition_de,
          "inDefinedTermSet": `${pageUrl}#glossar`,
        })),
      }] : []),
    ],
  });
  return htmlResponse(html, assetRes);
}

// ============================================================
//  ?lang=en: Sprachvariante für Crawler konsistent machen
// ============================================================
// Die hreflang-Links zeigen auf <url>?lang=en. Damit Google die Variante
// als eigenständige englische Seite akzeptiert, muss sie auf sich selbst
// kanonisieren und lang="en" tragen — sonst verwirft Google das hreflang-Paar.
export function applyLangVariant(request, res) {
  const url = new URL(request.url);
  if (url.searchParams.get("lang") !== "en") return res;
  if (!(res.headers.get("content-type") || "").includes("text/html")) return res;
  const withLang = (href) => {
    try {
      const u = new URL(href, url.origin);
      u.searchParams.set("lang", "en");
      return u.toString();
    } catch { return href; }
  };
  return new HTMLRewriter()
    .on("html", { element(el) { el.setAttribute("lang", "en"); } })
    .on('link[rel="canonical"]', {
      element(el) { const h = el.getAttribute("href"); if (h) el.setAttribute("href", withLang(h)); },
    })
    .on('meta[property="og:url"]', {
      element(el) { const c = el.getAttribute("content"); if (c) el.setAttribute("content", withLang(c)); },
    })
    .on('meta[property="og:locale"]', { element(el) { el.setAttribute("content", "en_US"); } })
    .on('meta[property="og:locale:alternate"]', { element(el) { el.setAttribute("content", "de_DE"); } })
    .transform(res);
}

// ============================================================
//  IndexNow
// ============================================================
// Optionales Secret INDEXNOW_KEY (8–128 Zeichen a–z, A–Z, 0–9, -).
// Der Schlüssel wird unter /<key>.txt ausgeliefert; nach Admin-Änderungen
// meldet der Worker die betroffenen URLs an api.indexnow.org (Bing, Yandex,
// Seznam, Naver …). Ohne Secret passiert nichts.
export function indexNowKey(env) {
  const k = env.INDEXNOW_KEY;
  return k && /^[A-Za-z0-9-]{8,128}$/.test(k) ? k : null;
}

export function serveIndexNowKey(env, pathname) {
  const key = indexNowKey(env);
  if (!key || pathname !== `/${key}.txt`) return null;
  return new Response(key, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

// Meldet alle Seiten, die sich in den letzten Minuten geändert haben:
// Orte (Stammdaten oder neue Preise), deren Stadtseiten, neue Termine und die
// datengetriebenen Übersichtsseiten.
export async function pingIndexNow(env, request) {
  const key = indexNowKey(env);
  if (!key) return;
  const host = new URL(request.url).host;
  if (host !== "altbieratlas.de" && host !== "www.altbieratlas.de") return; // keine Vorschau-Hosts melden
  const base = `https://${host}`;
  try {
    const since = "datetime('now', '-10 minutes')";
    const [bRes, eRes] = await Promise.all([
      env.DB.prepare(
        `SELECT DISTINCT b.id, b.city FROM breweries b
         LEFT JOIN prices p ON p.brewery_id = b.id AND p.status = 'approved' AND p.created_at >= ${since}
         WHERE b.status = 'approved' AND (b.updated_at >= ${since} OR p.id IS NOT NULL)
         LIMIT 200`
      ).all(),
      env.DB.prepare(
        `SELECT id FROM events WHERE status = 'approved' AND created_at >= ${since} LIMIT 50`
      ).all(),
    ]);
    const urls = new Set();
    for (const b of bRes.results || []) {
      urls.add(`${base}/ort/${encodeURIComponent(b.id)}`);
      const slug = citySlug(b.city);
      if (slug) urls.add(`${base}/stadt/${slug}`);
    }
    for (const e of eRes.results || []) urls.add(`${base}/event?id=${encodeURIComponent(e.id)}`);
    if (!urls.size) return;
    urls.add(`${base}/`);
    urls.add(`${base}/ranglisten`);
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host, key, keyLocation: `${base}/${key}.txt`, urlList: [...urls],
      }),
    });
  } catch (e) {
    console.error("[indexnow]", e?.message || e);
  }
}
