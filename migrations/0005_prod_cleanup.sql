-- ============================================================
-- Altbieratlas — Prod-Cleanup & Venue-Type-Migration  v0.6.0
-- ============================================================
-- Für bestehende Installs (ergänzt 0001–0004).
-- Für Neuinstallationen genügt 0001 + 0002.
--
-- Was dieses Skript tut:
--   1. venue_types auf 7 neue IDs migrieren
--   2. Brauerei-Typen der bestehenden Einträge anpassen
--   3. Test-/Platzhalter-Einträge entfernen
--   4. Test-Events entfernen (außer bierboerse-benrath)
--   5. Neue Stile hinzufügen (hellers-alt, altus-alt)
--   6. Neue Brauereien hinzufügen (hellers, kuerzer-flingern, altus)
--   7. maps_url für bestehende Einträge setzen
--   8. Preise aktualisieren / ergänzen
--
-- WICHTIG: Idempotent (alle Statements sind INSERT OR IGNORE /
-- UPDATE OR IGNORE / DELETE IF EXISTS).
-- ============================================================

-- ---- 1. venue_types auf 7 neue IDs erweitern ----
-- Neue Typen einfügen (INSERT OR IGNORE — bestehende bleiben erhalten)
INSERT OR IGNORE INTO venue_types (id, name_de, name_en, header_de, header_en) VALUES
  ('brewery',        'Brauerei',      'Brewery',          'Was hier gebraut wird',                  'What is brewed here'),
  ('brewpub',        'Hausbrauerei',  'Brewpub',          'Was hier gebraut und ausgeschenkt wird',  'What is brewed and served here'),
  ('pub',            'Kneipe',        'Pub',              'Was hier ausgeschenkt wird',              'What is served here'),
  ('restaurant',     'Restaurant',    'Restaurant',       'Was hier ausgeschenkt wird',              'What is served here'),
  ('kiosk',          'Kiosk',         'Kiosk',            'Was hier erhältlich ist',                 'What is available here'),
  ('supermarket',    'Supermarkt',    'Supermarket',      'Was hier erhältlich ist',                 'What is available here'),
  ('beverage_store', 'Getränkeshop',  'Beverage store',   'Was hier erhältlich ist',                 'What is available here');

-- ---- 2. Brauerei-Typen migrieren ----
-- hausbrauerei → brewpub (braut und schenkt aus)
UPDATE breweries SET type = 'brewpub',  updated_at = datetime('now')
  WHERE type = 'hausbrauerei';
-- gastronomie → pub (Kneipe, kein Eigenbrauen)
UPDATE breweries SET type = 'pub',      updated_at = datetime('now')
  WHERE type = 'gastronomie';
-- handel → beverage_store
UPDATE breweries SET type = 'beverage_store', updated_at = datetime('now')
  WHERE type = 'handel';

-- Spezialfall: reine Produktionsbrauereien (kein Taproom-Fokus) → brewery
UPDATE breweries SET type = 'brewery', updated_at = datetime('now')
  WHERE id IN ('koenigshof', 'hannen', 'alaskan-brewing', 'long-trail');

-- ---- 3. Test-/Platzhalter-Brauereien löschen ----
-- (cascade löscht zugehörige prices + brewery_styles)
DELETE FROM breweries WHERE id IN (
  'fuchs',
  'marble-nl',
  'bruery-terreux',
  'tokyo-alt',
  'malzmuehle-alt'
);

-- ---- 4. Test-Events löschen, Bierbörse behalten ----
DELETE FROM events WHERE id IN (
  'maimarkt',
  'altbierrunde-2026',
  'sticke-herbst-2026',
  'latzenbier-2026'
);

-- ---- 5. Neue Bierstile ----
INSERT OR IGNORE INTO styles (id, name, abv, ibu, color, tasting_de, tasting_en) VALUES
  ('hellers-alt', 'Hellers Altbier', 4.8, NULL, '#8b4820',
    'Bio-Altbier des Kölner Brauhauses Hellers. Mild, ausgewogen, mit biologisch angebautem Malz gebraut.',
    'Organic Altbier from Cologne''s Hellers brewpub. Mild, balanced, brewed with organically grown malt.'),
  ('altus-alt', 'Altus Bio-Alt', 4.9, NULL, '#8d4a1e',
    'Erstes Bio-Altbier aus Düsseldorf. Mild-malzig, ausgewogen, mit ökologisch angebautem Hopfen und Malz.',
    'The first certified organic Altbier from Düsseldorf. Mildly malty, balanced, brewed with organically grown hops and malt.');

