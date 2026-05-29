-- ============================================================
-- Altbieratlas — Seed data  v0.9.2
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
INSERT OR IGNORE INTO styles (id, name, abv, ibu, color, tasting_de, tasting_en) VALUES
  -- Düsseldorfer Hausbrauereien
  ('uerige-alt',    'Uerige Alt',          4.7,  52, '#7b3a13',
    'Kräftig herb, würzig, trockener Abgang. Eine der bitteren unter den Düsseldorfer Alts.',
    'Firmly bitter, spicy, dry finish. One of the more bitter Düsseldorf Alts.'),
  ('sticke',        'Uerige Sticke',       6.0,  65, '#5b2409',
    'Stärker eingebraut, malzig-komplex, intensivere Hopfengabe. Nur zweimal jährlich ausgeschenkt.',
    'Stronger brew, malt-complex, more intense hopping. Only served twice a year.'),
  ('doppelsticke',  'Uerige Doppelsticke', 8.5,  70, '#3d1606',
    'Fast portweinartig, reich, komplex, mit langer Reife. Für die seltenen Anlässe.',
    'Almost port-like, rich, complex, long-aged. For the rare occasions.'),
  ('fuechschen-alt','Füchschen Alt',       4.5,  38, '#8a4a1f',
    'Malzbetont, vollmundig, weich. Eines der zugänglichsten Düsseldorfer Alts.',
    'Malt-forward, full-bodied, soft. One of the most approachable Düsseldorf Alts.'),
  ('schumacher-alt','Schumacher Alt',      4.6,  32, '#9b5226',
    'Mild, rund, gut trinkbar. Der Klassiker für den langen Abend.',
    'Mild, round, highly drinkable. The classic for a long evening.'),
  ('schluessel-alt','Schlüssel Alt',       5.0,  35, '#823c13',
    'Leicht herb, ausgewogen, trocken. Sehr traditioneller Stil.',
    'Lightly bitter, balanced, dry. Very traditional style.'),
  ('kuerzer-alt',   'Kürzer Alt',          4.8,  34, '#8f461b',
    'Frisch, hell-bernsteinfarben, mit leichter Citrusnote vom offen gekochten Sud.',
    'Fresh, light amber, with a gentle citrus note from the open-boil wort.'),
  -- Niederrhein
  ('koenigshof-alt','Königshof Alt',       4.9,  28, '#8c4a1a',
    'Mild-malzig, niederrheinisch weich. Klassisch für die Region.',
    'Mild-malty, soft in the Lower-Rhine style. Regional classic.'),
  ('hannen-alt',    'Hannen Alt',          4.8,  30, '#8c4820',
    'Industriell gebraut, aber klassisch profiliert. Die wohl bekannteste Alt-Marke außerhalb Düsseldorfs.',
    'Industrially brewed but classically profiled. Likely the best-known Alt brand outside Düsseldorf.'),
  ('bolten-uralt',  'Bolten Ur-Alt',       4.9,  28, '#8a4618',
    'Niederrheinisch mild, leicht malzig mit fruchtig-würzigem Charakter. Das älteste kommerziell gebraute Alt — ein Stück lebendige Biergeschichte.',
    'Mild Lower-Rhine style, lightly malty with a fruity-spicy character. The oldest commercially brewed Alt — a piece of living beer history.'),
  ('diebels-alt',   'Diebels Alt',         4.9,  27, '#8b4417',
    'Mild, leicht herb, gut trinkbar. Der typische Niederrhein-Alt — weicher und runder als die Düsseldorfer Hausbrauerei-Versionen.',
    'Mild, slightly bitter, very drinkable. The typical Lower-Rhine Alt — softer and rounder than the Düsseldorf brewpub versions.'),
  ('frankenheim-alt','Frankenheim Alt',    4.9,  30, '#8c4519',
    'Ausgewogen-malzig, leicht herb, süffig. Das erfolgreichste Düsseldorfer Industrie-Alt.',
    'Balanced-malty, lightly bitter, easy-drinking. The most successful Düsseldorf industrial Alt.'),
  -- Bio / Köln
  ('hellers-alt',   'Hellers Altbier',     4.8, NULL, '#8b4820',
    'Bio-Altbier des Kölner Brauhauses Hellers. Mild, ausgewogen, mit biologisch angebautem Malz gebraut.',
    'Organic Altbier from Cologne''s Hellers brewpub. Mild, balanced, brewed with organically grown malt.'),
  ('altus-alt',     'Altus Bio-Alt',       4.9, NULL, '#8d4a1e',
    'Erstes Bio-Altbier aus Düsseldorf. Mild-malzig, ausgewogen, mit ökologisch angebautem Hopfen und Malz.',
    'The first certified organic Altbier from Düsseldorf. Mildly malty, balanced, brewed with organically grown hops and malt.'),
  -- Internationale Interpretationen (informational, kein Brauerei-Mapping)
  ('alaskan-amber', 'Alaskan Amber',       5.3,  18, '#a55b24',
    'Amerikanische Alt-Interpretation: malzbetont, karamellig, weicher als die Düsseldorfer Originale.',
    'American take on Alt: malt-forward, caramel, softer than the Düsseldorf originals.'),
  ('long-trail-ale','Long Trail Ale',      4.6,  25, '#a56030',
    'Vermonter Interpretation: malzig, süßlich, mit amerikanischem Hopfencharakter.',
    'Vermont take: malty, mildly sweet, with American hop character.');

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
  (id, name, short_name, type, city, country, address, maps_url, lat, lng, founded, website, description_de, description_en, verified, status, is_historical)
