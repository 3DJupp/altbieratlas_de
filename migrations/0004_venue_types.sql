-- ============================================================
-- Altbieratlas — Migration 0004
-- venue_types lookup table, maps_url column, remove hardcoded
-- type CHECK constraint on breweries (replaced by FK)
-- ============================================================

-- 1. Venue-Typen-Tabelle
CREATE TABLE IF NOT EXISTS venue_types (
  id        TEXT PRIMARY KEY,
  name_de   TEXT NOT NULL,
  name_en   TEXT,
  header_de TEXT,
  header_en TEXT
);

INSERT OR IGNORE INTO venue_types (id, name_de, name_en, header_de, header_en) VALUES
  ('hausbrauerei', 'Hausbrauerei', 'Brewery',         'Was hier gebraut und ausgeschenkt wird', 'What is brewed and served here'),
  ('gastronomie',  'Gastronomie',  'Bar / Restaurant', 'Was hier ausgeschenkt wird',             'What is served here'),
  ('handel',       'Handel',       'Retail',           'Was hier erhältlich ist',                'What is available here');

-- 2. Breweries neu anlegen: ohne hardcoded type-CHECK, mit maps_url, mit FK auf venue_types
PRAGMA defer_foreign_keys = ON;

CREATE TABLE IF NOT EXISTS breweries_v2 (
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

INSERT INTO breweries_v2
  (id, name, short_name, type, city, country, address, maps_url,
   lat, lng, founded, website, description_de, description_en,
   verified, status, created_at, updated_at)
SELECT
  id, name, short_name, type, city, country, address, NULL,
  lat, lng, founded, website, description_de, description_en,
  verified, status, created_at, updated_at
FROM breweries;

DROP TABLE breweries;
ALTER TABLE breweries_v2 RENAME TO breweries;

CREATE INDEX IF NOT EXISTS idx_breweries_city    ON breweries(city);
CREATE INDEX IF NOT EXISTS idx_breweries_status  ON breweries(status);
CREATE INDEX IF NOT EXISTS idx_breweries_country ON breweries(country);