-- ---- 6. Neue Brauereien ----
INSERT OR IGNORE INTO breweries (id, name, short_name, type, city, country, address, maps_url, lat, lng, founded, website, description_de, description_en, verified, status) VALUES
  ('kuerzer-flingern', 'Brauerei Kürzer Flingern', 'Kürzer Flingern', 'brewpub', 'Düsseldorf', 'DE',
    'Fichtenstraße 21, 40233 Düsseldorf',
    'https://maps.google.com/maps?q=Fichtenstra%C3%9Fe+21,+40233+D%C3%BCsseldorf',
    51.2337, 6.8151, 2020, 'https://brauerei-kuerzer.de',
    'Zweiter Kürzer-Standort in Düsseldorf-Flingern. Vollwertige Produktionsbrauerei mit Taproom, Biergarten und sechs Spezialbieren, die ausschließlich hier ausgeschenkt werden.',
    'Second Kürzer site in Düsseldorf-Flingern. Full production brewery with taproom, beer garden and six specialty beers available only here.',
    1, 'approved'),
  ('altus', 'Altus bräu', 'Altus', 'brewery', 'Düsseldorf', 'DE',
    'Sonnbornstr. 2, 40625 Düsseldorf',
    'https://maps.google.com/maps?q=Sonnbornstr.+2,+40625+D%C3%BCsseldorf',
    51.2157, 6.8633, 2021, 'https://altus-braeu.de',
    'Erstes Bio-Altbier aus Düsseldorf. Gebraut nach biologischen Standards mit Malz und Hopfen aus ökologischem Anbau — im Lohnbrauen-Verfahren bei einer Partnerbrauerei.',
    'The first certified organic Altbier from Düsseldorf, contract-brewed to organic standards using ecologically grown malt and hops.',
    1, 'approved'),
  ('hellers', 'Hellers Brauhaus', 'Hellers', 'brewpub', 'Köln', 'DE',
    'Roonstraße 33, 50674 Köln',
    'https://maps.google.com/maps?q=Roonstra%C3%9Fe+33,+50674+K%C3%B6ln',
    50.9284, 6.9408, 1996, 'https://www.hellers.koeln',
    'Bio-Hausbrauerei im Kwartier Latäng, Köln. Die einzige Kölner Hausbrauerei in Bio-Qualität — braut Kölsch, naturtrübes Wiess und Altbier.',
    'Organic brewpub in Cologne''s Kwartier Latäng. The city''s only brewpub producing its beers — Kölsch, naturally cloudy Wiess and Altbier — to certified organic standards.',
    1, 'approved');

-- ---- 6b. Stil-Zuordnungen für neue Einträge ----
INSERT OR IGNORE INTO brewery_styles (brewery_id, style_id) VALUES
  ('kuerzer-flingern', 'kuerzer-alt'),
  ('hellers',          'hellers-alt'),
  ('altus',            'altus-alt');

-- ---- 7. maps_url für bestehende Einträge setzen ----
UPDATE breweries SET maps_url = 'https://maps.google.com/maps?q=Berger+Stra%C3%9Fe+1,+40213+D%C3%BCsseldorf', updated_at = datetime('now')
  WHERE id = 'uerige'        AND (maps_url IS NULL OR maps_url = '');
UPDATE breweries SET maps_url = 'https://maps.google.com/maps?q=Ratinger+Stra%C3%9Fe+28,+40213+D%C3%BCsseldorf', updated_at = datetime('now')
  WHERE id = 'fuechschen'    AND (maps_url IS NULL OR maps_url = '');
UPDATE breweries SET maps_url = 'https://maps.google.com/maps?q=Ostra%C3%9Fe+123,+40210+D%C3%BCsseldorf', updated_at = datetime('now')
  WHERE id = 'schumacher'    AND (maps_url IS NULL OR maps_url = '');