VALUES
  -- ========== Düsseldorf — Hausbrauereien (Altstadt) ==========
  ('uerige', 'Brauerei im Uerige', 'Uerige', 'brewpub', 'Düsseldorf', 'DE',
    'Berger Straße 1, 40213 Düsseldorf',
    'https://maps.app.goo.gl/7LRrNJg6GxJD8J6y7',
    51.2253, 6.7722, 1862, 'https://uerige.de',
    'Eine der vier klassischen Düsseldorfer Hausbrauereien in der Altstadt. Bekannt für kräftig-herbes, würziges Alt und die halbjährliche Sticke-Ausschank.',
    'One of the four classic Düsseldorf brewpubs in the old town. Known for a firm, bitter, spicy Alt and its biannual Sticke release.',
    1, 'approved', 0),

  ('fuechschen', 'Brauerei Füchschen', 'Füchschen', 'brewpub', 'Düsseldorf', 'DE',
    'Ratinger Straße 28, 40213 Düsseldorf',
    'https://maps.app.goo.gl/SjsbNAnc7h29xwiK8',
    51.2278, 6.7715, 1848, 'https://fuechschen.de',
    'Familiengeführte Hausbrauerei, bekannt für ein malzbetontes, vollmundiges Alt und die legendäre Weihnachts-Silvester-Stimmung.',
    'Family-run brewpub known for a malty, full-bodied Alt and its legendary Christmas-New-Year atmosphere.',
    1, 'approved', 0),

  ('schumacher', 'Brauerei Schumacher', 'Schumacher', 'brewpub', 'Düsseldorf', 'DE',
    'Oststraße 123, 40210 Düsseldorf',
    'https://maps.app.goo.gl/txBSi9QNHmm7hn5b6',
    51.2224, 6.7912, 1838, 'https://schumacher-alt.de',
    'Die älteste der Düsseldorfer Hausbrauereien. Mildes, gut trinkbares Schumacher Alt seit 1838.',
    'The oldest of the Düsseldorf brewpubs. A mild, highly drinkable Schumacher Alt since 1838.',
    1, 'approved', 0),

  ('schluessel', 'Brauerei zum Schlüssel', 'Schlüssel', 'brewpub', 'Düsseldorf', 'DE',
    'Bolkerstraße 41-47, 40213 Düsseldorf',
    'https://maps.app.goo.gl/rAoikQk3Z7kRWPMcA',
    51.2268, 6.7728, 1850, 'https://zumschluessel.de',
    'Traditionsreiche Hausbrauerei an der Bolkerstraße, im Herzen der Altstadt. Ausgewogenes, leicht herbes Alt.',
    'Heritage brewpub on Bolker Straße, in the heart of the old town. A balanced, gently bitter Alt.',
    1, 'approved', 0),

  ('kuerzer-altstadt', 'Brauerei Kürzer', 'Kürzer', 'brewpub', 'Düsseldorf', 'DE',
    'Kurze Straße 18-20, 40213 Düsseldorf',
    'https://maps.app.goo.gl/6ggY8aBHTgjhKB7b7',
    51.2262, 6.7733, 2010, 'https://brauerei-kuerzer.de',
    'Die jüngste der Düsseldorfer Altstadt-Hausbrauereien. Offene Braukessel mitten im Gastraum.',
    'The youngest of Düsseldorf''s old-town brewpubs. Open brewing kettles right in the taproom.',
    1, 'approved', 0),

  -- ========== Düsseldorf — weitere Standorte ==========
  ('kuerzer-flingern', 'Brauerei Kürzer Flingern', 'Kürzer Flingern', 'brewpub', 'Düsseldorf', 'DE',
    'Fichtenstraße 21, 40233 Düsseldorf',
    'https://maps.app.goo.gl/XpnPvsgYyfjHLXR29',
    51.2337, 6.8151, 2020, 'https://brauerei-kuerzer.de',
    'Zweiter Kürzer-Standort in Düsseldorf-Flingern. Vollwertige Produktionsbrauerei mit Taproom, Biergarten und sechs Spezialbieren, die ausschließlich hier ausgeschenkt werden.',
    'Second Kürzer site in Düsseldorf-Flingern. Full production brewery with taproom, beer garden and six specialty beers available only here.',
    1, 'approved', 0),

  ('fuchs-benrath', 'Fuchs Benrath', 'Fuchs', 'pub', 'Düsseldorf', 'DE',
    'Börchemstraße 18, 40597 Düsseldorf',
    'https://maps.app.goo.gl/rznuTeFTPNQ5zsyz9',
    51.164322, 6.872441, 2016, 'https://www.fuchs-benrath.de',
    'Fuchs in Benrath ist eine gemütliche Düsseldorfer Kneipe mit Brauhaus-Charme und beliebtem Füchschen Alt vom Fass. Neben klassischer regionaler Küche und saisonalen Gerichten bietet das Lokal eine lockere, gesellige Atmosphäre mit großer Außenterrasse und Live-Übertragungen von Fußballspielen. Besonders beliebt ist der „Fuchs" als Treffpunkt für Freunde, Stammtische und entspannte Abende im Düsseldorfer Süden.',
    'Fuchs Benrath is a cozy pub and brewery-style restaurant in the south of Düsseldorf, known for its traditional atmosphere and fresh Füchschen Alt beer on tap. The venue serves regional German dishes and seasonal specialties in a relaxed, social setting with a spacious outdoor terrace. It is a popular meeting spot for locals, especially for casual evenings, football broadcasts, and gatherings with friends.',
    1, 'approved', 0),

  ('altus', 'Altus bräu', 'Altus', 'brewery', 'Düsseldorf', 'DE',
    'Sonnbornstr. 2, 40625 Düsseldorf',
    'https://maps.app.goo.gl/6zbs82wR9AruhKYX7',
    51.2157, 6.8633, 2021, 'https://altus-braeu.de',
    'Erstes Bio-Altbier aus Düsseldorf. Gebraut nach biologischen Standards mit Malz und Hopfen aus ökologischem Anbau — im Lohnbrauen-Verfahren bei einer Partnerbrauerei.',
    'The first certified organic Altbier from Düsseldorf, contract-brewed to organic standards using ecologically grown malt and hops.',
    1, 'approved', 0),

  ('frankenheim', 'Frankenheim Brauerei', 'Frankenheim', 'brewery', 'Düsseldorf', 'DE',
    'Grafenberger Allee 101, 40237 Düsseldorf',
    'https://maps.app.goo.gl/KnFrFzpqZX1Kz1JF8',
    51.2281, 6.8077, 1873, 'https://www.frankenheim.de',
    'Große Düsseldorfer Alt-Brauerei, seit 1873. Frankenheim Alt ist nach Diebels das zweitmeistverkaufte Altbier Deutschlands — heute Teil der Radeberger Gruppe.',
    'Major Düsseldorf Alt brewery since 1873. Frankenheim Alt is Germany''s second best-selling Altbier after Diebels — today part of the Radeberger Group.',
    1, 'approved', 0),

  -- ========== Düsseldorf — Historisch ==========
  ('schloesser', 'Schlösser Alt', 'Schlösser', 'brewery', 'Düsseldorf', 'DE',
    'Oststraße, 40210 Düsseldorf',
    NULL,
    51.2231, 6.7899, 1873, NULL,
    'Ehemalige Düsseldorfer Brauerei, gegründet 1873. War einst die meistverkaufte Alt-Marke der Stadt. Die Brauerei wurde geschlossen; die Marke wird heute von Carlsberg Deutschland produziert.',
    'Former Düsseldorf brewery, founded 1873. Once the city''s best-selling Alt brand. The brewery has since closed; the brand is now produced by Carlsberg Deutschland.',
    1, 'approved', 1),

  ('gatzweiler', 'Gatzweiler Alt', 'Gatzweiler', 'brewery', 'Düsseldorf', 'DE',
    'Ratinger Straße, 40213 Düsseldorf',
    NULL,
    51.2276, 6.7744, 1845, NULL,
    'Traditionsreiche Düsseldorfer Alt-Brauerei, gegründet um 1845. Wurde in den 1960er Jahren von Binding aufgekauft und eingestellt. Gatzweiler Alt war für seinen milden, malzbetonten Stil bekannt.',
    'Traditional Düsseldorf Alt brewery, founded around 1845. Acquired by Binding in the 1960s and discontinued. Gatzweiler Alt was known for its mild, malt-forward style.',
    1, 'approved', 1),

  ('rhenania', 'Brauerei Rhenania', 'Rhenania', 'brewery', 'Düsseldorf', 'DE',
    'Schwanemarkt, 40213 Düsseldorf',
    NULL,
    51.2291, 6.7799, 1879, NULL,
    'Historische Düsseldorfer Alt-Brauerei, gegründet 1879. Braute bis Mitte des 20. Jahrhunderts ein typisches Düsseldorfer Alt. Heute nicht mehr in Betrieb.',
    'Historic Düsseldorf Alt brewery, founded 1879. Brewed a classic Düsseldorf Alt until the mid-20th century. No longer in operation.',
    1, 'approved', 1),

  -- ========== Krefeld ==========
  ('koenigshof', 'Privatbrauerei Königshof', 'Königshof', 'brewery', 'Krefeld', 'DE',
    'Untergath 70, 47805 Krefeld',
    'https://maps.app.goo.gl/mqMMdLwZaMuUshtA6',
    51.3172, 6.5603, 1830, 'https://privatbrauerei-koenigshof.de',
    'Niederrheinische Privatbrauerei mit einem milderen Alt im niederrheinischen Stil.',
    'Lower-Rhine private brewery with a milder Alt in the Niederrhein style.',
    1, 'approved', 0),

  -- ========== Mönchengladbach — Historisch ==========
  ('hannen', 'Hannen Brauerei', 'Hannen', 'brewery', 'Mönchengladbach', 'DE',
    'Bismarckstraße 115, 41061 Mönchengladbach',
    NULL,
    51.1805, 6.4428, 1725, 'https://de.wikipedia.org/wiki/Hannen-Brauerei',
    'Traditionsmarke, heute unter Carlsberg-Dach. Eines der bekanntesten Alt-Biere außerhalb Düsseldorfs.',
    'Heritage brand, now under Carlsberg. One of the best-known Alts outside Düsseldorf.',
    1, 'approved', 1),

  -- ========== Köln ==========
  ('hellers', 'Hellers Brauhaus', 'Hellers', 'brewpub', 'Köln', 'DE',
    'Roonstraße 33, 50674 Köln',
    'https://maps.app.goo.gl/JKUZo3D88FwnceN87',
    50.9284, 6.9408, 1996, 'https://www.hellers.koeln',
    'Bio-Hausbrauerei im Kwartier Latäng, Köln. Die einzige Kölner Hausbrauerei in Bio-Qualität — braut Kölsch, naturtrübes Wiess und sogar Altbier.',
    'Organic brewpub in Cologne''s Kwartier Latäng. The city''s only brewpub producing its beers — Kölsch, naturally cloudy Wiess and even Altbier — to certified organic standards.',
    1, 'approved', 0),

  -- ========== Niederrhein ==========
  ('bolten', 'Bolten Brauerei', 'Bolten', 'brewery', 'Korschenbroich', 'DE',
    'Richrather Straße 61, 41352 Korschenbroich',
    'https://maps.app.goo.gl/LD4Xc3b2NdYvhGTa7',
    51.1891, 6.5127, 1266, 'https://bolten-brauerei.de',
    'Die älteste kontinuierlich brauereitreibende Alt-Brauerei Deutschlands — seit 1266 in Korschenbroich am Niederrhein. Das Bolten Ur-Alt gilt als älteste Alt-Biermarke der Welt.',
    'Germany''s oldest continuously operating Alt brewery — in Korschenbroich on the Lower Rhine since 1266. Bolten Ur-Alt is considered the world''s oldest Alt beer brand.',
    1, 'approved', 0),

  ('diebels', 'Brauerei Diebels', 'Diebels', 'brewery', 'Issum', 'DE',
    'Brauerei-Diebels-Platz, 47661 Issum',
    'https://maps.app.goo.gl/9P8x2cqK5BXhM7Ys6',
    51.5340, 6.4279, 1878, 'https://www.diebels.de',
    'Größte Altbier-Brauerei Deutschlands, gegründet 1878 in Issum am Niederrhein. Diebels Alt ist das meistverkaufte Altbier Deutschlands — heute im AB-InBev-Konzern.',
    'Germany''s largest Altbier brewery, founded 1878 in Issum on the Lower Rhine. Diebels Alt is Germany''s best-selling Altbier — today part of the AB InBev group.',
    1, 'approved', 0);

