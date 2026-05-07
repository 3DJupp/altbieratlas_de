-- ============================================================
-- Altbieratlas — Migration 0003: Mehrtägige Events + Venue-Typen
-- ============================================================

-- Mehrtägige Events: optionales Enddatum (YYYY-MM-DD)
ALTER TABLE events ADD COLUMN end_date TEXT;

-- Venue-Typen-Tabelle für pflegbare Labels
CREATE TABLE IF NOT EXISTS venue_types (
  id         TEXT PRIMARY KEY,     -- 'brewery', 'pub', 'shop'
  label_de   TEXT NOT NULL,
  label_en   TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO venue_types (id, label_de, label_en, sort_order) VALUES
  ('brewery', 'Hausbrauerei', 'Brewpub',           1),
  ('pub',     'Gastronomie',  'Bar / Restaurant',   2),
  ('shop',    'Handel',       'Retail',             3);