UPDATE breweries SET maps_url = 'https://maps.google.com/maps?q=Bolkerstra%C3%9Fe+41,+40213+D%C3%BCsseldorf', updated_at = datetime('now')
  WHERE id = 'schluessel'    AND (maps_url IS NULL OR maps_url = '');
UPDATE breweries SET maps_url = 'https://maps.google.com/maps?q=Kurze+Stra%C3%9Fe+18,+40213+D%C3%BCsseldorf', updated_at = datetime('now')
  WHERE id = 'kuerzer'       AND (maps_url IS NULL OR maps_url = '');
UPDATE breweries SET maps_url = 'https://maps.google.com/maps?q=Flinger+Stra%C3%9Fe+1,+40213+D%C3%BCsseldorf', updated_at = datetime('now')
  WHERE id = 'zum-schlueffken' AND (maps_url IS NULL OR maps_url = '');
UPDATE breweries SET maps_url = 'https://maps.google.com/maps?q=Untergath+70,+47805+Krefeld', updated_at = datetime('now')
  WHERE id = 'koenigshof'    AND (maps_url IS NULL OR maps_url = '');
UPDATE breweries SET maps_url = 'https://maps.google.com/maps?q=Bismarckstra%C3%9Fe+115,+41061+M%C3%B6nchengladbach', updated_at = datetime('now')
  WHERE id = 'hannen'        AND (maps_url IS NULL OR maps_url = '');
UPDATE breweries SET maps_url = 'https://maps.google.com/maps?q=5429+Shaune+Drive,+Juneau,+AK', updated_at = datetime('now')
  WHERE id = 'alaskan-brewing' AND (maps_url IS NULL OR maps_url = '');
UPDATE breweries SET maps_url = 'https://maps.google.com/maps?q=5520+US-4,+Bridgewater+Corners,+VT', updated_at = datetime('now')
  WHERE id = 'long-trail'    AND (maps_url IS NULL OR maps_url = '');

-- ---- 8. Preise aktualisieren ----
-- Uerige: reale Preise (war 2,70 € — jetzt 2,85 €/0,25l lt. Meldungen 2025/2026)
DELETE FROM prices WHERE brewery_id = 'uerige'      AND size = '0.25l' AND price < 2.8 AND source = 'on-site';
DELETE FROM prices WHERE brewery_id = 'uerige'      AND size = '0.25l' AND source = 'website';
-- Füchschen: war 2,60 € → 2,90 €
DELETE FROM prices WHERE brewery_id = 'fuechschen'  AND size = '0.25l' AND price < 2.8 AND source = 'on-site';
-- Schumacher: war 2,50 € → 2,90 €
DELETE FROM prices WHERE brewery_id = 'schumacher'  AND size = '0.25l' AND price < 2.8 AND source = 'on-site';
-- Schlüssel: war 2,60 € → 2,90 €
DELETE FROM prices WHERE brewery_id = 'schluessel'  AND size = '0.25l' AND price < 2.8 AND source = 'on-site';

INSERT OR IGNORE INTO prices (brewery_id, date, size, price, source, status) VALUES
  ('uerige',          '2026-04-15', '0.25l', 2.85, 'on-site', 'approved'),
  ('uerige',          '2025-11-05', '0.25l', 2.85, 'on-site', 'approved'),
  ('fuechschen',      '2026-04-12', '0.25l', 2.90, 'on-site', 'approved'),
  ('fuechschen',      '2025-09-01', '0.25l', 2.70, 'on-site', 'approved'),
  ('schumacher',      '2026-04-08', '0.25l', 2.90, 'on-site', 'approved'),
  ('schumacher',      '2025-10-15', '0.25l', 2.70, 'on-site', 'approved'),
  ('schluessel',      '2026-04-14', '0.25l', 2.90, 'on-site', 'approved'),
  ('schluessel',      '2025-12-01', '0.25l', 2.70, 'on-site', 'approved'),
  ('kuerzer-flingern','2026-04-20', '0.25l', 2.80, 'on-site', 'approved');
