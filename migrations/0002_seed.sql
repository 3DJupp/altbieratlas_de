-- ============================================================
-- Altbieratlas — Seed data  v0.6.0
-- ============================================================
-- Venue types, styles, glossary, breweries, prices and events
-- for every deployment (dev, staging and production).
-- All statements are idempotent (INSERT OR IGNORE).
-- ============================================================

-- Venue types (must come before breweries due to FK)
INSERT OR IGNORE INTO venue_types (id, name_de, name_en, header_de, header_en) VALUES
  ('brewery',        'Brauerei',      'Brewery',          'Was hier gebraut wird',                  'What is brewed here'),
  ('brewpub',        'Hausbrauerei',  'Brewpub',          'Was hier gebraut und ausgeschenkt wird',  'What is brewed and served here'),
  ('pub',            'Kneipe',        'Pub',              'Was hier ausgeschenkt wird',              'What is served here'),
  ('restaurant',     'Restaurant',    'Restaurant',       'Was hier ausgeschenkt wird',              'What is served here'),
  ('kiosk',          'Kiosk',         'Kiosk',            'Was hier erhältlich ist',                 'What is available here'),
  ('supermarket',    'Supermarkt',    'Supermarket',      'Was hier erhältlich ist',                 'What is available here'),
  ('beverage_store', 'Getränkeshop',  'Beverage store',   'Was hier erhältlich ist',                 'What is available here');
-- ============================================================

-- Beer styles
INSERT OR IGNORE INTO styles (id, name, abv, ibu, color, tasting_de, tasting_en) VALUES
  ('uerige-alt',    'Uerige Alt',          4.7,  52, '#7b3a13',
    'Kräftig herb, würzig, trockener Abgang. Eine der bitteren unter den Düsseldorfer Alts.',
    'Firmly bitter, spicy, dry finish. One of the more bitter Düsseldorf Alts.'),
  ('sticke',        'Uerige Sticke',        6.0,  65, '#5b2409',
    'Stärker eingebraut, malzig-komplex, intensivere Hopfengabe. Nur zweimal jährlich ausgeschenkt.',
    'Stronger brew, malt-complex, more intense hopping. Only served twice a year.'),
  ('doppelsticke',  'Uerige Doppelsticke',  8.5, 70, '#3d1606',
    'Fast portweinartig, reich, komplex, mit langer Reife. Für die seltenen Anlässe.',
    'Almost port-like, rich, complex, long-aged. For the rare occasions.'),
  ('fuechschen-alt','Füchschen Alt',        4.5,  38, '#8a4a1f',
    'Malzbetont, vollmundig, weich. Eines der zugänglichsten Düsseldorfer Alts.',
    'Malt-forward, full-bodied, soft. One of the most approachable Düsseldorf Alts.'),
  ('schumacher-alt','Schumacher Alt',       4.6,  32, '#9b5226',
    'Mild, rund, gut trinkbar. Der Klassiker für den langen Abend.',
    'Mild, round, highly drinkable. The classic for a long evening.'),
  ('schluessel-alt','Schlüssel Alt',        5.0,  35, '#823c13',
    'Leicht herb, ausgewogen, trocken. Sehr traditioneller Stil.',
    'Lightly bitter, balanced, dry. Very traditional style.'),
  ('kuerzer-alt',   'Kürzer Alt',           4.8,  34, '#8f461b',
    'Frisch, hell-bernsteinfarben, mit leichter Citrusnote vom offen gekochten Sud.',
    'Fresh, light amber, with a gentle citrus note from the open-boil wort.'),
  ('alaskan-amber', 'Alaskan Amber',        5.3,  18, '#a55b24',
    'Amerikanische Alt-Interpretation: malzbetont, karamellig, weicher als die Düsseldorfer Originale.',
    'American take on Alt: malt-forward, caramel, softer than the Düsseldorf originals.'),
  ('koenigshof-alt','Königshof Alt',        4.9,  28, '#8c4a1a',
    'Mild-malzig, niederrheinisch weich. Klassisch für die Region.',
    'Mild-malty, soft in the Lower-Rhine style. Regional classic.'),
  ('hannen-alt',    'Hannen Alt',           4.8,  30, '#8c4820',
    'Industriell gebraut, aber klassisch profiliert. Die wohl bekannteste Alt-Marke außerhalb Düsseldorfs.',
    'Industrially brewed but classically profiled. Likely the best-known Alt brand outside Düsseldorf.'),
  ('long-trail-ale','Long Trail Ale',       4.6,  25, '#a56030',
    'Vermonter Interpretation: malzig, süßlich, mit amerikanischem Hopfencharakter.',
    'Vermont take: malty, mildly sweet, with American hop character.'),
  ('hellers-alt',   'Hellers Altbier',      4.8, NULL, '#8b4820',
    'Bio-Altbier des Kölner Brauhauses Hellers. Mild, ausgewogen, mit biologisch angebautem Malz gebraut.',
    'Organic Altbier from Cologne''s Hellers brewpub. Mild, balanced, brewed with organically grown malt.'),
  ('altus-alt',     'Altus Bio-Alt',        4.9, NULL, '#8d4a1e',
    'Erstes Bio-Altbier aus Düsseldorf. Mild-malzig, ausgewogen, mit ökologisch angebautem Hopfen und Malz.',
    'The first certified organic Altbier from Düsseldorf. Mildly malty, balanced, brewed with organically grown hops and malt.');

