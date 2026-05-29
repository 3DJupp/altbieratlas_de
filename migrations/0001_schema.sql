-- ============================================================
-- Altbieratlas — D1 Schema (SQLite) · Final state
-- ============================================================
-- Idempotent: CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- Für bestehende Installationen zusätzlich 0003_upgrade.sql anwenden.
-- ============================================================

-- Venue-Typen (Hausbrauerei, Gastronomie, Handel …)
CREATE TABLE IF NOT EXISTS venue_types (
  id          TEXT PRIMARY KEY,
  name_de     TEXT NOT NULL,
  name_en     TEXT,
  header_de   TEXT,
  header_en   TEXT,
  is_producer INTEGER NOT NULL DEFAULT 0
);

-- Breweries / taprooms / retail
CREATE TABLE IF NOT EXISTS breweries (
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
  is_historical  INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  photo_key      TEXT,
  logo_key       TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_breweries_city    ON breweries(city);
CREATE INDEX IF NOT EXISTS idx_breweries_status  ON breweries(status);
CREATE INDEX IF NOT EXISTS idx_breweries_country ON breweries(country);

-- Beer styles
CREATE TABLE IF NOT EXISTS styles (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  abv                 REAL,
  ibu                 INTEGER,
  color               TEXT,
  tasting_de          TEXT,
  tasting_en          TEXT,
  logo_key            TEXT,
  primary_brewery_id  TEXT REFERENCES breweries(id) ON DELETE SET NULL
);

-- n:m brewery <-> style mapping
CREATE TABLE IF NOT EXISTS brewery_styles (
  brewery_id TEXT NOT NULL,
  style_id   TEXT NOT NULL,
  PRIMARY KEY (brewery_id, style_id),
  FOREIGN KEY (brewery_id) REFERENCES breweries(id) ON DELETE CASCADE,
  FOREIGN KEY (style_id)   REFERENCES styles(id)    ON DELETE CASCADE
);

-- Price reports
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
CREATE UNIQUE INDEX IF NOT EXISTS uq_prices_seed
  ON prices(brewery_id, date, size, price, COALESCE(source, ''));

-- Events
CREATE TABLE IF NOT EXISTS events (
  id             TEXT PRIMARY KEY,
  title_de       TEXT NOT NULL,
  title_en       TEXT,
  brewery_id     TEXT,
  date           TEXT NOT NULL,
  time           TEXT,
  end_date       TEXT,
  end_time       TEXT,
  location       TEXT,
  url            TEXT,
  description_de TEXT,
  description_en TEXT,
  status         TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (brewery_id) REFERENCES breweries(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_events_date   ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Event-Biere (werden vom Preis-Ranking ausgenommen)
CREATE TABLE IF NOT EXISTS event_beers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id   TEXT    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name_de    TEXT,
  name_en    TEXT,
  size       TEXT    NOT NULL,
  price      REAL,
  notes      TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_event_beers_event ON event_beers(event_id);

-- Glossary
CREATE TABLE IF NOT EXISTS glossary (
  term          TEXT PRIMARY KEY,
  definition_de TEXT NOT NULL,
  definition_en TEXT
);

-- Contribution queue (moderation pipeline)
CREATE TABLE IF NOT EXISTS contributions (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('price','brewery','style','correction','event')),
  payload         TEXT NOT NULL,
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

-- Admin users (password hash: PBKDF2-SHA256, format "pbkdf2$<iter>$<salt_b64>$<hash_b64>")
CREATE TABLE IF NOT EXISTS admin_users (
  username      TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  email         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions (opaque token in HttpOnly cookie)
CREATE TABLE IF NOT EXISTS admin_sessions (
  token      TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (username) REFERENCES admin_users(username) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at);

-- Password reset tokens (1h TTL)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token      TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (username) REFERENCES admin_users(username) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reset_expires ON password_reset_tokens(expires_at);

-- Rate limiting (IP + time window)
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket     TEXT PRIMARY KEY,
  counter    INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_expires ON rate_limits(expires_at);

-- Untappd cache (24h TTL per brewery)
CREATE TABLE IF NOT EXISTS untappd_cache (
  atlas_id  TEXT PRIMARY KEY,
  data      TEXT NOT NULL,
  cached_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Site settings (key-value config, editable via admin)
CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Community votes for the Rivalen page (one vote per IP, upsertable)
CREATE TABLE IF NOT EXISTS rival_votes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  choice     TEXT NOT NULL CHECK (choice IN ('alt', 'kolsch')),
  ip_hash    TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rival_votes_ip ON rival_votes(ip_hash);
