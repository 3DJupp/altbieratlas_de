-- ============================================================
-- Altbieratlas — Seed data  v0.11.1
-- ============================================================
-- Venue types, styles, glossary, breweries, prices and events.
-- Applies to every deployment (dev, staging, production).
-- All statements are idempotent (INSERT OR IGNORE).
-- Personal data (impressum, author) is NOT included here;
-- configure those via the admin UI or SITE_CONFIG.
-- ============================================================

-- ============================================================
-- Venue types (must come before breweries due to FK)
-- ============================================================
INSERT OR IGNORE INTO venue_types (id, name_de, name_en, header_de, header_en, is_producer) VALUES
  ('brewery',        'Brauerei',      'Brewery',         'Was hier gebraut wird',                 'What is brewed here',            1),
  ('brewpub',        'Hausbrauerei',  'Brewpub',         'Was hier gebraut und ausgeschenkt wird', 'What is brewed and served here', 1),
  ('gastronomie',    'Gastronomie',   'Bar / Restaurant','Was hier ausgeschenkt wird',             'What is served here',            0),
  ('pub',            'Kneipe',        'Pub',             'Was hier ausgeschenkt wird',             'What is served here',            0),
  ('restaurant',     'Restaurant',    'Restaurant',      'Was hier ausgeschenkt wird',             'What is served here',            0),
  ('kiosk',          'Kiosk',         'Kiosk',           'Was hier erhältlich ist',                'What is available here',         0),
  ('handel',         'Handel',        'Retail',          'Was hier erhältlich ist',                'What is available here',         0),
  ('supermarket',    'Supermarkt',    'Supermarket',     'Was hier erhältlich ist',                'What is available here',         0),
  ('beverage_store', 'Getränkeshop',  'Beverage store',  'Was hier erhältlich ist',                'What is available here',         0);

-- ============================================================
-- Beer styles
-- ============================================================
INSERT OR IGNORE INTO styles (id, name, abv, ibu, color, tasting_de, tasting_en, logo_key) VALUES
  ('uerige-alt', 'Uerige Alt', 4.7, 52, '#7b3a13',
    'Kräftig herb, würzig, trockener Abgang. Eine der bitteren unter den Düsseldorfer Alts.',
    'Firmly bitter, spicy, dry finish. One of the more bitter Düsseldorf Alts.',
    'stile/uerige-alt.png'),
  ('uerige-sticke', 'Uerige Sticke', 6.0, 65, '#5b2409',
    'Stärker eingebraut, malzig-komplex, intensivere Hopfengabe. Nur zweimal jährlich ausgeschenkt.',
    'Stronger brew, malt-complex, more intense hopping. Only served twice a year.',
    'stile/uerige-alt.png'),
  ('uerige-doppelsticke', 'Uerige Doppelsticke', 8.5, 70, '#3d1606',
    'Fast portweinartig, reich, komplex, mit langer Reife. Für die seltenen Anlässe.',
    'Almost port-like, rich, complex, long-aged. For the rare occasions.',
    'stile/uerige-alt.png'),
  ('fuechschen-alt', 'Füchschen Alt', 4.5, 38, '#8a4a1f',
    'Malzbetont, vollmundig, weich. Eines der zugänglichsten Düsseldorfer Alts.',
    'Malt-forward, full-bodied, soft. One of the most approachable Düsseldorf Alts.',
    'stile/fuechschen-alt.png'),
  ('fuechschen-alt-af', 'Füchschen Alt Alkoholfrei', 0.2, 5, '#8a4a1f',
    NULL,
    NULL,
    'stile/fuechschen-alt.png'),
  ('schumacher-alt', 'Schumacher Alt', 4.6, 32, '#9b5226',
    'Mild, rund, gut trinkbar. Der Klassiker für den langen Abend.',
    'Mild, round, highly drinkable. The classic for a long evening.',
    'stile/schumacher-alt.png'),
  ('schluessel-alt', 'Schlüssel Alt', 5.0, 35, '#823c13',
    'Leicht herb, ausgewogen, trocken. Sehr traditioneller Stil.',
    'Lightly bitter, balanced, dry. Very traditional style.',
    'stile/schluessel-alt.png'),
  ('kuerzer-alt', 'Kürzer Alt', 4.8, 34, '#8f461b',
    'Frisch, hell-bernsteinfarben, mit leichter Citrusnote vom offen gekochten Sud.',
    'Fresh, light amber, with a gentle citrus note from the open-boil wort.',
    'stile/kuerzer-alt.png'),
  ('frankenheim-alt', 'Frankenheim Alt', 4.8, 50, '#003B7A',
    'Kastanienbraun, vollmundig, mit kräftiger Röstnote und deutlicher Karamellsüße im Antrunk. Der Abgang ist trocken und hopfenbitter.',
    'Full-bodied with pronounced roast and caramel sweetness up front. Finishes dry and firmly bitter.',
    'stile/frankenheim-alt.png'),
  ('koenigshof-alt', 'Königshof Alt', 4.9, 28, '#8c4a1a',
    'Mild-malzig, niederrheinisch weich. Klassisch für die Region.',
    'Mild-malty, soft in the Lower-Rhine style. Regional classic.',
    'stile/koenigshof-alt.png'),
  ('hannen-alt', 'Hannen Alt', 4.8, 30, '#8c4820',
    'Industriell gebraut, aber klassisch profiliert. Die wohl bekannteste Alt-Marke außerhalb Düsseldorfs.',
    'Industrially brewed but classically profiled. Likely the best-known Alt brand outside Düsseldorf.',
    'stile/hannen-alt.png'),
  ('bolten-uralt', 'Bolten Ur-Alt', 4.9, 28, '#8a4618',
    'Niederrheinisch mild, leicht malzig mit fruchtig-würzigem Charakter. Die unfiltrierte Variante aus der ältesten Altbierbrauerei der Welt.',
    'Mild Lower-Rhine style, lightly malty with a fruity-spicy character. The unfiltered variant from the world''s oldest Altbier brewery.',
    NULL),
  ('diebels-alt', 'Diebels Alt', 4.9, 27, '#8b4417',
    'Mild, leicht herb, gut trinkbar. Der typische Niederrhein-Alt — weicher und runder als die Düsseldorfer Hausbrauerei-Versionen.',
    'Mild, slightly bitter, very drinkable. The typical Lower-Rhine Alt — softer and rounder than the Düsseldorf brewpub versions.',
    NULL),
  ('gleumes-alt', 'Gleumes Alt', NULL, NULL, '#8a4a1c',
    'Hausgebrautes Alt der ältesten Krefelder Brauerei, seit 1896 an der Sternstraße gebraut und im historischen Ausschank frisch gezapft.',
    'House-brewed Alt from Krefeld''s oldest brewery, brewed on Sternstraße since 1896 and served fresh in the historic tap room.',
    NULL),
  ('pinkus-alt', 'Original Pinkus Alt', 5.1, NULL, '#c9a04a',
    'Heller Münsteraner Alt aus Bioland-Malz, obergärig und lang gelagert, mit frischem, leicht weinigem Charakter.',
    'Pale Münster-style Alt from Bioland malt, top-fermented and long-aged, with a fresh, slightly wine-like character.',
    NULL),
  ('hellers-alt', 'Hellers Altbier', 4.8, NULL, '#8b4820',
    'Bio-Altbier des Kölner Brauhauses Hellers. Mild, ausgewogen, mit biologisch angebautem Malz gebraut.',
    'Organic Altbier from Cologne''s Hellers brewpub. Mild, balanced, brewed with organically grown malt.',
    'stile/hellers-alt.png'),
  ('altus-alt', 'Altus Bio-Alt', 4.9, 35, '#8d4a1e',
    'Erstes Bio-Altbier aus Düsseldorf. Mild-malzig, ausgewogen, mit ökologisch angebautem Hopfen und Malz.',
    'The first certified organic Altbier from Düsseldorf. Mildly malty, balanced, brewed with organically grown hops and malt.',
    'stile/altus-alt.png'),
  ('dom-alt', 'Dom Alt', 4.8, 32, NULL,
    NULL,
    NULL,
    NULL),
  ('long-trail-ale', 'Long Trail Ale', 4.6, 25, '#a56030',
    'Vermonter Interpretation: malzig, süßlich, mit amerikanischem Hopfencharakter.',
    'Vermont take: malty, mildly sweet, with American hop character.',
    NULL);

