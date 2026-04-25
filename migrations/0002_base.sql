-- ============================================================
-- Altbieratlas — Basisdaten (Glossar & Bierstile)
-- ============================================================
-- Referenzdaten, die auf jedem Deployment vorhanden sein sollten.
-- Wird von scripts/db-setup.sh automatisch eingespielt.
-- Kein Testinhalt — keine Brauereien, Preise oder Events.
-- ============================================================

-- Bierstile
INSERT OR IGNORE INTO styles (id, name, abv, ibu, color, tasting_de, tasting_en) VALUES
  ('uerige-alt',    'Uerige Alt',       4.7,  52, '#7b3a13',
    'Kräftig herb, würzig, trockener Abgang. Eine der bitteren unter den Düsseldorfer Alts.',
    'Firmly bitter, spicy, dry finish. One of the more bitter Düsseldorf Alts.'),
  ('sticke',        'Uerige Sticke',    6.0,  65, '#5b2409',
    'Stärker eingebraut, malzig-komplex, intensivere Hopfengabe. Nur zweimal jährlich ausgeschenkt.',
    'Stronger brew, malt-complex, more intense hopping. Only served twice a year.'),
  ('doppelsticke',  'Uerige Doppelsticke', 8.5, 70, '#3d1606',
    'Fast portweinartig, reich, komplex, mit langer Reife. Für die seltenen Anlässe.',
    'Almost port-like, rich, complex, long-aged. For the rare occasions.'),
  ('fuechschen-alt','Füchschen Alt',    4.5,  38, '#8a4a1f',
    'Malzbetont, vollmundig, weich. Eines der zugänglichsten Düsseldorfer Alts.',
    'Malt-forward, full-bodied, soft. One of the most approachable Düsseldorf Alts.'),
  ('schumacher-alt','Schumacher Alt',   4.6,  32, '#9b5226',
    'Mild, rund, gut trinkbar. Der Klassiker für den langen Abend.',
    'Mild, round, highly drinkable. The classic for a long evening.'),
  ('schluessel-alt','Schlüssel Alt',    5.0,  35, '#823c13',
    'Leicht herb, ausgewogen, trocken. Sehr traditioneller Stil.',
    'Lightly bitter, balanced, dry. Very traditional style.'),
  ('kuerzer-alt',   'Kürzer Alt',       4.8,  34, '#8f461b',
    'Frisch, hell-bernsteinfarben, mit leichter Citrusnote vom offen gekochten Sud.',
    'Fresh, light amber, with a gentle citrus note from the open-boil wort.'),
  ('alaskan-amber', 'Alaskan Amber',    5.3,  18, '#a55b24',
    'Amerikanische Alt-Interpretation: malzbetont, karamellig, weicher als die Düsseldorfer Originale.',
    'American take on Alt: malt-forward, caramel, softer than the Düsseldorf originals.'),
  ('koenigshof-alt','Königshof Alt',    4.9,  28, '#8c4a1a',
    'Mild-malzig, niederrheinisch weich. Klassisch für die Region.',
    'Mild-malty, soft in the Lower-Rhine style. Regional classic.'),
  ('hannen-alt',    'Hannen Alt',       4.8,  30, '#8c4820',
    'Industriell gebraut, aber klassisch profiliert. Die wohl bekannteste Alt-Marke außerhalb Düsseldorfs.',
    'Industrially brewed but classically profiled. Likely the best-known Alt brand outside Düsseldorf.'),
  ('long-trail-ale','Long Trail Ale',   4.6,  25, '#a56030',
    'Vermonter Interpretation: malzig, süßlich, mit amerikanischem Hopfencharakter.',
    'Vermont take: malty, mildly sweet, with American hop character.');

-- Glossar
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
