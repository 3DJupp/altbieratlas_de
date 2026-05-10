-- ============================================================
-- Altbieratlas — Upgrade-Migration (bestehende Instanzen)
-- ============================================================
-- Für Neuinstallationen reicht 0001_schema.sql + 0002_seed.sql.
-- Dieses Skript bringt eine bestehende DB auf den Stand von 0001_schema.sql:
--
--   • venue_types: altes Schema (label_de/label_en/sort_order, IDs brewery/pub/shop)
--     wird durch das neue Schema (name_de/name_en/header_de/header_en, IDs
--     hausbrauerei/gastronomie/handel) ersetzt.
--
--   • breweries: neues Feld maps_url wird ergänzt; der hardcodierte
--     CHECK (type IN (...)) wird durch einen FK auf venue_types ersetzt;
--     alte Typ-IDs (brewery/pub/shop) werden migriert.
-- ============================================================

PRAGMA foreign_keys = OFF;
PRAGMA defer_foreign_keys = ON;

-- ---- 1. Neue venue_types anlegen ----
DROP TABLE IF EXISTS venue_types;
CREATE TABLE venue_types (
  id        TEXT PRIMARY KEY,
  name_de   TEXT NOT NULL,
  name_en   TEXT,
  header_de TEXT,
  header_en TEXT
);
INSERT INTO venue_types (id, name_de, name_en, header_de, header_en) VALUES
  ('hausbrauerei', 'Hausbrauerei', 'Brewery',        'Was hier gebraut und ausgeschenkt wird', 'What is brewed and served here'),
  ('gastronomie',  'Gastronomie',  'Bar / Restaurant','Was hier ausgeschenkt wird',             'What is served here'),
  ('handel',       'Handel',       'Retail',          'Was hier erhältlich ist',                'What is available here');

-- ---- 2. Breweries neu anlegen (maps_url + FK statt CHECK) ----
CREATE TABLE breweries_new (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  short_name     TEXT,
  type           TEXT NOT NULL REFERENCES venue_types(id),
  city           TEXT NOT NULL,
  country        TEXT NOT NULL DEFAULT 'DE',
  address        TEXT,
  maps_url       TEXT,
  lat            REAL NOT NULL,
  lng            REAL NOT NULL,
  founded        INTEGER,
  website        TEXT,
  description_de TEXT,
  description_en TEXT,
  verified       INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO breweries_new
  (id, name, short_name, type, city, country, address, maps_url,
   lat, lng, founded, website, description_de, description_en,
   verified, status, created_at, updated_at)
SELECT
  id, name, short_name,
  CASE type
    WHEN 'brewery' THEN 'hausbrauerei'
    WHEN 'pub'     THEN 'gastronomie'
    WHEN 'shop'    THEN 'handel'
    ELSE type
  END,
  city, country, address, NULL,
  lat, lng, founded, website, description_de, description_en,
  verified, status, created_at, updated_at
FROM breweries;

DROP TABLE breweries;
ALTER TABLE breweries_new RENAME TO breweries;

CREATE INDEX IF NOT EXISTS idx_breweries_city    ON breweries(city);
CREATE INDEX IF NOT EXISTS idx_breweries_status  ON breweries(status);
CREATE INDEX IF NOT EXISTS idx_breweries_country ON breweries(country);

PRAGMA foreign_keys = ON;