-- ============================================================
-- Style assignments
-- ============================================================
INSERT OR IGNORE INTO brewery_styles (brewery_id, style_id) VALUES
  ('uerige',          'uerige-alt'),
  ('uerige',          'sticke'),
  ('uerige',          'doppelsticke'),
  ('fuechschen',      'fuechschen-alt'),
  ('fuchs-benrath',   'fuechschen-alt'),
  ('schumacher',      'schumacher-alt'),
  ('schluessel',      'schluessel-alt'),
  ('kuerzer-altstadt','kuerzer-alt'),
  ('kuerzer-flingern','kuerzer-alt'),
  ('koenigshof',      'koenigshof-alt'),
  ('hannen',          'hannen-alt'),
  ('hellers',         'hellers-alt'),
  ('altus',           'altus-alt'),
  ('bolten',          'bolten-uralt'),
  ('diebels',         'diebels-alt'),
  ('frankenheim',     'frankenheim-alt');

-- ============================================================
-- Prices (approved, stand Mai 2026)
-- ============================================================
INSERT OR IGNORE INTO prices (brewery_id, date, size, price, source, status) VALUES
  -- Uerige — regulär 2,85 €/0,25l
  ('uerige',           '2026-04-15', '0.25l', 2.85, 'on-site',    'approved'),
  ('uerige',           '2025-11-05', '0.25l', 2.85, 'on-site',    'approved'),
  -- Füchschen — regulär 2,90 €/0,25l
  ('fuechschen',       '2026-04-12', '0.25l', 2.90, 'on-site',    'approved'),
  ('fuechschen',       '2025-09-01', '0.25l', 2.70, 'on-site',    'approved'),
  -- Schumacher — regulär 2,90 €/0,25l
  ('schumacher',       '2026-04-08', '0.25l', 2.90, 'on-site',    'approved'),
  ('schumacher',       '2025-10-15', '0.25l', 2.70, 'on-site',    'approved'),
  -- Schlüssel — regulär 2,90 €/0,25l
  ('schluessel',       '2026-04-14', '0.25l', 2.90, 'on-site',    'approved'),
  ('schluessel',       '2025-12-01', '0.25l', 2.70, 'on-site',    'approved'),
  -- Kürzer Altstadt
  ('kuerzer-altstadt', '2026-04-16', '0.25l', 2.80, 'on-site',    'approved'),
  ('kuerzer-altstadt', '2026-03-01', '0.25l', 2.70, 'on-site',    'approved'),
  ('kuerzer-altstadt', '2025-10-09', '0.2',   2.60, 'on-site',    'approved'),
  -- Kürzer Flingern
  ('kuerzer-flingern', '2026-04-20', '0.25l', 2.80, 'on-site',    'approved'),
  -- Fuchs Benrath
  ('fuchs-benrath',    '2024-11-01', '0.25',  2.80, 'Speisekarte','approved'),
  -- Königshof — Flasche Getränkehandel
  ('koenigshof',       '2026-04-02', '0.5l',  3.40, 'retail',     'approved'),
  -- Hannen — Flasche Getränkehandel
  ('hannen',           '2026-03-15', '0.5l',  2.90, 'retail',     'approved');