-- ============================================================
-- Glossary
-- ============================================================
INSERT OR IGNORE INTO glossary (term, definition_de, definition_en) VALUES
  ('Altbier',
    'Obergäriges, dunkel-bernsteinfarbenes Bier aus dem Rheinland. "Alt" verweist auf die alte, obergärige Brauart (im Gegensatz zum später aufgekommenen, untergärigen Lager).',
    'A top-fermented, amber-to-copper beer from the Rhineland. "Alt" refers to the old, top-fermenting brewing method (as opposed to later bottom-fermented lagers).'),
  ('Köbes',
    'Die traditionelle Bedienung in Düsseldorfer Hausbrauereien. Typischerweise in blauer Schürze, wortkarg, direkt, oft mit trockenem Humor. Ein Köbes ist keine Servicekraft im modernen Sinn — er ist Teil des Rituals.',
    'The traditional server in Düsseldorf brewpubs. Typically in a blue apron, taciturn, direct, often with a dry wit. A Köbes is not a service worker in the modern sense — he is part of the ritual.'),
  ('Sticke',
    'Ein stärker eingebrautes, hopfenbetonteres Alt. Im Uerige wird es nur zweimal jährlich ausgeschenkt — im Januar und Oktober, jeweils am dritten Dienstag.',
    'A stronger, more hop-forward Alt. At Uerige it is served only twice a year — on the third Tuesday of January and October.'),
  ('Doppelsticke',
    'Die noch stärkere Variante der Sticke, rund 8,5 % Alkohol. Ursprünglich für den Export in die USA gebraut.',
    'An even stronger variant of Sticke, around 8.5% ABV. Originally brewed for export to the USA.'),
  ('Kranz',
    'Das runde Holztablett, auf dem der Köbes die 0,25-l-Gläser stapelt. Fasst typisch 12 bis 15 Gläser.',
    'The round wooden tray the Köbes uses to stack 0.25 l glasses. Typically holds 12 to 15 glasses.'),
  ('Strichliste',
    'Der Bierdeckel, auf dem der Köbes für jedes neue Alt einen Strich macht. Abgerechnet wird am Ende — keiner prüft nach.',
    'The coaster on which the Köbes tallies a stroke for each new Alt. Settled at the end — nobody double-checks.'),
  ('Latzenbier',
    'Ein stärker eingebrautes Saison-Alt bei Schumacher, das vom hochgelegten Latzen-Fass gezapft wird. Traditionell im Herbst.',
    'A stronger seasonal Alt at Schumacher, tapped from an elevated Latzen barrel. Traditionally in autumn.'),
  ('Obergärig',
    'Bezeichnet die Gärweise: Hefe, die bei wärmeren Temperaturen (15-20 °C) oben auf dem Sud arbeitet. Führt zu fruchtigeren Aromen als untergärige Hefen.',
    'Describes the fermentation: yeast that works at warmer temperatures (15-20 °C) on top of the wort. Produces fruitier aromas than bottom-fermenting yeasts.'),
  ('Hausbrauerei',
    'Eine Brauerei, die direkt im angeschlossenen Gastraum ausschenkt. Die vier klassischen Düsseldorfer Hausbrauereien sind Uerige, Füchschen, Schumacher und Schlüssel.',
    'A brewery that pours directly in its attached taproom. The four classic Düsseldorf brewpubs are Uerige, Füchschen, Schumacher and Schlüssel.'),
  ('Rheinisches Reinheitsgebot',
    'Kein offizielles Gesetz, sondern ein augenzwinkerndes Selbstverständnis: ein richtiges Alt braucht nichts außer Wasser, Gerste, Hopfen und obergäriger Hefe — und einen Köbes, der es hinstellt.',
    'Not an actual law, but a tongue-in-cheek self-understanding: a proper Alt needs nothing but water, barley, hops and top-fermenting yeast — and a Köbes to set it down.');

-- ============================================================
-- Breweries / taprooms / retail
-- ============================================================
INSERT OR IGNORE INTO breweries
  (id, name, short_name, type, city, country, address, maps_url, lat, lng, founded, website, description_de, description_en, verified, status, is_historical, photo_key, logo_key)