-- Glossary
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
INSERT OR IGNORE INTO breweries (id, name, short_name, type, city, country, address, maps_url, lat, lng, founded, website, description_de, description_en, verified, status) VALUES
  -- ========== Düsseldorf — Hausbrauereien ==========
  ('uerige', 'Brauerei im Uerige', 'Uerige', 'brewpub', 'Düsseldorf', 'DE',
    'Berger Straße 1, 40213 Düsseldorf',
    'https://maps.google.com/maps?q=Berger+Stra%C3%9Fe+1,+40213+D%C3%BCsseldorf',
    51.2253, 6.7722, 1862, 'https://uerige.de',
    'Eine der vier klassischen Düsseldorfer Hausbrauereien in der Altstadt. Bekannt für kräftig-herbes, würziges Alt und die halbjährliche Sticke-Ausschank.',
    'One of the four classic Düsseldorf brewpubs in the old town. Known for a firm, bitter, spicy Alt and its biannual Sticke release.', 1, 'approved'),
  ('fuechschen', 'Brauerei Füchschen', 'Füchschen', 'brewpub', 'Düsseldorf', 'DE',
    'Ratinger Straße 28, 40213 Düsseldorf',
    'https://maps.google.com/maps?q=Ratinger+Stra%C3%9Fe+28,+40213+D%C3%BCsseldorf',
    51.2278, 6.7715, 1848, 'https://fuechschen.de',
    'Familiengeführte Hausbrauerei, bekannt für ein malzbetontes, vollmundiges Alt und die legendäre Weihnachts-Silvester-Stimmung.',
    'Family-run brewpub known for a malty, full-bodied Alt and its legendary Christmas-New-Year atmosphere.', 1, 'approved'),
  ('schumacher', 'Brauerei Schumacher', 'Schumacher', 'brewpub', 'Düsseldorf', 'DE',
    'Oststraße 123, 40210 Düsseldorf',
    'https://maps.google.com/maps?q=Ostra%C3%9Fe+123,+40210+D%C3%BCsseldorf',
    51.2224, 6.7912, 1838, 'https://schumacher-alt.de',
    'Die älteste der Düsseldorfer Hausbrauereien. Mildes, gut trinkbares Schumacher Alt seit 1838.',
    'The oldest of the Düsseldorf brewpubs. A mild, highly drinkable Schumacher Alt since 1838.', 1, 'approved'),
  ('schluessel', 'Brauerei zum Schlüssel', 'Schlüssel', 'brewpub', 'Düsseldorf', 'DE',
    'Bolkerstraße 41-47, 40213 Düsseldorf',
    'https://maps.google.com/maps?q=Bolkerstra%C3%9Fe+41,+40213+D%C3%BCsseldorf',
    51.2268, 6.7728, 1850, 'https://zumschluessel.de',
    'Traditionsreiche Hausbrauerei an der Bolkerstraße, im Herzen der Altstadt. Ausgewogenes, leicht herbes Alt.',
    'Heritage brewpub on Bolker Straße, in the heart of the old town. A balanced, gently bitter Alt.', 1, 'approved'),
  ('kuerzer', 'Brauerei Kürzer', 'Kürzer', 'brewpub', 'Düsseldorf', 'DE',
    'Kurze Straße 18-20, 40213 Düsseldorf',
    'https://maps.google.com/maps?q=Kurze+Stra%C3%9Fe+18,+40213+D%C3%BCsseldorf',
    51.2262, 6.7733, 2010, 'https://brauerei-kuerzer.de',
    'Die jüngste der Düsseldorfer Altstadt-Hausbrauereien. Offene Braukessel mitten im Gastraum.',
    'The youngest of Düsseldorf''s old-town brewpubs. Open brewing kettles right in the taproom.', 1, 'approved'),
  ('kuerzer-flingern', 'Brauerei Kürzer Flingern', 'Kürzer Flingern', 'brewpub', 'Düsseldorf', 'DE',
    'Fichtenstraße 21, 40233 Düsseldorf',
    'https://maps.google.com/maps?q=Fichtenstra%C3%9Fe+21,+40233+D%C3%BCsseldorf',
    51.2337, 6.8151, 2020, 'https://brauerei-kuerzer.de',
    'Zweiter Kürzer-Standort in Düsseldorf-Flingern. Vollwertige Produktionsbrauerei mit Taproom, Biergarten und sechs Spezialbieren, die ausschließlich hier ausgeschenkt werden.',
    'Second Kürzer site in Düsseldorf-Flingern. Full production brewery with taproom, beer garden and six specialty beers available only here.', 1, 'approved'),
  -- ========== Düsseldorf — Gastronomie ==========
  ('zum-schlueffken', 'Zum Schlüffken', 'Schlüffken', 'pub', 'Düsseldorf', 'DE',
    'Flinger Straße 1, 40213 Düsseldorf',
    'https://maps.google.com/maps?q=Flinger+Stra%C3%9Fe+1,+40213+D%C3%BCsseldorf',
    51.2271, 6.774, NULL, NULL,
    'Urige Altstadt-Kneipe mit Uerige Alt vom Fass. Klassische Köbes-Bedienung.',
    'Classic old-town pub serving Uerige Alt on tap. Traditional Köbes service.', 1, 'approved'),
  -- ========== Düsseldorf — Marke / Lohnbrauen ==========
  ('altus', 'Altus bräu', 'Altus', 'brewery', 'Düsseldorf', 'DE',
    'Sonnbornstr. 2, 40625 Düsseldorf',
    'https://maps.google.com/maps?q=Sonnbornstr.+2,+40625+D%C3%BCsseldorf',
    51.2157, 6.8633, 2021, 'https://altus-braeu.de',
    'Erstes Bio-Altbier aus Düsseldorf. Gebraut nach biologischen Standards mit Malz und Hopfen aus ökologischem Anbau — im Lohnbrauen-Verfahren bei einer Partnerbrauerei.',
    'The first certified organic Altbier from Düsseldorf, contract-brewed to organic standards using ecologically grown malt and hops.', 1, 'approved'),
  -- ========== Krefeld ==========
  ('koenigshof', 'Privatbrauerei Königshof', 'Königshof', 'brewery', 'Krefeld', 'DE',
    'Untergath 70, 47805 Krefeld',
    'https://maps.google.com/maps?q=Untergath+70,+47805+Krefeld',
    51.3172, 6.5603, 1830, 'https://privatbrauerei-koenigshof.de',
    'Niederrheinische Privatbrauerei mit einem milderen Alt im niederrheinischen Stil.',
    'Lower-Rhine private brewery with a milder Alt in the Niederrhein style.', 1, 'approved'),
  -- ========== Mönchengladbach ==========
  ('hannen', 'Hannen Brauerei', 'Hannen', 'brewery', 'Mönchengladbach', 'DE',
    'Bismarckstraße 115, 41061 Mönchengladbach',
    'https://maps.google.com/maps?q=Bismarckstra%C3%9Fe+115,+41061+M%C3%B6nchengladbach',
    51.1805, 6.4428, 1725, NULL,
    'Traditionsmarke, heute unter Carlsberg-Dach. Eines der bekanntesten Alt-Biere außerhalb Düsseldorfs.',
    'Heritage brand, now under Carlsberg. One of the best-known Alts outside Düsseldorf.', 1, 'approved'),
  -- ========== Köln ==========
  ('hellers', 'Hellers Brauhaus', 'Hellers', 'brewpub', 'Köln', 'DE',
    'Roonstraße 33, 50674 Köln',
    'https://maps.google.com/maps?q=Roonstra%C3%9Fe+33,+50674+K%C3%B6ln',
    50.9284, 6.9408, 1996, 'https://www.hellers.koeln',
    'Bio-Hausbrauerei im Kwartier Latäng, Köln. Die einzige Kölner Hausbrauerei in Bio-Qualität — braut Kölsch, naturtrübes Wiess und Altbier.',
    'Organic brewpub in Cologne''s Kwartier Latäng. The city''s only brewpub producing its beers — Kölsch, naturally cloudy Wiess and Altbier — to certified organic standards.', 1, 'approved'),
  -- ========== International ==========
  ('alaskan-brewing', 'Alaskan Brewing Co.', 'Alaskan', 'brewery', 'Juneau', 'US',
    '5429 Shaune Drive, Juneau, AK',
    'https://maps.google.com/maps?q=5429+Shaune+Drive,+Juneau,+AK',
    58.358, -134.554, 1986, 'https://alaskanbeer.com',
    'US-Craft-Brauerei mit einem sehr gelungenen Alt nach Düsseldorfer Vorbild — mehrfach ausgezeichnet.',
    'US craft brewery with a highly regarded Alt in the Düsseldorf tradition — multiple award winner.', 1, 'approved'),
  ('long-trail', 'Long Trail Brewing', 'Long Trail', 'brewery', 'Bridgewater Corners', 'US',
    '5520 US-4, Bridgewater Corners, VT',
    'https://maps.google.com/maps?q=5520+US-4,+Bridgewater+Corners,+VT',
    43.6, -72.7614, 1989, 'https://longtrail.com',
    'Vermonter Brauerei mit einem Flagship-Altbier im rheinischen Stil.',
    'Vermont brewery whose flagship is a Rhenish-style Altbier.', 1, 'approved');

