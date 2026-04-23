-- ============================================================
-- Altbieratlas — D1 Schema (SQLite)
-- ============================================================

-- Brauereien / Ausschankorte / Handel
CREATE TABLE IF NOT EXISTS breweries (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  short_name     TEXT,
  type           TEXT NOT NULL CHECK (type IN ('hausbrauerei','gastronomie','shop')),
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
CREATE INDEX IF NOT EXISTS idx_breweries_city    ON breweries(city);
CREATE INDEX IF NOT EXISTS idx_breweries_status  ON breweries(status);
CREATE INDEX IF NOT EXISTS idx_breweries_country ON breweries(country);

-- Bierstile
CREATE TABLE IF NOT EXISTS styles (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  abv        REAL,
  ibu        INTEGER,
  color      TEXT,
  tasting_de TEXT,
  tasting_en TEXT
);

-- n:m Zuordnung Brauerei <-> Stil
CREATE TABLE IF NOT EXISTS brewery_styles (
  brewery_id TEXT NOT NULL,
  style_id   TEXT NOT NULL,
  PRIMARY KEY (brewery_id, style_id),
  FOREIGN KEY (brewery_id) REFERENCES breweries(id) ON DELETE CASCADE,
  FOREIGN KEY (style_id)   REFERENCES styles(id)    ON DELETE CASCADE
);

-- Preismeldungen
CREATE TABLE IF NOT EXISTS prices (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  brewery_id TEXT NOT NULL,
  date       TEXT NOT NULL,
  size       TEXT NOT NULL,
  price      REAL NOT NULL,
  source     TEXT,
  notes      TEXT,
  status     TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brewery_id) REFERENCES breweries(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_prices_brewery ON prices(brewery_id);
CREATE INDEX IF NOT EXISTS idx_prices_date    ON prices(date DESC);
CREATE INDEX IF NOT EXISTS idx_prices_status  ON prices(status);
-- Dedup für idempotentes Seeding (gleicher Preis am gleichen Tag von der
-- gleichen Quelle wird nicht doppelt eingetragen; User-Beiträge sind selten
-- exakt identisch und haben i.d.R. eine eigene „source").
CREATE UNIQUE INDEX IF NOT EXISTS uq_prices_seed
  ON prices(brewery_id, date, size, price, COALESCE(source, ''));

-- Events
CREATE TABLE IF NOT EXISTS events (
  id             TEXT PRIMARY KEY,
  title_de       TEXT NOT NULL,
  title_en       TEXT,
  brewery_id     TEXT,
  date           TEXT NOT NULL,
  description_de TEXT,
  description_en TEXT,
  status         TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brewery_id) REFERENCES breweries(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_events_date   ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Glossar
CREATE TABLE IF NOT EXISTS glossary (
  term          TEXT PRIMARY KEY,
  definition_de TEXT NOT NULL,
  definition_en TEXT
);

-- Beitrags-Queue (Moderationspipeline)
CREATE TABLE IF NOT EXISTS contributions (
  id              TEXT PRIMARY KEY,              -- UUID
  type            TEXT NOT NULL CHECK (type IN ('price','brewery','style','correction','event')),
  payload         TEXT NOT NULL,                 -- JSON-String
  submitter_email TEXT,
  submitter_ip    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at     TEXT,
  reviewed_by     TEXT
);
CREATE INDEX IF NOT EXISTS idx_contributions_status  ON contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_created ON contributions(created_at DESC);

-- Admin-Benutzer (Passwort-Hash = PBKDF2-SHA256, in Format "pbkdf2$<iter>$<salt_b64>$<hash_b64>")
CREATE TABLE IF NOT EXISTS admin_users (
  username      TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions (Opaque Token in HttpOnly-Cookie)
CREATE TABLE IF NOT EXISTS admin_sessions (
  token      TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (username) REFERENCES admin_users(username) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at);

-- Rate-Limit (einfach: Zählung pro IP + Fenster)
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket     TEXT PRIMARY KEY,  -- z.B. "contrib:<ip>:<YYYYMMDDHH>"
  counter    INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_expires ON rate_limits(expires_at);
