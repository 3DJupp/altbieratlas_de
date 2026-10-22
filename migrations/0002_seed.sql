-- ============================================================
-- Altbieratlas — Seed data  v0.16.0
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
  ('taproom',        'Brauereiausschank', 'Taproom',     'Was hier ausgeschenkt wird',             'What is served here',            0),
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
    'Die alkoholfreie Variante des Füchschen Alt aus der Ratinger Straße, mit 0,2 % Alkohol.',
    'The alcohol-free version of Füchschen Alt from Ratinger Straße, at 0.2 % ABV.',
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
    'Das Hannen Alt der Großbrauerei-Jahre in Mönchengladbach, zuletzt unter Carlsberg. Industriell gebraut, aber klassisch profiliert und lange die bekannteste Alt-Marke außerhalb Düsseldorfs. Heute als Hannen Alt (2023+) von Bolten gebraut.',
    'Hannen Alt from the big-brewery years in Mönchengladbach, last under Carlsberg. Industrially brewed but classically profiled, and for a long time the best-known Alt brand outside Düsseldorf. Now brewed by Bolten as Hannen Alt (2023+).',
    'stile/hannen-alt.png'),
  ('hannen-alt-2023', 'Hannen Alt (2023+)', 4.9, NULL, '#8c4820',
    'Röstmalze satt, tiefdunkel in der Farbe. Intensiv, rund und vollmundig mit malzig-herbem Geschmack, spritzig und frisch. Seit 2023 von der Privatbrauerei Bolten in Korschenbroich gebraut.',
    'Plenty of roasted malt, deep dark in colour. Intense, round and full-bodied with a malty, bitter taste, lively and fresh. Brewed by Privatbrauerei Bolten in Korschenbroich since 2023.',
    'stile/hannen-alt.png'),
  ('bolten-uralt', 'Bolten Ur-Alt', 4.9, 28, '#8a4618',
    'Niederrheinisch mild, leicht malzig mit fruchtig-würzigem Charakter. Die unfiltrierte Variante aus der ältesten Altbierbrauerei der Welt.',
    'Mild Lower-Rhine style, lightly malty with a fruity-spicy character. The unfiltered variant from the world''s oldest Altbier brewery.',
    NULL),
  ('bolten-alt', 'Bolten Alt', 4.9, NULL, '#8c4a1c',
    'Süffig, leicht mild, mit einer subtilen Süße. Anfänglich schlanker Körper, der mit jedem Schluck voller wird und Röstaromen ins Spiel bringt. Das klassische, filtrierte Alt der Privatbrauerei Bolten.',
    'Easy-drinking, gently mild, with a subtle sweetness. A slim body at first that grows fuller with every sip and brings roasted notes into play. The classic, filtered Alt from Privatbrauerei Bolten.',
    NULL),
  ('bolten-oh', 'Boltens Oh! Alkoholfrei', NULL, NULL, '#8a4618',
    'Das alkoholfreie Alt von Bolten (unter 0,5 %). Im Antrunk malzig, voller, runder Geschmack mit dezenter Säure und ausgeprägter Spritzigkeit. Isotonisch und naturtrüb.',
    'Bolten''s alcohol-free Alt (below 0.5 %). Malty on the first sip, full and round with a subtle acidity and a lively sparkle. Isotonic and unfiltered.',
    NULL),
  ('gatz-alt', 'Gatz Altbier', NULL, NULL, '#8b4a1c',
    'Die Düsseldorfer Traditionsmarke, früher Gatzweilers Alt aus Heerdt. Seit April 2022 gehört sie der Privatbrauerei Bolten und wird in Korschenbroich gebraut, zuvor zuletzt bei Königshof in Krefeld.',
    'The Düsseldorf heritage brand, formerly Gatzweilers Alt from Heerdt. Owned by Privatbrauerei Bolten since April 2022 and brewed in Korschenbroich, before that last at Königshof in Krefeld.',
    NULL),
  ('diebels-alt', 'Diebels Alt', 4.9, 27, '#8b4417',
    'Mild, leicht herb, gut trinkbar. Der typische Niederrhein-Alt — weicher und runder als die Düsseldorfer Hausbrauerei-Versionen.',
    'Mild, slightly bitter, very drinkable. The typical Lower-Rhine Alt — softer and rounder than the Düsseldorf brewpub versions.',
    NULL),
  ('gleumes-alt', 'Gleumes Alt', NULL, NULL, '#8a4a1c',
    'Hausgebrautes Alt der ältesten Krefelder Brauerei, seit 1896 an der Sternstraße gebraut und im historischen Ausschank frisch gezapft.',
    'House-brewed Alt from Krefeld''s oldest brewery, brewed on Sternstraße since 1896 and served fresh in the historic tap room.',
    NULL),
  ('hensen-alt', 'Hensen Alt', NULL, NULL, '#8b4513',
    'Niederrheinisches Altbier der wiederbelebten Brauerei Hensen aus Mönchengladbach-Waldhausen.',
    'Lower Rhine Altbier from the revived Hensen brewery in Mönchengladbach-Waldhausen.',
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
  ('dom-alt', 'Dom Alt', 4.8, 32, '#84431a',
    'Unfiltriertes Hausalt der Brauerei Im Dom in Neuss, vollmundig, mit Malz aus der Region und Hallertauer Hopfen.',
    'Unfiltered house Alt of the Brauerei Im Dom in Neuss, full-bodied, with regional malt and Hallertau hops.',
    NULL),
  ('altfred', 'ALTfred', NULL, NULL, '#874419',
    'Hausalt der Hausbrauerei Hitchcoq in Pempelfort, nach Reinheitsgebot gebraut. Malzig mit leicht hopfigem Abgang.',
    'House Alt of the Hitchcoq brewpub in Pempelfort, brewed to the Reinheitsgebot. Malty with a gently hoppy finish.',
    NULL),
  ('belsen-alt', 'Belsen Alt', NULL, NULL, '#8c4a1e',
    'Hausalt des Brauhauses Alter Bahnhof in Oberkassel, früher als Gulasch Alt ausgeschenkt. Malzig und würzig.',
    'House Alt of the Brauhaus Alter Bahnhof in Oberkassel, formerly served as Gulasch Alt. Malty and flavourful.',
    NULL),
  ('albrecht-alt', 'Joh. Albrecht Alt', NULL, NULL, '#8b4a20',
    'Hausalt des Brauhauses Joh. Albrecht in Niederkassel, im Düsseldorfer Stil gebraut, hopfig und fruchtig.',
    'House Alt of the Brauhaus Joh. Albrecht in Niederkassel, brewed in the Düsseldorf style, hoppy and fruity.',
    NULL),
  ('schlueffken-alt', 'Schlüffken Altbier', NULL, NULL, '#7f3f17',
    'Hausalt der Krefelder Brauerei Schlüffken, malzig-rustikal mit markanter Hopfennote.',
    'House Alt of Krefeld''s Schlüffken brewery, malty and rustic with a distinct hop note.',
    NULL);

-- ============================================================
-- Glossary
-- ============================================================
INSERT OR IGNORE INTO glossary (term, definition_de, definition_en) VALUES
  ('Altbier',
    'Obergäriges, dunkles Bier aus dem Rheinland. Das „Alt“ steht für die alte Brauart, nicht fürs Alter.',
    'Top-fermented dark beer from the Rhineland. The "Alt" refers to the old way of brewing, not the beer''s age.'),
  ('Doppelsticke',
    'Eine Stufe stärker als die Sticke, um die 8,5 % Alkohol. Lieber langsam trinken.',
    'One step up from Sticke, around 8.5% ABV. Best taken slowly.'),
  ('Halve Hahn',
    'Kein halbes Hähnchen, sondern ein Roggenbrötchen mit einer dicken Scheibe mittelaltem Gouda, dazu Senf und Zwiebeln. Der Klassiker zum Alt.',
    'Not half a chicken but a rye roll with a thick slice of medium-aged Gouda, mustard and onions. The classic snack with Alt.'),
  ('Köbes',
    'Die Bedienung im Brauhaus, klassisch mit blauer Schürze. Bringt das Alt, bevor du fragst, und hat immer einen Spruch parat.',
    'The server in a brewpub, classically in a blue apron. Brings your Alt before you ask and always has a quip ready.'),
  ('Kranz',
    'Das runde Tablett, auf dem der Köbes die Gläser durch den Laden trägt. Voll beladen passen locker ein Dutzend drauf.',
    'The round tray the Köbes uses to carry glasses through the room. Fully loaded it easily holds a dozen.'),
  ('Latzenbier',
    'Ein stärker eingebrautes Spezial-Alt, das es nur an wenigen Tagen im Jahr gibt. Der Name kommt von „op de Latt“: Besonders gelungene Sude kamen im Keller aufs oberste Regalbrett.',
    'A stronger special Alt that''s only poured on a few days a year. The name comes from "op de Latt": particularly good brews went on the top shelf in the cellar.'),
  ('Sticke',
    'Das „heimliche“ Alt: stärker eingebraut, kräftiger gehopft und nur an wenigen Tagen im Jahr im Ausschank. Der Name kommt vom niederdeutschen „stickum“ für heimlich.',
    'The "secret" Alt: brewed stronger, hopped harder and only poured on a few days a year. The name comes from the Low German "stickum", meaning secretly.'),
  ('Strichliste',
    'Die Striche auf deinem Bierdeckel. Einer pro Alt, am Ende wird gezählt.',
    'The marks on your coaster. One per Alt, counted up at the end.');

-- ============================================================
-- Breweries — nur Produzenten (Brauereien, Hausbrauereien) und ihr Stammausschank
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

  ('frankenheim-brauereiausschank', 'Frankenheim Brauereiausschank', 'Frankenheim', 'taproom', 'Düsseldorf', 'DE',
    'Wielandstraße 12-14,  40211 Düsseldorf',
    'https://maps.app.goo.gl/trgyQ5Hf3BixGaK18',
    51.229568, 6.793521, 1873, 'https://www.frankenheim.de',
    'Frankenheim Brauereiausschank ist ein traditionsreiches Brauhaus in Düsseldorf mit echter Altbier-Kultur. Auch nach dem Ende des Familienbesitzes bleibt die Location ihrer Geschichte treu und ist bekannt für frisch gezapftes Frankenheim Alt, herzhafte Brauhausküche, gesellige Atmosphäre und einen beliebten Biergarten.',
    'Frankenheim Brauereiausschank is a historic brewery pub in Düsseldorf with a strong Altbier tradition. Even after leaving family ownership, the venue has remained true to its heritage and is known for freshly poured Frankenheim Alt, hearty brewery-style cuisine, a social atmosphere, and a popular beer garden.',
    1, 'approved', 0, NULL, NULL),

  ('altus', 'Altus bräu', 'Altus', 'brewery', 'Düsseldorf', 'DE',
    'Roßstraße 19, 40476 Düsseldorf',
    'https://maps.app.goo.gl/VyotCHdUoL7ZUNYW7',
    51.24569, 6.77934, 2021, 'https://altus-braeu.de',
    'Erstes Bio-Altbier aus Düsseldorf. Gebraut nach biologischen Standards mit Malz und Hopfen aus ökologischem Anbau — im Lohnbrauen-Verfahren bei einer Partnerbrauerei.',
    'The first certified organic Altbier from Düsseldorf, contract-brewed to organic standards using ecologically grown malt and hops.',
    1, 'approved', 0, NULL, NULL),

  ('hitchcoq', 'Hitchcoq', 'Hitchcoq', 'brewpub', 'Düsseldorf', 'DE',
    'Nordstraße 30, 40477 Düsseldorf',
    'https://maps.app.goo.gl/8o34ssCxrqBQyuEB8',
    51.2372, 6.7836, 2018, 'https://hitchcoq.de',
    'Kleine Hausbrauerei in Pempelfort, eröffnet im November 2018. Neben Chicken Wings in verschiedenen Schärfegraden gibt es das hauseigene ALTfred frisch vom Fass. Koordinaten noch zu prüfen.',
    'Small brewpub in Pempelfort, opened in November 2018. Alongside chicken wings in several heat levels it serves its own ALTfred fresh from the tap. Coordinates still to be verified.',
    0, 'pending', 0, NULL, NULL),

  ('alter-bahnhof-oberkassel', 'Brauhaus Alter Bahnhof', 'Alter Bahnhof', 'brewpub', 'Düsseldorf', 'DE',
    'Belsenplatz 2, 40545 Düsseldorf',
    'https://maps.app.goo.gl/NaTG7sdni4SVpjzB8',
    51.2311, 6.7457, NULL, 'https://www.brauhaus-alterbahnhof.de',
    'Brauhaus im ehemaligen Oberkasseler Bahnhof von 1853 am Belsenplatz. Das hauseigene Alt hieß früher Gulasch Alt und wird heute als Belsen Alt ausgeschenkt. Koordinaten noch zu prüfen.',
    'Brewhouse in the former Oberkassel railway station (1853) on Belsenplatz. Its house Alt used to be called Gulasch Alt and is now served as Belsen Alt. Coordinates still to be verified.',
    0, 'pending', 0, NULL, NULL),

  ('joh-albrecht-duesseldorf', 'Brauhaus Joh. Albrecht Düsseldorf', 'Joh. Albrecht', 'brewpub', 'Düsseldorf', 'DE',
    'Niederkasseler Straße 104, 40547 Düsseldorf',
    'https://maps.app.goo.gl/iWrpToGTPFxEeaVc7',
    51.2428, 6.7405, NULL, 'http://duesseldorf.brauhaus-joh-albrecht.de',
    'Hausbrauerei in Niederkassel, Teil der Brauhaus-Joh.-Albrecht-Gruppe. Neben dem eigenen Alt im „Düsseldorf-Style“ gibt es das helle Messing, das dunkle Kupfer und ein Craftbeer. Koordinaten noch zu prüfen.',
    'Brewpub in Niederkassel, part of the Brauhaus Joh. Albrecht group. Besides its own Düsseldorf-style Alt it serves the pale Messing, the dark Kupfer and a craft beer. Coordinates still to be verified.',
    0, 'pending', 0, NULL, NULL),


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
    'Preußenring 130, 47798 Krefeld',
    'https://maps.app.goo.gl/nTbgfsEuuveGFDRQ6',
    51.3396, 6.5533, 2018, 'https://www.schlueffken.de',
    'Kleine Krefelder Brauerei am Preußenring, direkt neben dem Restaurant Nordbahnhof. Gegründet 2018 von Anne und Johannes Furth; der Name ehrt die Dampflok „Schluff“ („Mit Volldampf gebraut“). Das malzig-rustikale Schlüffken Alt mit markanter Hopfennote ist Krefelds jüngstes Altbier, daneben entstehen Pils, Weizen, alkoholfreie Sorten und Saisonbiere wie Summer Ale, Märzen und Festbier. Ausgeschenkt wird im Nordbahnhof nebenan. Koordinaten noch zu prüfen.',
    'Small Krefeld brewery on Preußenring, right next to the Nordbahnhof restaurant. Founded in 2018 by Anne and Johannes Furth; the name honours the steam locomotive "Schluff" ("brewed at full steam"). The malty, rustic Schlüffken Alt with a distinct hop note is Krefeld''s newest Altbier, alongside a Pils, a wheat beer, alcohol-free versions and seasonal beers such as a Summer Ale, Märzen and Festbier. It is served at the Nordbahnhof next door. Coordinates still to be verified.',
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
    'https://maps.app.goo.gl/onkmFHbbuEXeHNc78',
    51.338, 6.55962, 1807, 'https://ausschank-gleumes.de',
    'Krefelds älteste Brauerei: 1807 als „Zu den drei Kronen“ an der Sternstraße gegründet, seit 1896 unter dem Namen Gleumes. Gleumes Alt wird seit 1896 gebraut und im historischen Ausschank mit Holzvertäfelung und Stuckdecken frisch gezapft, dazu deftige Brauhausküche.',
    'Krefeld''s oldest brewery: founded in 1807 as "Zu den drei Kronen" on Sternstraße, run under the Gleumes name since 1896. Gleumes Alt has been brewed since 1896 and is served fresh in the historic tap room with wood panelling and stucco ceilings, alongside hearty brewhouse food.',
    0, 'pending', 0, NULL, NULL),

  ('hensen', 'Brauerei Hensen', 'Hensen', 'brewery', 'Mönchengladbach', 'DE',
    'Untere Straße 133, 41068 Mönchengladbach',
    NULL,
    51.197481, 6.4099019, 1793, NULL,
    '1793 gegründete Brauerei in Mönchengladbach-Waldhausen, nach der Schließung in den 1970ern 2017 wiederbelebt. Braut ein niederrheinisches Altbier, dazu Pils, IPA und weitere Sorten.',
    'Brewery in Mönchengladbach-Waldhausen founded in 1793, revived in 2017 after closing in the 1970s. Brews a Lower Rhine Altbier as well as Pils, IPA and other beers.',
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
    'https://maps.app.goo.gl/nL5GUayfaqfmrYVH7',
    51.183277, 6.4994, 1266, 'https://www.bolten-brauerei.de',
    'Gegründet 1266 und nach eigener Aussage die älteste Altbierbrauerei der Welt. Neben Bolten Alt und dem unfiltrierten Ur-Alt braut Bolten seit 2023 auch wieder Hannen Alt; seit 2022 gehört außerdem Gatz Altbier zum Haus. Ausgeschenkt wird im Gasthaus Hoff Marie und in der Landwirtschaft direkt gegenüber der Brauerei.',
    'Founded in 1266 and, by its own account, the oldest Altbier brewery in the world. Besides Bolten Alt and the unfiltered Ur-Alt, Bolten has brewed Hannen Alt again since 2023, and Gatz Altbier has also been part of the house since 2022. Its beer is served at Gasthaus Hoff Marie and at the Landwirtschaft directly opposite the brewery.',
    0, 'pending', 0, NULL, NULL),

  ('brauerei-im-dom', 'Brauerei Im Dom', 'Im Dom', 'brewpub', 'Neuss', 'DE',
    'Michaelstraße 75-77, 41460 Neuss',
    'https://maps.app.goo.gl/eGvSJmfdcRP7NrW59',
    51.196253, 6.693359, 1601, 'https://im-dom.de',
    'Die Brauerei Im Dom ist die letzte Hausbrauerei in Neuss und braut seit 1601 in der Altstadt. Im Ausschank: Dom''s Alt, Weizen und Gold, dazu deftige Brauhausküche. Das Haus steht unter Denkmalschutz, Führungen durch den Braukeller sind möglich.',
    'Brauerei Im Dom is the last remaining brewpub in Neuss, brewing in the old town since 1601. On tap: Dom''s Alt, Weizen and Gold, paired with hearty brewhouse fare. The listed building also offers tours of its historic brewing cellar.',
    1, 'approved', 0, NULL, 'brauerei-im-dom.svg'),

  ('diebels', 'Brauerei Diebels', 'Diebels', 'brewery', 'Issum', 'DE',
    'Brauerei-Diebels-Straße 1, 47661 Issum',
    'https://maps.app.goo.gl/gjoGH6pm4rWFqbor6',
    51.534786, 6.419453, 1878, 'https://www.diebels.de',
    'Größte Altbierbrauerei der Welt, 1878 vom Krefelder Braumeister Josef Diebels in Issum gegründet und heute Teil von AB InBev. Seit 1979 braut Diebels ausschließlich obergärige Biere. Im Besucherzentrum gibt es Brauereiführungen mit Verkostung.',
    'The world''s largest Altbier brewery, founded in Issum in 1878 by Krefeld brewmaster Josef Diebels and now part of AB InBev. Since 1979 Diebels has brewed only top-fermented beers. The visitor centre offers brewery tours with tastings.',
    0, 'pending', 0, NULL, NULL),

  -- ========== Ruhrgebiet / Münsterland ==========

  ('pinkus-mueller', 'Brauerei Pinkus Müller', 'Pinkus', 'brewpub', 'Münster', 'DE',
    'Kreuzstraße 4-10, 48143 Münster',
    'https://maps.app.goo.gl/YWCpqNSypn8YN6eG9',
    51.96556, 7.62167, 1816, 'https://www.pinkus.de',
    'Familienbrauerei in siebter Generation im Münsteraner Kuhviertel, gegründet 1816 und die letzte von einst rund 150 Altbierbrauereien der Stadt. Bio-Pionier: Gebraut wird ausschließlich mit Rohstoffen aus ökologischem Anbau. Das Original Pinkus Alt ist ein heller Münsteraner Alt und damit deutlich anders als das dunkle rheinische Alt. Gaststätte mit Altbierküche direkt an der Brauerei.',
    'Seventh-generation family brewery in Münster''s Kuhviertel, founded in 1816 and the last of the city''s once roughly 150 Altbier breweries. An organic pioneer that brews exclusively with organically grown ingredients. Original Pinkus Alt is a pale Münster-style Alt, quite different from the dark Rhineland Alt. Restaurant with Altbier kitchen right at the brewery.',
    1, 'approved', 0, NULL, NULL),

  -- ========== Köln ==========
  ('hellers', 'Hellers Brauhaus', 'Hellers', 'brewpub', 'Köln', 'DE',
    'Roonstraße 33, 50674 Köln',
    'https://maps.app.goo.gl/JKUZo3D88FwnceN87',
    50.9306759, 6.9382923, 1996, 'https://www.hellers.koeln',
    'Bio-Hausbrauerei im Kwartier Latäng, Köln. Die einzige Kölner Hausbrauerei in Bio-Qualität — braut Kölsch, naturtrübes Wiess und sogar Altbier.',
    'Organic brewpub in Cologne''s Kwartier Latäng. The city''s only brewpub producing its beers — Kölsch, naturally cloudy Wiess and even Altbier — to certified organic standards.',
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
UPDATE styles SET primary_brewery_id = 'bolten' WHERE id = 'bolten-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'bolten' WHERE id = 'bolten-oh' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'bolten' WHERE id = 'hannen-alt-2023' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'bolten' WHERE id = 'gatz-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'diebels' WHERE id = 'diebels-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'gleumes' WHERE id = 'gleumes-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'hensen' WHERE id = 'hensen-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'pinkus-mueller' WHERE id = 'pinkus-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'hellers' WHERE id = 'hellers-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'altus' WHERE id = 'altus-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'hitchcoq' WHERE id = 'altfred' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'alter-bahnhof-oberkassel' WHERE id = 'belsen-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'joh-albrecht-duesseldorf' WHERE id = 'albrecht-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'schlueffken' WHERE id = 'schlueffken-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'schluessel' WHERE id = 'schluessel-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'koenigshof' WHERE id = 'koenigshof-alt' AND primary_brewery_id IS NULL;
UPDATE styles SET primary_brewery_id = 'hannen' WHERE id = 'hannen-alt' AND primary_brewery_id IS NULL;

-- Übernahmen: Marke/Betrieb wird heute von einem anderen Ort geführt
UPDATE breweries SET successor_id = 'bolten' WHERE id IN ('hannen', 'gatzweiler') AND successor_id IS NULL;
UPDATE styles SET primary_brewery_id = 'brauerei-im-dom' WHERE id = 'dom-alt' AND primary_brewery_id IS NULL;

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
  ('altus', 'altus-alt'),
  ('koenigshof', 'koenigshof-alt'),
  ('gleumes', 'gleumes-alt'),
  ('hensen', 'hensen-alt'),
  ('hannen', 'hannen-alt'),
  ('bolten', 'bolten-alt'),
  ('bolten', 'bolten-uralt'),
  ('bolten', 'hannen-alt-2023'),
  ('bolten', 'gatz-alt'),
  ('bolten', 'bolten-oh'),
  ('brauerei-im-dom', 'dom-alt'),
  ('diebels', 'diebels-alt'),
  ('pinkus-mueller', 'pinkus-alt'),
  ('hellers', 'hellers-alt'),
  ('hitchcoq', 'altfred'),
  ('alter-bahnhof-oberkassel', 'belsen-alt'),
  ('joh-albrecht-duesseldorf', 'albrecht-alt'),
  ('schlueffken', 'schlueffken-alt');

-- ============================================================
-- Prices (approved, Stand Live-DB Oktober 2026)
-- ============================================================
INSERT OR IGNORE INTO prices (brewery_id, date, size, price, source, notes, status) VALUES
  ('uerige', '2026-10-17', '0.25l', 3.05, 'Beitrag', NULL, 'pending'),
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
  ('koenigshof', '2026-04-02', '0.5l', 3.4, 'retail', NULL, 'approved'),
  ('hannen', '2026-03-15', '0.5l', 2.9, 'retail', NULL, 'approved'),
  ('brauerei-im-dom', '2025-12-31', '0.2', 2.4, 'Speisekarte', NULL, 'approved'),
  ('brauerei-im-dom', '2025-12-31', '0.5', 5.5, 'Speisekarte', NULL, 'approved'),
  ('hitchcoq', '2026-10-17', '0.3l', 4.5, 'Beitrag', NULL, 'pending'),
  ('alter-bahnhof-oberkassel', '2026-10-17', '0.25l', 3.1, 'Speisekarte', NULL, 'pending'),
  ('joh-albrecht-duesseldorf', '2024-09-09', '0.2', 2.5, 'Speisekarte', NULL, 'pending'),
  ('joh-albrecht-duesseldorf', '2024-09-09', '0.4', 4.7, 'Speisekarte', NULL, 'pending'),
  ('joh-albrecht-duesseldorf', '2024-09-09', '1.5', 16.0, 'Speisekarte', 'Pitcher', 'pending');

-- ============================================================
-- Events — nur Beispiele (Fest ohne Brauerei, Brauerei-Termin mit Event-Bier);
-- aktuelle Termine pflegen die Mitwirkenden in der Live-D1
-- ============================================================
INSERT OR IGNORE INTO events
  (id, title_de, title_en, brewery_id, date, end_date, time, end_time, location, url, description_de, description_en, status)
VALUES
  ('bierboerse-benrath', 'Benrather Bierbörse', 'Benrather Bierbörse',
    NULL, '2027-08-20', '2027-08-22', '15:00', '20:00', 'Benrath',
    'https://www.bierboerse.com/city/duesseldorf-benrath.htm',
    'Vom 20.–22. August 2027 lädt die Benrather Bierbörse in Düsseldorf-Benrath Bierfans aus ganz Deutschland ein. Rund 40 Stände bieten in der Fußgängerzone und auf der Heubesstraße über 500 Biersorten sowie vielfältige Speisen an. Die traditionsreiche Veranstaltung findet seit über 30 Jahren nahe des Benrather Schlosses statt und begeistert mit gemütlichen Biergärten und rheinischer Atmosphäre.',
    'From August 20–22, 2027, the Benrather Bierbörse in Düsseldorf-Benrath welcomes beer lovers from across Germany. Around 40 stands in the pedestrian zone and along Heubesstraße offer more than 500 types of beer and a wide variety of food. Held for more than 30 years near the famous Benrath Palace, the event is known for its cozy beer gardens and authentic Rhineland atmosphere.',
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
-- Biernamen sind Eigennamen: EN = DE
SELECT v.column1, v.column2, v.column2, v.column3, v.column4 FROM (VALUES
  ('schumacher-latzen-2026-11', 'Latzenbier', '1l', NULL)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM event_beers e WHERE e.event_id = v.column1 AND e.name_de = v.column2 AND e.size = v.column3);