-- Style assignments
INSERT OR IGNORE INTO brewery_styles (brewery_id, style_id) VALUES
  ('uerige',          'uerige-alt'),
  ('uerige',          'sticke'),
  ('uerige',          'doppelsticke'),
  ('fuechschen',      'fuechschen-alt'),
  ('schumacher',      'schumacher-alt'),
  ('schluessel',      'schluessel-alt'),
  ('kuerzer',         'kuerzer-alt'),
  ('kuerzer-flingern','kuerzer-alt'),
  ('zum-schlueffken', 'uerige-alt'),
  ('koenigshof',      'koenigshof-alt'),
  ('hannen',          'hannen-alt'),
  ('hellers',         'hellers-alt'),
  ('altus',           'altus-alt'),
  ('alaskan-brewing', 'alaskan-amber'),
  ('long-trail',      'long-trail-ale');

-- ============================================================
-- Prices
-- ============================================================
INSERT OR IGNORE INTO prices (brewery_id, date, size, price, source, status) VALUES
  -- Uerige (Berger Str. 1, Düsseldorf) — regulär 2,85 €/0,25l (Stand 2025/2026)
  ('uerige',          '2026-04-15', '0.25l', 2.85, 'on-site',  'approved'),
  ('uerige',          '2025-11-05', '0.25l', 2.85, 'on-site',  'approved'),
  ('uerige',          '2025-06-20', '0.25l', 2.85, 'on-site',  'approved'),
  -- Füchschen (Ratinger Str. 28) — regulär 2,90 €/0,25l (Stand 2026)
  ('fuechschen',      '2026-04-12', '0.25l', 2.90, 'on-site',  'approved'),
  ('fuechschen',      '2025-09-01', '0.25l', 2.70, 'on-site',  'approved'),
  -- Schumacher (Oststraße 123) — regulär 2,90 €/0,25l (Stand 2026)
  ('schumacher',      '2026-04-08', '0.25l', 2.90, 'on-site',  'approved'),
  ('schumacher',      '2025-10-15', '0.25l', 2.70, 'on-site',  'approved'),
  -- Schlüssel (Bolkerstraße 41–47) — regulär 2,90 €/0,25l (Stand 2026)
  ('schluessel',      '2026-04-14', '0.25l', 2.90, 'on-site',  'approved'),
  ('schluessel',      '2025-12-01', '0.25l', 2.70, 'on-site',  'approved'),
  -- Kürzer Altstadt (Kurze Str. 18–20)
  ('kuerzer',         '2026-04-16', '0.25l', 2.80, 'on-site',  'approved'),
  ('kuerzer',         '2025-10-09', '0.2',   2.60, 'on-site',  'approved'),
  -- Kürzer Flingern (Fichtenstraße 21)
  ('kuerzer-flingern','2026-04-20', '0.25l', 2.80, 'on-site',  'approved'),
  -- Königshof (Krefeld) — Flasche im Getränkehandel
  ('koenigshof',      '2026-04-02', '0.5l',  3.40, 'retail',   'approved'),
  -- Hannen (Mönchengladbach) — Flasche im Getränkehandel
  ('hannen',          '2026-03-15', '0.5l',  2.90, 'retail',   'approved'),
  -- International
  ('alaskan-brewing', '2026-03-22', '0.5l',  5.20, 'on-site',  'approved'),
  ('long-trail',      '2026-03-18', '0.5l',  4.80, 'on-site',  'approved');

