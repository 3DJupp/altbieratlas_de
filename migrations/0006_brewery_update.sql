-- ============================================================
-- Altbieratlas — v0.7.0 Brewery Data Update
-- ============================================================
-- Für bestehende Installs (ergänzt 0001–0005).
-- Für Neuinstallationen genügt 0001 + 0002.
--
-- Was dieses Skript tut:
--   1. is_historical-Spalte hinzufügen
--   2. Kürzer Altstadt: short_name korrigieren
--   3. Nicht-rheinische Brauereien entfernen (alaskan, long-trail, schlüffken)
--   4. Neue Brauereien hinzufügen (bolten, diebels, frankenheim, gulasch-alt)
--   5. Historisch relevante Marken hinzufügen (schloesser, gatzweiler, rhenania)
-- ============================================================

-- ---- 1. is_historical-Spalte hinzufügen ----
ALTER TABLE breweries ADD COLUMN is_historical INTEGER NOT NULL DEFAULT 0;

-- ---- 2. Kürzer Altstadt: Short-Name klarer differenzieren ----
UPDATE breweries SET short_name = 'Kürzer Altstadt', updated_at = datetime('now')
  WHERE id = 'kuerzer';

-- ---- 3. Entfernen: Nicht-rheinische / veraltete Einträge ----
-- Cascade löscht brewery_styles und prices dieser Brauereien
DELETE FROM breweries WHERE id IN ('alaskan-brewing', 'long-trail', 'zum-schlueffken');

-- Zugehörige Stile entfernen (werden von niemand mehr referenziert)
DELETE FROM styles WHERE id IN ('alaskan-amber', 'long-trail-ale');

-- ---- 4. Neue Brauereien ----
INSERT OR IGNORE INTO breweries (id, name, short_name, type, city, country, address, maps_url, lat, lng, founded, website, description_de, description_en, verified, status) VALUES
  -- Bolten (Korschenbroich) — älteste kontinuierlich brauereitreibende Altbierbrauerei
  ('bolten', 'Bolten Brauerei', 'Bolten', 'brewery', 'Korschenbroich', 'DE',
    'Richrather Straße 61, 41352 Korschenbroich',
    'https://maps.google.com/maps?q=Richrather+Stra%C3%9Fe+61,+41352+Korschenbroich',
    51.1891, 6.5127, 1266, 'https://bolten-brauerei.de',
    'Die älteste kontinuierlich brauereitreibende Alt-Brauerei Deutschlands — seit 1266 in Korschenbroich am Niederrhein. Das Bolten Ur-Alt gilt als älteste Alt-Biermarke der Welt.',
    'Germany''s oldest continuously operating Alt brewery — in Korschenbroich on the Lower Rhine since 1266. Bolten Ur-Alt is considered the world''s oldest Alt beer brand.', 1, 'approved'),
  -- Diebels (Issum) — meistverkauftes Altbier Deutschlands
  ('diebels', 'Brauerei Diebels', 'Diebels', 'brewery', 'Issum', 'DE',
    'Brauerei-Diebels-Platz, 47661 Issum',
    'https://maps.google.com/maps?q=Brauerei-Diebels-Platz,+47661+Issum',
    51.5340, 6.4279, 1878, 'https://www.diebels.de',
    'Größte Altbier-Brauerei Deutschlands, gegründet 1878 in Issum am Niederrhein. Diebels Alt ist das meistverkaufte Altbier Deutschlands — heute im AB-InBev-Konzern.',
    'Germany''s largest Altbier brewery, founded 1878 in Issum on the Lower Rhine. Diebels Alt is Germany''s best-selling Altbier — today part of the AB InBev group.', 1, 'approved'),
  -- Frankenheim (Düsseldorf) — bekannte Düsseldorfer Marke
  ('frankenheim', 'Frankenheim Brauerei', 'Frankenheim', 'brewery', 'Düsseldorf', 'DE',
    'Grafenberger Allee 101, 40237 Düsseldorf',
    'https://maps.google.com/maps?q=Grafenberger+Allee+101,+40237+D%C3%BCsseldorf',
    51.2281, 6.8077, 1873, 'https://www.frankenheim.de',
    'Große Düsseldorfer Alt-Brauerei, seit 1873. Frankenheim Alt ist nach Diebels das zweitmeistverkaufte Altbier Deutschlands — heute Teil der Radeberger Gruppe.',
    'Major Düsseldorf Alt brewery since 1873. Frankenheim Alt is Germany''s second best-selling Altbier after Diebels — today part of the Radeberger Group.', 1, 'approved'),
  -- Gulasch (Düsseldorf) — Altbierkneipe in der Altstadt
  ('gulasch', 'Zum Gulasch', 'Gulasch', 'pub', 'Düsseldorf', 'DE',
    'Bolkerstraße 12, 40213 Düsseldorf',
    'https://maps.google.com/maps?q=Bolkerstra%C3%9Fe+12,+40213+D%C3%BCsseldorf',
    51.2265, 6.7731, NULL, NULL,
    'Beliebte Altbierkneipe in der Düsseldorfer Altstadt mit ausgezeichneten Gulaschspezialitäten und Altbier vom Fass.',
    'Popular Altbier pub in Düsseldorf old town, known for hearty gulasch specialties and draught Altbier.', 0, 'approved');

