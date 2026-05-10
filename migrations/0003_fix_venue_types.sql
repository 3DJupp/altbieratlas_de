-- ============================================================
-- Altbieratlas — Migration 0003
-- Venue-Typ-Werte umbenennen:
--   brewery → hausbrauerei
--   pub     → gastronomie
--   shop    → handel
--
-- Da SQLite keine ALTER COLUMN / DROP CONSTRAINT kennt, wird die
-- Tabelle neu erstellt (standard SQLite-Pattern).
-- ============================================================

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS breweries_v2 (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  short_name     TEXT,
  type           TEXT NOT NULL CHECK (type IN ('hausbrauerei','gastronomie','handel')),
  city           TEXT NOT NULL,
  country        TEXT NOT NULL DEFAULT 'DE',
  address        TEXT,
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
SELECT
  id, name, short_name,
  CASE type
    WHEN 'brewery' THEN 'hausbrauerei'
    WHEN 'pub'     THEN 'gastronomie'
    WHEN 'shop'    THEN 'handel'
    ELSE type
  END AS type,
  city, country, address, lat, lng, founded, website,
  description_de, description_en, verified, status, created_at, updated_at
FROM breweries;

DROP TABLE breweries;
ALTER TABLE breweries_v2 RENAME TO breweries;

CREATE INDEX IF NOT EXISTS idx_breweries_city    ON breweries(city);
CREATE INDEX IF NOT EXISTS idx_breweries_status  ON breweries(status);
CREATE INDEX IF NOT EXISTS idx_breweries_country ON breweries(country);

PRAGMA foreign_keys = ON;