-- ============================================================
-- Events — bestätigte Veranstaltungen
-- ============================================================
INSERT OR IGNORE INTO events
  (id, title_de, title_en, brewery_id, date, end_date, time, end_time, location, url, description_de, description_en, status)
VALUES
  ('bierboerse-benrath', 'Bierbörse', 'Bierbörse',
    NULL, '2026-08-21', '2026-08-23', NULL, NULL, 'Benrath',
    'https://www.bierboerse.com/city/duesseldorf-benrath.htm',
    'Vom 21.–23. August 2026 lädt die Benrather Bierbörse in Düsseldorf-Benrath Bierfans aus ganz Deutschland ein. Rund 40 Stände bieten in der Fußgängerzone und auf der Heubesstraße über 500 Biersorten sowie vielfältige Speisen an. Die traditionsreiche Veranstaltung findet seit 32 Jahren nahe des Benrather Schlosses statt und begeistert mit gemütlichen Biergärten und rheinischer Atmosphäre.',
    'From August 21–23, 2026, the Benrather Bierbörse in Düsseldorf-Benrath welcomes beer lovers from across Germany. Around 40 stands in the pedestrian zone and along Heubesstraße offer more than 500 types of beer and a wide variety of food. Held for 32 years near the famous Benrath Palace, the event is known for its cozy beer gardens and authentic Rhineland atmosphere.',
    'approved');

-- ============================================================
-- Event beers
-- ============================================================
INSERT OR IGNORE INTO event_beers (event_id, name_de, name_en, size, price) VALUES
  ('bierboerse-benrath', 'Kürzer Alt', NULL, '0.25l', 3.00),
  ('bierboerse-benrath', 'Bolten alt', NULL, '0.25l', 2.50);
