// Altbieratlas — Mock-Seed-Daten  v0.6.0
// Spiegelt migrations/0002_seed.sql für den Mock-Modus (kein Backend).

window.ATLAS_DATA = {
  breweries: [
    // ========== Düsseldorf — Hausbrauereien ==========
    {
      id: "uerige",
      name: "Brauerei im Uerige",
      short: "Uerige",
      type: "brewpub",
      city: "Düsseldorf",
      country: "DE",
      address: "Berger Straße 1, 40213 Düsseldorf",
      mapsUrl: "https://maps.google.com/maps?q=Berger+Stra%C3%9Fe+1,+40213+D%C3%BCsseldorf",
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
      type: "brewpub",
      city: "Düsseldorf",
      country: "DE",
      address: "Ratinger Straße 28, 40213 Düsseldorf",
      mapsUrl: "https://maps.google.com/maps?q=Ratinger+Stra%C3%9Fe+28,+40213+D%C3%BCsseldorf",
      coords: [51.2278, 6.7715],
      founded: 1848,
      website: "https://fuechschen.de",
      description: {
        de: "Familiengeführte Hausbrauerei, bekannt für ein malzbetontes, vollmundiges Alt und die legendäre Weihnachts-Silvester-Stimmung.",
        en: "Family-run brewpub known for a malty, full-bodied Alt and its legendary Christmas-New-Year atmosphere.",
      },
      styles: ["fuechschen-alt"],
      verified: true,
    },
    {
      id: "schumacher",
      name: "Brauerei Schumacher",
      short: "Schumacher",
      type: "brewpub",
      city: "Düsseldorf",
      country: "DE",
      address: "Oststraße 123, 40210 Düsseldorf",
      mapsUrl: "https://maps.google.com/maps?q=Ostra%C3%9Fe+123,+40210+D%C3%BCsseldorf",
      coords: [51.2224, 6.7912],
      founded: 1838,
      website: "https://schumacher-alt.de",
      description: {
        de: "Die älteste der Düsseldorfer Hausbrauereien. Mildes, gut trinkbares Schumacher Alt seit 1838.",
        en: "The oldest of the Düsseldorf brewpubs. A mild, highly drinkable Schumacher Alt since 1838.",
      },
      styles: ["schumacher-alt"],
      verified: true,
    },
    {
      id: "schluessel",
      name: "Brauerei zum Schlüssel",
      short: "Schlüssel",
      type: "brewpub",
      city: "Düsseldorf",
      country: "DE",
      address: "Bolkerstraße 41-47, 40213 Düsseldorf",
      mapsUrl: "https://maps.google.com/maps?q=Bolkerstra%C3%9Fe+41,+40213+D%C3%BCsseldorf",
      coords: [51.2268, 6.7728],
      founded: 1850,
      website: "https://zumschluessel.de",
      description: {
        de: "Traditionsreiche Hausbrauerei an der Bolkerstraße, im Herzen der Altstadt. Ausgewogenes, leicht herbes Alt.",
        en: "Heritage brewpub on Bolker Straße, in the heart of the old town. A balanced, gently bitter Alt.",
      },
      styles: ["schluessel-alt"],
      verified: true,
    },
    {
      id: "kuerzer",
      name: "Brauerei Kürzer",
      short: "Kürzer",
      type: "brewpub",
      city: "Düsseldorf",
      country: "DE",
      address: "Kurze Straße 18-20, 40213 Düsseldorf",
      mapsUrl: "https://maps.google.com/maps?q=Kurze+Stra%C3%9Fe+18,+40213+D%C3%BCsseldorf",
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
    {
      id: "kuerzer-flingern",
      name: "Brauerei Kürzer Flingern",
      short: "Kürzer Flingern",
      type: "brewpub",
      city: "Düsseldorf",
      country: "DE",
      address: "Fichtenstraße 21, 40233 Düsseldorf",
      mapsUrl: "https://maps.google.com/maps?q=Fichtenstra%C3%9Fe+21,+40233+D%C3%BCsseldorf",
      coords: [51.2337, 6.8151],
      founded: 2020,
      website: "https://brauerei-kuerzer.de",
      description: {
        de: "Zweiter Kürzer-Standort in Düsseldorf-Flingern. Vollwertige Produktionsbrauerei mit Taproom, Biergarten und sechs Spezialbieren, die ausschließlich hier ausgeschenkt werden.",
        en: "Second Kürzer site in Düsseldorf-Flingern. Full production brewery with taproom, beer garden and six specialty beers available only here.",
      },
      styles: ["kuerzer-alt"],
      verified: true,
    },
    // ========== Düsseldorf — Gastronomie ==========
    {
      id: "zum-schlueffken",
      name: "Zum Schlüffken",
      short: "Schlüffken",
      type: "pub",
      city: "Düsseldorf",
      country: "DE",
      address: "Flinger Straße 1, 40213 Düsseldorf",
      mapsUrl: "https://maps.google.com/maps?q=Flinger+Stra%C3%9Fe+1,+40213+D%C3%BCsseldorf",
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
    // ========== Düsseldorf — Marke / Lohnbrauen ==========
    {
      id: "altus",
      name: "Altus bräu",
      short: "Altus",
      type: "brewery",
      city: "Düsseldorf",
      country: "DE",
      address: "Sonnbornstr. 2, 40625 Düsseldorf",
      mapsUrl: "https://maps.google.com/maps?q=Sonnbornstr.+2,+40625+D%C3%BCsseldorf",
      coords: [51.2157, 6.8633],
      founded: 2021,
      website: "https://altus-braeu.de",
      description: {
        de: "Erstes Bio-Altbier aus Düsseldorf. Gebraut nach biologischen Standards mit Malz und Hopfen aus ökologischem Anbau — im Lohnbrauen-Verfahren bei einer Partnerbrauerei.",
        en: "The first certified organic Altbier from Düsseldorf, contract-brewed to organic standards using ecologically grown malt and hops.",
      },
      styles: ["altus-alt"],
      verified: true,
    },
    // ========== Krefeld ==========
    {
      id: "koenigshof",
      name: "Privatbrauerei Königshof",
      short: "Königshof",
      type: "brewery",
      city: "Krefeld",
      country: "DE",
      address: "Untergath 70, 47805 Krefeld",
      mapsUrl: "https://maps.google.com/maps?q=Untergath+70,+47805+Krefeld",
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
      type: "brewery",
      city: "Mönchengladbach",
      country: "DE",
      address: "Bismarckstraße 115, 41061 Mönchengladbach",
      mapsUrl: "https://maps.google.com/maps?q=Bismarckstra%C3%9Fe+115,+41061+M%C3%B6nchengladbach",
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
    // ========== Köln ==========
    {
      id: "hellers",
      name: "Hellers Brauhaus",
      short: "Hellers",
      type: "brewpub",
      city: "Köln",
      country: "DE",
      address: "Roonstraße 33, 50674 Köln",
      mapsUrl: "https://maps.google.com/maps?q=Roonstra%C3%9Fe+33,+50674+K%C3%B6ln",
      coords: [50.9284, 6.9408],
      founded: 1996,
      website: "https://www.hellers.koeln",
      description: {
        de: "Bio-Hausbrauerei im Kwartier Latäng, Köln. Die einzige Kölner Hausbrauerei in Bio-Qualität — braut Kölsch, naturtrübes Wiess und Altbier.",
        en: "Organic brewpub in Cologne's Kwartier Latäng. The city's only brewpub producing its beers — Kölsch, naturally cloudy Wiess and Altbier — to certified organic standards.",
      },
      styles: ["hellers-alt"],
      verified: true,
    },
    // ========== International ==========
    {
      id: "alaskan-brewing",
      name: "Alaskan Brewing Co.",
      short: "Alaskan",
      type: "brewery",
      city: "Juneau",
      country: "US",
      address: "5429 Shaune Drive, Juneau, AK",
      mapsUrl: "https://maps.google.com/maps?q=5429+Shaune+Drive,+Juneau,+AK",
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
      type: "brewery",
      city: "Bridgewater Corners",
      country: "US",
      address: "5520 US-4, Bridgewater Corners, VT",
      mapsUrl: "https://maps.google.com/maps?q=5520+US-4,+Bridgewater+Corners,+VT",
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
    {
      id: "koenigshof-alt",
      name: "Königshof Alt",
      abv: 4.9,
      ibu: 28,
      color: "#8c4a1a",
      tasting: {
        de: "Mild-malzig, niederrheinisch weich. Klassisch für die Region.",
        en: "Mild-malty, soft in the Lower-Rhine style. Regional classic.",
      },
    },
    {
      id: "hannen-alt",
      name: "Hannen Alt",
      abv: 4.8,
      ibu: 30,
      color: "#8c4820",
      tasting: {
        de: "Industriell gebraut, aber klassisch profiliert. Die wohl bekannteste Alt-Marke außerhalb Düsseldorfs.",
        en: "Industrially brewed but classically profiled. Likely the best-known Alt brand outside Düsseldorf.",
      },
    },
    {
      id: "long-trail-ale",
      name: "Long Trail Ale",
      abv: 4.6,
      ibu: 25,
      color: "#a56030",
      tasting: {
        de: "Vermonter Interpretation: malzig, süßlich, mit amerikanischem Hopfencharakter.",
        en: "Vermont take: malty, mildly sweet, with American hop character.",
      },
    },
    {
      id: "hellers-alt",
      name: "Hellers Altbier",
      abv: 4.8,
      ibu: null,
      color: "#8b4820",
      tasting: {
        de: "Bio-Altbier des Kölner Brauhauses Hellers. Mild, ausgewogen, mit biologisch angebautem Malz gebraut.",
        en: "Organic Altbier from Cologne's Hellers brewpub. Mild, balanced, brewed with organically grown malt.",
      },
    },
    {
      id: "altus-alt",
      name: "Altus Bio-Alt",
      abv: 4.9,
      ibu: null,
      color: "#8d4a1e",
      tasting: {
        de: "Erstes Bio-Altbier aus Düsseldorf. Mild-malzig, ausgewogen, mit ökologisch angebautem Hopfen und Malz.",
        en: "The first certified organic Altbier from Düsseldorf. Mildly malty, balanced, brewed with organically grown hops and malt.",
      },
    },
  ],

  // Preismeldungen (Seed) — Stand 2025/2026
  prices: [
    // Uerige — 2,85 €/0,25l
    { breweryId: "uerige", date: "2026-04-15", size: "0,25l", price: 2.85, source: "vor Ort" },
    { breweryId: "uerige", date: "2025-11-05", size: "0,25l", price: 2.85, source: "vor Ort" },
    { breweryId: "uerige", date: "2025-06-20", size: "0,25l", price: 2.85, source: "vor Ort" },
    // Füchschen — 2,90 €/0,25l
    { breweryId: "fuechschen", date: "2026-04-12", size: "0,25l", price: 2.90, source: "vor Ort" },
    { breweryId: "fuechschen", date: "2025-09-01", size: "0,25l", price: 2.70, source: "vor Ort" },
    // Schumacher — 2,90 €/0,25l
    { breweryId: "schumacher", date: "2026-04-08", size: "0,25l", price: 2.90, source: "vor Ort" },
    { breweryId: "schumacher", date: "2025-10-15", size: "0,25l", price: 2.70, source: "vor Ort" },
    // Schlüssel — 2,90 €/0,25l
    { breweryId: "schluessel", date: "2026-04-14", size: "0,25l", price: 2.90, source: "vor Ort" },
    { breweryId: "schluessel", date: "2025-12-01", size: "0,25l", price: 2.70, source: "vor Ort" },
    // Kürzer Altstadt
    { breweryId: "kuerzer", date: "2026-04-16", size: "0,25l", price: 2.80, source: "vor Ort" },
    { breweryId: "kuerzer", date: "2025-10-09", size: "0,2l",  price: 2.60, source: "vor Ort" },
    // Kürzer Flingern
    { breweryId: "kuerzer-flingern", date: "2026-04-20", size: "0,25l", price: 2.80, source: "vor Ort" },
    // Königshof — Flasche
    { breweryId: "koenigshof", date: "2026-04-02", size: "0,5l", price: 3.40, source: "Handel" },
    // Hannen — Flasche
    { breweryId: "hannen", date: "2026-03-15", size: "0,5l", price: 2.90, source: "Handel" },
    // International
    { breweryId: "alaskan-brewing", date: "2026-03-22", size: "0,5l", price: 5.20, source: "Brewery" },
    { breweryId: "long-trail",      date: "2026-03-18", size: "0,5l", price: 4.80, source: "Brewery" },
  ],

  events: [
    {
      id: "bierboerse-benrath",
      title: { de: "Bierbörse", en: "Bierbörse" },
      breweryId: null,
      date: "2026-08-21",
      endDate: "2026-08-23",
      location: "Benrath",
      url: "https://www.bierboerse.com/city/duesseldorf-benrath.htm",
      description: {
        de: "Vom 21.–23. August 2026 lädt die Benrather Bierbörse in Düsseldorf-Benrath Bierfans aus ganz Deutschland ein. Rund 40 Stände bieten in der Fußgängerzone und auf der Heubesstraße über 500 Biersorten sowie vielfältige Speisen an. Die traditionsreiche Veranstaltung findet seit 32 Jahren nahe des Benrather Schlosses statt und begeistert mit gemütlichen Biergärten und rheinischer Atmosphäre.",
        en: "From August 21–23, 2026, the Benrather Bierbörse in Düsseldorf-Benrath welcomes beer lovers from across Germany. Around 40 stands in the pedestrian zone and along Heubesstraße offer more than 500 types of beer and a wide variety of food. Held for 32 years near the famous Benrath Palace, the event is known for its cosy beer gardens and authentic Rhineland atmosphere.",
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
  averagePrice(size = "0,25l") {
    const list = window.ATLAS_DATA.prices.filter((p) => p.size === size);
    if (!list.length) return null;
    const sum = list.reduce((a, b) => a + b.price, 0);
    return sum / list.length;
  },
};