VALUES
  -- ========== Düsseldorf — Hausbrauereien (Altstadt) ==========
  ('uerige', 'Brauerei im Uerige', 'Uerige', 'brewpub', 'Düsseldorf', 'DE',
    'Berger Straße 1, 40213 Düsseldorf',
    'https://maps.app.goo.gl/7LRrNJg6GxJD8J6y7',
    51.2249806, 6.7721837, 1862, 'https://uerige.de',
    'Eine der vier klassischen Düsseldorfer Hausbrauereien in der Altstadt. Bekannt für kräftig-herbes, würziges Alt und die halbjährliche Sticke-Ausschank.',
    'One of the four classic Düsseldorf brewpubs in the old town. Known for a firm, bitter, spicy Alt and its biannual Sticke release.',
    1, 'approved', 0, NULL, NULL),

  ('fuechschen', 'Brauerei Füchschen', 'Füchschen', 'brewpub', 'Düsseldorf', 'DE',
    'Ratinger Straße 28, 40213 Düsseldorf',
    'https://maps.app.goo.gl/SjsbNAnc7h29xwiK8',
    51.22952, 6.77549, 1848, 'https://fuechschen.de',
    'Familiengeführte Hausbrauerei, bekannt für ein malzbetontes, vollmundiges Alt und die legendäre Weihnachts-Silvester-Stimmung.',
    'Family-run brewpub known for a malty, full-bodied Alt and its legendary Christmas-New-Year atmosphere.',
    1, 'approved', 0, NULL, NULL),

  ('schumacher', 'Brauerei Schumacher', 'Schumacher', 'brewpub', 'Düsseldorf', 'DE',
    'Oststraße 123, 40210 Düsseldorf',
    'https://maps.app.goo.gl/txBSi9QNHmm7hn5b6',
    51.2216, 6.7854, 1838, 'https://schumacher-alt.de',
    'Die älteste der Düsseldorfer Hausbrauereien. Mildes, gut trinkbares Schumacher Alt seit 1838.',
    'The oldest of the Düsseldorf brewpubs. A mild, highly drinkable Schumacher Alt since 1838.',
    1, 'approved', 0, NULL, NULL),

  ('schluessel', 'Brauerei zum Schlüssel', 'Schlüssel', 'brewpub', 'Düsseldorf', 'DE',
    'Bolkerstraße 41-47, 40213 Düsseldorf',
    'https://maps.app.goo.gl/rAoikQk3Z7kRWPMcA',
    51.226093, 6.774437, 1850, 'https://zumschluessel.de',
    'Traditionsreiche Hausbrauerei an der Bolkerstraße, im Herzen der Altstadt. Ausgewogenes, leicht herbes Alt.',
    'Heritage brewpub on Bolker Straße, in the heart of the old town. A balanced, gently bitter Alt.',
    1, 'approved', 0, NULL, NULL),

  ('kuerzer-altstadt', 'Brauerei Kürzer', 'Kürzer', 'brewpub', 'Düsseldorf', 'DE',
    'Kurze Straße 18-20, 40213 Düsseldorf',
    'https://maps.app.goo.gl/6ggY8aBHTgjhKB7b7',
    51.226955, 6.773337, 2010, 'https://brauerei-kuerzer.de',
    'Die jüngste der Düsseldorfer Altstadt-Hausbrauereien. Offene Braukessel mitten im Gastraum.',
    'The youngest of Düsseldorf''s old-town brewpubs. Open brewing kettles right in the taproom.',
    1, 'approved', 0, NULL, NULL),

  -- ========== Düsseldorf — weitere Brauereien und Brauereiausschänke ==========
  ('kuerzer-flingern', 'Brauerei Kürzer Flingern', 'Kürzer Flingern', 'brewpub', 'Düsseldorf', 'DE',
    'Fichtenstraße 21, 40233 Düsseldorf',
    'https://maps.app.goo.gl/XpnPvsgYyfjHLXR29',
    51.2168285, 6.808743, 2020, 'https://brauerei-kuerzer.de',
    'Zweiter Kürzer-Standort in Düsseldorf-Flingern. Vollwertige Produktionsbrauerei mit Taproom, Biergarten und sechs Spezialbieren, die ausschließlich hier ausgeschenkt werden.',
    'Second Kürzer site in Düsseldorf-Flingern. Full production brewery with taproom, beer garden and six specialty beers available only here.',
    1, 'approved', 0, NULL, NULL),

  ('frankenheim-brauereiausschank', 'Frankenheim Brauereiausschank', 'Frankenheim', 'brewpub', 'Düsseldorf', 'DE',
    'Wielandstraße 12-14,  40211 Düsseldorf',
    'https://maps.app.goo.gl/trgyQ5Hf3BixGaK18',
    51.229568, 6.793521, 1873, 'https://www.frankenheim.de',
    'Frankenheim Brauereiausschank ist ein traditionsreiches Brauhaus in Düsseldorf mit echter Altbier-Kultur. Auch nach dem Ende des Familienbesitzes bleibt die Location ihrer Geschichte treu und ist bekannt für frisch gezapftes Frankenheim Alt, herzhafte Brauhausküche, gesellige Atmosphäre und einen beliebten Biergarten.',
    'Frankenheim Brauereiausschank is a historic brewery pub in Düsseldorf with a strong Altbier tradition. Even after leaving family ownership, the venue has remained true to its heritage and is known for freshly poured Frankenheim Alt, hearty brewery-style cuisine, a social atmosphere, and a popular beer garden.',
    1, 'approved', 0, NULL, NULL),

  ('im-goldenen-kessel', 'Im Goldenen Kessel', 'Goldener Kessel', 'gastronomie', 'Düsseldorf', 'DE',
    'Bolkerstraße 44, 40213 Düsseldorf',
    'https://maps.google.com/maps?q=Bolkerstra%C3%9Fe+44%2C+40213+D%C3%BCsseldorf',
    51.226315, 6.775122, NULL, 'https://schumacher-alt.de/gaststaetten/im-goldenen-kessel/',
    'Der Altstadt-Ausschank der Brauerei Schumacher an der Bolkerstraße. Schumacher Alt frisch vom Fass, dazu klassische Brauhausküche wie Haxe und Bratwurst. Neben dem Stammhaus an der Oststraße die zweite Schumacher-Adresse und einer der traditionsreichsten Altbier-Orte der Altstadt.',
    'Brauerei Schumacher''s old-town tap house on Bolkerstraße. Schumacher Alt fresh from the barrel, with classic brewhouse fare such as pork knuckle and bratwurst. Alongside the main house on Oststraße, Schumacher''s second address and one of the old town''s most traditional Altbier spots.',
    0, 'pending', 0, NULL, NULL),

  ('kneipe-kneipe', 'Kneipe Kneipe', 'Kneipe Kneipe', 'pub', 'Düsseldorf', 'DE',
    'Liefergasse 1, 40213 Düsseldorf',
    'https://maps.google.com/maps?q=Liefergasse+1,+40213+D%C3%BCsseldorf',
    51.2285, 6.7731, 2026, NULL,
    'Die älteste Kellerkneipe der Düsseldorfer Altstadt, bis Ende 2024 rund 50 Jahre lang einfach „Kneipe“. Seit Juli 2026 unter neuem Namen von den Altus-Gründern Tim Kasparek und Anthony Boniteau betrieben: erste eigene Ausschankstätte für Altus, Düsseldorfs erstes Bio-Altbier, frisch vom Fass. Dazu gibt es wieder den Kultschnaps „Stress“.',
    'The oldest cellar bar in Düsseldorf''s old town, known simply as "Kneipe" for around 50 years until it closed at the end of 2024. Reopened in July 2026 under a new name by Altus founders Tim Kasparek and Anthony Boniteau as the first dedicated outlet for Altus, Düsseldorf''s first organic Altbier, on tap. The cult house schnapps "Stress" is back too.',
    1, 'approved', 0, NULL, NULL),

  ('altus', 'Altus bräu', 'Altus', 'brewery', 'Düsseldorf', 'DE',
    'Roßstraße 19, 40476 Düsseldorf',
    'https://maps.google.com/maps?q=Ro%C3%9Fstra%C3%9Fe+19%2C+40476+D%C3%BCsseldorf',
    51.24569, 6.77934, 2021, 'https://altus-braeu.de',
    'Erstes Bio-Altbier aus Düsseldorf. Gebraut nach biologischen Standards mit Malz und Hopfen aus ökologischem Anbau — im Lohnbrauen-Verfahren bei einer Partnerbrauerei.',
    'The first certified organic Altbier from Düsseldorf, contract-brewed to organic standards using ecologically grown malt and hops.',
    1, 'approved', 0, NULL, NULL),

  -- ========== Düsseldorf — Gastronomie ==========
  ('dae-spiegel', 'Dä Spiegel', 'Dä Spiegel', 'gastronomie', 'Düsseldorf', 'DE',
    'Bolkerstraße 22, 40213 Düsseldorf',
    'https://maps.app.goo.gl/iLq4oso5jLWwWPDb6',
    51.226225, 6.773531, 1969, 'https://daespiegel.de/',
    'Dä Spiegel ist eine traditionelle Partykneipe in der Düsseldorfer Altstadt. Die Kneipe ist bekannt für ihre ausgelassene Stimmung, Live-Musik, Rock- und Partyklassiker sowie ihre lange Geschichte als beliebter Treffpunkt für Nachtschwärmer.',
    'Dä Spiegel is a traditional party pub in Düsseldorf’s old town. It is well known for its lively atmosphere, live music, rock and party classics, and its long-standing reputation as a popular nightlife meeting spot.',
    1, 'approved', 0, NULL, NULL),

  ('mississippi-d-alt', 'Mississippi D-Altstadt', 'Mississippi', 'gastronomie', 'Düsseldorf', 'DE',
    'Bolkerstraße 32, 40213 Düsseldorf',
    'https://maps.app.goo.gl/rVTCtk4qafHQ2fvo8',
    51.226355, 6.774311, NULL, 'https://www.mississippi-bar.de/',
    'Mississippi in der Altstadt ist eine beliebte Partylocation in Düsseldorf. Die Bar ist bekannt für ausgelassene Stimmung, Musik zum Feiern, Drinks und eine lebendige Atmosphäre besonders am Wochenende.',
    'Mississippi in the Altstadt is a popular party bar in Düsseldorf’s old town. It is known for its lively atmosphere, party music, drinks, and a busy nightlife scene, especially on weekends.',
    1, 'approved', 0, NULL, NULL),

  ('kasematten-schluessel', 'Kasematten Schlüssel', 'Kasematten (Schlüssel)', 'gastronomie', 'Düsseldorf', 'DE',
    'Untere Rheinwerft / Rheinuferpromenade, 40213 Düsseldorf',
    'https://maps.app.goo.gl/19HShAVx4QiYRVn98',
    51.226098580595234, 6.770250505530696, NULL, 'http://www.kasematten-duesseldorf.de/',
    'Zum Schlüssel an den Kasematten ist ein beliebter Biergarten direkt an der Rheinpromenade in der Düsseldorfer Altstadt. Die Location ist bekannt für frisches Altbier, entspannte Atmosphäre und den Blick auf den Rhein – besonders im Sommer ein beliebter Treffpunkt.',
    'Zum Schlüssel at the Kasematten is a popular riverside beer garden on Düsseldorf’s Rhine promenade. It is known for fresh Altbier, a relaxed atmosphere, and scenic river views, especially during summer.',
    1, 'approved', 0, 'kasematten-schluessel.png', NULL),

  ('kasematten-frannkenheim', 'Kasematten Frankenheim', 'Kasematten (Frankenheim)', 'gastronomie', 'Düsseldorf', 'DE',
    'Untere Rheinwerft / Rheinuferpromenade, 40213 Düsseldorf',
    'https://maps.app.goo.gl/19HShAVx4QiYRVn98',
    51.22586674755738, 6.770199184672781, NULL, 'http://www.kasematten-duesseldorf.de',
    'Frankenheim an den Kasematten ist ein beliebter Biergarten direkt an der Rheinpromenade in der Düsseldorfer Altstadt. Die Location ist bekannt für frisch gezapftes Altbier, entspannte Stimmung und den schönen Blick auf den Rhein.',
    'Frankenheim an den Kasematten is a popular riverside beer garden on Düsseldorf’s Rhine promenade. It is known for freshly served Altbier, a relaxed atmosphere, and scenic views of the Rhine River.',
    1, 'approved', 0, NULL, NULL),

  ('zum-schiffchen', 'Restaurant Zum Schiffchen', 'Zum Schiffchen', 'restaurant', 'Düsseldorf', 'DE',
    'Konrad-Adenauer-Platz 14, 40210 Düsseldorf',
    'https://maps.app.goo.gl/6f8vXdEaZTsEyQPD8?g_st=ac',
    51.220137, 6.792816, NULL, NULL,
    'Zum Schiffchen ist ein Restaurant und Bistro im Düsseldorfer Hauptbahnhof. Die Location bietet eine gemütliche Atmosphäre sowie deutsche Speisen und Getränke für Reisende und Besucher.',
    'Zum Schiffchen is a restaurant and bistro located inside Düsseldorf Central Station. It offers a cozy atmosphere along with German food and drinks for travelers and visitors.',
    1, 'approved', 0, NULL, NULL),

  ('fuchs-benrath', 'Fuchs Benrath', 'Fuchs', 'pub', 'Düsseldorf', 'DE',
    'Börchemstraße 18, 40597 Düsseldorf',
    'https://maps.app.goo.gl/rznuTeFTPNQ5zsyz9',
    51.164322, 6.872441, 2016, 'https://www.fuchs-benrath.de',
    'Fuchs in Benrath ist eine gemütliche Düsseldorfer Kneipe mit Brauhaus-Charme und beliebtem Füchschen Alt vom Fass. Neben klassischer regionaler Küche und saisonalen Gerichten bietet das Lokal eine lockere, gesellige Atmosphäre mit großer Außenterrasse und Live-Übertragungen von Fußballspielen. Besonders beliebt ist der „Fuchs“ als Treffpunkt für Freunde, Stammtische und entspannte Abende im Düsseldorfer Süden.',
    'Fuchs Benrath is a cozy pub and brewery-style restaurant in the south of Düsseldorf, known for its traditional atmosphere and fresh Füchschen Alt beer on tap. The venue serves regional German dishes and seasonal specialties in a relaxed, social setting with a spacious outdoor terrace. It is a popular meeting spot for locals, especially for casual evenings, football broadcasts, and gatherings with friends.',
    1, 'approved', 0, 'fuchs-benrath.png', NULL),

  ('muehlentreff', 'Mühlentreff Benrath', 'Mühlentreff', 'gastronomie', 'Düsseldorf', 'DE',
    'Paulsmühlenstraße 99, 40597 Düsseldorf',
    'https://maps.app.goo.gl/TwFkC6DR7mkmqhvb9',
    51.165322, 6.886514, NULL, 'https://muehlentreff.eatbu.com',
    '',
    '',
    1, 'approved', 0, 'muehlentreff.jpg', NULL),

  ('extratour', 'Extratour Zum Alten Rhein', 'Extratour', 'gastronomie', 'Düsseldorf', 'DE',
    'Drängenburger Str. 4, 40593 Düsseldorf',
    'https://maps.app.goo.gl/bfTBadSuJ6QJM1tYA?g_st=ac',
    51.14504, 6.864357, NULL, 'https://extratour-urdenbach.de',
    '',
    '',
    1, 'approved', 0, NULL, NULL),

  -- ========== Düsseldorf — Historisch ==========
  ('schloesser', 'Brauerei Schlösser', 'Schlösser', 'brewery', 'Düsseldorf', 'DE',
    'Münsterstraße, 40476 Düsseldorf (heute Campus Derendorf der Hochschule Düsseldorf)',
    NULL,
    51.2468622, 6.7916869, 1873, NULL,
    'Gegründet 1873 von der Bäckerfamilie Schlösser, ab 1932 Teil der Schwabenbrauerei. Schlösser Alt wurde bis in die 1970er Jahre in der Altstadt gebraut, ab 1972 in einem Neubau in Derendorf zwischen Münster- und Rather Straße. 2002 wurde die Brauerei geschlossen und abgerissen, heute steht dort der Campus Derendorf der Hochschule Düsseldorf. Schlösser Alt wird seitdem in Dortmund gebraut (Radeberger Gruppe).',
    'Founded in 1873 by the Schlösser baking family, part of Schwabenbrauerei from 1932. Schlösser Alt was brewed in the old town until the 1970s, then from 1972 in a new plant in Derendorf between Münsterstraße and Rather Straße. The brewery closed in 2002 and was demolished; the Hochschule Düsseldorf''s Derendorf campus now stands on the site. Schlösser Alt has since been brewed in Dortmund (Radeberger Group).',
    0, 'pending', 1, NULL, NULL),

  ('gatzweiler', 'Brauerei Gatzweiler', 'Gatzweiler', 'brewery', 'Düsseldorf', 'DE',
    'Viersener Straße, 40549 Düsseldorf (heute Vodafone-Campus)',
    NULL,
    51.235583, 6.732747, 1963, NULL,
    '1936 übernahm der Neusser Braumeister Carl Gatzweiler die Altstadt-Hausbrauerei Zum Schlüssel und etablierte daneben die Marke Gatzweilers Alt. Die Großbrauerei in Heerdt bestand von 1963 bis 1999, 1977 erreichte Gatzweilers Alt mit rund 530.000 Hektolitern den Rekordabsatz. 1999 ging die Marke an Carlsberg, seit 2022 gehört Gatz Altbier zur Privatbrauerei Bolten. Auf dem früheren Brauereigelände steht heute der Vodafone-Campus.',
    'In 1936, Neuss brewmaster Carl Gatzweiler took over the old-town brewpub Zum Schlüssel and also launched the Gatzweilers Alt brand. The large brewery in Heerdt operated from 1963 to 1999; in 1977 Gatzweilers Alt peaked at around 530,000 hectolitres. The brand went to Carlsberg in 1999 and has belonged to Privatbrauerei Bolten since 2022. The Vodafone Campus now stands on the former brewery site.',
    0, 'pending', 1, NULL, NULL),

  -- ========== Krefeld ==========
  ('schlueffken', 'Brauerei Schlüffken', 'Schlüffken', 'brewery', 'Krefeld', 'DE',
    'Preußenring (am Nordbahnhof), Krefeld',
    NULL,
    51.3487, 6.5662, 2018, NULL,
    'Neue Krefelder Brauerei am Nordbahnhof, gegründet 2018 von Anne und Johannes Furth als Teil des Restaurants Nordbahnhof. Das malzig-rustikale Schlüffken Alt mit markanter Hopfennote ist Krefelds jüngstes Altbier; der Name ehrt die Dampflok „Schluff“ („Mit Volldampf gebraut“). Adresse und Koordinaten noch zu prüfen.',
    'New Krefeld brewery at the Nordbahnhof, founded in 2018 by Anne and Johannes Furth as part of the Nordbahnhof restaurant. The malty, rustic Schlüffken Alt with a distinct hop note is Krefeld''s newest Altbier; the name honours the steam locomotive "Schluff" ("brewed at full steam"). Address and coordinates still to be verified.',
    0, 'pending', 0, NULL, NULL),

  ('koenigshof', 'Brauerei Königshof', 'Königshof', 'brewery', 'Krefeld', 'DE',
    'Obergath 68-112, 47805 Krefeld',
    'https://maps.app.goo.gl/mqMMdLwZaMuUshtA6',
    51.31599, 6.5717876, 2003, 'https://brauereikoenigshof.de',
    'Brauerei im Krefelder Stadtteil Königshof, seit 2003 am früheren Braustandort der Rhenania. Mildes Alt im niederrheinischen Stil.',
    'Brewery in Krefeld''s Königshof district, operating since 2003 on the former Rhenania brewing site. A mild Alt in the Lower-Rhine style.',
    1, 'approved', 0, NULL, NULL),

  ('gleumes', 'Brauerei Gleumes', 'Gleumes', 'brewpub', 'Krefeld', 'DE',
    'Sternstraße 12, 47798 Krefeld',
    'https://maps.google.com/maps?q=Sternstra%C3%9Fe+12%2C+47798+Krefeld',
    51.338, 6.55962, 1807, 'https://ausschank-gleumes.de',
    'Krefelds älteste Brauerei: 1807 als „Zu den drei Kronen“ an der Sternstraße gegründet, seit 1896 unter dem Namen Gleumes. Gleumes Alt wird seit 1896 gebraut und im historischen Ausschank mit Holzvertäfelung und Stuckdecken frisch gezapft, dazu deftige Brauhausküche.',
    'Krefeld''s oldest brewery: founded in 1807 as "Zu den drei Kronen" on Sternstraße, run under the Gleumes name since 1896. Gleumes Alt has been brewed since 1896 and is served fresh in the historic tap room with wood panelling and stucco ceilings, alongside hearty brewhouse food.',
    0, 'pending', 0, NULL, NULL),

  ('rhenania', 'Brauerei Rhenania', 'Rhenania', 'brewery', 'Krefeld', 'DE',
    'Marktstraße 41, 47798 Krefeld',
    NULL,
    51.3305, 6.5623, 1838, NULL,
    '1838 kaufte Hermann Josef Wirichs die Hausbrauerei Et Bröckske in Krefeld und führte sie als Brauerei Rhenania. Am 28. Februar 2002 endete die Produktion von Rhenania Alt in Krefeld, die Marken- und Braurechte gingen an Krombacher. Der Krefelder Braustandort wird seit 2003 als Brauerei Königshof weitergeführt.',
    'In 1838 Hermann Josef Wirichs bought the Et Bröckske brewpub in Krefeld and ran it as Brauerei Rhenania. Production of Rhenania Alt in Krefeld ended on 28 February 2002 and the brand and brewing rights went to Krombacher. The Krefeld brewing site has continued as Brauerei Königshof since 2003.',
    0, 'pending', 1, NULL, NULL),

  -- ========== Mönchengladbach — Historisch ==========
  ('hannen', 'Hannen Brauerei', 'Hannen', 'brewery', 'Mönchengladbach', 'DE',
    'Senefelderstraße 25, 41066 Mönchengladbach',
    NULL,
    51.2283518, 6.4763886, 1725, 'https://de.wikipedia.org/wiki/Hannen-Brauerei',
    'Traditionsmarke vom Niederrhein und eines der bekanntesten Alt-Biere außerhalb Düsseldorfs. Ab 1968 entstand die Großbrauerei in Mönchengladbach-Neuwerk, 1975 wurden die alten Standorte in Korschenbroich und Willich geschlossen. 2003 ging die Brauerei an Oettinger, die Marke 2005 an Carlsberg. Seit April 2022 gehört Hannen Alt zur Privatbrauerei Bolten und wird seit 2023 wieder in Korschenbroich gebraut.',
    'Heritage brand from the Lower Rhine and one of the best-known Alts outside Düsseldorf. The large brewery in Mönchengladbach-Neuwerk was built from 1968, and the old sites in Korschenbroich and Willich closed in 1975. The brewery went to Oettinger in 2003 and the brand to Carlsberg in 2005. Since April 2022 Hannen Alt has belonged to Privatbrauerei Bolten and has been brewed in Korschenbroich again since 2023.',
    1, 'approved', 1, NULL, NULL),

  -- ========== Niederrhein ==========
  ('bolten', 'Privatbrauerei Bolten', 'Bolten', 'brewery', 'Korschenbroich', 'DE',
    'Rheydter Straße 138, 41352 Korschenbroich',
    'https://maps.google.com/maps?q=Rheydter+Stra%C3%9Fe+138%2C+41352+Korschenbroich',
    51.183277, 6.4994, 1266, 'https://www.bolten-brauerei.de',
    'Gegründet 1266 und nach eigener Aussage die älteste Altbierbrauerei der Welt. Neben Bolten Alt und dem unfiltrierten Ur-Alt braut Bolten seit 2023 auch wieder Hannen Alt; seit 2022 gehört außerdem Gatz Altbier zum Haus. Ausgeschenkt wird im Gasthaus Hoff Marie und in der Landwirtschaft direkt gegenüber der Brauerei.',
    'Founded in 1266 and, by its own account, the oldest Altbier brewery in the world. Besides Bolten Alt and the unfiltered Ur-Alt, Bolten has brewed Hannen Alt again since 2023, and Gatz Altbier has also been part of the house since 2022. Its beer is served at Gasthaus Hoff Marie and at the Landwirtschaft directly opposite the brewery.',
    0, 'pending', 0, NULL, NULL),

  ('hoff-marie', 'Gasthaus Hoff Marie', 'Hoff Marie', 'gastronomie', 'Korschenbroich', 'DE',
    'Sebastianusstraße 9, 41352 Korschenbroich',
    'https://maps.google.com/maps?q=Sebastianusstra%C3%9Fe+9%2C+41352+Korschenbroich',
    51.1900011, 6.512603, 2024, 'https://www.bolten-brauerei.de/de/Gasthaus-Hoff-Marie.htm',
    'Brauereiausschank der Privatbrauerei Bolten im ältesten Haus Korschenbroichs, einem rund 500 Jahre alten, denkmalgeschützten Steinhaus. Früher die Gaststätte „Zum Anker“, nach Übernahme und Renovierung durch die Bolten Gastronomie im November 2024 als Gasthaus Hoff Marie neu eröffnet. Bolten Alt vom Fass.',
    'Privatbrauerei Bolten''s tap house in Korschenbroich''s oldest building, a listed stone house around 500 years old. Formerly the "Zum Anker" inn, it reopened as Gasthaus Hoff Marie in November 2024 after Bolten''s gastronomy arm took it over and renovated it. Bolten Alt on tap.',
    0, 'pending', 0, NULL, NULL),

  ('bolten-landwirtschaft', 'Bolten Landwirtschaft', 'Landwirtschaft', 'gastronomie', 'Korschenbroich', 'DE',
    'Rheydter Straße 145, 41352 Korschenbroich',
    'https://maps.google.com/maps?q=Rheydter+Stra%C3%9Fe+145%2C+41352+Korschenbroich',
    51.18327, 6.499772, NULL, 'https://www.bolten-brauerei.de',
    'Gaststätte der Privatbrauerei Bolten direkt gegenüber der Brauerei, mit Picknick-Biergarten. Bolten Alt frisch aus der Nachbarschaft.',
    'Privatbrauerei Bolten''s restaurant directly opposite the brewery, with a picnic beer garden. Bolten Alt fresh from across the street.',
    0, 'pending', 0, NULL, NULL),

  ('brauerei-im-dom', 'Brauerei Im Dom', 'Im Dom', 'brewery', 'Neuss', 'DE',
    'Michaelstraße 75-77, 41460 Neuss',
    'https://maps.app.goo.gl/eGvSJmfdcRP7NrW59',
    51.196253, 6.693359, 1601, 'https://im-dom.de',
    'Die Brauerei Im Dom ist die letzte Hausbrauerei in Neuss und braut seit 1601 in der Altstadt. Im Ausschank: Dom''s Alt, Weizen und Gold, dazu deftige Brauhausküche. Das Haus steht unter Denkmalschutz, Führungen durch den Braukeller sind möglich.',
    'Brauerei Im Dom is the last remaining brewpub in Neuss, brewing in the old town since 1601. On tap: Dom''s Alt, Weizen and Gold, paired with hearty brewhouse fare. The listed building also offers tours of its historic brewing cellar.',
    1, 'approved', 0, NULL, 'brauerei-im-dom.svg'),

  ('diebels', 'Brauerei Diebels', 'Diebels', 'brewery', 'Issum', 'DE',
    'Brauerei-Diebels-Straße 1, 47661 Issum',
    'https://maps.google.com/maps?q=Brauerei-Diebels-Stra%C3%9Fe+1%2C+47661+Issum',
    51.534786, 6.419453, 1878, 'https://www.diebels.de',
    'Größte Altbierbrauerei der Welt, 1878 vom Krefelder Braumeister Josef Diebels in Issum gegründet und heute Teil von AB InBev. Seit 1979 braut Diebels ausschließlich obergärige Biere. Im Besucherzentrum gibt es Brauereiführungen mit Verkostung.',
    'The world''s largest Altbier brewery, founded in Issum in 1878 by Krefeld brewmaster Josef Diebels and now part of AB InBev. Since 1979 Diebels has brewed only top-fermented beers. The visitor centre offers brewery tours with tastings.',
    0, 'pending', 0, NULL, NULL),

  -- ========== Ruhrgebiet / Münsterland ==========
  ('factory-bottrop', 'Factory Bottrop', 'Factory Bottrop', 'gastronomie', 'Bottrop', 'DE',
    'Gladbecker Str. 78, 46236 Bottrop',
    'https://maps.app.goo.gl/ehgDRb9jJETgGzWU7',
    51.528939, 6.929466, 2015, 'https://www.factory-buffet.de/standort-bottrop',
    'Die Factory Bottrop ist ein modernes amerikanisch-mexikanisches Buffetrestaurant im Industrial-Style. In einem ehemaligen Straßenbahndepot bietet sie große Buffet-Auswahl, BBQ-Spezialitäten und eine lockere Sportsbar-Atmosphäre.',
    'Factory Bottrop is a modern American-Mexican buffet restaurant with an industrial design. Located in a former tram depot, it offers a large buffet selection, BBQ specialties, and a relaxed sports bar atmosphere.',
    1, 'approved', 0, NULL, NULL),

  ('pinkus-mueller', 'Brauerei Pinkus Müller', 'Pinkus', 'brewpub', 'Münster', 'DE',
    'Kreuzstraße 4-10, 48143 Münster',
    'https://maps.google.com/maps?q=Kreuzstra%C3%9Fe+4-10%2C+48143+M%C3%BCnster',
    51.96556, 7.62167, 1816, 'https://www.pinkus.de',
    'Familienbrauerei in siebter Generation im Münsteraner Kuhviertel, gegründet 1816 und die letzte von einst rund 150 Altbierbrauereien der Stadt. Bio-Pionier: Gebraut wird ausschließlich mit Rohstoffen aus ökologischem Anbau. Das Original Pinkus Alt ist ein heller Münsteraner Alt und damit deutlich anders als das dunkle rheinische Alt. Gaststätte mit Altbierküche direkt an der Brauerei.',
    'Seventh-generation family brewery in Münster''s Kuhviertel, founded in 1816 and the last of the city''s once roughly 150 Altbier breweries. An organic pioneer that brews exclusively with organically grown ingredients. Original Pinkus Alt is a pale Münster-style Alt, quite different from the dark Rhineland Alt. Restaurant with Altbier kitchen right at the brewery.',
    1, 'approved', 0, NULL, NULL),

  -- ========== Köln / Hilden ==========
  ('hellers', 'Hellers Brauhaus', 'Hellers', 'brewpub', 'Köln', 'DE',
    'Roonstraße 33, 50674 Köln',
    'https://maps.app.goo.gl/JKUZo3D88FwnceN87',
    50.9306759, 6.9382923, 1996, 'https://www.hellers.koeln',
    'Bio-Hausbrauerei im Kwartier Latäng, Köln. Die einzige Kölner Hausbrauerei in Bio-Qualität — braut Kölsch, naturtrübes Wiess und sogar Altbier.',
    'Organic brewpub in Cologne''s Kwartier Latäng. The city''s only brewpub producing its beers — Kölsch, naturally cloudy Wiess and even Altbier — to certified organic standards.',
    1, 'approved', 0, NULL, NULL),

  ('hemingway-hilden', 'Hemingway Hilden', 'Hemingway', 'gastronomie', 'Hilden', 'DE',
    'Markt 16, 40721 Hilden',
    'https://maps.app.goo.gl/wFiw2JPgwmGRGkr17',
    51.168685, 6.932494, 2023, 'https://hemingway-hilden.de/',
    'Hemingway ist ein kleines Café, Bar und Restaurant im Herzen von Hilden. Die Location ist bekannt für ihre gemütliche Atmosphäre, Cocktails, Kaffee und entspanntes Zusammensitzen.',
    'Hemingway is a small café, bar, and restaurant in the heart of Hilden. It is known for its cozy atmosphere, cocktails, coffee, and relaxed social setting.',
    1, 'approved', 0, NULL, NULL);