-- ---- 5. Historische Brauereien ----
INSERT OR IGNORE INTO breweries (id, name, short_name, type, city, country, address, maps_url, lat, lng, founded, website, description_de, description_en, verified, status, is_historical) VALUES
  -- Schlösser Alt — ehemals größte Düsseldorfer Alt-Marke
  ('schloesser', 'Schlösser Alt', 'Schlösser', 'brewery', 'Düsseldorf', 'DE',
    'Oststraße, 40210 Düsseldorf',
    NULL,
    51.2231, 6.7899, 1873, NULL,
    'Ehemalige Düsseldorfer Brauerei, gegründet 1873. War einst die meistverkaufte Alt-Marke der Stadt. Die Brauerei wurde geschlossen; die Marke wird heute von Carlsberg Deutschland unter veränderten Rezepturen produziert.',
    'Former Düsseldorf brewery, founded 1873. Once the city''s best-selling Alt brand. The brewery has since closed; the brand is now produced by Carlsberg Deutschland with a modified recipe.', 1, 'approved', 1),
  -- Gatzweiler — traditionsreiche Düsseldorfer Alt-Brauerei
  ('gatzweiler', 'Gatzweiler Alt', 'Gatzweiler', 'brewery', 'Düsseldorf', 'DE',
    'Ratinger Straße, 40213 Düsseldorf',
    NULL,
    51.2276, 6.7744, 1845, NULL,
    'Traditionsreiche Düsseldorfer Alt-Brauerei, gegründet um 1845. Wurde in den 1960er Jahren von Binding aufgekauft und eingestellt. Das Gatzweiler Alt war für seinen milden, malzbetonten Stil bekannt.',
    'Traditional Düsseldorf Alt brewery, founded around 1845. Acquired by Binding in the 1960s and discontinued. Gatzweiler Alt was known for its mild, malt-forward style.', 1, 'approved', 1),
  -- Rhenania — historische Düsseldorfer Brauerei
  ('rhenania', 'Brauerei Rhenania', 'Rhenania', 'brewery', 'Düsseldorf', 'DE',
    'Schwanemarkt, 40213 Düsseldorf',
    NULL,
    51.2291, 6.7799, 1879, NULL,
    'Historische Düsseldorfer Alt-Brauerei, gegründet 1879. Braute bis Mitte des 20. Jahrhunderts ein typisches Düsseldorfer Alt. Heute nicht mehr in Betrieb.',
    'Historic Düsseldorf Alt brewery, founded 1879. Brewed a classic Düsseldorf Alt until the mid-20th century. No longer in operation.', 1, 'approved', 1);

-- ---- 5b. Stile und Zuordnungen ----
-- Bolten Ur-Alt
INSERT OR IGNORE INTO styles (id, name, abv, ibu, color, tasting_de, tasting_en) VALUES
  ('bolten-uralt', 'Bolten Ur-Alt', 4.9, 28, '#8a4618',
    'Niederrheinisch mild, leicht malzig mit fruchtig-würzigem Charakter. Das älteste kommerziell gebraute Alt — ein Stück lebendige Biergeschichte.',
    'Mild Lower-Rhine style, lightly malty with a fruity-spicy character. The oldest commercially brewed Alt — a piece of living beer history.'),
  ('diebels-alt', 'Diebels Alt', 4.9, 27, '#8b4417',
    'Mild, leicht herb, gut trinkbar. Der typische Niederrhein-Alt — weicher und runder als die Düsseldorfer Hausbrauerei-Versionen.',
    'Mild, slightly bitter, very drinkable. The typical Lower-Rhine Alt — softer and rounder than the Düsseldorf brewpub versions.'),
  ('frankenheim-alt', 'Frankenheim Alt', 4.9, 30, '#8c4519',
    'Ausgewogen-malzig, leicht herb, süffig. Das erfolgreichste Düsseldorfer Industrie-Alt.',
    'Balanced-malty, lightly bitter, easy-drinking. The most successful Düsseldorf industrial Alt.');

INSERT OR IGNORE INTO brewery_styles (brewery_id, style_id) VALUES
  ('bolten',      'bolten-uralt'),
  ('diebels',     'diebels-alt'),
  ('frankenheim', 'frankenheim-alt');
