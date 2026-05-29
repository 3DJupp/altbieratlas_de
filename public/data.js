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
      logoKey: null,
      logoUrl: null,
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
      logoKey: null,
      logoUrl: null,
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
      logoKey: null,
      logoUrl: null,
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
      logoKey: null,
      logoUrl: null,
    },
    {
      id: "kuerzer",
      name: "Brauerei Kürzer",
      short: "Kürzer Altstadt",
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
      logoKey: null,
      logoUrl: null,
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
      logoKey: null,
      logoUrl: null,
    },
    // ========== Düsseldorf — Gastronomie ==========
    {
      id: "gulasch",
      name: "Zum Gulasch",
      short: "Gulasch",
      type: "pub",
      city: "Düsseldorf",
      country: "DE",
      address: "Bolkerstraße 12, 40213 Düsseldorf",
      mapsUrl: "https://maps.google.com/maps?q=Bolkerstra%C3%9Fe+12,+40213+D%C3%BCsseldorf",
      coords: [51.2265, 6.7731],
      founded: null,
      website: null,
      description: {
        de: "Beliebte Altbierkneipe in der Düsseldorfer Altstadt mit ausgezeichneten Gulaschspezialitäten und Altbier vom Fass.",
        en: "Popular Altbier pub in Düsseldorf old town, known for hearty gulasch specialties and draught Altbier.",
      },
      styles: [],
      verified: false,
      logoKey: null,
      logoUrl: null,
      isHistorical: false,
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
      logoKey: null,
      logoUrl: null,
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
      logoKey: null,
      logoUrl: null,
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
      logoKey: null,
      logoUrl: null,
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
      logoKey: null,
      logoUrl: null,
    },
    // ========== Niederrhein — Großbrauereien ==========
    {
      id: "bolten",
      name: "Bolten Brauerei",
      short: "Bolten",
      type: "brewery",
      city: "Korschenbroich",
      country: "DE",
      address: "Richrather Straße 61, 41352 Korschenbroich",
      mapsUrl: "https://maps.google.com/maps?q=Richrather+Stra%C3%9Fe+61,+41352+Korschenbroich",
      coords: [51.1891, 6.5127],
      founded: 1266,
      website: "https://bolten-brauerei.de",
      description: {
        de: "Die älteste kontinuierlich brauereitreibende Alt-Brauerei Deutschlands — seit 1266 in Korschenbroich am Niederrhein. Das Bolten Ur-Alt gilt als älteste Alt-Biermarke der Welt.",
        en: "Germany's oldest continuously operating Alt brewery — in Korschenbroich on the Lower Rhine since 1266. Bolten Ur-Alt is considered the world's oldest Alt beer brand.",
      },
      styles: ["bolten-uralt"],
      verified: true,
      logoKey: null,
      logoUrl: null,
      isHistorical: false,
    },
    {
      id: "diebels",
      name: "Brauerei Diebels",
      short: "Diebels",
      type: "brewery",
      city: "Issum",
      country: "DE",
      address: "Brauerei-Diebels-Platz, 47661 Issum",
      mapsUrl: "https://maps.google.com/maps?q=Brauerei-Diebels-Platz,+47661+Issum",
      coords: [51.5340, 6.4279],
      founded: 1878,
      website: "https://www.diebels.de",
      description: {
        de: "Größte Altbier-Brauerei Deutschlands, gegründet 1878 in Issum am Niederrhein. Diebels Alt ist das meistverkaufte Altbier Deutschlands — heute im AB-InBev-Konzern.",
        en: "Germany's largest Altbier brewery, founded 1878 in Issum on the Lower Rhine. Diebels Alt is Germany's best-selling Altbier — today part of the AB InBev group.",
      },
      styles: ["diebels-alt"],
      verified: true,
      logoKey: null,
      logoUrl: null,
      isHistorical: false,
    },
    {
      id: "frankenheim",
      name: "Frankenheim Brauerei",
      short: "Frankenheim",
      type: "brewery",
      city: "Düsseldorf",
      country: "DE",
      address: "Grafenberger Allee 101, 40237 Düsseldorf",
      mapsUrl: "https://maps.google.com/maps?q=Grafenberger+Allee+101,+40237+D%C3%BCsseldorf",
      coords: [51.2281, 6.8077],
      founded: 1873,
      website: "https://www.frankenheim.de",
      description: {
        de: "Große Düsseldorfer Alt-Brauerei, seit 1873. Frankenheim Alt ist nach Diebels das zweitmeistverkaufte Altbier Deutschlands — heute Teil der Radeberger Gruppe.",
        en: "Major Düsseldorf Alt brewery since 1873. Frankenheim Alt is Germany's second best-selling Altbier after Diebels — today part of the Radeberger Group.",
      },
      styles: ["frankenheim-alt"],
      verified: true,
      logoKey: null,
      logoUrl: null,
      isHistorical: false,
    },
    // ========== Historisch relevante Marken ==========
    {
      id: "schloesser",
      name: "Schlösser Alt",
      short: "Schlösser",
      type: "brewery",
      city: "Düsseldorf",
      country: "DE",
      address: "Oststraße, 40210 Düsseldorf",
      mapsUrl: null,
      coords: [51.2231, 6.7899],
      founded: 1873,
      website: null,
      description: {
        de: "Ehemalige Düsseldorfer Brauerei, gegründet 1873. War einst die meistverkaufte Alt-Marke der Stadt. Die Brauerei wurde geschlossen; die Marke wird heute von Carlsberg Deutschland produziert.",
        en: "Former Düsseldorf brewery, founded 1873. Once the city's best-selling Alt brand. The brewery has since closed; the brand is now produced by Carlsberg Deutschland.",
      },
      styles: [],
      verified: true,
      logoKey: null,
      logoUrl: null,
      isHistorical: true,
    },
    {
      id: "gatzweiler",
      name: "Gatzweiler Alt",
      short: "Gatzweiler",
      type: "brewery",
      city: "Düsseldorf",
      country: "DE",
      address: "Ratinger Straße, 40213 Düsseldorf",
      mapsUrl: null,
      coords: [51.2276, 6.7744],
      founded: 1845,
      website: null,
      description: {
        de: "Traditionsreiche Düsseldorfer Alt-Brauerei, gegründet um 1845. Wurde in den 1960er Jahren von Binding aufgekauft und eingestellt. Gatzweiler Alt war für seinen milden, malzbetonten Stil bekannt.",
        en: "Traditional Düsseldorf Alt brewery, founded around 1845. Acquired by Binding in the 1960s and discontinued. Gatzweiler Alt was known for its mild, malt-forward style.",
      },
      styles: [],
      verified: true,
      logoKey: null,
      logoUrl: null,
      isHistorical: true,
    },
    {
      id: "rhenania",
      name: "Brauerei Rhenania",
      short: "Rhenania",
      type: "brewery",
      city: "Düsseldorf",
      country: "DE",
      address: "Schwanemarkt, 40213 Düsseldorf",
      mapsUrl: null,
      coords: [51.2291, 6.7799],
      founded: 1879,
      website: null,
      description: {
        de: "Historische Düsseldorfer Alt-Brauerei, gegründet 1879. Braute bis Mitte des 20. Jahrhunderts ein typisches Düsseldorfer Alt. Heute nicht mehr in Betrieb.",
        en: "Historic Düsseldorf Alt brewery, founded 1879. Brewed a classic Düsseldorf Alt until the mid-20th century. No longer in operation.",
      },
      styles: [],
      verified: true,
      logoKey: null,
      logoUrl: null,
      isHistorical: true,
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
      id: "bolten-uralt",
      name: "Bolten Ur-Alt",
      abv: 4.9,
      ibu: 28,
      color: "#8a4618",
      tasting: {
        de: "Niederrheinisch mild, leicht malzig mit fruchtig-würzigem Charakter. Das älteste kommerziell gebraute Alt — ein Stück lebendige Biergeschichte.",
        en: "Mild Lower-Rhine style, lightly malty with a fruity-spicy character. The oldest commercially brewed Alt — a piece of living beer history.",
      },
    },
    {
      id: "diebels-alt",
      name: "Diebels Alt",
      abv: 4.9,
      ibu: 27,
      color: "#8b4417",
      tasting: {
        de: "Mild, leicht herb, gut trinkbar. Der typische Niederrhein-Alt — weicher und runder als die Düsseldorfer Hausbrauerei-Versionen.",
        en: "Mild, slightly bitter, very drinkable. The typical Lower-Rhine Alt — softer and rounder than the Düsseldorf brewpub versions.",
      },
    },
    {
      id: "frankenheim-alt",
      name: "Frankenheim Alt",
      abv: 4.9,
      ibu: 30,
      color: "#8c4519",
      tasting: {
        de: "Ausgewogen-malzig, leicht herb, süffig. Das erfolgreichste Düsseldorfer Industrie-Alt.",
        en: "Balanced-malty, lightly bitter, easy-drinking. The most successful Düsseldorf industrial Alt.",
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
    // Bolten — Flasche im Handel
    { breweryId: "bolten",     date: "2026-04-10", size: "0,5l", price: 2.80, source: "Handel" },
    // Diebels — Flasche im Supermarkt
    { breweryId: "diebels",    date: "2026-04-10", size: "0,5l", price: 1.49, source: "Handel" },
    // Frankenheim — Flasche im Handel
    { breweryId: "frankenheim", date: "2026-04-10", size: "0,5l", price: 1.59, source: "Handel" },
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
