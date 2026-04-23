// Altbieratlas — Seed-Daten
// Enthält echte Düsseldorfer Hausbrauereien und international relevante Altbier-Produzenten.
// Alle Zahlen sind Platzhalter für den PoC.

window.ATLAS_DATA = {
  breweries: [
    // ========== Düsseldorf — Hausbrauereien ==========
    {
      id: "uerige",
      name: "Brauerei im Uerige",
      short: "Uerige",
      type: "hausbrauerei",
      city: "Düsseldorf",
      country: "DE",
      address: "Berger Straße 1, 40213 Düsseldorf",
      coords: [51.2253, 6.7722],
      founded: 1862,
      website: "https://uerige.de",
      description: {
        de: "Eine der vier klassischen Düsseldorfer Hausbrauereien in der Altstadt. Bekannt für kräftig-herbes, würziges Alt und die halbjährliche Sticke-Ausschank.",
        en: "One of the four classic Düsseldorf brewpubs in the old town. Known for a firm, bitter, spicy Alt and its biannual Sticke release.",
      },
      styles: ["uerige-alt", "sticke", "doppelsticke"],
      verified: true,
    },
    {
      id: "fuechschen",
      name: "Brauerei Füchschen",
      short: "Füchschen",
      type: "hausbrauerei",
      city: "Düsseldorf",
      country: "DE",
      address: "Ratinger Straße 28, 40213 Düsseldorf",
      coords: [51.2278, 6.7715],
      founded: 1848,
      website: "https://fuechschen.de",
      description: {
        de: "Familiengeführte Hausbrauerei, bekannt für ein malzbetontes, vollmundiges Alt und die legendäre Weihnachts-Silvester-Stimmung.",
        en: "Family-run brewpub known for a malty, full-bodied Alt and its legendary Christmas-New-Year atmosphere.",
      },
      styles: ["fuechschen-alt", "weizen"],
      verified: true,
    },
    {
      id: "schumacher",
      name: "Brauerei Schumacher",
      short: "Schumacher",
      type: "hausbrauerei",
      city: "Düsseldorf",
      country: "DE",
      address: "Oststraße 123, 40210 Düsseldorf",
      coords: [51.2224, 6.7912],
      founded: 1838,
      website: "https://schumacher-alt.de",
      description: {
        de: "Die älteste der Düsseldorfer Hausbrauereien. Mildes, gut trinkbares Schumacher Alt seit 1838.",
        en: "The oldest of the Düsseldorf brewpubs. A mild, highly drinkable Schumacher Alt since 1838.",
      },
      styles: ["schumacher-alt", "latzenbier"],
      verified: true,
    },
    {
      id: "schluessel",
      name: "Brauerei zum Schlüssel",
      short: "Schlüssel",
      type: "hausbrauerei",
      city: "Düsseldorf",
      country: "DE",
      address: "Bolkerstraße 41-47, 40213 Düsseldorf",
      coords: [51.2268, 6.7728],
      founded: 1850,
      website: "https://zumschluessel.de",
      description: {
        de: "Traditionsreiche Hausbrauerei an der Bolkerstraße, im Herzen der Altstadt. Ausgewogenes, leicht herbes Alt.",
        en: "Heritage brewpub on Bolker Straße, in the heart of the old town. A balanced, gently bitter Alt.",
      },
      styles: ["schluessel-alt", "stike-alt"],
      verified: true,
    },
    {
      id: "kuerzer",
      name: "Brauerei Kürzer",
      short: "Kürzer",
      type: "hausbrauerei",
      city: "Düsseldorf",
      country: "DE",
      address: "Kurze Straße 18-20, 40213 Düsseldorf",
      coords: [51.2262, 6.7733],
      founded: 2010,
      website: "https://brauerei-kuerzer.de",
      description: {
        de: "Die jüngste der Düsseldorfer Altstadt-Hausbrauereien. Offene Braukessel mitten im Gastraum.",
        en: "The youngest of Düsseldorf's old-town brewpubs. Open brewing kettles right in the taproom.",
      },
      styles: ["kuerzer-alt"],
      verified: true,
    },
    // ========== Düsseldorf Umland ==========
    {
      id: "zum-schlueffken",
      name: "Zum Schlüffken",
      short: "Schlüffken",
      type: "gastronomie",
      city: "Düsseldorf",
      country: "DE",
      address: "Flinger Straße 1, 40213 Düsseldorf",
      coords: [51.2271, 6.774],
      founded: null,
      website: null,
      description: {
        de: "Urige Altstadt-Kneipe mit Uerige Alt vom Fass. Klassische Köbes-Bedienung.",
        en: "Classic old-town pub serving Uerige Alt on tap. Traditional Köbes service.",
      },
      styles: ["uerige-alt"],
      verified: true,
    },
    // ========== Krefeld ==========
    {
      id: "koenigshof",
      name: "Privatbrauerei Königshof",
      short: "Königshof",
      type: "hausbrauerei",
      city: "Krefeld",
      country: "DE",
      address: "Untergath 70, 47805 Krefeld",
      coords: [51.3172, 6.5603],
      founded: 1830,
      website: "https://privatbrauerei-koenigshof.de",
      description: {
        de: "Niederrheinische Privatbrauerei mit einem milderen Alt im niederrheinischen Stil.",
        en: "Lower-Rhine private brewery with a milder Alt in the Niederrhein style.",
      },
      styles: ["koenigshof-alt"],
      verified: true,
    },
    // ========== Mönchengladbach ==========
    {
      id: "hannen",
      name: "Hannen Brauerei",
      short: "Hannen",
      type: "hausbrauerei",
      city: "Mönchengladbach",
      country: "DE",
      address: "Bismarckstraße 115, 41061 Mönchengladbach",
      coords: [51.1805, 6.4428],
      founded: 1725,
      website: null,
      description: {
        de: "Traditionsmarke, heute unter Carlsberg-Dach. Eines der bekanntesten Alt-Biere außerhalb Düsseldorfs.",
        en: "Heritage brand, now under Carlsberg. One of the best-known Alts outside Düsseldorf.",
      },
      styles: ["hannen-alt"],
      verified: true,
    },
    // ========== Köln (ja, es gibt dort Alt-Ausschank...) ==========
    {
      id: "malzmuehle-alt",
      name: "Alt-Eck",
      short: "Alt-Eck Köln",
      type: "gastronomie",
      city: "Köln",
      country: "DE",
      address: "Weidengasse 20, 50668 Köln",
      coords: [50.9452, 6.9606],
      founded: null,
      website: null,
      description: {
        de: "Exotisch im Kölsch-Land: eine Kneipe mit echtem Alt-Ausschank. Nicht jedermanns Sache.",
        en: "Exotic in Kölsch country: a pub actually serving Alt. Not for everyone.",
      },
      styles: ["fuechschen-alt"],
      verified: false,
    },
    // ========== International ==========
    {
      id: "alaskan-brewing",
      name: "Alaskan Brewing Co.",
      short: "Alaskan",
      type: "hausbrauerei",
      city: "Juneau",
      country: "US",
      address: "5429 Shaune Drive, Juneau, AK",
      coords: [58.358, -134.554],
      founded: 1986,
      website: "https://alaskanbeer.com",
      description: {
        de: "US-Craft-Brauerei mit einem sehr gelungenen Alt nach Düsseldorfer Vorbild — mehrfach ausgezeichnet.",
        en: "US craft brewery with a highly regarded Alt in the Düsseldorf tradition — multiple award winner.",
      },
      styles: ["alaskan-amber"],
      verified: true,
    },
    {
      id: "long-trail",
      name: "Long Trail Brewing",
      short: "Long Trail",
      type: "hausbrauerei",
      city: "Bridgewater Corners",
      country: "US",
      address: "5520 US-4, Bridgewater Corners, VT",
      coords: [43.6, -72.7614],
      founded: 1989,
      website: "https://longtrail.com",
      description: {
        de: "Vermonter Brauerei mit einem Flagship-Altbier im rheinischen Stil.",
        en: "Vermont brewery whose flagship is a Rhenish-style Altbier.",
      },
      styles: ["long-trail-ale"],
      verified: true,
    },
    {
      id: "bruery-terreux",
      name: "The Bruery",
      short: "Bruery",
      type: "hausbrauerei",
      city: "Placentia",
      country: "US",
      address: "717 Dunn Way, Placentia, CA",
      coords: [33.8814, -117.8626],
      founded: 2008,
      website: "https://thebruery.com",
      description: {
        de: "Kalifornische Craft-Brauerei mit gelegentlichen Altbier-Interpretationen.",
        en: "California craft brewery with occasional Altbier releases.",
      },
      styles: ["humulus-alt"],
      verified: false,
    },
    {
      id: "marble-nl",
      name: "Brouwerij Rückerl",
      short: "Rückerl",
      type: "hausbrauerei",
      city: "Arnhem",
      country: "NL",
      address: "Westervoortsedijk 73, Arnhem",
      coords: [51.9804, 5.9388],
      founded: 2014,
      website: null,
      description: {
        de: "Niederländische Hausbrauerei mit einem Altbier nach niederrheinischer Tradition.",
        en: "Dutch brewpub with an Altbier in the Niederrhein tradition.",
      },
      styles: ["rueckerl-alt"],
      verified: false,
    },
    {
      id: "tokyo-alt",
      name: "Ushitora Brewery",
      short: "Ushitora",
      type: "hausbrauerei",
      city: "Tokyo",
      country: "JP",
      address: "2-9-3 Sangenjaya, Setagaya, Tokyo",
      coords: [35.6434, 139.6713],
      founded: 2014,
      website: null,
      description: {
        de: "Tokioter Craft-Brauerei, die immer wieder ein Altbier ins Sortiment nimmt.",
        en: "Tokyo craft brewery that regularly puts an Altbier on the lineup.",
      },
      styles: ["ushitora-alt"],
      verified: false,
    },
  ],

  styles: [
    {
      id: "uerige-alt",
      name: "Uerige Alt",
      abv: 4.7,
      ibu: 52,
      color: "#7b3a13",
      tasting: {
        de: "Kräftig herb, würzig, trockener Abgang. Eine der bitteren unter den Düsseldorfer Alts.",
        en: "Firmly bitter, spicy, dry finish. One of the more bitter Düsseldorf Alts.",
      },
    },
    {
      id: "sticke",
      name: "Uerige Sticke",
      abv: 6.0,
      ibu: 65,
      color: "#5b2409",
      tasting: {
        de: "Stärker eingebraut, malzig-komplex, intensivere Hopfengabe. Nur zweimal jährlich ausgeschenkt.",
        en: "Stronger brew, malt-complex, more intense hopping. Only served twice a year.",
      },
    },
    {
      id: "doppelsticke",
      name: "Uerige Doppelsticke",
      abv: 8.5,
      ibu: 70,
      color: "#3d1606",
      tasting: {
        de: "Fast portweinartig, reich, komplex, mit langer Reife. Für die seltenen Anlässe.",
        en: "Almost port-like, rich, complex, long-aged. For the rare occasions.",
      },
    },
    {
      id: "fuechschen-alt",
      name: "Füchschen Alt",
      abv: 4.5,
      ibu: 38,
      color: "#8a4a1f",
      tasting: {
        de: "Malzbetont, vollmundig, weich. Eines der zugänglichsten Düsseldorfer Alts.",
        en: "Malt-forward, full-bodied, soft. One of the most approachable Düsseldorf Alts.",
      },
    },
    {
      id: "schumacher-alt",
      name: "Schumacher Alt",
      abv: 4.6,
      ibu: 32,
      color: "#9b5226",
      tasting: {
        de: "Mild, rund, gut trinkbar. Der Klassiker für den langen Abend.",
        en: "Mild, round, highly drinkable. The classic for a long evening.",
      },
    },
    {
      id: "schluessel-alt",
      name: "Schlüssel Alt",
      abv: 5.0,
      ibu: 35,
      color: "#823c13",
      tasting: {
        de: "Leicht herb, ausgewogen, trocken. Sehr traditioneller Stil.",
        en: "Lightly bitter, balanced, dry. Very traditional style.",
      },
    },
    {
      id: "kuerzer-alt",
      name: "Kürzer Alt",
      abv: 4.8,
      ibu: 34,
      color: "#8f461b",
      tasting: {
        de: "Frisch, hell-bernsteinfarben, mit leichter Citrusnote vom offen gekochten Sud.",
        en: "Fresh, light amber, with a gentle citrus note from the open-boil wort.",
      },
    },
    {
      id: "alaskan-amber",
      name: "Alaskan Amber",
      abv: 5.3,
      ibu: 18,
      color: "#a55b24",
      tasting: {
        de: "Amerikanische Alt-Interpretation: malzbetont, karamellig, weicher als die Düsseldorfer Originale.",
        en: "American take on Alt: malt-forward, caramel, softer than the Düsseldorf originals.",
      },
    },
  ],

  // Preismeldungen (Seed)
  prices: [
    // Uerige
    { breweryId: "uerige", date: "2026-04-15", size: "0,25l", price: 2.7, source: "vor Ort" },
    { breweryId: "uerige", date: "2026-04-10", size: "0,25l", price: 2.7, source: "vor Ort" },
    { breweryId: "uerige", date: "2026-03-28", size: "0,25l", price: 2.7, source: "Website" },
    { breweryId: "uerige", date: "2025-11-05", size: "0,25l", price: 2.5, source: "vor Ort" },
    { breweryId: "uerige", date: "2025-06-20", size: "0,25l", price: 2.5, source: "vor Ort" },
    // Füchschen
    { breweryId: "fuechschen", date: "2026-04-12", size: "0,25l", price: 2.6, source: "vor Ort" },
    { breweryId: "fuechschen", date: "2026-02-14", size: "0,25l", price: 2.6, source: "vor Ort" },
    { breweryId: "fuechschen", date: "2025-09-01", size: "0,25l", price: 2.4, source: "vor Ort" },
    // Schumacher
    { breweryId: "schumacher", date: "2026-04-08", size: "0,25l", price: 2.5, source: "vor Ort" },
    { breweryId: "schumacher", date: "2026-01-20", size: "0,25l", price: 2.5, source: "vor Ort" },
    // Schlüssel
    { breweryId: "schluessel", date: "2026-04-14", size: "0,25l", price: 2.6, source: "vor Ort" },
    { breweryId: "schluessel", date: "2025-12-01", size: "0,25l", price: 2.5, source: "vor Ort" },
    // Kürzer
    { breweryId: "kuerzer", date: "2026-04-16", size: "0,25l", price: 2.8, source: "vor Ort" },
    { breweryId: "kuerzer", date: "2026-03-01", size: "0,25l", price: 2.7, source: "vor Ort" },
    // Königshof
    { breweryId: "koenigshof", date: "2026-04-02", size: "0,5l", price: 3.4, source: "Handel" },
    // Hannen
    { breweryId: "hannen", date: "2026-03-15", size: "0,5l", price: 2.9, source: "Handel" },
    // International
    { breweryId: "alaskan-brewing", date: "2026-03-22", size: "0,5l", price: 5.2, source: "Brewery" },
    { breweryId: "long-trail", date: "2026-03-18", size: "0,5l", price: 4.8, source: "Brewery" },
    { breweryId: "tokyo-alt", date: "2026-04-01", size: "0,33l", price: 6.5, source: "vor Ort" },
    // Gastronomie
    { breweryId: "zum-schlueffken", date: "2026-04-12", size: "0,25l", price: 2.7, source: "vor Ort" },
    { breweryId: "malzmuehle-alt", date: "2026-03-05", size: "0,25l", price: 3.0, source: "vor Ort" },
  ],

  events: [
    {
      id: "sticke-herbst-2026",
      title: { de: "Sticke-Ausschank Uerige (Herbst)", en: "Sticke release at Uerige (autumn)" },
      breweryId: "uerige",
      date: "2026-10-20",
      description: {
        de: "Der traditionelle Sticke-Anstich im Uerige. Ein Termin für Alt-Liebhaber weltweit.",
        en: "The traditional Sticke tapping at Uerige. A bucket-list date for Alt lovers worldwide.",
      },
    },
    {
      id: "altbierrunde-2026",
      title: { de: "Düsseldorfer Altbierrunde", en: "Düsseldorf Altbier round" },
      breweryId: null,
      date: "2026-05-18",
      description: {
        de: "Gemeinschaftliche Tour durch die vier klassischen Hausbrauereien der Altstadt.",
        en: "Group tour through the four classic old-town brewpubs.",
      },
    },
    {
      id: "latzenbier-2026",
      title: { de: "Schumacher Latzenbier-Saison", en: "Schumacher Latzenbier season" },
      breweryId: "schumacher",
      date: "2026-11-05",
      description: {
        de: "Das stärker eingebraute Latzenbier wird direkt aus dem hochgestellten Latzen-Fass gezapft.",
        en: "The stronger Latzenbier is served directly from the elevated barrel.",
      },
    },
  ],

  glossary: [
    {
      term: "Altbier",
      definition: {
        de: "Obergäriges, dunkel-bernsteinfarbenes Bier aus dem Rheinland. \"Alt\" verweist auf die alte, obergärige Brauart (im Gegensatz zum später aufgekommenen, untergärigen Lager).",
        en: "A top-fermented, amber-to-copper beer from the Rhineland. \"Alt\" refers to the old, top-fermenting brewing method (as opposed to later bottom-fermented lagers).",
      },
    },
    {
      term: "Köbes",
      definition: {
        de: "Die traditionelle Bedienung in Düsseldorfer Hausbrauereien. Typischerweise in blauer Schürze, wortkarg, direkt, oft mit trockenem Humor. Ein Köbes ist keine Servicekraft im modernen Sinn — er ist Teil des Rituals.",
        en: "The traditional server in Düsseldorf brewpubs. Typically in a blue apron, taciturn, direct, often with a dry wit. A Köbes is not a service worker in the modern sense — he is part of the ritual.",
      },
    },
    {
      term: "Sticke",
      definition: {
        de: "Ein stärker eingebrautes, hopfenbetonteres Alt. Im Uerige wird es nur zweimal jährlich ausgeschenkt — im Januar und Oktober, jeweils am dritten Dienstag.",
        en: "A stronger, more hop-forward Alt. At Uerige it is served only twice a year — on the third Tuesday of January and October.",
      },
    },
    {
      term: "Doppelsticke",
      definition: {
        de: "Die noch stärkere Variante der Sticke, rund 8,5 % Alkohol. Ursprünglich für den Export in die USA gebraut.",
        en: "An even stronger variant of Sticke, around 8.5% ABV. Originally brewed for export to the USA.",
      },
    },
    {
      term: "Kranz",
      definition: {
        de: "Das runde Holztablett, auf dem der Köbes die 0,25-l-Gläser stapelt. Fasst typisch 12 bis 15 Gläser.",
        en: "The round wooden tray the Köbes uses to stack 0.25 l glasses. Typically holds 12 to 15 glasses.",
      },
    },
    {
      term: "Strichliste",
      definition: {
        de: "Der Bierdeckel, auf dem der Köbes für jedes neue Alt einen Strich macht. Abgerechnet wird am Ende — keiner prüft nach.",
        en: "The coaster on which the Köbes tallies a stroke for each new Alt. Settled at the end — nobody double-checks.",
      },
    },
    {
      term: "Latzenbier",
      definition: {
        de: "Ein stärker eingebrautes Saison-Alt bei Schumacher, das vom hochgelegten Latzen-Fass gezapft wird. Traditionell im Herbst.",
        en: "A stronger seasonal Alt at Schumacher, tapped from an elevated Latzen barrel. Traditionally in autumn.",
      },
    },
    {
      term: "Obergärig",
      definition: {
        de: "Bezeichnet die Gärweise: Hefe, die bei wärmeren Temperaturen (15-20 °C) oben auf dem Sud arbeitet. Führt zu fruchtigeren Aromen als untergärige Hefen.",
        en: "Describes the fermentation: yeast that works at warmer temperatures (15-20 °C) on top of the wort. Produces fruitier aromas than bottom-fermenting yeasts.",
      },
    },
    {
      term: "Hausbrauerei",
      definition: {
        de: "Eine Brauerei, die direkt im angeschlossenen Gastraum ausschenkt. Die vier klassischen Düsseldorfer Hausbrauereien sind Uerige, Füchschen, Schumacher und Schlüssel.",
        en: "A brewery that pours directly in its attached taproom. The four classic Düsseldorf brewpubs are Uerige, Füchschen, Schumacher and Schlüssel.",
      },
    },
    {
      term: "Rheinisches Reinheitsgebot",
      definition: {
        de: "Kein offizielles Gesetz, sondern ein augenzwinkerndes Selbstverständnis: ein richtiges Alt braucht nichts außer Wasser, Gerste, Hopfen und obergäriger Hefe — und einen Köbes, der es hinstellt.",
        en: "Not an actual law, but a tongue-in-cheek self-understanding: a proper Alt needs nothing but water, barley, hops and top-fermenting yeast — and a Köbes to set it down.",
      },
    },
  ],
};