-- ============================================================
-- Events — nur bestätigte, laufende Veranstaltungen
-- ============================================================
INSERT OR IGNORE INTO events (id, title_de, title_en, brewery_id, date, end_date, location, url, description_de, description_en, status) VALUES
  ('bierboerse-benrath', 'Bierbörse', 'Bierbörse',
    NULL, '2026-08-21', '2026-08-23', 'Benrath',
    'https://www.bierboerse.com/city/duesseldorf-benrath.htm',
    'Vom 21.–23. August 2026 lädt die Benrather Bierbörse in Düsseldorf-Benrath Bierfans aus ganz Deutschland ein. Rund 40 Stände bieten in der Fußgängerzone und auf der Heubesstraße über 500 Biersorten sowie vielfältige Speisen an. Die traditionsreiche Veranstaltung findet seit 32 Jahren nahe des Benrather Schlosses statt und begeistert mit gemütlichen Biergärten und rheinischer Atmosphäre.',
    'From August 21–23, 2026, the Benrather Bierbörse in Düsseldorf-Benrath welcomes beer lovers from across Germany. Around 40 stands in the pedestrian zone and along Heubesstraße offer more than 500 types of beer and a wide variety of food. Held for 32 years near the famous Benrath Palace, the event is known for its cosy beer gardens and authentic Rhineland atmosphere.',
    'approved');
