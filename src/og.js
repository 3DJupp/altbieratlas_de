// ============================================================
// Dynamischer OG-Image-Generator für Brauerei-Detailseiten
// Erzeugt ein 1200×630-px-PNG im Stil des statischen og-image.png
// ============================================================
import satori, { init as satoriInit } from "satori/standalone";
import yogaWasm from "satori/yoga.wasm";
import { Resvg, initWasm as resvgInitWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import fontData from "./assets/PressStart2P.ttf";

// Initialisierung einmalig pro Worker-Instanz (Promise-Singleton verhindert Race Conditions)
let initPromise = null;
function ensureInit() {
  if (!initPromise) {
    initPromise = satoriInit(yogaWasm).then(() => resvgInitWasm(resvgWasm));
  }
  return initPromise;
}

// Farbpalette passend zum statischen og-image.png
const C = {
  bg:      "#1a0700",
  amber:   "#c8763a",
  foam:    "#fff8eb",
  gold:    "#d4a84b",
  text:    "#fff8eb",
  sub:     "#d4a84b",
  dim:     "#8a5a2a",
};

// Venue-Type-Bezeichnungen (DE)
const TYPE_LABELS = {
  brewery:        "Brauerei",
  brewpub:        "Hausbrauerei",
  gastronomie:    "Gastronomie",
  pub:            "Kneipe",
  restaurant:     "Restaurant",
  kiosk:          "Kiosk",
  handel:         "Handel",
  supermarket:    "Supermarkt",
  beverage_store: "Getränkeshop",
};

// Gibt den besten Preis zurück: bevorzugt 0.25 l, sonst kleinste Größe mit Daten
function bestPrice(prices) {
  if (!prices || prices.length === 0) return null;

  // Größen-Strings → Zahlen normalisieren ("0.25" → 0.25, "0,25" → 0.25)
  const normalized = prices.map((p) => ({
    ...p,
    sizeNum: parseFloat(String(p.size).replace(",", ".")),
  })).filter((p) => !isNaN(p.sizeNum) && p.avg_price > 0);

  if (normalized.length === 0) return null;

  const pref = normalized.find((p) => p.sizeNum === 0.25);
  if (pref) return pref;

  // Größte Datenmenge, dann kleinste Größe
  return normalized.sort((a, b) => b.n - a.n || a.sizeNum - b.sizeNum)[0];
}

function formatSize(size) {
  const n = parseFloat(String(size).replace(",", "."));
  if (isNaN(n)) return String(size) + " l";
  return n.toString().replace(".", ",") + " l";
}

function formatPrice(p) {
  return p.toFixed(2).replace(".", ",") + " €";
}

// Kürzt Text auf maxLen Zeichen (Wortgrenze), hängt … an
function truncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text || "";
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

// Satori-VDOM: Bierglas (vereinfacht, passend zum statischen Bild)
function glassEl() {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "90px",
        height: "340px",
        alignSelf: "center",
        marginLeft: "60px",
        marginRight: "0px",
        borderRadius: "4px",
        overflow: "hidden",
      },
      children: [
        // Schaum
        {
          type: "div",
          props: {
            style: {
              width: "100%",
              height: "52px",
              background: C.foam,
              borderRadius: "4px 4px 0 0",
            },
          },
        },
        // Bierkörper
        {
          type: "div",
          props: {
            style: {
              width: "100%",
              flex: "1",
              background: C.amber,
            },
          },
        },
      ],
    },
  };
}

export async function generateOgImage({ name, city, type, prices }) {
  await ensureInit();

  const typeLabel = TYPE_LABELS[type] || type || "";
  const price     = bestPrice(prices);

  const subtitle = [
    truncate(city, 28),
    typeLabel,
  ].filter(Boolean).join("  ·  ");

  const priceText = price
    ? `${formatSize(price.size)}  ·  ∅ ${formatPrice(price.avg_price)}`
    : null;

  const vdom = {
    type: "div",
    props: {
      style: {
        display:         "flex",
        flexDirection:   "column",
        width:           "1200px",
        height:          "630px",
        background:      C.bg,
        fontFamily:      "PressStart2P",
        position:        "relative",
        overflow:        "hidden",
      },
      children: [
        // Hauptbereich
        {
          type: "div",
          props: {
            style: {
              display:       "flex",
              flexDirection: "row",
              flex:          "1",
              alignItems:    "center",
              gap:           "0px",
            },
            children: [
              glassEl(),
              // Textbereich
              {
                type: "div",
                props: {
                  style: {
                    display:       "flex",
                    flexDirection: "column",
                    flex:          "1",
                    paddingLeft:   "60px",
                    paddingRight:  "60px",
                    gap:           "28px",
                  },
                  children: [
                    // "ALTBIERATLAS" klein oben
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize:      "22px",
                          color:         C.dim,
                          letterSpacing: "4px",
                        },
                        children: "ALTBIERATLAS",
                      },
                    },
                    // Brauereiname groß
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize:      name.length > 22 ? "34px" : "42px",
                          color:         C.text,
                          lineHeight:    "1.4",
                          letterSpacing: "1px",
                        },
                        children: truncate(name.toUpperCase(), 40),
                      },
                    },
                    // Stadt · Typ
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize:      "20px",
                          color:         C.sub,
                          letterSpacing: "2px",
                        },
                        children: subtitle.toUpperCase(),
                      },
                    },
                    // Preis (falls vorhanden)
                    ...(priceText ? [{
                      type: "div",
                      props: {
                        style: {
                          fontSize:      "18px",
                          color:         C.amber,
                          letterSpacing: "2px",
                        },
                        children: priceText,
                      },
                    }] : []),
                  ],
                },
              },
            ],
          },
        },
        // Goldene Trennlinie
        {
          type: "div",
          props: {
            style: {
              height:     "2px",
              background: C.gold,
              margin:     "0 40px",
            },
          },
        },
        // Footer
        {
          type: "div",
          props: {
            style: {
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              height:          "72px",
              fontSize:        "18px",
              color:           C.sub,
              letterSpacing:   "4px",
            },
            children: "ALTBIERATLAS.DE",
          },
        },
      ],
    },
  };

  const svg = await satori(vdom, {
    width:  1200,
    height: 630,
    fonts: [{
      name:   "PressStart2P",
      data:   fontData,
      weight: 400,
      style:  "normal",
    }],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  return resvg.render().asPng();
}