// Helpers
window.ATLAS_HELPERS = {
  getBrewery(id) {
    return window.ATLAS_DATA.breweries.find((b) => b.id === id);
  },
  getStyle(id) {
    return window.ATLAS_DATA.styles.find((s) => s.id === id);
  },
  pricesFor(breweryId) {
    return window.ATLAS_DATA.prices
      .filter((p) => p.breweryId === breweryId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },
  latestPrice(breweryId, size = "0,25l") {
    const list = window.ATLAS_HELPERS.pricesFor(breweryId).filter((p) => p.size === size);
    return list[0];
  },
  // Beiträge aus LocalStorage mergen (Mock-Backend)
  userContributions() {
    try {
      return JSON.parse(localStorage.getItem("atlas-contributions") || "[]");
    } catch {
      return [];
    }
  },
  addContribution(c) {
    const all = window.ATLAS_HELPERS.userContributions();
    all.unshift({ ...c, id: "c_" + Date.now(), pending: true });
    localStorage.setItem("atlas-contributions", JSON.stringify(all));
  },
  // Durchschnittspreis über alle 0,25l
  averagePrice(size = "0,25l") {
    const list = window.ATLAS_DATA.prices.filter((p) => p.size === size);
    if (!list.length) return null;
    const sum = list.reduce((a, b) => a + b.price, 0);
    return sum / list.length;
  },
};