-- Primär-Ort je Stil (nach den Brauereien, wegen FK)
UPDATE styles SET primary_brewery_id = 'uerige' WHERE id = 'uerige-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'uerige' WHERE id = 'uerige-sticke' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'uerige' WHERE id = 'uerige-doppelsticke' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'fuechschen' WHERE id = 'fuechschen-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'fuechschen' WHERE id = 'fuechschen-alt-af' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'schumacher' WHERE id = 'schumacher-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'kuerzer-altstadt' WHERE id = 'kuerzer-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'frankenheim-brauereiausschank' WHERE id = 'frankenheim-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'bolten' WHERE id = 'bolten-uralt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'diebels' WHERE id = 'diebels-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'gleumes' WHERE id = 'gleumes-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'pinkus-mueller' WHERE id = 'pinkus-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'hellers' WHERE id = 'hellers-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'altus' WHERE id = 'altus-alt' AND primary_brewery_id IS NULL;

-- ============================================================
-- Style assignments
-- ============================================================
INSERT OR IGNORE INTO brewery_styles (brewery_id, style_id) VALUES
  ('uerige', 'uerige-alt'),
  ('uerige', 'uerige-sticke'),
  ('uerige', 'uerige-doppelsticke'),
  ('fuechschen', 'fuechschen-alt'),
  ('schumacher', 'schumacher-alt'),
  ('schluessel', 'schluessel-alt'),
  ('kuerzer-altstadt', 'kuerzer-alt'),
  ('kuerzer-flingern', 'kuerzer-alt'),
  ('frankenheim-brauereiausschank', 'frankenheim-alt'),
  ('im-goldenen-kessel', 'schumacher-alt'),
  ('kneipe-kneipe', 'altus-alt'),
  ('altus', 'altus-alt'),
  ('kasematten-schluessel', 'schluessel-alt'),
  ('kasematten-frannkenheim', 'frankenheim-alt'),
  ('zum-schiffchen', 'frankenheim-alt'),
  ('fuchs-benrath', 'fuechschen-alt'),
  ('fuchs-benrath', 'fuechschen-alt-af'),
  ('muehlentreff', 'schumacher-alt'),
  ('extratour', 'schumacher-alt'),
  ('koenigshof', 'koenigshof-alt'),
  ('gleumes', 'gleumes-alt'),
  ('hannen', 'hannen-alt'),
  ('bolten', 'bolten-uralt'),
  ('bolten', 'hannen-alt'),
  ('hoff-marie', 'bolten-uralt'),
  ('bolten-landwirtschaft', 'bolten-uralt'),
  ('brauerei-im-dom', 'dom-alt'),
  ('diebels', 'diebels-alt'),
  ('pinkus-mueller', 'pinkus-alt'),
  ('hellers', 'hellers-alt'),
  ('hemingway-hilden', 'schumacher-alt');

