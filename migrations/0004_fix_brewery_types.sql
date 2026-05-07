-- ============================================================
-- Migration 0004: Align brewery type values with schema
-- ============================================================
-- The production DB was initialized with legacy type values
-- (hausbrauerei, gastronomie) that differ from the schema
-- (brewery, pub). This migration recreates the breweries table
-- with the correct CHECK constraint and remaps the values.
-- ============================================================

-- Step 1: Create replacement table with correct CHECK constraint
CREATE TABLE breweries_v2 (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  short_name     TEXT,
  type           TEXT NOT NULL CHECK (type IN ('brewery','pub','shop')),
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

-- Step 2: Copy all rows, remapping legacy type values
INSERT INTO breweries_v2
  SELECT
    id, name, short_name,
    CASE type
      WHEN 'hausbrauerei' THEN 'brewery'
      WHEN 'gastronomie'  THEN 'pub'
      ELSE type
    END AS type,
    city, country, address, lat, lng, founded, website,
    description_de, description_en, verified, status,
    created_at, updated_at
  FROM breweries;

-- Step 3: Swap tables (FK enforcement is OFF by default in D1/SQLite)
DROP TABLE breweries;
ALTER TABLE breweries_v2 RENAME TO breweries;

-- Step 4: Restore indexes
CREATE INDEX IF NOT EXISTS idx_breweries_city    ON breweries(city);
CREATE INDEX IF NOT EXISTS idx_breweries_status  ON breweries(status);
CREATE INDEX IF NOT EXISTS idx_breweries_country ON breweries(country);