-- ============================================================
-- Prices (approved, Stand Live-DB Oktober 2026)
-- ============================================================
INSERT OR IGNORE INTO prices (brewery_id, date, size, price, source, notes, status) VALUES
  ('uerige', '2026-04-15', '0.25l', 2.85, 'on-site', NULL, 'approved'),
  ('uerige', '2025-11-05', '0.25l', 2.85, 'on-site', NULL, 'approved'),
  ('fuechschen', '2026-04-12', '0.25l', 2.9, 'on-site', NULL, 'approved'),
  ('fuechschen', '2025-09-01', '0.25l', 2.7, 'on-site', NULL, 'approved'),
  ('schumacher', '2026-04-08', '0.25l', 2.9, 'on-site', NULL, 'approved'),
  ('schumacher', '2025-10-15', '0.25l', 2.7, 'on-site', NULL, 'approved'),
  ('schluessel', '2026-04-14', '0.25l', 2.9, 'on-site', NULL, 'approved'),
  ('schluessel', '2025-12-01', '0.25l', 2.7, 'on-site', NULL, 'approved'),
  ('kuerzer-altstadt', '2026-04-16', '0.2', 2.8, 'on-site', NULL, 'approved'),
  ('kuerzer-altstadt', '2026-03-01', '0.2', 2.7, 'on-site', NULL, 'approved'),
  ('kuerzer-altstadt', '2025-10-09', '0.2', 2.6, 'on-site', NULL, 'approved'),
  ('kuerzer-flingern', '2026-04-20', '0.2', 2.8, 'on-site', NULL, 'approved'),
  ('fuchs-benrath', '2026-05-14', '0.25', 2.9, 'Beitrag', 'Speisekarte', 'approved'),
  ('fuchs-benrath', '2024-11-01', '0.25', 2.8, 'Speisekarte', NULL, 'approved'),
  ('koenigshof', '2026-04-02', '0.5l', 3.4, 'retail', NULL, 'approved'),
  ('hannen', '2026-03-15', '0.5l', 2.9, 'retail', NULL, 'approved'),
  ('mississippi-d-alt', '2026-05-17', '0.5', 5.9, 'Speisekarte', NULL, 'approved'),
  ('kasematten-schluessel', '2026-05-17', '0.25', 3.5, 'Speisekarte', NULL, 'approved'),
  ('kasematten-schluessel', '2026-05-17', '0.5', 6.8, 'Speisekarte', NULL, 'approved'),
  ('kasematten-frannkenheim', '2026-05-17', '0.3l', 3.9, 'Speisekarte', NULL, 'approved'),
  ('kasematten-frannkenheim', '2026-05-17', '0.5', 6.5, 'Speisekarte', NULL, 'approved'),
  ('hemingway-hilden', '2026-05-17', '0.25', 3.3, 'Speisekarte', NULL, 'approved'),
  ('hemingway-hilden', '2026-05-17', '0.5', 5.9, 'Speisekarte', NULL, 'approved'),
  ('factory-bottrop', '2026-05-16', '0.4', 4.95, 'Speisekarte', NULL, 'approved'),
  ('extratour', '2026-06-06', '0.25l', 2.8, 'Speisekarte', NULL, 'approved'),
  ('extratour', '2026-06-06', '0.5', 5.5, 'Speisekarte', NULL, 'approved'),
  ('muehlentreff', '2026-07-02', '0.2', 2.5, NULL, NULL, 'approved'),
  ('brauerei-im-dom', '2025-12-31', '0.2', 2.4, 'Speisekarte', NULL, 'approved'),
  ('brauerei-im-dom', '2025-12-31', '0.5', 5.5, 'Speisekarte', NULL, 'approved');

-- ============================================================
-- Events — bestätigte Veranstaltungen
-- ============================================================
INSERT OR IGNORE INTO events
  (id, title_de, title_en, brewery_id, date, end_date, time, end_time, location, url, description_de, description_en, status)
VALUES
  ('bierboerse-benrath', 'Bierbörse', 'Bierbörse',
    NULL, '2027-08-20', '2027-08-22', '15:00', '20:00', 'Benrath',
    'https://www.bierboerse.com/city/duesseldorf-benrath.htm',
    'Vom 20.–22. August 2027 lädt die Benrather Bierbörse in Düsseldorf-Benrath Bierfans aus ganz Deutschland ein. Rund 40 Stände bieten in der Fußgängerzone und auf der Heubesstraße über 500 Biersorten sowie vielfältige Speisen an. Die traditionsreiche Veranstaltung findet seit über 30 Jahren nahe des Benrather Schlosses statt und begeistert mit gemütlichen Biergärten und rheinischer Atmosphäre.',
    'From August 20–22, 2027, the Benrather Bierbörse in Düsseldorf-Benrath welcomes beer lovers from across Germany. Around 40 stands in the pedestrian zone and along Heubesstraße offer more than 500 types of beer and a wide variety of food. Held for more than 30 years near the famous Benrath Palace, the event is known for its cozy beer gardens and authentic Rhineland atmosphere.',
    'approved'),
  ('rheinkirmes-2026', 'Rheinkirmes 2026', 'Rheinkirmes 2026',
    NULL, '2026-07-17', '2026-07-26', '11:00', '20:00', NULL,
    'https://rheinkirmes-duesseldorf.de',
    'Die Rheinkirmes („Größte Kirmes am Rhein") ist Düsseldorfs großes Sommer-Volksfest, jedes Jahr im Juli auf den Rheinwiesen in Oberkassel gegenüber der Altstadt. Ausgerichtet vom St. Sebastianus Schützenverein, kommen an neun Tagen rund vier Millionen Besucher. Eintritt frei, etwa 300 Fahrgeschäfte und Stände, Altbier-Zelte, Schützenumzug und zum Abschluss Höhenfeuerwerk über dem Rhein.',
    'The Rheinkirmes ("Größte Kirmes am Rhein") is Düsseldorf''s big summer funfair, held every July on the Rheinwiesen in Oberkassel across from the Altstadt. Organised by the St. Sebastianus Schützenverein, it draws about four million visitors over nine days. Free entry, around 300 rides and stalls, Altbier tents, a Schützen parade, and fireworks over the Rhine to close.',
    'approved'),
  ('schluessel-stike-2026-10', 'Stike-Ausschank im Schlüssel', 'Stike tapping at Schlüssel',
    'schluessel', '2026-10-14', NULL, NULL, NULL, 'Düsseldorf Altstadt',
    'https://www.zumschluessel.de/events-termine-duesseldorf/stike-ausschank',
    'Am 14. Oktober 2026 findet wieder unser Original Schlüssel Stike-Abend statt. Es ist ein besonderer Tag für alle Liebhaber handwerklicher Braukunst: Unser kräftiges Stike-Altbier mit seiner einzigartigen Geschichte wird serviert – eine Spezialität, die nur zweimal im Jahr ausgeschenkt wird.

Original Schlüssel Stike ist eine saisonale Spezialität mit besonderer Geschichte. Sein Rezept geht auf eine alte Klostertradition zurück: Während der Fastenzeit brauten Mönche ein besonders kräftiges Altbier, um neue Kraft zu gewinnen – trotz des Verbots ihres Abtes, das sie heimlich umgingen.',
    'The Original Schlüssel Stike is tapped fresh from the wooden barrel twice a year (March and October). The October 2026 edition starts on 14 October.',
    'approved'),
  ('uerige-sticke-2026-10', 'Sticke-Ausschank im Uerige', 'Sticke tapping at Uerige',
    'uerige', '2026-10-20', NULL, NULL, NULL, 'Düsseldorf Altstadt',
    'https://www.altbierwelt.de/altbier-lokale/stickum-im-uerige/',
    'Am dritten Dienstag im Oktober wird im Uerige die Sticke angestochen — das stärkere, kräftig gehopfte Alt (ca. 6 % vol.), das nur zweimal im Jahr (Januar und Oktober) ausgeschenkt wird.',
    'On the third Tuesday of October, Uerige taps its Sticke — the stronger, more heavily hopped Alt (about 6% ABV) served only twice a year (January and October).',
    'approved'),
  ('schumacher-latzen-2026-11', 'Latzenbier-Ausschank bei Schumacher', 'Latzenbier tapping at Schumacher',
    'schumacher', '2026-11-19', NULL, NULL, NULL, 'Düsseldorf',
    'https://schumacher-alt.de',
    'Das Schumacher Latzenbier wird am dritten Donnerstag im März, September und November ausgeschenkt. Nächster Termin: 19. November 2026.',
    'Schumacher Latzenbier is tapped on the third Thursday of March, September and November. Next date: 19 November 2026.',
    'approved');

-- ============================================================
-- Event beers
-- ============================================================
-- event_beers hat keinen natürlichen Schlüssel: nur einfügen, was am Event noch fehlt (idempotent)
INSERT INTO event_beers (event_id, name_de, name_en, size, price)
SELECT v.column1, v.column2, NULL, v.column3, v.column4 FROM (VALUES
  ('rheinkirmes-2026', 'Schlüssel', '0.25l', 3.3),
  ('rheinkirmes-2026', 'Uerige', '0.25l', 3.4),
  ('rheinkirmes-2026', 'Schumacher', '0.25l', 3.5),
  ('rheinkirmes-2026', 'Kürzer', '0.2l', 2.9),
  ('rheinkirmes-2026', 'Schlösser', '0.2l', 3.0),
  ('schumacher-latzen-2026-11', 'Latzenbier', '1l', NULL)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM event_beers e WHERE e.event_id = v.column1 AND e.name_de = v.column2 AND e.size = v.column3);
